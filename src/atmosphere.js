import { drawActor, line, oval, pixel } from "./art.js";
import { WATER_POOL, inWater } from "./ambience.js";
import { isBlocked, mapById } from "./maps.js";

// Ambient life is a pure view of public state, seed and time. Nothing here
// advances the simulation or consumes its seeded random stream.
const P = Object.freeze({
  pool: ["#27434c", "#2b4952", "#304e56", "#34535a"],
  poolDark: "#203b45",
  rim: "#53717a",
  reflection: "#8bb5b7",
  wake: "#a3d0cb",
  catInk: "#392f32",
  cat: "#bb9975",
  catLight: "#dfba88",
  catShade: "#806451",
  mouseInk: "#273039",
  mouse: "#a69489",
  mouseLight: "#d8c5ad",
  ear: "#c38482",
  bird: "#887b69",
  birdLight: "#c0b29a",
  gold: "#dbb96f",
});

const CAT = Object.freeze({
  antiquities: { x: 335, y: 248 },
  natural_history: { x: 600, y: 563 },
  sculpture_court: { x: 625, y: 550 },
  clock_gallery: { x: 735, y: 444 },
});
const MICE = Object.freeze({
  antiquities: [
    [440, 538, 33, 1],
    [754, 510, 27, -1],
  ],
  natural_history: [
    [393, 501, 31, 1],
    [790, 524, 28, -1],
  ],
  sculpture_court: [
    [410, 507, 30, 1],
    [756, 489, 29, -1],
  ],
  clock_gallery: [
    [545, 515, 31, 1],
    [644, 595, 27, -1],
  ],
});
const BIRD = Object.freeze({
  antiquities: { x: 865, y: 246 },
  natural_history: { x: 655, y: 189 },
  sculpture_court: { x: 884, y: 234 },
  clock_gallery: { x: 906, y: 202 },
});

function galleryId(state, map) {
  return map?.id || state?.mapId || "antiquities";
}
function galleryMap(state, map) {
  return map?.obstacles ? map : mapById(galleryId(state, map));
}
function phaseTime(time, options) {
  return options?.reducedMotion ? 0 : Number.isFinite(time) ? time : 0;
}
function poolSpan(y) {
  const dy = (y - WATER_POOL.y) / WATER_POOL.ry;
  return Math.abs(dy) < 1
    ? Math.floor(WATER_POOL.rx * Math.sqrt(1 - dy * dy))
    : 0;
}
function poolContains(x, y) {
  return inWater("sculpture_court", x, y);
}
function drawPool(ctx, time, seed, reducedMotion) {
  const { x: cx, y: cy, ry } = WATER_POOL;
  const tick = reducedMotion ? 0 : Math.floor(time * 4);
  for (let dy = -ry; dy <= ry; dy++) {
    const y = cy + dy,
      half = poolSpan(y);
    if (!half) continue;
    const shade =
      Math.abs(
        Math.floor(dy / 9) +
          Math.floor(seed % 4) +
          (reducedMotion ? 0 : Math.floor(time * 0.5)),
      ) % P.pool.length;
    pixel(ctx, cx - half, y, half * 2 + 1, 1, P.pool[shade]);
    pixel(ctx, cx - half, y, 1, 1, P.rim);
    pixel(ctx, cx + half, y, 1, 1, P.rim);
    if ((dy + tick) % 13 === 0 && half > 22) {
      for (const offset of [-38, -8, 27]) {
        const shift = Math.round(Math.sin(dy * 0.19 + time * 1.4 + offset) * 2),
          px = cx + offset + shift;
        if (Math.abs(px - cx) < half - 9)
          pixel(ctx, px, y, 7 + Math.abs(offset % 3), 1, P.reflection);
      }
    }
  }
  // Broken skylight strips reveal that the shallow inset reflects the hall.
  for (let i = 0; i < 5; i++) {
    const x = cx - 50 + i * 24,
      drift = reducedMotion ? 0 : Math.round(Math.sin(time * 0.8 + i) * 2);
    for (let y = cy - 29 + (i % 2) * 5; y < cy + 27; y += 13) {
      const px = x + drift + Math.round(Math.sin(y * 0.2 + time) * 2);
      if (poolContains(px, y)) {
        pixel(ctx, px, y, 2, 7, P.poolDark);
        pixel(ctx, px + 2, y + 1, 1, 5, P.rim);
      }
    }
  }
}

