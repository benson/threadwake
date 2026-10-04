import { WORLD } from "./config.js";

const caseAt = (id, x, y, w, h, kind = "case") => ({ id, x, y, w, h, kind });
export const MAPS = [
  {
    id: "antiquities",
    name: "Antiquities",
    waves: [1, 2],
    spawn: { x: 600, y: 400 },
    obstacles: [
      caseAt("urns", 250, 240, 150, 70),
      caseAt("coins", 800, 240, 150, 70),
      caseAt("tablets", 250, 540, 150, 70),
      caseAt("vases", 800, 540, 150, 70),
    ],
  },
  {
    id: "natural_history",
    name: "Natural History",
    waves: [3, 4],
    spawn: { x: 600, y: 400 },
    obstacles: [
      caseAt("skeleton", 480, 175, 240, 70),
      caseAt("fossils", 480, 555, 240, 70),
      caseAt("insects", 160, 310, 170, 65),
      caseAt("shells", 870, 425, 170, 65),
    ],
  },
  {
    id: "sculpture_court",
    name: "Sculpture Court",
    waves: [5, 6],
    spawn: { x: 600, y: 400 },
    obstacles: [
      caseAt("bust", 220, 210, 90, 90, "plinth"),
      caseAt("column", 500, 170, 90, 90, "plinth"),
      caseAt("bird", 840, 230, 90, 90, "plinth"),
      caseAt("hand", 240, 540, 90, 90, "plinth"),
      caseAt("figure", 580, 540, 90, 90, "plinth"),
      caseAt("mask", 850, 535, 90, 90, "plinth"),
    ],
  },
  {
    id: "clock_gallery",
    name: "Clock Gallery",
    waves: [7, 8],
    spawn: { x: 600, y: 400 },
    obstacles: [
      caseAt("pendulums", 430, 230, 70, 140),
      caseAt("gears", 700, 430, 70, 140),
      caseAt("watches", 180, 545, 190, 55),
      caseAt("automata", 830, 190, 190, 55),
    ],
  },
];
export const mapForWave = (wave) =>
  MAPS[Math.max(0, Math.min(MAPS.length - 1, Math.floor((wave - 1) / 2) || 0))];
export const mapById = (id) => MAPS.find((map) => map.id === id) || MAPS[0];
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

