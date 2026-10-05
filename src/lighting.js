import { pixel, oval } from "./art.js";
import { weaponMuzzle } from "./combat-geometry.js";

const CELL = 2;
const LIMIT = 12;
const WARM = [244, 178, 88],
  COOL = [112, 180, 222],
  MINT = [116, 221, 196];

// Lighting is presentation-only. The same snapshot always produces the same
// lamps, occlusion and exposure; no timers or random state enter the simulation.
export function collectLights(state, reducedMotion = false) {
  const lights = [
    { x: 600, y: 330, radius: 340, power: 0.14, color: COOL, ambient: true },
    ...[252, 440, 758, 952].map((x) => ({
      x,
      y: -76,
      radius: 190,
      power: 0.4,
      color: WARM,
      ambient: true,
    })),
  ];
  for (const p of state?.players || []) {
    if (p.dead) continue;
    if (p.weapons?.includes("lantern")) {
      const muzzle = weaponMuzzle({ ...p, lastWeapon: "lantern" });
      lights.push({
        x: muzzle.x,
        y: muzzle.y,
        radius: 105,
        power: 0.4,
        color: WARM,
        owner: p.id,
      });
    }
  }
  for (const f of state?.flowers || [])
    lights.push({
      x: f.x,
      y: f.y - 12,
      radius: 65 + 25 * (f.charge || 0),
      power: 0.12 + 0.2 * (f.charge || 0),
      color: MINT,
    });
  const events = [];
  for (const e of state?.effects || []) {
    const remain = Math.max(0, Math.min(1, e.life / (e.maxLife || 0.35)));
    if (e.type === "storm") {
      const power = (reducedMotion ? 0.14 : 0.72) * remain * remain;
      events.push({ x: e.x, y: e.y, radius: 100, power, color: COOL });
      if (Number.isFinite(e.fromX))
        events.push({
          x: e.fromX,
          y: e.fromY,
          radius: 75,
          power: power * 0.6,
          color: COOL,
        });
    } else if (e.type === "lantern")
      events.push({
        x: e.x,
        y: e.y,
        radius: 110 + (1 - remain) * 30,
        power: (reducedMotion ? 0.18 : 0.44) * remain,
        color: WARM,
      });
    else if (e.type === "supply" || e.type === "bloom" || e.type === "heal")
      events.push({
        x: e.x,
        y: e.y,
        radius: 90,
        power: (reducedMotion ? 0.12 : 0.32) * remain,
        color: MINT,
      });
    else if (e.type === "death")
      events.push({
        x: e.x,
        y: e.y - 8,
        radius: 32,
        power:
          (reducedMotion ? 0.03 : 0.16) * Math.max(0, (remain - 0.7) / 0.3),
        color: WARM,
      });
  }
  // Prefer meaningful nearby emitters when a large co-op volley hits at once.
  events.sort((a, b) => b.power - a.power);
  const occupied = new Set(),
    distinct = [];
  for (const light of events) {
    const key = [
      Math.round(light.x / 48),
      Math.round(light.y / 48),
      ...light.color,
    ].join(":");
    if (occupied.has(key)) continue;
    occupied.add(key);
    distinct.push(light);
    if (distinct.length === LIMIT) break;
  }
  return [...lights, ...distinct].filter((l) => l.power > 0.015);
}

function intersects(from, to, box) {
  let near = 0,
    far = 1;
  for (const [axis, min, max] of [
    ["x", box.x, box.x + box.w],
    ["y", box.y, box.y + box.h],
  ]) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < 1e-8) {
      if (from[axis] < min || from[axis] > max) return false;
      continue;
    }
    let a = (min - from[axis]) / delta,
      b = (max - from[axis]) / delta;
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a);
    far = Math.min(far, b);
    if (near > far) return false;
  }
  return far > 0.001 && near < 0.999;
}

export function lightStrength(light, x, y, obstacles = []) {
  const dx = x - light.x,
    dy = (y - light.y) * 1.12;
  const distance = Math.hypot(dx, dy) / light.radius;
  if (distance >= 1) return 0;
  const to = { x, y };
  // Receivers on a display remain lit; only objects between lamp and receiver
  // cast the hard-edged shadow visible on the floor behind that display.
  const blocked = obstacles.some((o) => {
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return false;
    if (
      light.x >= o.x &&
      light.x <= o.x + o.w &&
      light.y >= o.y &&
      light.y <= o.y + o.h
    )
      return false;
    return intersects(light, to, o);
  });
  const falloff = (1 - distance) ** 2;
  return Math.round(falloff * (blocked ? 0.08 : 1) * 32) / 32;
}

