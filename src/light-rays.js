import { pixel, line, oval } from "./art.js";

const EPSILON = 1e-7;
const BOUNCE_LIMIT = 4;
const SOURCE_LIMIT = 8;
const SOURCE_OFFSET = 2.5;
const SHAFT_CELL = 2;
const SHAFT_WIDTH = 1200;
const SHAFT_HEIGHT = 720;

// Shared by the baked window art and its projected, occluded illumination.
export const WINDOW_APERTURES = Object.freeze([
  Object.freeze({
    x: 90,
    top: -106,
    bottom: -24,
    width: 24,
    slope: 0.32,
    color: Object.freeze([132, 187, 205]),
  }),
  Object.freeze({
    x: 520,
    top: -106,
    bottom: -24,
    width: 24,
    slope: 0.1,
    color: Object.freeze([162, 170, 211]),
  }),
  Object.freeze({
    x: 1148,
    top: -106,
    bottom: -24,
    width: 24,
    slope: -0.38,
    color: Object.freeze([204, 189, 151]),
  }),
]);

function validBox(box) {
  return (
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    box.w > 0 &&
    box.h > 0 &&
    Number.isFinite(box.w) &&
    Number.isFinite(box.h)
  );
}

// Scalar slab intersection: no temporary vectors or arrays in the raster loop.
function boxDistance(x, y, dx, dy, box) {
  let near = -Infinity,
    far = Infinity;
  if (Math.abs(dx) < EPSILON) {
    if (x < box.x || x > box.x + box.w) return Infinity;
  } else {
    const a = (box.x - x) / dx,
      b = (box.x + box.w - x) / dx;
    near = Math.min(a, b);
    far = Math.max(a, b);
  }
  if (Math.abs(dy) < EPSILON) {
    if (y < box.y || y > box.y + box.h) return Infinity;
  } else {
    const a = (box.y - y) / dy,
      b = (box.y + box.h - y) / dy;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  if (far < Math.max(near, 0)) return Infinity;
  return near >= 0 ? near : far;
}

/** Nearest rectangle face hit, in world distance, with an outward unit normal.
 * Direction need not be normalized. An origin inside a solid returns its exit
 * face and inside:true, so illumination never mistakes that exit for a receiver.
 */
export function raycastObstacles(
  obstacles,
  x,
  y,
  dx,
  dy,
  maxDistance = Infinity,
) {
  const length = Math.hypot(dx, dy);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(length) ||
    length < EPSILON ||
    !(maxDistance >= 0)
  )
    return null;
  dx /= length;
  dy /= length;
  let distance = maxDistance,
    index = -1;
  for (let i = 0; i < obstacles.length; i++) {
    const box = obstacles[i];
    if (!validBox(box)) continue;
    const at = boxDistance(x, y, dx, dy, box);
    if (
      Number.isFinite(at) &&
      at >= 0 &&
      at <= distance &&
      (index < 0 || at < distance)
    ) {
      distance = at;
      index = i;
    }
  }
  if (index < 0) return null;
  const box = obstacles[index],
    hx = x + dx * distance,
    hy = y + dy * distance;
  let normalX = 0,
    normalY = 0;
  if (Math.abs(hx - box.x) < EPSILON) normalX = -1;
  else if (Math.abs(hx - box.x - box.w) < EPSILON) normalX = 1;
  else if (Math.abs(hy - box.y) < EPSILON) normalY = -1;
  else normalY = 1;
  return {
    x: hx,
    y: hy,
    distance,
    normalX,
    normalY,
    obstacle: box,
    index,
    inside: x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h,
  };
}

export function segmentHit(obstacles, from, to) {
  return raycastObstacles(
    obstacles,
    from.x,
    from.y,
    to.x - from.x,
    to.y - from.y,
    Math.hypot(to.x - from.x, to.y - from.y),
  );
}

function material(map, box) {
  if (box.kind === "plinth")
    return { color: [205, 213, 202], reflectance: 0.72 };
  if (map.id === "clock_gallery")
    return { color: [200, 158, 102], reflectance: 0.57 };
  if (map.id === "natural_history")
    return { color: [151, 172, 154], reflectance: 0.48 };
  return { color: [192, 153, 112], reflectance: 0.52 };
}

/** One diffuse bounce from directly visible exhibit faces. Deterministic and
 * bounded to four lights; bounce inputs are deliberately never traced again.
 * Receivers must also use the returned normal to enforce the outward hemisphere.
 */
