// x/y are stable feet anchors. Combat follows visible torsos and rigid weapon
// sockets; decorative breathing/recoil never changes authoritative hitboxes.
export const COMBAT_GEOMETRY = Object.freeze({
  player: Object.freeze({ bodyY: -18, radius: 12, reach: 18 }),
  soldier: Object.freeze({ bodyY: -13, radius: 6, reach: 14 }),
  mite: Object.freeze({ bodyY: -8, radius: 8, reach: 0 }),
  moth: Object.freeze({ bodyY: -13, radius: 10, reach: 9 }),
  thorn: Object.freeze({ bodyY: -18, radius: 12, reach: 22 }),
  warden: Object.freeze({ bodyY: -32, radius: 24, reach: 27 }),
});
const geometry = (actor) =>
  COMBAT_GEOMETRY[actor.type] || COMBAT_GEOMETRY.player;
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
export function bodyCircle(actor) {
  const g = geometry(actor);
  return { x: finite(actor.x), y: finite(actor.y) + g.bodyY, r: g.radius };
}
export function weaponMuzzle(actor, aim = null) {
  const body = bodyCircle(actor),
    g = geometry(actor);
  let dx = finite(aim?.x, finite(actor.aimX, actor.face === -1 ? -1 : 1));
  let dy = finite(aim?.y, finite(actor.aimY));
  const length = Math.hypot(dx, dy);
  if (length < 1e-8) {
    dx = actor.face === -1 ? -1 : 1;
    dy = 0;
  } else {
    dx /= length;
    dy /= length;
  }
  return { x: body.x + dx * g.reach, y: body.y + dy * g.reach };
}
export function aimFromWeapon(actor, targetActor) {
  const from = bodyCircle(actor),
    to = bodyCircle(targetActor);
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy);
  const aim =
    length > 1e-8
      ? { x: dx / length, y: dy / length }
      : { x: actor.face === -1 ? -1 : 1, y: 0 };
  return {
    ...weaponMuzzle(actor, aim),
    dx: aim.x,
    dy: aim.y,
    angle: Math.atan2(aim.y, aim.x),
  };
}
