// Pose parameters are shared by the game and the workshop. Time is in seconds.
export const ANIMATION_DEFAULTS = Object.freeze({
  fps: 12,
  stride: 8,
  bob: 1,
  scarf: 1,
  idle: 1,
  hitFlash: 1,
  anticipation: 0.12,
  rise: 0.1,
  impact: 0.08,
  follow: 0.14,
  settle: 0.2,
  recover: 0.18,
});
export const ACTION_PHASES = Object.freeze([
  "anticipation",
  "rise",
  "impact",
  "follow",
  "settle",
  "recover",
]);
let current = { ...ANIMATION_DEFAULTS };
export function setAnimationSettings(settings = {}) {
  for (const key of Object.keys(ANIMATION_DEFAULTS)) {
    if (Number.isFinite(Number(settings[key])))
      current[key] = Math.max(
        0,
        Math.min(key === "fps" ? 30 : 20, Number(settings[key])),
      );
  }
  return { ...current };
}
export function getAnimationSettings() {
  return { ...current };
}
export function pose(actor, time, settings = {}) {
  const s = { ...current, ...settings };
  const q = Math.floor(time * Math.max(1, s.fps)) / Math.max(1, s.fps);
  const moving =
    Math.hypot(actor.vx || 0, actor.vy || 0) > 4 || settings.state === "run";
  const phase = q * s.stride,
    gait = Math.sin(phase),
    pass = Math.cos(phase);
  const total = ACTION_PHASES.reduce((n, key) => n + Math.max(0.02, s[key]), 0);
  const age = Number.isFinite(settings.actionTime)
    ? settings.actionTime
    : settings.state === "cast"
      ? q % (total + 0.6)
      : (actor.castAge ?? 999);
  const cast = age >= 0 && age < total;
  let actionPhase = "idle",
    actionProgress = 0,
    lift = 0,
    lean = 0,
    stretch = 0;
  let needleReach = 0;
  if (cast) {
    let start = 0;
    for (const name of ACTION_PHASES) {
      const duration = Math.max(0.02, s[name]);
      if (age < start + duration) {
        actionPhase = name;
        actionProgress = (age - start) / duration;
        break;
      }
      start += duration;
    }
    const a = actionProgress;
    if (actionPhase === "anticipation") {
      lift = -a;
      lean = -2 * a;
      stretch = -a;
      needleReach = -2 - a;
    }
    if (actionPhase === "rise") {
      lift = 4 * a;
      lean = -2 + 3 * a;
      stretch = 2 * a;
      needleReach = -3 + 7 * a;
    }
    if (actionPhase === "impact") {
      lift = 4;
      lean = 3;
      stretch = 2;
      needleReach = 5;
    }
    if (actionPhase === "follow") {
      lift = 4 * (1 - a);
      lean = 3 * (1 - a);
      stretch = 2 * (1 - a);
      needleReach = 5 * (1 - a);
    }
    if (actionPhase === "settle") {
      lift = -Math.sin(a * Math.PI);
      stretch = -Math.sin(a * Math.PI);
    }
  }
  return {
    q,
    moving,
    step: moving ? Math.round(gait * 2) : 0,
    // Each boot is planted at the actor's ground line for half a stride.
    leftLift: moving ? Math.max(0, Math.round(gait * 2)) : 0,
    rightLift: moving ? Math.max(0, Math.round(-gait * 2)) : 0,
    leftStride: moving ? Math.round(pass) : 0,
    rightStride: moving ? -Math.round(pass) : 0,
    coatSwing: moving ? Math.round(gait) : 0,
    bob: Math.round(
      moving
        ? Math.abs(Math.sin(phase)) * s.bob
        : Math.sin(q * 2.4) * 0.55 * s.idle,
    ),
    // The cloth catches up one pose behind the hand when the thread releases.
    scarf:
      s.scarf *
      (actionPhase === "impact" ? 1.35 : actionPhase === "follow" ? 1.2 : 1),
    cast,
    phase: actionPhase,
    actionPhase,
    actionProgress,
    lift,
    lean,
    stretch,
    needleReach,
    totalDuration: total,
    blink: settings.state === "blink" || q % 4.7 > 4.5,
    hit: (actor.hit > 0 || settings.state === "hit") && s.hitFlash > 0,
    back: settings.back ?? actor.vy < -15,
    face: actor.face < 0 ? -1 : 1,
  };
}