export function collectBounceLights(map, directLights) {
  const obstacles = map.obstacles || [],
    candidates = new Map();
  const sources = directLights
    .filter(
      (l) =>
        !l.bounce &&
        !l.ambient &&
        l.power > 0.035 &&
        l.radius > 0 &&
        Number.isFinite(l.x) &&
        Number.isFinite(l.y) &&
        Number.isFinite(l.radius) &&
        Number.isFinite(l.power),
    )
    .slice()
    .sort((a, b) => b.power - a.power)
    .slice(0, SOURCE_LIMIT);
  for (const source of sources) {
    if (
      obstacles.some(
        (o) =>
          source.x > o.x &&
          source.x < o.x + o.w &&
          source.y > o.y &&
          source.y < o.y + o.h,
      )
    )
      continue;
    for (let index = 0; index < obstacles.length; index++) {
      const box = obstacles[index];
      if (!validBox(box)) continue;
      const albedo = material(map, box);
      for (let face = 0; face < 4; face++) {
        const nx = face === 0 ? -1 : face === 1 ? 1 : 0,
          ny = face === 2 ? -1 : face === 3 ? 1 : 0;
        if (
          (nx < 0 && source.x >= box.x) ||
          (nx > 0 && source.x <= box.x + box.w) ||
          (ny < 0 && source.y >= box.y) ||
          (ny > 0 && source.y <= box.y + box.h)
        )
          continue;
        for (let sample = 1; sample <= 3; sample++) {
          const px = nx
              ? box.x + (nx > 0 ? box.w : 0)
              : box.x + (box.w * sample) / 4,
            py = ny
              ? box.y + (ny > 0 ? box.h : 0)
              : box.y + (box.h * sample) / 4,
            dx = px - source.x,
            dy = py - source.y,
            distance = Math.hypot(dx, dy);
          if (distance >= source.radius || distance < EPSILON) continue;
          const hit = raycastObstacles(
            obstacles,
            source.x,
            source.y,
            dx,
            dy,
            distance + 0.01,
          );
          if (
            !hit ||
            hit.inside ||
            hit.index !== index ||
            hit.normalX !== nx ||
            hit.normalY !== ny
          )
            continue;
          const cosine = Math.max(0, (-dx * nx - dy * ny) / distance),
            attenuation = (1 - distance / source.radius) ** 2,
            power =
              source.power * attenuation * cosine * albedo.reflectance * 0.42;
          if (power < 0.004) continue;
          const bounceX = px + nx * SOURCE_OFFSET,
            bounceY = py + ny * SOURCE_OFFSET;
          // In a narrow gap, an outward offset could enter the neighboring case.
          // Skip that receiver instead of launching light inside a different solid.
          if (
            obstacles.some(
              (o) =>
                bounceX > o.x &&
                bounceX < o.x + o.w &&
                bounceY > o.y &&
                bounceY < o.y + o.h,
            )
          )
            continue;
          const key = `${index}:${face}`,
            prior = candidates.get(key);
          if (prior && prior.power >= power) continue;
          const sourceColor = source.color || [255, 255, 255];
          candidates.set(key, {
            x: bounceX,
            y: bounceY,
            radius: Math.min(96, Math.max(40, source.radius * 0.6)),
            power: Math.min(0.18, power),
            color: albedo.color.map((v, i) =>
              Math.round(sourceColor[i] * (0.45 + (v / 255) * 0.55)),
            ),
            normalX: nx,
            normalY: ny,
            bounce: true,
            sourceObstacle: box.id ?? index,
          });
        }
      }
    }
  }
  return [...candidates.values()]
    .sort((a, b) => b.power - a.power)
    .slice(0, BOUNCE_LIMIT);
}

