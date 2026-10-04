import {
  createGame,
  addPlayer,
  step,
  startGame,
  chooseUpgrade,
  UPGRADES,
} from "./sim.js";
import { createRenderer } from "./render.js";
import { connectRoom } from "./net.js";
import { AudioGarden } from "./audio.js";
import { setAnimationSettings } from "./animation.js";
const $ = (id) => document.getElementById(id),
  canvas = $("world"),
  renderer = createRenderer(canvas),
  audio = new AudioGarden();
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
setAnimationSettings(store.get("threadwake.motion", {}));
window.addEventListener("storage", (e) => {
  if (e.key === "threadwake.motion")
    setAnimationSettings(store.get("threadwake.motion", {}));
});
let settings = store.get("threadwake.settings", {
  sound: true,
  motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
let memory = store.get("threadwake.memories", {
  balance: 0,
  traits: { vitality: 0, haste: 0, echo: 0 },
  runs: 0,
  best: 0,
});
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
  runAwarded = false,
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
const name = store.get("threadwake.name", "Weaver");
$("name").value = name;
audio.enabled = settings.sound;
$("sound").checked = settings.sound;
$("motion").checked = settings.motion;
addPlayer(state, id, name);
const demo = state.players[0];
demo.x = 600;
demo.y = 420;
function show(which) {
  screen = which;
  for (const s of ["menu", "lobby", "draft", "result"])
    $(s).hidden = s !== which;
  $("hud").hidden = !["play", "draft"].includes(which);
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
  const n = $("name").value.trim().slice(0, 16) || "Weaver";
  store.set("threadwake.name", n);
  return n;
}
function resetInputs() {
  keys.clear();
  touch = { x: 0, y: 0 };
  castPending = false;
  if (net) net.sendInput({ x: 0, y: 0, cast: false });
}
function startSolo() {
  roomGeneration++;
  audio.reset();
  net?.close();
  net = null;
  online = false;
  $("network-status").hidden = true;
  id = "solo";
  state = createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
  addPlayer(state, id, safeName(), memory.traits);
  startGame(state);
  runAwarded = false;
  phase = "";
  paused = false;
  accumulator = 0;
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
  phase = "";
  runAwarded = false;
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
                ? detail || "Could not join this grove. Try again."
                : "Connecting…";
        if (value === "error") toast(detail || "Connection failed.");
        updateLobby();
      },
      onState(next) {
        if (generation !== roomGeneration) return;
        previousState = state;
        state = next;
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
      el.textContent = `${p.name}${p.id === id ? " · you" : ""}${p.id === state.hostId ? " · keeper" : ""}`;
      return el;
    }),
  );
  $("begin").disabled = !identityReady || status !== "connected" || !host();
  $("begin").textContent = host()
    ? "Enter the grove"
    : "Waiting for the keeper";
}
function updatePhase() {
  if (state.phase !== phase) {
    phase = state.phase;
    if (phase === "playing") {
      if (screen === "lobby" || screen === "result") runAwarded = false;
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
    $("again").textContent = host() ? "Weave again" : "Waiting for the keeper";
  }
  if (phase === "draft") updateDraft();
}
function upgradeById(value) {
  return Array.isArray(UPGRADES)
    ? UPGRADES.find((u) => u.id === value)
    : UPGRADES[value];
}
function updateDraft() {
  const choices = state.choices?.[id] || [];
  const signature = JSON.stringify(choices);
  if (signature === draftSignature) return;
  draftSignature = signature;
  $("choices").replaceChildren();
  $("draft-caption").textContent = `Wave ${state.wave} survived`;
  $("draft-status").textContent = choices.length
    ? ""
    : "Waiting for the others…";
  choices.forEach((value, i) => {
    const u = upgradeById(typeof value === "string" ? value : value.id);
    if (!u) return;
    const b = document.createElement("button");
    b.className = "upgrade";
    const glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.textContent = ["✦", "⌁", "❋"][i];
    const title = document.createElement("strong");
    title.textContent = u.name;
    const desc = document.createElement("small");
    desc.textContent = u.description;
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
    toast("Reconnect to choose a thread.");
    return;
  }
  audio.click();
  if (online) net?.choose(value);
  else {
    chooseUpgrade(state, id, value);
    updatePhase();
  }
  if (online) {
    $("draft-status").textContent = "Choosing…";
  }
}
function award() {
  if (runAwarded) return 0;
  runAwarded = true;
  const key = `${state.seed}:${state.runNumber || 0}:${id}`;
  memory.awards ??= [];
  if (memory.awards.includes(key)) return 0;
  memory.awards.push(key);
  memory.awards = memory.awards.slice(-32);
  const earned = Math.max(
    0,
    Math.floor(((state.wave || 1) - 1) / 2) + (state.phase === "won" ? 3 : 0),
  );
  memory.balance += earned;
  memory.runs++;
  memory.best = Math.max(memory.best, state.wave || 1);
  store.set("threadwake.memories", memory);
  return earned;
}
function showResult() {
  show("result");
  resetInputs();
  const won = state.phase === "won";
  $("result-caption").textContent = won
    ? "The garden remembers"
    : "A thread is never truly lost";
  $("result-title").textContent = won
    ? "Morning, at last."
    : "Until the next dawn.";
  $("result-stats").textContent =
    `${state.kills || 0} unmade · ${state.caught || 0} shots woven · wave ${state.wave}`;
  const earned = award();
  $("result-memory").hidden = earned === 0;
  $("result-memory").textContent = `+${earned} memories`;
  $("again").disabled = !host();
  $("again").textContent = host() ? "Weave again" : "Waiting for the keeper";
}
function backHome() {
  roomGeneration++;
  net?.close();
  net = null;
  online = false;
  paused = false;
  resetInputs();
  $("options").close();
  state = createGame(77);
  id = "solo";
  addPlayer(state, id, safeName());
  phase = "lobby";
  show("menu");
  history.replaceState({}, "", location.pathname);
  updateMemoryCount();
}
function options() {
  if ($("options").open) return;
  paused = !online;
  resetInputs();
  $("options-title").textContent =
    screen === "menu" ? "Options" : online ? "In the grove" : "Paused";
  $("quit").hidden = screen === "menu";
  $("online-pause").hidden = !online;
  $("options").showModal();
}
function closeOptions() {
  paused = false;
  last = performance.now();
  $("options").close();
}
function updateMemoryCount() {
  $("memory-count").textContent = memory.balance ? `· ${memory.balance}` : "";
}
function memories() {
  updateMemoryCount();
  $("memory-balance").textContent = `${memory.balance} memories to plant`;
  $("talents").replaceChildren();
  const data = [
    ["vitality", "Root", "+4 health per rank"],
    ["haste", "Leaf", "+2% movement per rank"],
    ["echo", "Spool", "2% faster unwind per rank"],
  ];
  for (const [key, title, desc] of data) {
    const rank = memory.traits[key],
      cost = rank + 1,
      b = document.createElement("button");
    b.textContent = `${title}  ${"◆".repeat(rank)}${"◇".repeat(3 - rank)}${rank < 3 ? ` · ${cost} memories` : ""}`;
    const s = document.createElement("small");
    s.textContent = desc;
    b.append(s);
    b.disabled = rank >= 3 || memory.balance < cost;
    b.onclick = () => {
      memory.balance -= cost;
      memory.traits[key]++;
      store.set("threadwake.memories", memory);
      audio.click();
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
$("home").onclick = backHome;
$("again").onclick = () => {
  if (online) {
    runAwarded = false;
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
$("close-memories").onclick = () => $("memories").close();
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
$("name").onchange = () => {
  const name = safeName();
  net?.rename?.(name);
};
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
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
  if (document.hidden) resetInputs();
});
canvas.addEventListener("pointerdown", () => {
  if (screen === "play" && !$("options").open) {
    castPending = true;
    audio.unlock();
  }
});
const stick = $("stick");
let stickId = null;
function stickMove(e) {
  if (e.pointerId !== stickId) return;
  const r = stick.getBoundingClientRect(),
    dx = (e.clientX - r.left - r.width / 2) / 40,
    dy = (e.clientY - r.top - r.height / 2) / 40,
    d = Math.max(1, Math.hypot(dx, dy));
  touch = { x: dx / d, y: dy / d };
  stick.firstElementChild.style.transform = `translate(${touch.x * 32}px,${touch.y * 32}px)`;
}
stick.onpointerdown = (e) => {
  stickId = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  stickMove(e);
  audio.unlock();
};
stick.onpointermove = stickMove;
stick.onpointerup = stick.onpointercancel = () => {
  stickId = null;
  touch = { x: 0, y: 0 };
  stick.firstElementChild.style.transform = "";
};
$("touch-cast").onpointerdown = (e) => {
  e.preventDefault();
  castPending = true;
  audio.unlock();
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
  const pad = navigator.getGamepads?.()[0];
  if (pad) {
    if (Math.abs(pad.axes[0]) > 0.18) x += pad.axes[0];
    if (Math.abs(pad.axes[1]) > 0.18) y += pad.axes[1];
    const pressed = pad.buttons[0]?.pressed;
    if (pressed && !padCast) castPending = true;
    padCast = pressed;
  }
  if ($("options").open || screen !== "play")
    return { x: 0, y: 0, cast: false };
  const d = Math.max(1, Math.hypot(x, y)),
    out = { x: x / d, y: y / d, cast: castPending };
  castPending = false;
  return out;
}
function updateHud() {
  const p = state.players.find((p) => p.id === id);
  if (!p) return;
  $("health").textContent = `♥ ${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
  $("squad").textContent = state.players
    .filter((p) => p.id !== id)
    .map((p) => `${p.name} ${p.dead ? "✧" : Math.ceil(p.hp) + "♥"}`)
    .join("  ");
  $("wave").textContent = `WAVE ${state.wave} / 8`;
  $("clock").textContent =
    `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, "0")}`;
  $("ability-label").textContent =
    p.castCooldown > 0
      ? `UNWIND · ${p.castCooldown.toFixed(1)}s`
      : "SPACE · UNWIND";
  $("ability-meter").textContent =
    p.castCooldown > 0
      ? "◇".repeat(Math.max(1, Math.ceil(p.castCooldown)))
      : "◆ ◆ ◆ ◆ ◆ ◆";
  $("downed").hidden = !p.dead;
  $("downed").textContent =
    `${p.revive ? `Mending ${Math.round(p.revive * 100)}%` : "Stay close to a friend to mend."}`;
  const t = state.time;
  $("lesson").textContent =
    t < 8
      ? "Keep moving. Your needle finds the nearest foe."
      : t < 17
        ? "SPACE unwinds your footsteps into an echo."
        : t < 29
          ? "Catch red shots on the thread between you and your echo."
          : t < 41
            ? "Sweep your thread over charged flowers to make them bloom."
            : "";
}
function interpolated(now) {
  if (!online || !previousState || state.phase !== "playing") return state;
  const a = Math.min(1, (now - receivedAt) / 67);
  const interpolate = (list, old) =>
    list.map((p) => {
      const q = old?.find((q) => q.id === p.id);
      return q
        ? { ...p, x: q.x + (p.x - q.x) * a, y: q.y + (p.y - q.y) * a }
        : p;
    });
  return {
    ...state,
    players: interpolate(state.players, previousState.players),
    enemies: interpolate(state.enemies, previousState.enemies),
    echoes: interpolate(state.echoes, previousState.echoes),
    shots: interpolate(state.shots, previousState.shots),
  };
}
function frame(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (!paused && !online && screen === "play") {
    accumulator += dt;
    let i = accumulator >= 1 / 30 ? input() : null;
    while (accumulator >= 1 / 30) {
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
    screen === "menu" || screen === "lobby" ? now / 1000 : state.time,
    { reducedMotion: settings.motion, shake: !settings.motion },
  );
  if (now - uiAt > 100) {
    uiAt = now;
    if (screen === "play") updateHud();
    audio.update(state);
  }
  requestAnimationFrame(frame);
}
window.__threadwake = {
  get state() {
    return state;
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