let reflectionCanvas = null;
let reflectionCtx = null;
const REFLECTION_SCALE = 2;
function reflectionSurface() {
  if (typeof document === "undefined") return null;
  if (!reflectionCanvas) {
    reflectionCanvas = document.createElement("canvas");
    reflectionCanvas.width = 96 * REFLECTION_SCALE;
    reflectionCanvas.height = 80 * REFLECTION_SCALE;
    reflectionCtx = reflectionCanvas.getContext("2d");
    reflectionCtx.imageSmoothingEnabled = false;
    reflectionCtx.scale(REFLECTION_SCALE, REFLECTION_SCALE);
    reflectionCtx._pixelRatio = REFLECTION_SCALE;
  }
  return reflectionCanvas;
}
function reflectActors(ctx, state, time, options) {
  const surface = reflectionSurface();
  if (!surface) return;
  const pool = WATER_POOL,
    candidates = [...(state?.players || []), ...(state?.enemies || [])]
      .filter((a) => !a.dead && Number.isFinite(a.x) && Number.isFinite(a.y))
      .filter(
        (a) =>
          Math.abs(a.x - pool.x) < pool.rx + 22 &&
          Math.abs(a.y - pool.y) < pool.ry + 20,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - pool.x, a.y - pool.y) -
          Math.hypot(b.x - pool.x, b.y - pool.y),
      )
      .slice(0, 4);
  if (!candidates.length) return;
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.imageSmoothingEnabled = false;
  for (const actor of candidates) {
    reflectionCtx.clearRect(0, 0, 96, 80);
    drawActor(reflectionCtx, { ...actor, x: 48, y: 58 }, time, {
      reducedMotion: true,
    });
    // Scanlines are sampled from the real sprite, flipped and compressed below
    // its feet. Analytic ellipse bounds replace a vector clip path.
    for (let row = 0; row < 19; row++) {
      const sy = Math.round((58 - row * 1.5) * REFLECTION_SCALE),
        dy = Math.round(actor.y + 3 + row),
        half = poolSpan(dy);
      if (!half) continue;
      const ripple = options?.reducedMotion
          ? 0
          : Math.round(Math.sin(row * 0.65 + time * 3 + actor.x * 0.1) * 2),
        dx = Math.round(actor.x - 48 + ripple),
        left = Math.max(0, Math.ceil(pool.x - half - dx)),
        right = Math.min(96, Math.floor(pool.x + half - dx));
      if (right > left)
        ctx.drawImage(
          surface,
          left * REFLECTION_SCALE,
          sy,
          (right - left) * REFLECTION_SCALE,
          REFLECTION_SCALE,
          dx + left,
          dy,
          right - left,
          1,
        );
    }
  }
  ctx.restore();
}
function ripple(ctx, x, y, rx, ry, color, step = 2) {
  for (let i = 0; i < 48; i += step) {
    const a = (i * Math.PI * 2) / 48,
      px = x + Math.cos(a) * rx,
      py = y + Math.sin(a) * ry;
    if (poolContains(px, py)) pixel(ctx, px, py, 1, 1, color);
  }
}
function drawWaterMotion(ctx, state, time, seed, options) {
  const reduced = !!options?.reducedMotion,
    t = phaseTime(time, options);
  for (let i = 0; i < (reduced ? 1 : 3); i++) {
    const x = WATER_POOL.x + [-45, 30, 3][i],
      y = WATER_POOL.y + [3, -17, 24][i],
      p =
        (((t * (0.27 + i * 0.04) + i * 0.31 + (seed % 17) * 0.03) % 1) + 1) % 1;
    ripple(ctx, x, y, 5 + p * 25, 2 + p * 12, P.rim, 3);
  }
  if (reduced) return;
  for (const actor of state?.players || []) {
    if (
      !inWater("sculpture_court", actor.x, actor.y) ||
      Math.hypot(actor.vx || 0, actor.vy || 0) < 20
    )
      continue;
    const speed = Math.min(1, Math.hypot(actor.vx, actor.vy) / 140),
      phase = (((time * 2.7 + (actor.color || 0) * 0.31) % 1) + 1) % 1;
    for (const offset of [0, 0.5]) {
      const p = (phase + offset) % 1,
        backX = actor.x - (actor.vx || 0) * 0.055,
        backY = actor.y - (actor.vy || 0) * 0.055;
      ripple(
        ctx,
        backX,
        backY,
        3 + p * (12 + speed * 7),
        2 + p * (5 + speed * 4),
        P.wake,
        2,
      );
    }
    for (let i = 0; i < 3; i++) {
      const px = actor.x - (actor.vx || 0) * (0.035 + i * 0.012),
        py = actor.y - (actor.vy || 0) * (0.035 + i * 0.012);
      if (poolContains(px, py)) pixel(ctx, px, py, 2, 1, P.reflection);
    }
  }
}

