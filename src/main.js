import {
  createGame,
  addPlayer,
  setCharacter,
  step,
  startGame,
  chooseUpgrade,
  UPGRADES,
} from "./sim.js";
import { createRenderer } from "./render.js";
import { connectRoom } from "./net.js";
import { AudioGarden } from "./audio.js";
import { setAnimationSettings } from "./animation.js";
import { MILESTONES, normalizeMemory, bankProgress } from "./progression.js";
import { WAVE_DURATION, BALANCE, PERMANENT } from "./config.js";
import { MAPS, mapForWave } from "./maps.js";
import { capturePresentation, presentState } from "./presentation.js";
import { drawCurio } from "./curios.js";
import { drawMenuArt } from "./menu-art.js";
import { drawActor } from "./art.js";
import { CHARACTERS, getCharacter, WEAPONS } from "./characters.js";
import { acquiredItems } from "./inventory.js";
import { upgradeDetails } from "./upgrade-copy.js";
import {
  pixelIcon,
  iconText,
  pixelMeter,
  pixelTransition,
  initializePixelIcons,
  drawPixelIcon,
} from "./pixel-ui.js";
import { installViewport } from "./viewport.js";
installViewport();
const $ = (id) => document.getElementById(id),
  canvas = $("world"),
  renderer = createRenderer(canvas),
  audio = new AudioGarden();
