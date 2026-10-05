import { drawActor, drawCombatGeometry } from "./art.js";
import {
  ANIMATION_DEFAULTS,
  ACTION_PHASES,
  setAnimationSettings,
  pose,
} from "./animation.js";
import { createRenderer } from "./render.js";
import { initializePixelIcons, pixelLine, pixelText } from "./pixel-ui.js";
const REPLAY_VERSION = 8;
import {
  createGame,
  addPlayer,
  startGame,
  step,
  chooseUpgrade,
  UPGRADES,
} from "./sim.js";

const $ = (id) => document.getElementById(id);
initializePixelIcons();
const canvas = $("preview"),
  ctx = canvas.getContext("2d"),
  sheet = $("sheet"),
  sc = sheet.getContext("2d");
const curve = $("curves"),
  cc = curve.getContext("2d");
// Authoring previews use the same half-unit raster as the live game.
for (const preview of [canvas, sheet]) {
  preview.width *= 2;
  preview.height *= 2;
  const context = preview.getContext("2d");
  context.scale(2, 2);
  context._pixelRatio = 2;
  context.imageSmoothingEnabled = false;
}
const phaseKeys = ACTION_PHASES;
const ranges = {
  fps: [4, 24, 1, "Pose rate"],
  stride: [0, 16, 0.5, "Stride"],
  bob: [0, 3, 0.1, "Bob"],
  scarf: [0, 3, 0.1, "Apron follow"],
  idle: [0, 3, 0.1, "Breathing"],
  hitFlash: [0, 1, 0.1, "Hit flash"],
  ...Object.fromEntries(
    phaseKeys.map((k) => [
      k,
      [0.02, 0.6, 0.01, k[0].toUpperCase() + k.slice(1) + " · s"],
    ]),
  ),
};
let settings = { ...ANIMATION_DEFAULTS },
  running = true,
  time = 0,
  last = 0,
  mode = "motion";
try {
  const saved = JSON.parse(localStorage.getItem("afterhours.motion"));
  for (const k in settings)
    if (Number.isFinite(saved?.[k]))
      settings[k] = Math.max(
        ranges[k]?.[0] ?? 0,
        Math.min(ranges[k]?.[1] ?? 20, saved[k]),
      );
} catch {}
const duration = (s = settings) =>
  $("pose").value === "cast"
    ? phaseKeys.reduce((n, k) => n + (s[k] || 0), 0) || 0.82
    : 2;
