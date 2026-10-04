import {
  createGame,
  addPlayer,
  step,
  startGame,
  chooseUpgrade,
  UPGRADES,
  upgradePreview,
} from "./sim.js";
import { createRenderer } from "./render.js";
import { connectRoom } from "./net.js";
import { AudioGarden } from "./audio.js";
import { setAnimationSettings } from "./animation.js";
import { MILESTONES, normalizeMemory, bankProgress } from "./progression.js";
import { WAVE_DURATION, WORLD } from "./config.js";
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
const lessonProgress = { moved: false, cast: false };
const glyphs = {
  fork: "⋔",
  needle: "↗",
  spark: "✦",
  orbit: "◉",
  echo: "◇",
  thread: "⌁",
  flower: "❋",
  heart: "♥",
  wing: "➶",
  snow: "❄",
  star: "✧",
};
const name = store.get("threadwake.name", "Weaver");
$("name").value = name;
audio.enabled = settings.sound;
audio.musicVolume = (settings.musicVolume ?? 65) / 100;
audio.effectsVolume = (settings.effectsVolume ?? 80) / 100;
$("music-volume").value = settings.musicVolume ?? 65;
$("effects-volume").value = settings.effectsVolume ?? 80;
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
  addPlayer(state, id, safeName(), memory.traits);
  startGame(state);
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
  bank();
  if (state.phase !== phase) {
    phase = state.phase;
    if (phase === "playing") {
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
    glyph.textContent = glyphs[u.icon] || "✦";
    const title = document.createElement("strong");
    const player = state.players.find((p) => p.id === id);
    const rank = player?.upgrades.filter((v) => v === u.id).length || 0;
    title.textContent = `${u.name} · ${rank + 1}`;
    const desc = document.createElement("small");
    const preview = upgradePreview(player, u.id);
    desc.textContent = `${preview.before} → ${preview.after}. ${preview.synergy}`;
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
function bank() {
  const result = bankProgress(
    memory,
    state,
    state.players.find((p) => p.id === id),
  );
  if (result.changed) {
    store.set("threadwake.memories", memory);
    if (result.newMilestones.length)
      toast(
        `${result.newMilestones.join(" · ")} · +${result.newMilestones.length} memory`,
      );
  }
  return result.runEarned;
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
  const earned = bank();
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
  $("run-invite").hidden = !online;
  $("connection-health").hidden = !online;
  $("connection-health").textContent =
    latency == null ? status : `${status} · ${Math.round(latency)} ms`;
  const player = state.players.find((p) => p.id === id);
  $("loadout").hidden = screen === "menu" || !player?.upgrades.length;
  $("loadout").replaceChildren(
    ...[...new Set(player?.upgrades || [])].map((value) => {
      const el = document.createElement("span"),
        u = upgradeById(value);
      el.textContent = `${glyphs[u.icon] || "✦"} ${u.name} · ${player.upgrades.filter((v) => v === value).length}`;
      return el;
    }),
  );
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
  $("milestones").replaceChildren(
    ...MILESTONES.map((m) => {
      const el = document.createElement("p");
      el.textContent = `${memory.milestones.includes(m.id) ? "◆" : "◇"} ${m.name} · ${m.description}`;
      return el;
    }),
  );
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
for (const kind of ["music", "effects"])
  $(kind + "-volume").oninput = () => {
    settings[kind + "Volume"] = Number($(kind + "-volume").value);
    audio[kind + "Volume"] = settings[kind + "Volume"] / 100;
    audio.unlock();
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
    dx = (e.clientX - r.left - r.width / 2) / 40,
    dy = (e.clientY - r.top - r.height / 2) / 40,
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
      if ($("options").open) closeOptions();
      else options();
    }
    padPause = menu;
  } else {
    padCast = false;
    padPause = false;
  }
  if ($("options").open || screen !== "play")
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
  $("health").textContent = `♥ ${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
  $("squad").textContent = state.players
    .filter((p) => p.id !== id)
    .map((p) => `${p.name} ${p.dead ? "✧" : Math.ceil(p.hp) + "♥"}`)
    .join("  ");
  $("wave").textContent = `WAVE ${state.wave} / 8`;
  $("clock").textContent =
    `${Math.max(0, Math.ceil(WAVE_DURATION - state.waveTime))}s`;
  const boss = state.enemies.find((e) => e.type === "warden");
  $("boss-health").hidden = !boss;
  if (boss) $("boss-health").textContent = `UNRAVELER · ${Math.ceil(boss.hp)}♥`;
  const castKey =
    device === "controller" ? "A" : device === "touch" ? "TAP" : "SPACE";
  $("ability-label").textContent =
    p.castCooldown > 0
      ? `UNWIND · ${p.castCooldown.toFixed(1)}s`
      : `${castKey} · UNWIND`;
  $("ability-meter").textContent =
    p.castCooldown > 0
      ? "◆".repeat(
          Math.max(
            0,
            Math.floor(6 * (1 - p.castCooldown / (p.cooldownDuration || 5.5))),
          ),
        ) +
        "◇".repeat(
          Math.min(
            6,
            Math.ceil((6 * p.castCooldown) / (p.cooldownDuration || 5.5)),
          ),
        )
      : "◆ ◆ ◆ ◆ ◆ ◆";
  $("downed").hidden = !p.dead;
  $("downed").textContent =
    `${p.revive ? `Mending ${Math.round(p.revive * 100)}%` : "Stay close to a friend to mend."}`;
  $("lesson").textContent = !lessonProgress.moved
    ? "Keep moving. Your needle finds the nearest foe."
    : !lessonProgress.cast
      ? `${castKey} unwinds your footsteps into an echo. Hold to cast when ready.`
      : !(p.stats?.catches > 0)
        ? "Catch red shots on the thread between you and your echo."
        : !(p.stats?.blooms > 0)
          ? "Hold your thread over flowers to charge them. Catches help them bloom."
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
    players: interpolate(state.players, previousState.players).map((p) => {
      if (p.id !== id || p.dead || $("options").open) return p;
      const actual = state.players.find((q) => q.id === id),
        dt = Math.min(0.067, Math.max(0, (now - receivedAt) / 1000));
      return {
        ...p,
        x: Math.max(
          16,
          Math.min(
            WORLD.width - 16,
            actual.x + latestInput.x * actual.speed * dt,
          ),
        ),
        y: Math.max(
          16,
          Math.min(
            WORLD.height - 16,
            actual.y + latestInput.y * actual.speed * dt,
          ),
        ),
      };
    }),
    enemies: interpolate(state.enemies, previousState.enemies),
    echoes: interpolate(state.echoes, previousState.echoes),
    shots: interpolate(state.shots, previousState.shots),
  };
}
function frame(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (paused) input(); // Keep controller menu polling alive while solo is paused.
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
    audio.update(state, id);
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