initializePixelIcons();
for (const art of document.querySelectorAll(
  "canvas[data-menu-art], canvas[data-curio-art]",
)) {
  art.width = art.height = 64;
  if (art.dataset.menuArt)
    drawMenuArt(art.getContext("2d"), art.dataset.menuArt, 0, 0, 64);
  else drawCurio(art.getContext("2d"), art.dataset.curioArt, 0, 0, 64);
}
$("milestone-details").addEventListener("toggle", () =>
  drawPixelIcon(
    $("milestone-arrow"),
    $("milestone-details").open ? "down" : "chevron",
  ),
);
const store = {
  get(k, f) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? f;
    } catch {
      return f;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
setAnimationSettings(store.get("afterhours.motion", {}));
window.addEventListener("storage", (e) => {
  if (e.key === "afterhours.motion")
    setAnimationSettings(store.get("afterhours.motion", {}));
});
let settings = store.get("threadwake.settings", {
  sound: true,
  motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
let memory = normalizeMemory(
  store.get("threadwake.memories", {
    balance: 0,
    traits: { vitality: 0, haste: 0, echo: 0 },
    runs: 0,
    best: 0,
  }),
);
for (const k of ["vitality", "haste", "echo"])
  memory.traits[k] = Math.max(0, Math.min(3, Number(memory.traits[k]) || 0));
let state = createGame(77),
  id = "solo",
  net = null,
  online = false,
  paused = false,
  screen = "menu",
  last = 0,
  accumulator = 0,
  sendAt = 0,
  uiAt = 0,
  phase = "",
  draftSignature = "",
  status = "",
  identityReady = false,
  roomGeneration = 0;
let keys = new Set(),
  castPending = false,
  touch = { x: 0, y: 0 },
  toastTimer,
  renderState = null,
  previousState = null,
  receivedAt = 0;
let castUntil = 0,
  touchCast = false,
  pointerCast = false,
  padPause = false,
  device = "keyboard",
  lastCastSent = 0,
  latestInput = { x: 0, y: 0 },
  latency = null;
let memoryReturnTo = "play";
const lessonProgress = { moved: false, cast: false };
const name = store.get("threadwake.name", "Custodian");
let selectedCharacter = getCharacter(
  store.get("afterhours.character", "custodian"),
).id;
let knownWeapons = null;
let knownWeaponRun = "";
const seenPowerups = new Set();
$("name").value = name;
audio.enabled = settings.sound;
audio.musicVolume = (settings.musicVolume ?? 65) / 100;
audio.effectsVolume = (settings.effectsVolume ?? 80) / 100;
$("music-volume").value = settings.musicVolume ?? 65;
$("effects-volume").value = settings.effectsVolume ?? 80;
$("sound").checked = settings.sound;
$("motion").checked = settings.motion;
addPlayer(state, id, name, {}, selectedCharacter);
const demo = state.players[0];
demo.x = 600;
demo.y = 420;
function updateCharacterChoice() {
  const character = getCharacter(selectedCharacter);
  for (const key of ["character-button", "lobby-character"])
    $(key).textContent = `${character.name} · change`;
  for (const button of $("character-choices").children)
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.character === selectedCharacter),
    );
}
for (const character of CHARACTERS) {
  const button = document.createElement("button");
  button.dataset.character = character.id;
  button.className = "character-card";
  const portrait = document.createElement("canvas");
  portrait.width = 128;
  portrait.height = 128;
  portrait.setAttribute("aria-hidden", "true");
  const portraitContext = portrait.getContext("2d");
  portraitContext.scale(2, 2);
  portraitContext._pixelRatio = 2;
  portraitContext.imageSmoothingEnabled = false;
  drawActor(
    portraitContext,
    {
      ...demo,
      x: 32,
      y: 55,
      character: character.id,
      weapons: [character.weapon],
      lastWeapon: character.weapon,
      invulnerable: 0,
    },
    0,
  );
  const title = document.createElement("strong");
  title.textContent = character.name;
  const weapon = document.createElement("span");
  weapon.textContent = WEAPONS[character.weapon].name;
  const description = document.createElement("small");
  description.textContent = `${WEAPONS[character.weapon].description} ${character.description}`;
  button.append(portrait, title, weapon, description);
  button.onclick = () => {
    if (!["lobby", "won", "lost"].includes(state.phase)) return;
    selectedCharacter = character.id;
    store.set("afterhours.character", selectedCharacter);
    if (online) net?.setCharacter(selectedCharacter);
    else setCharacter(state, id, selectedCharacter);
    updateCharacterChoice();
  };
  $("character-choices").append(button);
}
updateCharacterChoice();
for (const key of ["character-button", "lobby-character"])
  $(key).onclick = () => $("characters").showModal();
$("character-done").onclick = () => $("characters").close();
const soundControl = (target) =>
  target instanceof Element
    ? target.closest("button, a, input[type='checkbox'], select")
    : null;
document.addEventListener("pointerdown", () => audio.unlock(), {
  capture: true,
});
document.addEventListener("keydown", () => audio.unlock(), { capture: true });
document.addEventListener("pointerover", (event) => {
  const control = soundControl(event.target);
  if (
    event.pointerType === "touch" ||
    !control ||
    control.disabled ||
    control.contains(event.relatedTarget)
  )
    return;
  audio.hover?.();
});
document.addEventListener("focusin", (event) => {
  const control = soundControl(event.target);
  if (control && !control.disabled && control.matches(":focus-visible"))
    audio.hover?.();
});
document.addEventListener(
  "click",
  (event) => {
    const control = soundControl(event.target);
    if (!control || control.disabled) return;
    if (
      ["solo", "begin", "again"].includes(control.id) ||
      control.matches(".upgrade")
    )
      audio.confirm?.();
    else if (control.matches(".character-card, .talent")) audio.select?.();
    else if (
      [
        "home",
        "quit",
        "leave-lobby",
        "resume",
        "close-memories",
        "character-done",
      ].includes(control.id)
    )
      audio.back?.();
    else audio.click();
  },
  { capture: true },
);
function show(which) {
  screen = which;
  for (const s of ["menu", "lobby", "draft", "result"])
    $(s).hidden = s !== which;
  $("hud").hidden = which !== "play";
  $("touch").hidden =
    which !== "play" || !matchMedia("(pointer:coarse)").matches;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 2800);
}
function safeName() {
  const n = $("name").value.trim().slice(0, 16) || "Custodian";
  store.set("threadwake.name", n);
  return n;
}
function resetInputs() {
  keys.clear();
  touch = { x: 0, y: 0 };
  castPending = false;
  castUntil = 0;
  touchCast = false;
  pointerCast = false;
  padCast = false;
  latestInput = { x: 0, y: 0 };
  stickId = null;
  if (typeof stick !== "undefined")
    stick.firstElementChild.style.transform = "";
  if (net) net.sendInput({ x: 0, y: 0, cast: false });
}
function startSolo() {
  roomGeneration++;
  audio.reset();
  lessonProgress.moved = false;
  lessonProgress.cast = false;
  net?.close();
  net = null;
  online = false;
  $("network-status").hidden = true;
  id = "solo";
  state = createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
  addPlayer(state, id, safeName(), memory.traits, selectedCharacter);
  knownWeapons = null;
  startGame(state);
  phase = "";
  paused = false;
  accumulator = 0;
  previousState = null;
  show("play");
  audio.unlock();
  history.replaceState({}, "", location.pathname);
}
function roomCode() {
  const a = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(a, (x) => x.toString(36).padStart(2, "0")).join("");
}
async function join(room) {
  const generation = ++roomGeneration;
  net?.close();
  online = true;
  identityReady = false;
  id = "";
  status = "connecting";
  state = createGame(1);
  previousState = null;
  phase = "";
  lessonProgress.moved = false;
  lessonProgress.cast = false;
  show("lobby");
  $("begin").disabled = true;
  $("connection").textContent = "Connecting…";
  const url = new URL(location.href);
  url.searchParams.set("room", room);
  history.replaceState({}, "", url);
  try {
    net = await connectRoom({
      room,
      name: safeName(),
      traits: memory.traits,
      character: selectedCharacter,
      onHealth(health) {
        if (generation !== roomGeneration) return;
        latency = health.latencyMs;
        if (status === "connected") {
          $("network-status").hidden = !health.stale;
          $("network-status").textContent = health.stale
            ? "Connection delayed…"
            : "";
        }
        $("connection-health").textContent =
          `${status}${latency == null ? "" : ` · ${Math.round(latency)} ms`}`;
      },
      onIdentity(v) {
        if (generation !== roomGeneration) return;
        id = v.id;
        identityReady = true;
        updateLobby();
      },
      onStatus(value, detail) {
        if (generation !== roomGeneration) return;
        status = value;
        $("network-status").hidden = value === "connected" || !online;
        $("network-status").textContent =
          value === "reconnecting"
            ? "Reconnecting…"
            : value === "error"
              ? "Connection interrupted"
              : value === "closed"
                ? detail || "Disconnected"
                : "Connecting…";
        $("connection").textContent =
          value === "connected"
            ? "Invite a friend, or begin."
            : value === "reconnecting"
              ? "Reconnecting…"
              : value === "error"
                ? detail || "Could not join this shift. Try again."
                : "Connecting…";
        if (value === "error") toast(detail || "Connection failed.");
        updateLobby();
      },
      onState(next) {
        if (generation !== roomGeneration) return;
        previousState = capturePresentation(state);
        state = next;
        if (state.phase === "lobby") {
          const self = state.players.find((p) => p.id === id);
          if (self && self.character !== selectedCharacter) {
            selectedCharacter = getCharacter(self.character).id;
            updateCharacterChoice();
          }
        }
        receivedAt = performance.now();
        updatePhase();
      },
    });
  } catch (e) {
    status = "error";
    $("connection").textContent = "Could not connect. Return and try again.";
    toast(e.message || "Connection failed.");
  }
}
function host() {
  return (
    !online ||
    (!state.hostId ? state.players[0]?.id === id : state.hostId === id)
  );
}
function updateLobby() {
  if (screen !== "lobby") return;
  $("party").replaceChildren(
    ...state.players.map((p) => {
      const el = document.createElement("span");
      el.textContent = `${p.name} · ${getCharacter(p.character).name}${p.id === id ? " · you" : ""}${p.id === state.hostId ? " · host" : ""}`;
      return el;
    }),
  );
  $("begin").disabled = !identityReady || status !== "connected" || !host();
  $("begin").textContent = host() ? "Start shift" : "Waiting for the host";
}
function updatePhase() {
  bank();
  if (state.phase !== phase) {
    phase = state.phase;
    if (phase === "playing") {
      $("characters").close();
      show("play");
      draftSignature = "";
    } else if (phase === "draft") {
      show("draft");
      resetInputs();
      draftSignature = "";
    } else if (phase === "won" || phase === "lost") {
      showResult();
    } else if (phase === "lobby" && online) show("lobby");
  }
  if (screen === "lobby") updateLobby();
  if (screen === "result") {
    $("again").disabled = !host();
    $("again").textContent = host() ? "Another shift" : "Waiting for the host";
  }
  if (phase === "draft") updateDraft();
}
function upgradeById(value) {
  return Array.isArray(UPGRADES)
    ? UPGRADES.find((u) => u.id === value)
    : UPGRADES[value];
}
function itemCopyContext() {
  return {
    control:
      device === "controller" ? "A" : device === "touch" ? null : "Space",
    teammates: state.players.length > 1,
  };
}
function updateDraft() {
  const choices = state.choices?.[id] || [];
  const signature = JSON.stringify(choices);
  if (signature === draftSignature) return;
  draftSignature = signature;
  $("choices").replaceChildren();
  $("draft-caption").textContent =
    `LEVEL ${state.level || 1} · Choose an upgrade for this shift`;
  $("draft-status").textContent = choices.length
    ? ""
    : "Waiting for the others…";
  choices.forEach((value, i) => {
    const u = upgradeById(typeof value === "string" ? value : value.id);
    if (!u) return;
    const b = document.createElement("button");
    b.className = "upgrade";
    const glyph = document.createElement("canvas");
    glyph.width = glyph.height = 64;
    glyph.className = "glyph curio-icon";
    glyph.setAttribute("aria-hidden", "true");
    drawCurio(glyph.getContext("2d"), u.id, 0, 0, 64);
    const title = document.createElement("strong");
    const player = state.players.find((p) => p.id === id);
    const rank = player?.upgrades.filter((v) => v === u.id).length || 0;
    title.textContent = `${u.name} · ${rank + 1}`;
    const desc = document.createElement("small");
    const preview = upgradeDetails(player, u.id, itemCopyContext());
    const definition = document.createElement("span");
    definition.className = "upgrade-description";
    definition.textContent = preview.description;
    desc.append(definition);
    for (const stat of preview.stats) {
      const row = document.createElement("span");
      row.className = "upgrade-stat";
      row.append(document.createTextNode(`${stat.label}: `));
      const values = document.createElement("span");
      values.className = "upgrade-values";
      pixelTransition(values, stat.before, stat.after);
      row.append(values);
      desc.append(row);
    }
    if (preview.synergy) {
      const note = document.createElement("span");
      note.className = "upgrade-note";
      note.textContent = preview.synergy;
      desc.append(note);
    }
    const key = document.createElement("span");
    key.className = "key";
    key.textContent = `${i + 1} · choose`;
    b.append(glyph, title, desc, key);
    b.onclick = () => selectUpgrade(u.id);
    $("choices").append(b);
  });
}
function selectUpgrade(value) {
  if (online && status !== "connected") {
    toast("Reconnect to choose an upgrade.");
    return;
  }
  if (online) net?.choose(value);
  else {
    chooseUpgrade(state, id, value);
    updatePhase();
  }
  if (online) {
    $("draft-status").textContent = "Choosing…";
  }
}
function bank() {
  const result = bankProgress(
    memory,
    state,
    state.players.find((p) => p.id === id),
  );
  if (result.changed) {
    store.set("threadwake.memories", memory);
    updateMemoryCount();
    if (result.newMilestones.length)
      toast(
        `${result.newMilestones.join(" · ")} · +${result.newMilestones.length} ${result.newMilestones.length === 1 ? "credit" : "credits"}`,
      );
  }
  return result.runEarned;
}
function showResult() {
  show("result");
  resetInputs();
  const won = state.phase === "won";
  $("result-caption").textContent = won
    ? "Doors open at nine"
    : "The collection got away";
  $("result-title").textContent = won ? "Shift complete." : "Clocked out.";
  $("result-stats").textContent =
    `${state.kills || 0} enemies defeated · ${state.caught || 0} red shots cleared · wave ${state.wave}`;
  const earned = bank();
  $("result-memory").hidden = false;
  $("result-memory").textContent =
    `+${earned} ${earned === 1 ? "credit" : "credits"} saved · ${memory.balance} available`;
  $("again").disabled = !host();
  $("again").textContent = host() ? "Another shift" : "Waiting for the host";
}
function backHome() {
  roomGeneration++;
  net?.close();
  net = null;
  online = false;
  paused = false;
  resetInputs();
  $("options").close();
  $("memories").close();
  state = createGame(77);
  previousState = null;
  accumulator = 0;
  id = "solo";
  addPlayer(state, id, safeName(), {}, selectedCharacter);
  knownWeapons = null;
  phase = "lobby";
  show("menu");
  history.replaceState({}, "", location.pathname);
  updateMemoryCount();
}
let inspectedItem = null;
function options() {
  if ($("options").open || $("memories").open) return;
  paused = !online;
  resetInputs();
  $("options-title").textContent =
    screen === "menu" ? "Options" : online ? "On shift" : "Paused";
  $("quit").hidden = screen === "menu";
  $("online-pause").hidden = !online;
  $("run-invite").hidden = !online;
  $("connection-health").hidden = !online;
  $("connection-health").textContent =
    latency == null ? status : `${status} · ${Math.round(latency)} ms`;
  const player = state.players.find((p) => p.id === id);
  const showInventory = screen !== "menu" && Boolean(player);
  $("inventory").hidden = !showInventory;
  $("options").classList.toggle("with-inventory", showInventory);
  const items = acquiredItems(player, itemCopyContext());
  const inspect = (item) => {
    inspectedItem = item.key;
    for (const button of $("loadout").children)
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.item === item.key),
      );
    $("item-name").textContent = item.name;
    $("item-description").textContent = item.description;
    $("item-stats").replaceChildren(
      ...item.stats.flatMap(({ label, value }) => {
        const term = document.createElement("dt"),
          detail = document.createElement("dd");
        term.textContent = label;
        detail.textContent = value;
        return [term, detail];
      }),
    );
  };
  $("loadout").replaceChildren(
    ...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.item = item.key;
      button.setAttribute("aria-controls", "item-details");
      if (item.icon) {
        const icon = document.createElement("canvas");
        icon.width = icon.height = 64;
        icon.className = "loadout-icon";
        icon.setAttribute("aria-hidden", "true");
        drawCurio(icon.getContext("2d"), item.icon, 0, 0, 64);
        button.append(icon);
      }
      button.append(
        document.createTextNode(
          item.name + (item.count ? ` ×${item.count}` : ""),
        ),
      );
      button.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "touch") inspect(item);
      });
      button.addEventListener("focus", () => inspect(item));
      button.addEventListener("click", () => inspect(item));
      return button;
    }),
  );
  if (items.length)
    inspect(items.find((item) => item.key === inspectedItem) || items[0]);
  $("options").showModal();
}
function closeOptions() {
  paused = false;
  last = performance.now();
  $("options").close();
}
function updateMemoryCount() {
  $("memory-count").textContent = `· ${memory.balance}`;
  $("hud-memory-count").textContent = memory.balance;
  $("pause-memories").textContent = `Staff kit · ${memory.balance}`;
  iconText(
    $("title-credits"),
    "credit",
    `${memory.balance} ${memory.balance === 1 ? "credit" : "credits"}`,
  );
  $("title-best").textContent =
    memory.best || memory.runs ? `Best ${memory.best} / 8` : "First shift";
  const ranks = Object.values(memory.traits).reduce(
    (sum, rank) => sum + rank,
    0,
  );
  $("title-equipment").textContent = `${ranks} / 9 permanent upgrades`;
  if (!$("gallery-route").children.length) {
    for (const map of MAPS) {
      const item = document.createElement("li"),
        waves = document.createElement("span");
      waves.textContent = `Waves ${map.waves[0]}–${map.waves[1]}`;
      item.append(document.createTextNode(map.name), waves);
      $("gallery-route").append(item);
    }
  }
}
function permanentStat(key, rank) {
  if (key === "vitality")
    return `${BALANCE.playerHp + getCharacter(state.players.find((p) => p.id === id)?.character || selectedCharacter).hpBonus + rank * PERMANENT.healthPerRank}`;
  if (key === "haste")
    return `${Math.round(100 * (1 + rank * PERMANENT.speedPerRank))}%`;
  return `${(BALANCE.castCooldown * (1 - rank * PERMANENT.cooldownPerRank)).toFixed(2)}s`;
}
function memories() {
  if (!$("memories").open) {
    memoryReturnTo = $("options").open ? "options" : screen;
    $("options").close();
    paused = !online && screen !== "menu";
    resetInputs();
  }
  updateMemoryCount();
  iconText(
    $("memory-balance"),
    "credit",
    `${memory.balance} ${memory.balance === 1 ? "credit" : "credits"}`,
  );
  $("milestone-count").textContent =
    `${memory.milestones.length} / ${MILESTONES.length}`;
  $("talents").replaceChildren();
  $("milestones").replaceChildren(
    ...MILESTONES.map((m) => {
      const el = document.createElement("p");
      iconText(
        el,
        memory.milestones.includes(m.id) ? "credit" : "empty",
        `${m.name} · ${m.description}`,
      );
      return el;
    }),
  );
  const data = [
    ["vitality", "Work coat", "Maximum health"],
    ["haste", "Soft soles", "Movement speed"],
    ["echo", "Grip tape", "Ability recharge time"],
  ];
  for (const [key, title, label] of data) {
    const rank = memory.traits[key],
      cost = rank + 1,
      b = document.createElement("button");
    b.className = "talent";
    b.dataset.trait = key;
    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    const heading = document.createElement("span"),
      illustration = document.createElement("canvas");
    heading.className = "talent-heading";
    illustration.width = illustration.height = 64;
    illustration.className = "menu-art";
    illustration.setAttribute("aria-hidden", "true");
    drawCurio(
      illustration.getContext("2d"),
      { vitality: "vitality", haste: "speed", echo: "echo" }[key],
      0,
      0,
      64,
    );
    heading.append(illustration, titleEl);
    const ranks = document.createElement("span");
    ranks.className = "talent-ranks";
    pixelMeter(ranks, rank, 3);
    const price = document.createElement("span");
    price.className = "talent-price";
    price.textContent =
      rank < 3
        ? `Buy · ${cost} ${cost === 1 ? "credit" : "credits"}`
        : "Fully equipped";
    const s = document.createElement("small");
    s.className = "talent-effect";
    s.textContent = `${label}\n`;
    if (rank < 3)
      pixelTransition(
        s,
        permanentStat(key, rank),
        permanentStat(key, rank + 1),
      );
    else s.append(document.createTextNode(permanentStat(key, rank)));
    b.append(heading, ranks, s, price);
    b.disabled = rank >= 3 || memory.balance < cost;
    b.onclick = () => {
      memory.balance -= cost;
      memory.traits[key]++;
      store.set("threadwake.memories", memory);
      net?.setTraits?.(memory.traits);
      memories();
    };
    $("talents").append(b);
  }
  if (!$("memories").open) $("memories").showModal();
}
$("solo").onclick = startSolo;
$("friends").onclick = () => join(roomCode());
$("begin").onclick = () => {
  audio.unlock();
  net?.start();
};
$("copy-link").onclick = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Invite copied.");
  } catch {
    toast("Copy the address above to invite a friend.");
  }
};
$("leave-lobby").onclick = backHome;
$("run-invite").onclick = () => $("copy-link").onclick();
$("home").onclick = backHome;
$("again").onclick = () => {
  if (online) {
    audio.reset();
    net?.start();
  } else startSolo();
};
$("pause-button").onclick = options;
$("options-button").onclick = options;
$("resume").onclick = closeOptions;
$("options").addEventListener("cancel", () => {
  paused = false;
});
$("quit").onclick = backHome;
$("memories-button").onclick = memories;
$("hud-memories").onclick = memories;
$("pause-memories").onclick = memories;
$("result-kit").onclick = memories;
function closeMemories() {
  $("memories").close();
  paused = false;
  last = performance.now();
  if (memoryReturnTo === "options") options();
}
$("close-memories").onclick = closeMemories;
$("memories").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeMemories();
});
$("sound").onchange = () => {
  settings.sound = $("sound").checked;
  audio.enabled = settings.sound;
  audio.unlock();
  store.set("threadwake.settings", settings);
};
$("motion").onchange = () => {
  settings.motion = $("motion").checked;
  store.set("threadwake.settings", settings);
};
for (const kind of ["music", "effects"])
  $(kind + "-volume").oninput = () => {
    settings[kind + "Volume"] = Number($(kind + "-volume").value);
    audio[kind + "Volume"] = settings[kind + "Volume"] / 100;
    audio.unlock();
    if (kind === "effects") audio.slider(settings[kind + "Volume"] / 100);
    store.set("threadwake.settings", settings);
  };