// Scan-converted polygons keep projected shadows on the raster without paths,
// antialiasing, gradients or blurred post-processing.
function polygon(ctx, points, color) {
  let minY = Math.floor(Math.min(...points.map((p) => p[1]))),
    maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2)
      pixel(ctx, xs[i], y, xs[i + 1] - xs[i], 1, color);
  }
}

export function createLighting() {
  const cache = new Map();
  let exposure = null;
  function stamp(light, map) {
    const x = Math.round(light.x / 2) * 2,
      y = Math.round(light.y / 2) * 2;
    const radius = Math.round(light.radius / 4) * 4;
    const key = [map.id, x, y, radius, ...light.color].join(":");
    if (cache.has(key)) {
      const hit = cache.get(key);
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const size = Math.ceil((radius * 2) / CELL),
      canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d"),
      data = context.createImageData(size, size);
    const normalized = { ...light, x, y, radius };
    const obstacles = map.obstacles.filter(
      (o) =>
        o.x < x + radius &&
        o.x + o.w > x - radius &&
        o.y < y + radius &&
        o.y + o.h > y - radius,
    );
    for (let row = 0; row < size; row++)
      for (let col = 0; col < size; col++) {
        const strength = lightStrength(
          normalized,
          x - radius + col * CELL,
          y - radius + row * CELL,
          obstacles,
        );
        const at = (row * size + col) * 4;
        data.data[at] = light.color[0];
        data.data[at + 1] = light.color[1];
        data.data[at + 2] = light.color[2];
        data.data[at + 3] = Math.round(strength * 255);
      }
    context.putImageData(data, 0, 0);
    const result = { canvas, x: x - radius, y: y - radius, size: size * CELL };
    cache.set(key, result);
    while (cache.size > 36) cache.delete(cache.keys().next().value);
    return result;
  }
  function shadows(ctx, state, lights) {
    const old = ctx.globalAlpha;
    for (const actor of [
      ...(state?.players || []),
      ...(state?.enemies || []),
      ...(state?.companions || []),
    ]) {
      if (actor.dead) continue;
      let lamp = lights
        .filter((l) => l.owner !== actor.id && l.power > 0.1)
        .sort(
          (a, b) =>
            Math.hypot(a.x - actor.x, a.y - actor.y) -
            Math.hypot(b.x - actor.x, b.y - actor.y),
        )[0];
      const dx = actor.x - (lamp?.x ?? actor.x - 100),
        dy = actor.y - (lamp?.y ?? actor.y - 160),
        distance = Math.hypot(dx, dy) || 1;
      const extent =
        actor.type === "warden" ? 27 : actor.type === "mite" ? 8 : 18;
      const sx = (dx / distance) * extent,
        sy = (dy / distance) * extent * 0.45 + 2;
      const width =
        actor.type === "warden" ? 15 : actor.type === "mite" ? 7 : 5;
      ctx.globalAlpha = old * 0.19;
      polygon(
        ctx,
        [
          [actor.x - width, actor.y],
          [actor.x + width, actor.y],
          [actor.x + sx + width * 0.65, actor.y + sy],
          [actor.x + sx - width * 0.65, actor.y + sy],
        ],
        "#0b1320",
      );
      oval(ctx, actor.x + sx, actor.y + sy, width * 0.65, 2, "#0b1320");
    }
    ctx.globalAlpha = old;
  }
  function illuminate(ctx, map, lights, ox, oy) {
    if (!exposure) {
      exposure = document.createElement("canvas");
      exposure.width = 320;
      exposure.height = 180;
    }
    const lightContext = exposure.getContext("2d");
    lightContext.clearRect(0, 0, 320, 180);
    lightContext.imageSmoothingEnabled = false;
    lightContext.globalCompositeOperation = "lighter";
    for (const light of lights) {
      if (
        light.x + light.radius < ox ||
        light.x - light.radius > ox + 640 ||
        light.y + light.radius < oy ||
        light.y - light.radius > oy + 360
      )
        continue;
      const field = stamp(light, map);
      lightContext.globalAlpha = Math.min(0.8, light.power);
      lightContext.drawImage(
        field.canvas,
        Math.round((field.x - ox) / 2),
        Math.round((field.y - oy) / 2),
        field.size / 2,
        field.size / 2,
      );
    }
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = map.id === "sculpture_court" ? "#dce4ed" : "#c7d3e4";
    ctx.fillRect(ox, oy, 640, 360);
    ctx.globalCompositeOperation = "screen";
    // One bounded exposure prevents simultaneous lightning from bleaching the room.
    ctx.globalAlpha = 0.7;
    ctx.drawImage(exposure, ox, oy, 640, 360);
    ctx.restore();
  }
  return { shadows, illuminate };
}