function save() {
  setAnimationSettings(settings);
  try {
    localStorage.setItem("afterhours.motion", JSON.stringify(settings));
  } catch {}
  $("timeline").max = duration();
  time %= duration();
  drawSheet();
  drawPhases();
}
function controls() {
  $("sliders").replaceChildren();
  for (const [key, [min, max, step, label]] of Object.entries(ranges)) {
    if (!(key in settings)) continue;
    const row = document.createElement("div");
    row.className = "parameter";
    const l = document.createElement("label"),
      span = document.createElement("span"),
      out = document.createElement("output");
    span.textContent = label;
    out.textContent = settings[key];
    const input = document.createElement("input");
    Object.assign(input, {
      type: "range",
      min,
      max,
      step,
      value: settings[key],
      id: `param-${key}`,
    });
    l.htmlFor = input.id;
    l.append(span, out);
    input.oninput = () => {
      settings[key] = Number(input.value);
      out.textContent = input.value;
      save();
    };
    row.append(l, input);
    $("sliders").append(row);
  }
}
function actor(t = time) {
  const direction = $("direction").value,
    moving = $("pose").value === "run";
  return {
    id: "preview",
    type: $("subject").value === "player" ? undefined : $("subject").value,
    x: 0,
    y: 0,
    vx: moving && !["up", "down"].includes(direction) ? 100 : 0,
    vy:
      direction === "up" && moving
        ? -100
        : direction === "down" && moving
          ? 100
          : 0,
    color: Number($("palette").value),
    face: direction === "left" ? -1 : 1,
    aimX: direction === "left" ? -1 : direction === "right" ? 1 : 0,
    aimY: direction === "up" ? -1 : direction === "down" ? 1 : 0,
    shotAge: $("pose").value === "fire" ? t % 0.65 : 999,
    hp: 100,
    maxHp: 100,
    hit: $("pose").value === "hit" ? 0.2 : 0,
    castAge: 999,
    castCooldown: 0,
    upgrades: [],
    phase: t,
  };
}
function rig(s, t) {
  return {
    ...s,
    back: $("direction").value === "up",
    state: $("pose").value,
    ...($("pose").value === "cast" ? { actionTime: t } : {}),
  };
}
function paint(context, x, y, scale, t, s = settings) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  drawActor(context, actor(t), t, rig(s, t));
  if ($("geometry").checked) drawCombatGeometry(context, actor(t));
  context.restore();
}
function drawSheet() {
  sc.imageSmoothingEnabled = false;
  sc.fillStyle = "#192532";
  sc.fillRect(0, 0, 800, 160);
  for (let i = 0; i < 8; i++) {
    sc.fillStyle = "#24313e";
    sc.fillRect(i * 100 + 2, 2, 96, 156);
    const t = (i / 8) * duration();
    paint(sc, i * 100 + 50, 118, 3, t);
    sc.font = "13px monospace";
    sc.fillStyle = "#c4c5c2";
    pixelText(sc, `${t.toFixed(2)}s`, i * 100 + 8, 139, 1);
  }
}
function drawPhases() {
  $("phases").replaceChildren();
  $("phases").hidden = $("pose").value !== "cast";
  if ($("pose").value !== "cast") return;
  let cursor = 0;
  for (const key of phaseKeys) {
    const b = document.createElement("button");
    b.textContent = key;
    b.style.flexGrow = settings[key] || 0.1;
    const start = cursor;
    b.onclick = () => {
      running = false;
      $("play").textContent = "Play";
      time = start;
      draw();
    };
    b.dataset.phase = key;
    $("phases").append(b);
    cursor += settings[key] || 0;
  }
}
function drawCurves() {
  const end = duration(),
    isCast = $("pose").value === "cast";
  cc.fillStyle = "#192532";
  cc.fillRect(0, 0, 800, 150);
  cc.fillStyle = "#354452";
  for (let i = 1; i < 6; i++) {
    cc.fillRect(0, i * 25, 800, 1);
  }
  const keys = isCast ? ["lift", "lean", "stretch"] : ["bob", "step", "scarf"];
  const colors = ["#dfc37d", "#86c8b6", "#c69cb6"];
  const samples = [settings, ANIMATION_DEFAULTS].map((s) =>
    Array.from({ length: 161 }, (_, i) =>
      pose(actor((i / 160) * end), (i / 160) * end, rig(s, (i / 160) * end)),
    ),
  );
  keys.forEach((key, index) => {
    const neutral = 0;
    const max = Math.max(
      1,
      ...samples.flat().map((p) => Math.abs((Number(p[key]) || 0) - neutral)),
    );
    samples.forEach((poses, base) => {
      if (base && !$("compare").checked) return;
      cc.globalAlpha = base ? 0.35 : 1;
      let previous = null;
      poses.forEach((p, i) => {
        const x = i * 5,
          y = 75 - (((Number(p[key]) || 0) - neutral) / max) * 59;
        if (previous)
          pixelLine(
            cc,
            previous.x,
            previous.y,
            x,
            y,
            colors[index],
            base ? 1 : 2,
            !!base,
          );
        previous = { x, y };
      });
    });
  });
  cc.globalAlpha = 1;
  cc.fillStyle = "#f0dfb9";
  cc.fillRect(Math.round((time / end) * 800), 0, 1, 150);
}
function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#192532";
  ctx.fillRect(0, 0, 640, 280);
  ctx.fillStyle = "#263441";
  ctx.fillRect(0, 212, 640, 68);
  if ($("grid").checked) {
    ctx.fillStyle = "#354452";
    for (let x = 0; x < 640; x += 5) {
      ctx.fillRect(x, 0, 1, 280);
    }
    for (let y = 0; y < 280; y += 5) {
      ctx.fillRect(0, y, 640, 1);
    }
  }
  const compare = $("compare").checked;
  if (compare) {
    paint(ctx, 160, 225, 5, time, ANIMATION_DEFAULTS);
    paint(ctx, 480, 225, 5, time);
    ctx.fillStyle = "#f3e6c8";
    ctx.font = "14px monospace";
    pixelText(ctx, "DEFAULTS", 18, 12, 2);
    pixelText(ctx, "CURRENT", 338, 12, 2);
  } else paint(ctx, 320, 225, 5, time);
  $("time").value = `${time.toFixed(2)}s`;
  $("timeline").value = time;
  const p = pose(actor(), time, rig(settings, time));
  $("phase-name").value = $("pose").value === "cast" ? p.phase || "" : "";
  for (const b of $("phases").children)
    b.setAttribute("aria-pressed", String(b.dataset.phase === p.phase));
  drawCurves();
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("play").onclick = () => {
  running = !running;
  $("play").textContent = running ? "Pause" : "Play";
};
$("step").onclick = () => {
  running = false;
  $("play").textContent = "Play";
  time = (time + 1 / settings.fps) % duration();
  draw();
};
$("timeline").oninput = () => {
  running = false;
  $("play").textContent = "Play";
  time = Number($("timeline").value);
  draw();
};
$("reset").onclick = () => {
  settings = { ...ANIMATION_DEFAULTS };
  controls();
  save();
};
for (const key of ["subject", "pose", "palette", "direction"])
  $(key).onchange = save;