// Returns an RGBA raster without requiring DOM/Canvas, for both caches and tests.
// Every cell traces back through the actual aperture and stops at the first case.
export function buildShaftField(map, apertures = WINDOW_APERTURES) {
  const width = SHAFT_WIDTH / SHAFT_CELL,
    height = SHAFT_HEIGHT / SHAFT_CELL,
    data = new Uint8ClampedArray(width * height * 4),
    obstacles = (map.obstacles || []).filter(validBox);
  for (const window of apertures) {
    const half = window.width / 2,
      reach = 700,
      divergence = 0.004;
    for (let row = 0; row < height; row++) {
      const y = (row + 0.5) * SHAFT_CELL,
        distanceY = y - window.bottom;
      if (distanceY <= 0 || distanceY >= reach) continue;
      // The two real horizontal mullions cast narrow interruptions in the shaft.
      if (
        (distanceY > 225 && distanceY < 230) ||
        (distanceY > 453 && distanceY < 458)
      )
        continue;
      const spread = 1 + distanceY * divergence,
        center = window.x + window.slope * distanceY,
        start = Math.max(0, Math.floor((center - half * spread) / SHAFT_CELL)),
        end = Math.min(
          width - 1,
          Math.ceil((center + half * spread) / SHAFT_CELL),
        );
      for (let col = start; col <= end; col++) {
        const x = (col + 0.5) * SHAFT_CELL,
          apertureX = (x - center) / spread;
        if (Math.abs(apertureX) >= half || Math.abs(apertureX) < 0.75) continue;
        const fromX = window.x + apertureX,
          dx = x - fromX,
          dy = distanceY;
        let blocked = false;
        for (let i = 0; i < obstacles.length; i++) {
          if (
            boxDistance(fromX, window.bottom, dx, dy, obstacles[i]) <
            1 - EPSILON
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const edge = Math.abs(apertureX) / half,
          strength =
            (1 - Math.pow(edge, 6)) * Math.pow(1 - distanceY / reach, 0.65),
          alpha = (Math.round(strength * 20) / 20) * 0.3,
          at = (row * width + col) * 4;
        if (alpha * 255 <= data[at + 3]) continue;
        // Neighboring stained panes retain a restrained cool/warm color shift.
        const tint = apertureX < 0 ? 1 : 0.9;
        data[at] = Math.round(window.color[0] * tint);
        data[at + 1] = window.color[1];
        data[at + 2] = Math.min(
          255,
          Math.round(window.color[2] * (apertureX < 0 ? 1 : 1.04)),
        );
        data[at + 3] = Math.round(alpha * 255);
      }
    }
  }
  return { data, width, height, cell: SHAFT_CELL };
}

export function createLightShafts() {
  const cache = new WeakMap();
  return {
    draw(ctx, map, viewport = { x: 0, y: 0, w: 1200, h: 800 }, options = {}) {
      if (options.lightShafts === false) return;
      let canvas = cache.get(map);
      if (!canvas) {
        const field = buildShaftField(map);
        canvas = document.createElement("canvas");
        canvas.width = field.width;
        canvas.height = field.height;
        const context = canvas.getContext("2d"),
          image = context.createImageData(field.width, field.height);
        image.data.set(field.data);
        context.putImageData(image, 0, 0);
        cache.set(map, canvas);
      }
      const x = Math.max(0, Math.floor(viewport.x / SHAFT_CELL)),
        y = Math.max(0, Math.floor(viewport.y / SHAFT_CELL)),
        right = Math.min(
          canvas.width,
          Math.ceil((viewport.x + (viewport.w ?? 640)) / SHAFT_CELL),
        ),
        bottom = Math.min(
          canvas.height,
          Math.ceil((viewport.y + (viewport.h ?? 360)) / SHAFT_CELL),
        );
      if (right <= x || bottom <= y) return;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(
        canvas,
        x,
        y,
        right - x,
        bottom - y,
        x * SHAFT_CELL,
        y * SHAFT_CELL,
        (right - x) * SHAFT_CELL,
        (bottom - y) * SHAFT_CELL,
      );
      ctx.restore();
    },
  };
}

export function drawWindowFrames(ctx, map) {
  const stone = map.id === "sculpture_court",
    clock = map.id === "clock_gallery",
    dark = stone ? "#293740" : "#20272e",
    trim = stone ? "#8c9e9f" : clock ? "#947447" : "#707d7c";
  for (const window of WINDOW_APERTURES) {
    const x = window.x,
      y = window.top,
      h = window.bottom - window.top;
    oval(ctx, x, y + 4, 16, 11, dark);
    pixel(ctx, x - 16, y + 4, 32, h, dark);
    oval(ctx, x - 0.5, y + 4, 14, 9, trim);
    pixel(ctx, x - 14, y + 4, 28, h - 1, trim);
    oval(ctx, x, y + 5, 12, 8, "#152730");
    pixel(ctx, x - 12, y + 5, 24, h - 3, "#152730");
    for (let row = 0; row < h - 4; row++) {
      const yy = y + 2 + row,
        inset = row < 7 ? Math.max(0, 5 - row) : 0,
        band = row < 24 ? 0 : row < 51 ? 1 : 2;
      pixel(
        ctx,
        x - 11 + inset,
        yy,
        10 - inset,
        1,
        ["#719fae", "#507e91", "#3e677e"][band],
      );
      pixel(
        ctx,
        x + 1,
        yy,
        10 - inset,
        1,
        ["#9eabc1", "#737f9c", "#535f7d"][band],
      );
      if (row % 17 < 2) {
        pixel(ctx, x - 10 + inset, yy, 2, 1, "#a7c4c6");
        pixel(ctx, x + 7, yy, 2, 1, "#c1bca7");
      }
    }
    // Glazing bars are structural window members, shared with aperture ray cuts.
    pixel(ctx, x - 0.75, y + 1, 1.5, h - 2, "#27343e");
    pixel(ctx, x - 0.5, y + 2, 0.5, h - 3, "#a6a694");
    for (const dy of [28, 55]) {
      pixel(ctx, x - 12, y + dy, 24, 1.5, "#25323d");
      pixel(ctx, x - 11.5, y + dy + 1, 23, 0.5, trim);
    }
    oval(ctx, x, y + 14, 3.5, 5, "#374957");
    oval(ctx, x - 0.5, y + 13, 2.5, 4, "#b2ad8b");
    line(ctx, x - 13.5, y + 6, x - 13.5, window.bottom - 1, "#b7c2b6", 0.5);
    line(ctx, x + 13, y + 7, x + 13, window.bottom - 1, "#364650", 1);
    pixel(ctx, x - 17, window.bottom + 1, 34, 3, dark);
    pixel(ctx, x - 16, window.bottom, 32, 1.5, trim);
    pixel(ctx, x - 14, window.bottom, 26, 0.5, "#c6c7ad");
  }
}