$("name").onchange = () => {
  const name = safeName();
  net?.rename?.(name);
};
window.addEventListener("keydown", (e) => {
  device = "keyboard";
  if (e.target instanceof HTMLInputElement) return;
  if (
    e.code === "Space" &&
    e.target instanceof Element &&
    e.target.closest("button, a")
  )
    return;
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.code === "Escape") {
    if (!$("options").open && !$("memories").open && screen === "play") {
      e.preventDefault();
      options();
    }
    return;
  }
  if (e.code === "KeyM" && !e.repeat) {
    $("sound").checked = !$("sound").checked;
    $("sound").onchange();
  }
  if (screen === "draft" && /^Digit[123]$/.test(e.code)) {
    const b = $("choices").children[Number(e.code.slice(-1)) - 1];
    if (b && !b.disabled) b.click();
  }
  if (
    e.code === "Space" &&
    !e.repeat &&
    screen === "play" &&
    !$("options").open
  )
    castPending = true;
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  resetInputs();
  if (!online && screen === "play") options();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resetInputs();
    if (!online && screen === "play") options();
  }
});
canvas.addEventListener("pointerdown", (e) => {
  if (screen === "play" && !$("options").open) {
    device = e.pointerType === "touch" ? "touch" : "keyboard";
    castPending = true;
    pointerCast = true;
    canvas.setPointerCapture(e.pointerId);
    audio.unlock();
  }
});
canvas.onpointerup =
  canvas.onpointercancel =
  canvas.onlostpointercapture =
    () => {
      pointerCast = false;
    };
