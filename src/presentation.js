import { TICK_RATE } from "./config.js";
import { mapById, mapForWave, moveInMap } from "./maps.js";

const STEP = 1 / TICK_RATE;
const MAX_GAP = 0.2;
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const groups = ["players", "enemies", "shots", "echoes", "companions"];
const motionFields = [
  "x",
  "y",
  "dead",
  "type",
  "owner",
  "hostile",
  "orbitPhase",
  "phase",
];

// Retain only motion and discontinuity markers before the mutable simulation
// steps. No JSON cloning, paths, combat pools, traits, or private state are copied.
export function capturePresentation(state) {
  if (!state) return null;
  const capture = {};
  for (const key of [
    "version",
    "seed",
    "runNumber",
    "phase",
    "wave",
    "mapId",
    "time",
    "tick",
  ])
    if (state[key] !== undefined) capture[key] = state[key];
  for (const group of groups)
    capture[group] = (state[group] || []).map((entity) => {
      const motion = { id: entity.id };
      for (const key of motionFields)
        if (entity[key] !== undefined) motion[key] = entity[key];
      return motion;
    });
  return capture;
}

function compatible(previous, current) {
  if (!previous || previous.phase !== "playing" || current.phase !== "playing")
    return false;
  for (const key of ["version", "seed", "runNumber", "wave", "mapId"])
    if (previous[key] !== current[key]) return false;
  const elapsed = current.time - previous.time;
  return Number.isFinite(elapsed) && elapsed > 0 && elapsed <= MAX_GAP;
}

function continuous(old, entity, group, elapsed) {
  if (
    !old ||
    old.dead !== entity.dead ||
    old.type !== entity.type ||
    old.owner !== entity.owner ||
    old.hostile !== entity.hostile
  )
    return false;
  if (![old.x, old.y, entity.x, entity.y].every(Number.isFinite)) return false;
  // Normal needles move faster than bodies. A teleport or stale correction is
  // shown immediately instead of sweeping a body or shot across the arena.
  const speed =
    group === "shots"
      ? Math.hypot(finite(entity.vx), finite(entity.vy))
      : finite(entity.speed, 200);
  const maximum =
    group === "shots"
      ? Math.max(32, speed * elapsed * 1.5 + 8)
      : Math.min(80, Math.max(24, speed * elapsed * 1.5 + 8));
  return Math.hypot(entity.x - old.x, entity.y - old.y) <= maximum;
}

function movement(entity, input) {
  if (!input) return { vx: finite(entity.vx), vy: finite(entity.vy) };
  let x = clamp(finite(input.x), -1, 1),
    y = clamp(finite(input.y), -1, 1);
  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  const speed = Math.max(0, finite(entity.speed));
  return { vx: x * speed, vy: y * speed };
}

function clocks(entity, old, lead, elapsed) {
  const result = { ...entity };
  // An action reset is already authoritative. Advance from the current action,
  // never blend from the prior cast or from the idle sentinel.
  for (const key of ["castAge", "shotAge"])
    if (Number.isFinite(entity[key]) && entity[key] >= 0 && entity[key] < 999)
      result[key] = Math.min(999, entity[key] + lead);
  for (const key of ["life", "hit", "fireIn", "exposed"])
    if (Number.isFinite(entity[key]))
      result[key] = Math.max(0, entity[key] - lead);
  for (const key of ["orbitPhase", "phase"])
    if (
      typeof entity[key] === "number" &&
      Number.isFinite(old?.[key]) &&
      elapsed > 0
    ) {
      const rate = (entity[key] - old[key]) / elapsed;
      if (Math.abs(rate) < 20) result[key] = entity[key] + rate * lead;
    }
  return result;
}

// alpha blends the last two completed steps. leadSeconds is only presentation
// time since the current step: normally the solo accumulator (at most 1 tick),
// or bounded time since a network snapshot. Returned state must only be drawn.
// Membership, HP, deaths, stages, previews, choices and counters are current.
// Solo should leave localId null: interpolation adds up to one tick of visual
// delay but cannot overshoot on release. Supplying localId enables optional
// network prediction, whose bounded speculative lead can require correction.
export function presentState(
  previous,
  current,
  {
    alpha = 1,
    leadSeconds = 0,
    localId = null,
    input = null,
    maxLeadSeconds = STEP,
    paused = false,
  } = {},
) {
  if (!current || paused || current.phase !== "playing") return current;
  const lead = clamp(
    finite(leadSeconds),
    0,
    clamp(finite(maxLeadSeconds, STEP), 0, 0.1),
  );
  const blend = clamp(finite(alpha, 1), 0, 1);
  const canBlend = compatible(previous, current);
  const elapsed = canBlend ? current.time - previous.time : 0;
  const view = { ...current, time: finite(current.time) + lead };
  const map = current.mapId ? mapById(current.mapId) : mapForWave(current.wave);
  for (const group of groups) {
    const oldById = new Map(
      canBlend ? (previous[group] || []).map((p) => [p.id, p]) : [],
    );
    view[group] = (current[group] || []).map((entity) => {
      const old = oldById.get(entity.id);
      const smooth = continuous(old, entity, group, elapsed);
      const result = clocks(entity, smooth ? old : null, lead, elapsed);
      if (smooth) {
        result.x = old.x + (entity.x - old.x) * blend;
        result.y = old.y + (entity.y - old.y) * blend;
        if (group === "players" && entity.id === localId && !entity.dead) {
          const velocity = movement(entity, input);
          Object.assign(
            result,
            moveInMap(
              map,
              entity,
              velocity.vx * lead,
              velocity.vy * lead,
              10,
              18,
            ),
          );
          result.vx = velocity.vx;
          result.vy = velocity.vy;
          if (velocity.vx) result.face = velocity.vx > 0 ? 1 : -1;
        }
      }
      return result;
    });
  }
  view.effects = (current.effects || []).map((effect) =>
    clocks(effect, null, lead, 0),
  );
  return view;
}