$("export").onclick = () =>
  download(
    new Blob(
      [
        JSON.stringify(
          { schema: "afterhours.motion.v1", animation: settings },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    "afterhours-motion.json",
  );
$("sheet-export").onclick = () => {
  drawSheet();
  sheet.toBlob((b) => download(b, "afterhours-poses.png"));
};
$("import").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file || file.size > 10000)
      throw new Error("Choose a motion preset under 10 KB.");
    const data = JSON.parse(await file.text());
    if (data.schema !== "afterhours.motion.v1")
      throw new Error("This is not a After Hours motion preset.");
    const next = { ...ANIMATION_DEFAULTS };
    for (const [k, [min, max]] of Object.entries(ranges)) {
      if (!(k in next) || data.animation?.[k] === undefined) continue;
      const v = data.animation[k];
      if (!Number.isFinite(v) || v < min || v > max)
        throw new Error(`Invalid ${k} value.`);
      next[k] = v;
    }
    settings = next;
    controls();
    save();
    $("lab-status").textContent = "Preset loaded.";
  } catch (err) {
    $("lab-status").textContent = err.message;
  } finally {
    e.target.value = "";
  }
};

// Encounter takes contain initial conditions and inputs, never mutated world snapshots.
const renderer = createRenderer($("encounter"));
const keys = new Set();
let encounter,
  config,
  take = [],
  playing = true,
  replaying = false,
  replayIndex = 0,
  accumulator = 0;