const stick = $("stick");
let stickId = null;
function stickMove(e) {
  if (e.pointerId !== stickId) return;
  const r = stick.getBoundingClientRect(),
    scale = r.width / 100,
    dx = (e.clientX - r.left - r.width / 2) / (40 * scale),
    dy = (e.clientY - r.top - r.height / 2) / (40 * scale),
    d = Math.max(1, Math.hypot(dx, dy));
  touch = { x: dx / d, y: dy / d };
  stick.firstElementChild.style.transform = `translate(${touch.x * 32}px,${touch.y * 32}px)`;
}
stick.onpointerdown = (e) => {
  device = "touch";
  stickId = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  stickMove(e);
  audio.unlock();
};
stick.onpointermove = stickMove;
stick.onpointerup =
  stick.onpointercancel =
  stick.onlostpointercapture =
    () => {
      stickId = null;
      touch = { x: 0, y: 0 };
      stick.firstElementChild.style.transform = "";
    };
$("touch-cast").onpointerdown = (e) => {
  e.preventDefault();
  castPending = true;
  device = "touch";
  touchCast = true;
  e.currentTarget.setPointerCapture(e.pointerId);
  audio.unlock();
};
$("touch-cast").onpointerup =
  $("touch-cast").onpointercancel =
  $("touch-cast").onlostpointercapture =
    () => {
      touchCast = false;
    };