export function isBlocked(map, point, radius = 0) {
  if (
    point.x < radius ||
    point.y < radius ||
    point.x > WORLD.width - radius ||
    point.y > WORLD.height - radius
  )
    return true;
  return map.obstacles.some((o) => {
    const x = clamp(point.x, o.x, o.x + o.w),
      y = clamp(point.y, o.y, o.y + o.h);
    return radius > 0
      ? (point.x - x) ** 2 + (point.y - y) ** 2 < radius ** 2 - 1e-8
      : point.x > o.x &&
          point.x < o.x + o.w &&
          point.y > o.y &&
          point.y < o.y + o.h;
  });
}
export function safePosition(map, point, radius = 10, margin = radius) {
  const p = {
    x: clamp(point.x, margin, WORLD.width - margin),
    y: clamp(point.y, margin, WORLD.height - margin),
  };
  if (!isBlocked(map, p, radius)) return p;
  const candidates = map.obstacles
    .flatMap((o) => [
      { x: o.x - radius - 0.1, y: p.y },
      { x: o.x + o.w + radius + 0.1, y: p.y },
      { x: p.x, y: o.y - radius - 0.1 },
      { x: p.x, y: o.y + o.h + radius + 0.1 },
    ])
    .filter(
      (q) =>
        q.x >= margin &&
        q.y >= margin &&
        q.x <= WORLD.width - margin &&
        q.y <= WORLD.height - margin &&
        !isBlocked(map, q, radius),
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
    );
  return candidates[0] || { ...map.spawn };
}
export function moveInMap(map, point, dx, dy, radius = 10, margin = radius) {
  let p = { x: point.x, y: point.y };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
  for (let i = 0; i < steps; i++) {
    const both = {
      x: clamp(p.x + dx / steps, margin, WORLD.width - margin),
      y: clamp(p.y + dy / steps, margin, WORLD.height - margin),
    };
    if (!isBlocked(map, both, radius)) {
      p = both;
      continue;
    }
    const across = { x: both.x, y: p.y };
    if (!isBlocked(map, across, radius)) p = across;
    const down = { x: p.x, y: both.y };
    if (!isBlocked(map, down, radius)) p = down;
  }
  return p;
}
function boxEntry(a, b, o) {
  let enter = 0,
    exit = 1;
  for (const [at, delta, low, high] of [
    [a.x, b.x - a.x, o.x, o.x + o.w],
    [a.y, b.y - a.y, o.y, o.y + o.h],
  ]) {
    if (Math.abs(delta) < 1e-8) {
      if (at < low || at > high) return Infinity;
    } else {
      const t1 = (low - at) / delta,
        t2 = (high - at) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
    }
  }
  return enter <= exit && enter <= 1 && exit >= 0 ? enter : Infinity;
}
function circleEntry(a, b, center, radius) {
  const x = a.x - center.x,
    y = a.y - center.y,
    dx = b.x - a.x,
    dy = b.y - a.y;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const length = dx * dx + dy * dy,
    dot = x * dx + y * dy,
    discriminant = dot * dot - length * c;
  if (!length || discriminant < 0) return Infinity;
  const t = (-dot - Math.sqrt(discriminant)) / length;
  return t >= 0 && t <= 1 ? t : Infinity;
}
function rectEntry(a, b, o, radius) {
  if (!radius) return boxEntry(a, b, o);
  // Exact rounded corners of a circular projectile against a rectangular case.
  // A square expansion would silently block shots outside the visible corner.
  const sides = [
    { x: o.x - radius, y: o.y, w: o.w + radius * 2, h: o.h },
    { x: o.x, y: o.y - radius, w: o.w, h: o.h + radius * 2 },
  ];
  return Math.min(
    ...sides.map((side) => boxEntry(a, b, side)),
    ...[
      { x: o.x, y: o.y },
      { x: o.x + o.w, y: o.y },
      { x: o.x, y: o.y + o.h },
      { x: o.x + o.w, y: o.y + o.h },
    ].map((corner) => circleEntry(a, b, corner, radius)),
  );
}
// Cases and plinths are solid cover. Marbles, hostile shots, sweeps and supply
// pulses all use this same line-of-sight policy instead of hitting through art.
export function coverHit(map, from, to, radius = 0) {
  return map.obstacles.reduce(
    (at, o) => Math.min(at, rectEntry(from, to, o, radius)),
    Infinity,
  );
}
export const lineBlocked = (map, from, to, radius = 0) =>
  Number.isFinite(coverHit(map, from, to, radius));
export function steerAroundCover(map, from, goal, radius = 10) {
  const blocked = map.obstacles
    .map((o) => ({ o, at: rectEntry(from, goal, o, radius) }))
    .filter((hit) => Number.isFinite(hit.at))
    .sort((a, b) => a.at - b.at)[0];
  if (!blocked) return goal;
  const { o } = blocked,
    r = radius + 8;
  const candidates = [
    { x: o.x - r, y: o.y - r },
    { x: o.x + o.w + r, y: o.y - r },
    { x: o.x - r, y: o.y + o.h + r },
    { x: o.x + o.w + r, y: o.y + o.h + r },
  ].filter(
    (p) => !isBlocked(map, p, radius) && !lineBlocked(map, from, p, radius),
  );
  const clearRoutes = candidates.filter(
    (p) => !lineBlocked(map, p, goal, radius),
  );
  const routes = clearRoutes.length ? clearRoutes : candidates;
  routes.sort(
    (a, b) =>
      Math.hypot(a.x - from.x, a.y - from.y) +
      Math.hypot(a.x - goal.x, a.y - goal.y) -
      Math.hypot(b.x - from.x, b.y - from.y) -
      Math.hypot(b.x - goal.x, b.y - goal.y),
  );
  return routes[0] || goal;
}
