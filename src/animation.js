// Pixel-snapped poses are shared by play and the workshop. Time is in seconds.
export const ANIMATION_DEFAULTS = Object.freeze({
  fps: 12,
  stride: 8,
  bob: 1,
  scarf: 1, // Apron follow; the key stays stable for workshop presets.
  idle: 1,
  hitFlash: 1,
  anticipation: 0, // Retained for older setting objects; sweep hits immediately.
  rise: 0,
  impact: 0.09,
  follow: 0.11,
  settle: 0.09,
  recover: 0.08,
});
export const ACTION_PHASES = Object.freeze([
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
  const s = { ...current, ...settings },
    q = Math.floor(time * Math.max(1, s.fps)) / Math.max(1, s.fps),
    moving =
      Math.hypot(actor.vx || 0, actor.vy || 0) > 4 || settings.state === "run",
    phase = q * s.stride,
    gait = Math.sin(phase),
    pass = Math.cos(phase),
    total = ACTION_PHASES.reduce((n, key) => n + Math.max(0.02, s[key]), 0),
    age = Number.isFinite(settings.actionTime)
      ? settings.actionTime
      : settings.state === "cast"
        ? q % (total + 0.45)
        : (actor.castAge ?? 999),
    cast = age >= 0 && age < total,
    aimLength = Math.hypot(actor.aimX || 0, actor.aimY || 0),
    aimX = aimLength > 0 ? actor.aimX / aimLength : actor.face < 0 ? -1 : 1,
    aimY = aimLength > 0 ? actor.aimY / aimLength : 0,
    shotAge = settings.shotTime ?? actor.shotAge ?? 999,
    recoil =
      shotAge >= 0 && shotAge < 0.18
        ? Math.round(3 * (1 - shotAge / 0.18) ** 2)
        : 0;
  let actionPhase = "idle",
    actionProgress = 0,
    lift = 0,
    lean = 0,
    stretch = 0,
    broomReach = 0;
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
    if (actionPhase === "impact") {
      lift = 2;
      lean = 3;
      stretch = 1;
      broomReach = 10 - a * 2;
    } else if (actionPhase === "follow") {
      lift = 2 * (1 - a);
      lean = 3 * (1 - a);
      stretch = 2 * (1 - a);
      broomReach = 8 * (1 - a);
    } else if (actionPhase === "settle") {
      lift = -Math.sin(a * Math.PI);
      lean = -a;
      stretch = -Math.sin(a * Math.PI);
      broomReach = -2;
    } else if (actionPhase === "recover") {
      lean = -(1 - a);
      broomReach = -2 * (1 - a);
    }
  }
  return {
    q,
    moving,
    aimX,
    aimY,
    recoil,
    firing: shotAge >= 0 && shotAge < 0.08,
    step: moving ? Math.round(gait * 3) : 0,
    leftLift: moving ? Math.max(0, Math.round(gait * 3)) : 0,
    rightLift: moving ? Math.max(0, Math.round(-gait * 3)) : 0,
    leftStride: moving ? Math.round(pass * 3) : 0,
    rightStride: moving ? -Math.round(pass * 3) : 0,
    coatSwing: moving ? Math.round(gait) : 0,
    bob: Math.round(
      moving
        ? Math.abs(Math.sin(phase)) * s.bob
        : Math.sin(q * 2.4) * 0.55 * s.idle,
    ),
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
    broomReach,
    needleReach: broomReach, // Compatibility with older workshop readers.
    totalDuration: total,
    blink: settings.state === "blink" || q % 4.7 > 4.5,
    hit: (actor.hit > 0 || settings.state === "hit") && s.hitFlash > 0,
    back: settings.back ?? aimY < -0.6,
    face: aimX < -0.15 ? -1 : aimX > 0.15 ? 1 : actor.face < 0 ? -1 : 1,
  };
}