let padCast = false;
function input() {
  let x =
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")) +
      touch.x,
    y =
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      Number(keys.has("KeyW") || keys.has("ArrowUp")) +
      touch.y;
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  if (pad) {
    const mag = Math.hypot(pad.axes[0] || 0, pad.axes[1] || 0);
    if (mag > 0.18) {
      const gain = Math.min(1, (mag - 0.18) / 0.82) / mag;
      x += pad.axes[0] * gain;
      y += pad.axes[1] * gain;
      device = "controller";
    }
    const pressed = pad.buttons[0]?.pressed;
    if (pressed && !padCast) {
      castPending = true;
      device = "controller";
      audio.unlock();
    }
    padCast = pressed;
    const menu = !!pad.buttons[9]?.pressed;
    if (menu && !padPause) {
      if ($("memories").open) closeMemories();
      else if ($("options").open) closeOptions();
      else options();
    }
    padPause = menu;
  } else {
    padCast = false;
    padPause = false;
  }
  if ($("options").open || $("memories").open || screen !== "play")
    return { x: 0, y: 0, cast: false };
  const now = performance.now();
  if (castPending) castUntil = now + 250;
  const p = state.players.find((p) => p.id === id);
  const wantsCast =
    keys.has("Space") || padCast || touchCast || pointerCast || now < castUntil;
  const cast =
    wantsCast &&
    p &&
    !p.dead &&
    p.castCooldown <= 0 &&
    now - lastCastSent > 220;
  if (cast) {
    lastCastSent = now;
    castUntil = 0;
    lessonProgress.cast = true;
  }
  const d = Math.max(1, Math.hypot(x, y)),
    out = { x: x / d, y: y / d, cast: !!cast };
  latestInput = out;
  if (Math.hypot(x, y) > 0.1 && state.time > 4) lessonProgress.moved = true;
  castPending = false;
  return out;
}
function updateHud() {
  const p = state.players.find((p) => p.id === id);
  if (!p) return;
  const runKey = `${state.seed}:${state.runNumber}:${id}`;
  if (runKey !== knownWeaponRun) {
    knownWeaponRun = runKey;
    knownWeapons = null;
    seenPowerups.clear();
  }
  const character = getCharacter(p.character);
  $("level").textContent = `LV ${state.level || 1}`;
  $("xp-count").textContent = `${state.xp || 0} / ${state.xpToNext || 1} XP`;
  const xpRatio = Math.max(
    0,
    Math.min(1, (state.xp || 0) / (state.xpToNext || 1)),
  );
  pixelMeter($("xp-meter"), Math.floor(xpRatio * 10), 10, "#80b7c2");
  $("xp-meter").setAttribute("aria-label", "Experience toward next level");
  $("xp-meter").setAttribute("aria-valuenow", state.xp || 0);
  $("xp-meter").setAttribute("aria-valuemin", "0");
  $("xp-meter").setAttribute("aria-valuemax", state.xpToNext || 1);
  if (knownWeapons) {
    for (const weapon of p.weapons || [])
      if (!knownWeapons.includes(weapon))
        toast(`${WEAPONS[weapon]?.name || weapon} acquired`);
  }
  knownWeapons = [...(p.weapons || [])];
  for (const effect of state.effects || []) {
    if (
      effect.type !== "haste" ||
      effect.owner !== id ||
      seenPowerups.has(effect.id)
    )
      continue;
    seenPowerups.add(effect.id);
    toast("Speed boost");
  }
  $("touch-cast").textContent = character.ability;
  const abilityArt = $("ability").querySelector("canvas");
  if (abilityArt.dataset.character !== character.id) {
    abilityArt.dataset.character = character.id;
    drawCurio(abilityArt.getContext("2d"), character.icon, 0, 0, 64);
  }
  iconText(
    $("health"),
    "heart",
    `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`,
    "#edaa99",
  );
  const teammates = state.players.filter((p) => p.id !== id);
  const squadKey = teammates
    .map((p) => `${p.id}:${p.name}:${p.dead}:${Math.ceil(p.hp)}`)
    .join("|");
  if ($("squad").dataset.roster !== squadKey) {
    $("squad").dataset.roster = squadKey;
    $("squad").replaceChildren(
      ...teammates.map((p) => {
        const label = document.createElement("span");
        label.append(
          document.createTextNode(
            `${p.name} ${p.dead ? "" : Math.ceil(p.hp)} `,
          ),
          pixelIcon(p.dead ? "cross" : "heart", 14, "#edaa99"),
        );
        return label;
      }),
    );
  }
  $("wave").textContent = `WAVE ${state.wave} / 8`;
  $("gallery-name").textContent = mapForWave(state.wave).name;
  $("clock").textContent =
    `${Math.max(0, Math.ceil((state.waveDuration || WAVE_DURATION) - state.waveTime))}s`;
  const boss = state.enemies.find((e) => e.type === "warden");
  $("boss-health").hidden = !boss;
  if (boss)
    iconText(
      $("boss-health"),
      "heart",
      `GRAND CLOCK · ${Math.ceil(boss.hp)}`,
      "#edaa99",
    );
  const castKey =
    device === "controller" ? "A" : device === "touch" ? "TAP" : "SPACE";
  // At the world edge the camera cannot keep staff away from the fixed HUD.
  // Feather the existing meter rather than covering the player's torso.
  const bodyX = p.x - renderer.camera.x + 320;
  const bodyY = p.y - 18 - renderer.camera.y + 180;
  const meterOverlap =
    Math.max(0, Math.min(1, (104 - Math.abs(bodyX - 320)) / 24)) *
    Math.max(0, Math.min(1, (bodyY - 292) / 15));
  $("ability").style.opacity = String(1 - 0.88 * meterOverlap);
  $("ability-label").textContent =
    p.castCooldown > 0
      ? `${character.ability.toUpperCase()} · ${p.castCooldown.toFixed(1)}s`
      : `${castKey} · ${character.ability.toUpperCase()}`;
  pixelMeter(
    $("ability-meter"),
    p.castCooldown > 0
      ? Math.floor(6 * (1 - p.castCooldown / (p.cooldownDuration || 5)))
      : 6,
    6,
  );
  $("downed").hidden = !p.dead;
  $("downed").textContent =
    `${p.revive ? `Being helped up ${Math.round(p.revive * 100)}%` : "A teammate can stand near you to help you up."}`;
  $("lesson").textContent = !lessonProgress.moved
    ? "Keep moving. Collect XP from defeated enemies."
    : !lessonProgress.cast
      ? `${castKey}: ${character.description} Hold to repeat.`
      : !(p.stats?.catches > 0)
        ? "Your special ability also clears red shots."
        : !(p.stats?.blooms > 0)
          ? "Stand near a supply cart to charge its healing pulse."
          : "";
}
function interpolated(now) {
  const interval = online ? 0.067 : 1 / 30;
  const lead = online ? Math.max(0, (now - receivedAt) / 1000) : accumulator;
  return presentState(previousState, state, {
    alpha: Math.min(1, lead / interval),
    leadSeconds: lead,
    maxLeadSeconds: interval,
    // Solo uses confirmed positions so releasing a key cannot snap back from a
    // speculative step. Online keeps its bounded local latency compensation.
    localId: online ? id : null,
    input: latestInput,
    paused: !online && (paused || screen !== "play"),
  });
}
function frame(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (paused) input(); // Keep controller menu polling alive while solo is paused.
  if (!paused && !online && screen === "play") {
    accumulator += dt;
    let i = accumulator >= 1 / 30 ? input() : null;
    while (accumulator >= 1 / 30) {
      previousState = capturePresentation(state);
      step(state, { [id]: i }, 1 / 30);
      i = { ...i, cast: false };
      accumulator -= 1 / 30;
    }
    updatePhase();
  }
  if (online && now - sendAt >= 1000 / 30) {
    sendAt = now;
    net?.sendInput(input());
  }
  renderState = interpolated(now);
  renderer.draw(
    renderState,
    id,
    screen === "menu" || screen === "lobby" ? now / 1000 : renderState.time,
    { reducedMotion: settings.motion, shake: !settings.motion },
  );
  if (now - uiAt > 100) {
    uiAt = now;
    if (screen === "play" || screen === "draft") updateHud();
    audio.update(state, id, { screen, paused: paused || document.hidden });
  }
  requestAnimationFrame(frame);
}
window.__threadwake = {
  get state() {
    return state;
  },
  get presentation() {
    return renderState;
  },
  get identity() {
    return id;
  },
  get screen() {
    return screen;
  },
  get online() {
    return online;
  },
  get renderer() {
    return renderer;
  },
};
updateMemoryCount();
requestAnimationFrame(frame);
const requested = new URL(location.href).searchParams.get("room");
if (requested && /^[a-zA-Z0-9_-]{6,64}$/.test(requested)) join(requested);