const MAX_TICKS = 54000;
for (const u of UPGRADES) {
  const o = document.createElement("option");
  o.value = u.id;
  o.textContent = u.name;
  o.title = u.description;
  $("build").append(o);
}
function readConfig() {
  return {
    seed: Number($("seed").value) >>> 0,
    wave: Math.min(
      $("scenario").value === "wave" ? 8 : 7,
      Number($("wave").value),
    ),
    scenario: $("scenario").value,
    invincible: $("invincible").checked,
    upgrades: [...$("build").selectedOptions].map((o) => o.value),
  };
}
function initialize(c) {
  const s = createGame(c.seed);
  addPlayer(s, "lab", "Custodian");
  startGame(s);
  const p = s.players[0];
  if (c.wave > 1) {
    s.wave = c.wave - 1;
    s.phase = "draft";
    s.choices.lab = ["quick"];
    chooseUpgrade(s, "lab", "quick");
  }
  p.upgrades = [...c.upgrades];
  p.maxHp = 110 + 30 * c.upgrades.filter((id) => id === "vitality").length;
  p.hp = p.maxHp;
  if (c.scenario !== "wave") {
    s.enemies = [];
    s._spawn = 1e9;
    s._flower = 1e9;
    const n = c.scenario === "melee" ? 14 : c.scenario === "barrage" ? 8 : 4;
    const type =
      c.scenario === "melee"
        ? "mite"
        : c.scenario === "thorns"
          ? "thorn"
          : "moth";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        r = c.scenario === "garden" ? 255 : 230;
      const hp = type === "mite" ? 55 : 100;
      s.enemies.push({
        id: ++s._id,
        type,
        x: 600 + Math.cos(a) * r,
        y: 400 + Math.sin(a) * r,
        hp,
        maxHp: hp,
        r: 10,
        hit: 0,
        phase: a,
        face: 1,
        _fire: 0.8 + i * 0.17,
        _touch: 0,
        slow: 0,
      });
    }
    if (["garden", "resonance"].includes(c.scenario))
      s.flowers = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return {
          id: ++s._id,
          x: 600 + Math.cos(a) * 110,
          y: 400 + Math.sin(a) * 110,
          kind: "supply",
          charge: i / 8,
          life: 600,
        };
      });
    if (c.scenario === "resonance") {
      const ally = addPlayer(s, "partner", "Partner");
      ally.x = 600;
      ally.y = 300;
      ally.invulnerable = 1000;
    }
  }
  return s;
}
function resetEncounter(replay = false) {
  if (!replay) {
    config = readConfig();
    take = [];
  }
  encounter = initialize(config);
  replaying = replay;
  replayIndex = 0;
  playing = true;
  accumulator = 0;
  keys.clear();
  $("encounter-play").textContent = "Pause";
  $("take-status").textContent = replay
    ? "Replaying take."
    : "Recording inputs.";
  $("encounter-choices").replaceChildren();
  if (mode === "encounter") $("encounter").focus({ preventScroll: true });
}
function applyChoice(id) {
  if (chooseUpgrade(encounter, "lab", id)) {
    if (!replaying) take.push({ choice: id });
    $("encounter-choices").replaceChildren();
  }
}
function encounterTick() {
  if (replaying) {
    while (take[replayIndex]?.choice) {
      applyChoice(take[replayIndex++].choice);
    }
    if (replayIndex >= take.length) {
      playing = false;
      $("encounter-play").textContent = "Play";
      $("take-status").textContent =
        `Replay complete · ${encounter.tick} ticks`;
      return;
    }
  }
  if (encounter.phase !== "playing") return;
  let input;
  if (replaying) {
    const v = take[replayIndex++].input;
    input = { x: v[0], y: v[1], cast: v[2] === 1 };
  } else {
    input = {
      x:
        Number(keys.has("KeyD") || keys.has("ArrowRight")) -
        Number(keys.has("KeyA") || keys.has("ArrowLeft")),
      y:
        Number(keys.has("KeyS") || keys.has("ArrowDown")) -
        Number(keys.has("KeyW") || keys.has("ArrowUp")),
      cast: keys.has("Space"),
    };
    if (take.length >= MAX_TICKS) {
      playing = false;
      $("take-status").textContent = "Take full · export or reset.";
      return;
    }
    take.push({ input: [input.x, input.y, Number(input.cast)] });
  }
  if (config.invincible) encounter.players[0].invulnerable = 1;
  if (config.scenario !== "wave") {
    encounter.waveTime = 0;
    for (const f of encounter.flowers) f.life = Math.max(f.life, 10);
  }
  const partner =
    config.scenario === "resonance"
      ? {
          x: 0,
          y: Math.sin(encounter.time * 0.6),
          cast: encounter.tick % 180 === 0,
        }
      : null;
  step(encounter, { lab: input, ...(partner ? { partner } : {}) });
  if (
    config.scenario !== "wave" &&
    !encounter.enemies.length &&
    encounter.phase === "playing"
  )
    encounter.phase = "won";
}
function drawEncounter() {
  renderer.draw(encounter, "lab", encounter.time, {
    animation: settings,
    shake: false,
    hitboxes: $("encounter-geometry").checked,
  });
  const p = encounter.players[0];
  $("encounter-status").value =
    `${replaying ? "Replay" : "Live"} · ${encounter.time.toFixed(1)}s · HP ${Math.ceil(p.hp)}/${p.maxHp} · ${encounter.caught} shots cleared · ${p.stats?.blooms || 0} supplies · ${p.stats?.resonances || 0} assists · ${encounter.phase}`;
  if (
    encounter.phase === "draft" &&
    !$("encounter-choices").children.length &&
    !replaying
  )
    for (const id of encounter.choices.lab || []) {
      const u = UPGRADES.find((u) => u.id === id),
        b = document.createElement("button");
      b.textContent = u.name;
      b.title = u.description;
      b.onclick = () => applyChoice(id);
      $("encounter-choices").append(b);
    }
}
function switchTab(next) {
  mode = next;
  $("motion-panel").hidden = next !== "motion";
  $("encounter-panel").hidden = next !== "encounter";
  $("motion-tab").setAttribute("aria-pressed", String(next === "motion"));
  $("encounter-tab").setAttribute("aria-pressed", String(next === "encounter"));
  accumulator = 0;
  keys.clear();
  if (next === "encounter") $("encounter").focus({ preventScroll: true });
}
$("motion-tab").onclick = () => switchTab("motion");
$("encounter-tab").onclick = () => switchTab("encounter");
$("encounter-reset").onclick = () => resetEncounter();
$("encounter-play").onclick = () => {
  playing = !playing;
  $("encounter-play").textContent = playing ? "Pause" : "Play";
  $("encounter").focus({ preventScroll: true });
};
$("encounter-step").onclick = () => {
  playing = false;
  $("encounter-play").textContent = "Play";
  encounterTick();
  drawEncounter();
};
$("replay").onclick = () => {
  if (take.length) resetEncounter(true);
  else $("take-status").textContent = "Play an encounter to record a take.";
};
$("replay-export").onclick = () => {
  if (!take.length) {
    $("take-status").textContent = "Play an encounter to record a take.";
    return;
  }
  download(
    new Blob(
      [
        JSON.stringify({
          schema: "afterhours.take.v1",
          simulationVersion: REPLAY_VERSION,
          config,
          animation: settings,
          frames: take,
        }),
      ],
      { type: "application/json" },
    ),
    `afterhours-take-${config.seed}.json`,
  );
};
$("replay-import").onchange = async (event) => {
  try {
    const file = event.target.files[0];
    if (!file || file.size > 4e6) throw new Error("Choose a take under 4 MB.");
    const data = JSON.parse(await file.text()),
      c = data.config;
    if (
      data.schema !== "afterhours.take.v1" ||
      data.simulationVersion !== REPLAY_VERSION ||
      !c ||
      !Number.isInteger(c.seed) ||
      c.seed < 0 ||
      c.seed > 4294967295 ||
      !Number.isInteger(c.wave) ||
      c.wave < 1 ||
      c.wave > (c.scenario === "wave" ? 8 : 7) ||
      !["wave", "melee", "barrage", "garden", "thorns", "resonance"].includes(
        c.scenario,
      ) ||
      typeof c.invincible !== "boolean" ||
      !Array.isArray(c.upgrades) ||
      c.upgrades.length > 16 ||
      c.upgrades.some((id) => !UPGRADES.some((u) => u.id === id)) ||
      !Array.isArray(data.frames) ||
      data.frames.length > MAX_TICKS ||
      !data.frames.length
    )
      throw new Error("Invalid After Hours take.");
    for (const f of data.frames)
      if (
        !(
          typeof f.choice === "string" &&
          UPGRADES.some((u) => u.id === f.choice)
        ) &&
        !(
          Array.isArray(f.input) &&
          f.input.length === 3 &&
          [-1, 0, 1].includes(f.input[0]) &&
          [-1, 0, 1].includes(f.input[1]) &&
          [0, 1].includes(f.input[2])
        )
      )
        throw new Error("Invalid input in take.");
    config = { ...c, upgrades: [...c.upgrades] };
    take = data.frames;
    $("seed").value = c.seed;
    $("wave").value = c.wave;
    $("scenario").value = c.scenario;
    $("invincible").checked = c.invincible;
    for (const o of $("build").options)
      o.selected = c.upgrades.includes(o.value);
    resetEncounter(true);
  } catch (err) {
    $("take-status").textContent = err.message;
  } finally {
    event.target.value = "";
  }
};
window.addEventListener("keydown", (e) => {
  if (mode !== "encounter" || document.activeElement !== $("encounter")) return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
$("encounter").addEventListener("pointerdown", () =>
  $("encounter").focus({ preventScroll: true }),
);
for (const id of ["seed", "wave", "scenario", "build", "invincible"])
  $(id).onchange = () => {
    $("wave").options[7].disabled = $("scenario").value !== "wave";
    if ($("scenario").value !== "wave" && $("wave").value === "8")
      $("wave").value = "7";
    $("take-status").textContent = "Start / reset to apply changes.";
  };
function frame(now) {
  const elapsed = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (mode === "motion") {
    if (running)
      time = (time + elapsed * Number($("speed").value)) % duration();
    draw();
  } else {
    if (playing) {
      accumulator += elapsed;
      while (accumulator >= 1 / 30 && playing) {
        encounterTick();
        accumulator -= 1 / 30;
      }
    }
    drawEncounter();
  }
  requestAnimationFrame(frame);
}
controls();
save();
resetEncounter();
requestAnimationFrame(frame);