function drawCat(ctx, x, y, time, seed, reducedMotion) {
  const t = reducedMotion ? 0 : time + (seed % 13) * 0.37,
    cycle = ((t % 21) + 21) % 21,
    stretch =
      cycle > 12 && cycle < 15
        ? Math.min(1, (cycle - 12) * 2, (15 - cycle) * 2)
        : 0,
    breath = reducedMotion ? 0 : Math.round(Math.sin(t * 1.7) * 0.5),
    tail = reducedMotion ? 0 : Math.round(Math.sin(t * 2.1) * 3),
    bodyX = x - 4,
    bodyY = y - 7 + breath,
    headX = x + 14 + Math.round(stretch * 5),
    headY = y - 10 - Math.round(stretch * 2),
    asleep = cycle < 7,
    blink = asleep || cycle % 6.4 < 0.2;
  oval(ctx, x, y + 1, 21, 3, P.catInk);
  line(ctx, x - 17, y - 7, x - 25, y - 10 + tail, P.catInk, 4);
  line(ctx, x - 17, y - 8, x - 24, y - 11 + tail, P.catShade, 2);
  pixel(ctx, x - 27, y - 12 + tail, 5, 4, P.catLight);
  oval(
    ctx,
    bodyX,
    bodyY,
    16 + Math.round(stretch * 4),
    6 - Math.round(stretch),
    P.catInk,
  );
  oval(ctx, bodyX, bodyY - 1, 14 + Math.round(stretch * 4), 5, P.cat);
  oval(ctx, x - 10, y - 10 + breath, 5, 3, P.catLight);
  pixel(ctx, x - 9, y - 4, 11, 2, P.catShade);
  for (const dx of [-8, 5]) {
    pixel(ctx, x + dx, y - 2, 7 + Math.round(stretch * 2), 3, P.catInk);
    pixel(ctx, x + dx + 1, y - 2, 5, 1, P.catLight);
  }
  oval(ctx, headX, headY, 7, 6, P.catInk);
  oval(ctx, headX, headY - 1, 6, 5, P.catLight);
  for (const dx of [-4, 4]) {
    pixel(ctx, headX + dx - 2, headY - 9, 5, 6, P.catInk);
    pixel(ctx, headX + dx - 1, headY - 8, 3, 4, P.catShade);
    pixel(ctx, headX + dx, headY - 7, 1, 2, P.ear);
  }
  for (const dx of [-3, 3])
    pixel(ctx, headX + dx, headY - 2, 2, blink ? 1 : 2, P.catInk);
  pixel(ctx, headX, headY + 1, 2, 1, P.ear);
  if (cycle > 13 && cycle < 14.5)
    pixel(ctx, headX - 1, headY + 3, 4, 3, P.catInk);
  line(ctx, headX - 5, headY + 2, headX - 10, headY + 1, P.catShade);
  line(ctx, headX + 5, headY + 2, headX + 10, headY + 1, P.catShade);
  pixel(ctx, headX - 5, headY + 4, 10, 2, P.gold);
  pixel(ctx, headX + 3, headY + 5, 2, 2, P.reflection);
}
function mousePosition(base, time, seed, index, reducedMotion) {
  const [x, y, distance, sign] = base,
    t = reducedMotion ? 2 : (((time + index * 3.1 + seed * 0.07) % 9) + 9) % 9;
  let travel = 0,
    visible = true,
    moving = false;
  if (t < 1.1) {
    travel = t / 1.1;
    moving = true;
  } else if (t < 3.5) travel = 1;
  else if (t < 4.3) {
    travel = 1 - (t - 3.5) / 0.8;
    moving = true;
  }
  // Remain visible while resting; these routes cross open floor.
  return { x: x + sign * distance * travel, y, sign, t, moving, visible };
}
function drawMouse(ctx, mouse, time) {
  const { x, y, sign, moving, t } = mouse,
    gait = moving ? Math.floor(time * 12) % 2 : 0,
    sniff = !moving && t > 1.5 && t < 3.3 ? 2 : 0;
  oval(ctx, x, y + 1, 9, 2, P.mouseInk);
  line(ctx, x - sign * 8, y - 4, x - sign * 15, y - 5 - gait, P.mouseInk);
  line(ctx, x - sign * 15, y - 5 - gait, x - sign * 18, y - 2, P.ear);
  oval(ctx, x, y - 4, 7, 4, P.mouseInk);
  oval(ctx, x + sign, y - 5, 6, 3, P.mouse);
  oval(ctx, x + sign * 7, y - 6 - sniff, 4, 3, P.mouseInk);
  oval(ctx, x + sign * 7, y - 7 - sniff, 3, 2, P.mouseLight);
  pixel(ctx, x + sign * 6 - 1, y - 11 - sniff, 3, 3, P.ear);
  pixel(ctx, x + sign * 9, y - 8 - sniff, 1, 1, P.mouseInk);
  pixel(ctx, x + sign * 11, y - 5 - sniff, 2, 1, P.ear);
  for (const dx of [-4, 3])
    pixel(ctx, x + dx, y - 1 - gait, 3, 2, P.mouseLight);
}
function retreatFromActors(mouse, base, actors, map) {
  const nearest = actors.reduce(
    (distance, actor) =>
      actor.dead
        ? distance
        : Math.min(distance, Math.hypot(actor.x - mouse.x, actor.y - mouse.y)),
    Infinity,
  );
  if (nearest >= 64) return mouse;
  // Retreat continuously to the start of the route when a visitor approaches.
  const alarm = Math.max(0, Math.min(1, (64 - nearest) / 50));
  const travel = (mouse.x - base[0]) * (1 - alarm);
  const retreat = { ...mouse, x: base[0] + travel, moving: true };
  return isBlocked(map, retreat, 5) ? mouse : retreat;
}
function drawBird(ctx, x, y, time, seed, reducedMotion) {
  const t = reducedMotion ? 0 : time + seed * 0.09,
    flap = t % 11 > 8.9 && t % 11 < 9.4 ? 3 : 0,
    turn = Math.floor(t / 4.7) % 2 ? -1 : 1;
  oval(ctx, x, y + 1, 8, 2, P.catInk);
  oval(ctx, x, y - 5, 7, 4, P.catInk);
  oval(ctx, x, y - 6, 6, 3, P.bird);
  line(ctx, x - 2, y - 5, x - 7, y - 8 - flap, P.birdLight, 3);
  oval(ctx, x + turn * 5, y - 9, 4, 4, P.catInk);
  oval(ctx, x + turn * 5, y - 10, 3, 3, P.birdLight);
  pixel(ctx, x + turn * 6, y - 11, 1, 1, P.catInk);
  pixel(ctx, x + turn * 9, y - 9, 4, 2, P.gold);
  for (const dx of [-2, 3]) line(ctx, x + dx, y - 2, x + dx, y + 1, P.catShade);
}
function drawPendulum(ctx, time, reducedMotion) {
  const angle = reducedMotion ? 0 : Math.sin(time * 1.35) * 0.38,
    x = 600 + Math.sin(angle) * 26,
    y = -13 + Math.cos(angle) * 30;
  pixel(ctx, 596, -32, 9, 5, P.catInk);
  pixel(ctx, 598, -31, 5, 3, P.gold);
  line(ctx, 600, -28, x, y, P.catInk, 4);
  line(ctx, 600, -28, x, y, P.gold, 2);
  oval(ctx, x, y, 8, 8, P.catInk);
  oval(ctx, x, y - 1, 6, 6, P.gold);
  oval(ctx, x, y - 1, 3, 3, P.birdLight);
}

export function drawAtmosphereGround(ctx, state, time, map, options = {}) {
  if (galleryId(state, map) !== "sculpture_court") return;
  const t = phaseTime(time, options),
    seed = state?.seed || 1;
  drawPool(ctx, t, seed, !!options.reducedMotion);
  reflectActors(ctx, state, t, options);
  drawWaterMotion(ctx, state, t, seed, options);
}

export function drawAtmosphereDetails(ctx, state, time, map, options = {}) {
  const gallery = galleryId(state, map),
    actualMap = galleryMap(state, map),
    seed = state?.seed || 1,
    t = phaseTime(time, options),
    cat = CAT[gallery],
    bird = BIRD[gallery];
  if (cat) drawCat(ctx, cat.x, cat.y, t, seed, !!options.reducedMotion);
  if (bird) drawBird(ctx, bird.x, bird.y, t, seed, !!options.reducedMotion);
  const actors = [...(state?.players || []), ...(state?.enemies || [])];
  for (const [index, base] of (MICE[gallery] || []).entries()) {
    const mouse = mousePosition(base, t, seed, index, !!options.reducedMotion);
    if (!mouse.visible || isBlocked(actualMap, mouse, 5)) continue;
    drawMouse(ctx, retreatFromActors(mouse, base, actors, actualMap), t);
  }
  if (gallery === "clock_gallery")
    drawPendulum(ctx, t, !!options.reducedMotion);
}
