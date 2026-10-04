import { pose } from "./animation.js";
import { bodyCircle, weaponMuzzle } from "./combat-geometry.js";

// Moonlit slate, polished walnut, brass, porcelain, and a little red velvet.
export const PALETTE = Object.freeze({
  ink: "#101925",
  shadow: "#192431",
  ground: "#293645",
  moss: "#303f4d",
  grass: "#405162",
  leaf: "#617185",
  light: "#8e9aa4",
  bark: "#3c3037",
  wood: "#765341",
  stone: "#485a6c",
  stoneLight: "#788a99",
  stoneTop: "#a4b0ae",
  cream: "#f3e5c5",
  creamShade: "#d0bb98",
  creamDark: "#998c7d",
  skin: "#d4a88a",
  teal: "#4f8294",
  tealLight: "#80b7c2",
  tealDark: "#31596c",
  red: "#ae4e59",
  redLight: "#e58d7e",
  redDark: "#6d333f",
  gold: "#dbb96f",
  white: "#fff5dd",
  violet: "#ad9bc3",
  purple: "#685979",
  blue: "#9bc8d5",
  coral: "#e69a87",
  echoDark: "#31596c",
  echoMid: "#6e9eab",
  echoLight: "#b7d0ce",
});
export const PLAYER_COLORS = ["#75b9bd", "#e7b47d", "#b4a2d2", "#d8959f"];
const UNIFORMS = [
  ["#274b61", "#45798a", "#76afae"],
  ["#635044", "#9e7560", "#d9b18b"],
  ["#494867", "#756f99", "#afa6cc"],
  ["#633d54", "#a3687e", "#d8a0ad"],
];

export function pixel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function stamp(ctx, grid, x, y, colors, flip = false) {
  for (let row = 0; row < grid.length; row++)
    for (let col = 0; col < grid[row].length; col++) {
      const color = colors[grid[row][col]];
      if (color)
        pixel(
          ctx,
          x + (flip ? grid[row].length - col - 1 : col),
          y + row,
          1,
          1,
          color,
        );
    }
}
export function line(ctx, x0, y0, x1, y1, color, width = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0),
    sx = x0 < x1 ? 1 : -1,
    dy = -Math.abs(y1 - y0),
    sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (let i = 0; i < 4096; i++) {
    pixel(ctx, x0, y0, width, width, color);
    if (x0 === x1 && y0 === y1) break;
    const e = 2 * error;
    if (e >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}
export function oval(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  for (let yy = -Math.ceil(ry); yy <= ry; yy++) {
    const xx = Math.round(
      rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))),
    );
    ctx.fillRect(Math.round(x - xx), Math.round(y + yy), xx * 2 + 1, 1);
  }
}
export function shadow(ctx, x, y, r = 10) {
  oval(ctx, x, y, r, 3, PALETTE.shadow);
}

function broom(ctx, handX, handY, tipX, tipY, face, striking) {
  line(ctx, handX, handY, tipX, tipY, PALETTE.ink, 3);
  line(ctx, handX + 1, handY, tipX + 1, tipY, PALETTE.wood, 1);
  const baseX = tipX + face * (striking ? 2 : 0),
    baseY = tipY + (striking ? 0 : 1);
  pixel(ctx, baseX - 5, baseY - 2, 11, 5, PALETTE.ink);
  pixel(ctx, baseX - 4, baseY - 1, 9, 4, PALETTE.creamShade);
  pixel(ctx, baseX - 5, baseY + 2, 11, 3, PALETTE.gold);
  for (let i = -4; i <= 4; i += 2)
    pixel(ctx, baseX + i, baseY + 4, 1, 2 + (i % 3), PALETTE.creamDark);
  pixel(ctx, baseX - 2, baseY, 5, 1, PALETTE.white);
}
// Every point is rasterized; the release point is the simulation's exact muzzle.
function slingshot(ctx, actor, p, shoulderX, shoulderY) {
  const m = weaponMuzzle(actor),
    ax = p.aimX,
    ay = p.aimY,
    nx = -ay,
    ny = ax,
    gripX = m.x - ax * (5 + p.recoil),
    gripY = m.y - ay * (5 + p.recoil),
    forkX = m.x - ax * 2,
    forkY = m.y - ay * 2;
  line(ctx, shoulderX, shoulderY, gripX, gripY, PALETTE.ink, 4);
  line(ctx, shoulderX, shoulderY, gripX, gripY, PALETTE.tealDark, 2);
  pixel(ctx, gripX - 1, gripY - 1, 3, 3, PALETTE.skin);
  line(ctx, gripX, gripY, forkX + nx * 4, forkY + ny * 4, PALETTE.ink, 3);
  line(ctx, gripX, gripY, forkX - nx * 4, forkY - ny * 4, PALETTE.ink, 3);
  line(ctx, gripX, gripY, forkX + nx * 4, forkY + ny * 4, PALETTE.gold);
  line(ctx, gripX, gripY, forkX - nx * 4, forkY - ny * 4, PALETTE.wood);
  const pull = p.firing ? 0 : 3 + (p.recoil > 0 ? (p.recoil % 2 ? 1 : -1) : 0);
  line(
    ctx,
    forkX + nx * 4,
    forkY + ny * 4,
    m.x - ax * pull,
    m.y - ay * pull,
    PALETTE.cream,
  );
  line(
    ctx,
    forkX - nx * 4,
    forkY - ny * 4,
    m.x - ax * pull,
    m.y - ay * pull,
    PALETTE.cream,
  );
  pixel(
    ctx,
    m.x - 1,
    m.y - 1,
    2,
    2,
    p.firing ? PALETTE.white : PALETTE.creamShade,
  );
  if (p.firing) {
    line(
      ctx,
      m.x + nx * 5,
      m.y + ny * 5,
      m.x + nx * 7,
      m.y + ny * 7,
      PALETTE.white,
    );
    line(
      ctx,
      m.x - nx * 5,
      m.y - ny * 5,
      m.x - nx * 7,
      m.y - ny * 7,
      PALETTE.white,
    );
  }
}
function aimedEmitter(ctx, actor, ink, color, width) {
  const c = bodyCircle(actor),
    m = weaponMuzzle(actor),
    dx = m.x - c.x,
    dy = m.y - c.y,
    length = Math.hypot(dx, dy) || 1,
    ax = dx / length,
    ay = dy / length,
    recoil =
      actor.shotAge >= 0 && actor.shotAge < 0.18
        ? 2 * (1 - actor.shotAge / 0.18)
        : 0;
  line(
    ctx,
    c.x + dx * 0.35 - ax * recoil,
    c.y + dy * 0.35 - ay * recoil,
    m.x,
    m.y,
    ink,
    width + 2,
  );
  line(ctx, c.x + dx * 0.4, c.y + dy * 0.4, m.x, m.y, color, width);
  pixel(
    ctx,
    m.x - 1,
    m.y - 1,
    3,
    3,
    actor.shotAge < 0.08 ? PALETTE.white : PALETTE.gold,
  );
}
export function drawCombatGeometry(ctx, actor) {
  if (actor.dead) return;
  const c = bodyCircle(actor),
    m = weaponMuzzle(actor);
  // Midpoint circle: a one-pixel outline of the collision body.
  let x = Math.round(c.r),
    y = 0,
    error = 1 - x;
  while (x >= y) {
    for (const [dx, dy] of [
      [x, y],
      [y, x],
      [-y, x],
      [-x, y],
      [-x, -y],
      [-y, -x],
      [y, -x],
      [x, -y],
    ])
      pixel(ctx, c.x + dx, c.y + dy, 1, 1, PALETTE.tealLight);
    y++;
    if (error < 0) error += 2 * y + 1;
    else {
      x--;
      error += 2 * (y - x) + 1;
    }
  }
  line(ctx, c.x - 2, c.y, c.x + 2, c.y, PALETTE.tealLight);
  line(ctx, c.x, c.y - 2, c.x, c.y + 2, PALETTE.tealLight);
  line(ctx, m.x - 2, m.y - 2, m.x + 2, m.y + 2, PALETTE.redLight);
  line(ctx, m.x - 2, m.y + 2, m.x + 2, m.y - 2, PALETTE.redLight);
}
function drawCustodian(ctx, actor, time, settings) {
  const p = pose(actor, time, settings),
    face = p.face,
    x =
      Math.round(actor.x || 0) +
      (p.hit ? (Math.floor(time * 24) % 2 ? -1 : 1) : 0),
    y = Math.round(actor.y || 0),
    top = y - 34 - p.bob - Math.round(p.lift),
    lean = Math.round(p.lean) * face - Math.round(p.aimX * p.recoil * 0.5),
    uniform = UNIFORMS[(actor.color || 0) % UNIFORMS.length],
    ink = p.hit ? PALETTE.white : PALETTE.ink;
  shadow(ctx, x, y, 11);
  if (actor.dead) {
    pixel(ctx, x - 13, y - 5, 25, 5, ink);
    pixel(ctx, x - 10, y - 8, 19, 5, uniform[1]);
    pixel(ctx, x + 7, y - 7, 4, 3, PALETTE.skin);
    pixel(ctx, x - 13, y - 8, 6, 2, PALETTE.gold);
    return;
  }
  // Two separate planted boots keep the walk readable against patterned tile.
  const leftX = x - 6 + p.leftStride * face,
    rightX = x + 2 + p.rightStride * face;
  pixel(ctx, leftX, y - 5 - p.leftLift, 5, 5, ink);
  pixel(ctx, rightX, y - 5 - p.rightLift, 5, 5, ink);
  pixel(ctx, leftX, y - 5 - p.leftLift, 4, 2, PALETTE.wood);
  pixel(ctx, rightX, y - 5 - p.rightLift, 4, 2, PALETTE.wood);
  // Work jacket, contrasting apron, and bright badge identify the custodian.
  pixel(ctx, x - 10 + lean, top + 15, 20, 15, ink);
  pixel(ctx, x - 9 + lean, top + 16, 18, 13, uniform[0]);
  pixel(ctx, x - 8 + lean, top + 17, 16, 5, uniform[1]);
  pixel(ctx, x - 7 + lean + p.coatSwing, top + 25, 14, 5, ink);
  pixel(ctx, x - 6 + lean + p.coatSwing, top + 25, 12, 4, uniform[0]);
  pixel(ctx, x - 5 + lean, top + 19, 10, 10, PALETTE.creamDark);
  pixel(ctx, x - 4 + lean, top + 20, 8, 7, PALETTE.creamShade);
  pixel(ctx, x - 4 + lean, top + 20, 2, 6, PALETTE.cream);
  pixel(
    ctx,
    x + 1 + lean,
    top + 21,
    2,
    3,
    PLAYER_COLORS[(actor.color || 0) % 4],
  );
  pixel(
    ctx,
    x - 4 + lean + p.coatSwing,
    top + 26 + Math.round(p.stretch),
    8,
    2,
    PALETTE.creamDark,
  );
  pixel(ctx, x - 2 + lean, top + 25, 4, 1, PALETTE.wood);
  // Toe caps stay visible below the shortened hem in contact and passing poses.
  pixel(ctx, leftX, y - 2 - p.leftLift, 5, 2, PALETTE.stoneLight);
  pixel(ctx, rightX, y - 2 - p.rightLift, 5, 2, PALETTE.stoneLight);
  // The broom is carried in the other hand and strikes on the first frame.
  const handX = x - face * 10 + lean,
    handY = top + 21 + (p.moving ? p.leftLift : 0),
    sweep = p.cast,
    sweepAngle =
      Math.atan2(p.aimY, p.aimX) +
      (p.actionPhase === "follow"
        ? p.actionProgress * 1.8
        : -0.5 + p.actionProgress * 0.5);
  const carryAngle = Math.atan2(13, -face * 20);
  let broomAngle = p.cast ? sweepAngle : carryAngle;
  if (p.cast && p.actionPhase !== "impact" && p.actionPhase !== "follow") {
    const recovery =
      p.actionPhase === "settle"
        ? p.actionProgress * 0.55
        : 0.55 + p.actionProgress * 0.45;
    const blend = recovery * recovery * (3 - 2 * recovery);
    const endAngle = Math.atan2(p.aimY, p.aimX) + 1.8;
    const turn = Math.atan2(
      Math.sin(carryAngle - endAngle),
      Math.cos(carryAngle - endAngle),
    );
    broomAngle = endAngle + turn * blend;
  }
  const tipX = handX + Math.cos(broomAngle) * 24,
    tipY = handY + Math.sin(broomAngle) * 24;
  line(ctx, x - face * 6 + lean, top + 19, handX, handY, ink, 3);
  pixel(ctx, handX - 1, handY - 1, 3, 3, PALETTE.skin);
  broom(ctx, handX, handY, tipX, tipY, face, sweep);
  // Fingers wrap over the shaft so a sweeping broom stays visibly held.
  pixel(ctx, handX - 1, handY - 1, 4, 3, PALETTE.skin);
  pixel(ctx, handX, handY + 1, 2, 1, PALETTE.creamShade);
  // A square-billed cap and tired face replace the old hood silhouette.
  pixel(ctx, x - 8 + lean, top + 5, 17, 11, ink);
  pixel(ctx, x - 7 + lean, top + 6, 15, 9, PALETTE.skin);
  pixel(ctx, x - 6 + lean, top + 7, 3, 7, PALETTE.creamDark);
  if (!p.back) {
    const eyeY = top + 11;
    pixel(ctx, x - 4 + lean, eyeY, 2, 2, p.blink ? PALETTE.skin : ink);
    pixel(ctx, x + 3 + lean, eyeY, 2, 2, p.blink ? PALETTE.skin : ink);
    if (!p.blink) {
      pixel(ctx, x - 4 + lean, eyeY, 1, 1, PALETTE.white);
      pixel(ctx, x + 3 + lean, eyeY, 1, 1, PALETTE.white);
    }
    pixel(ctx, x - 1 + lean, top + 14, 3, 1, PALETTE.wood);
  } else pixel(ctx, x - 6 + lean, top + 10, 13, 4, uniform[0]);
  pixel(ctx, x - 9 + lean, top + 1, 19, 7, ink);
  pixel(ctx, x - 7 + lean, top + 1, 15, 5, uniform[0]);
  pixel(ctx, x - 5 + lean, top + 1, 11, 2, uniform[2]);
  pixel(ctx, x - 10 + lean, top + 7, 20, 3, ink);
  pixel(ctx, x - 7 + lean, top + 7, 14, 1, uniform[1]);
  pixel(ctx, x - 1 + lean, top + 4, 3, 3, PALETTE.gold);
  pixel(ctx, x + lean, top + 4, 1, 1, PALETTE.white);
  slingshot(ctx, actor, p, x + face * 6 + lean - p.aimX * p.recoil, top + 19);
}
function drawSoldier(ctx, actor, time) {
  const gait = pose(actor, time),
    speed = Math.min(1, Math.hypot(actor.vx || 0, actor.vy || 0) / 65);
  const x = Math.round(actor.x),
    y = Math.round(actor.y),
    bob = gait.moving ? gait.bob : 0;
  shadow(ctx, x, y, 7);
  for (const [offset, stride, lift] of [
    [-5, gait.leftStride, gait.leftLift],
    [1, gait.rightStride, gait.rightLift],
  ]) {
    const footX = x + offset + Math.round(stride * speed),
      footY = y - 5 - Math.round(lift * speed);
    pixel(ctx, footX, footY, 4, 5, PALETTE.ink);
    pixel(ctx, footX, footY + 2, 4, 1, PALETTE.stoneLight);
  }
  pixel(ctx, x - 6, y - 17 - bob, 13, 13, PALETTE.ink);
  pixel(ctx, x - 5, y - 16 - bob, 11, 11, PALETTE.redDark);
  pixel(ctx, x - 3, y - 15 - bob, 7, 10, PALETTE.red);
  for (const yy of [y - 13, y - 10, y - 7])
    pixel(ctx, x, yy - bob, 2, 1, PALETTE.gold);
  pixel(ctx, x - 5, y - 24 - bob, 11, 9, PALETTE.ink);
  pixel(ctx, x - 4, y - 23 - bob, 9, 7, PALETTE.creamShade);
  pixel(ctx, x - 6, y - 25 - bob, 13, 4, PALETTE.ink);
  pixel(ctx, x - 3, y - 27 - bob, 7, 3, PALETTE.gold);
  pixel(ctx, x + 2, y - 21 - bob, 1, 2, PALETTE.ink);
  aimedEmitter(ctx, actor, PALETTE.ink, PALETTE.wood, 2);
}
export function drawActor(ctx, actor, time, settings = {}) {
  if (actor.type === "soldier") return drawSoldier(ctx, actor, time);
  if (actor.type && actor.type !== "player")
    return drawEnemy(ctx, actor, time, settings);
  drawCustodian(ctx, actor, time, settings);
}

function beetle(ctx, e, time, ink) {
  const x = Math.round(e.x),
    y = Math.round(e.y),
    hop = Math.round(
      Math.abs(Math.sin(Math.floor(time * 12) * 0.8 + (e.id || 0))) * 2,
    );
  shadow(ctx, x, y, 9);
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 3; leg++) {
      const rootY = y - 12 + leg * 4 - hop,
        kneeX = x + side * (11 + (leg === 1 ? 2 : 0)),
        kneeY = rootY + (leg - 1) * 2,
        toeX = kneeX + side * 3,
        toeY =
          kneeY + 3 + ((Math.floor(time * 12) + leg + (side > 0 ? 1 : 0)) % 2);
      line(ctx, x + side * 5, rootY, kneeX, kneeY, ink, 2);
      line(ctx, kneeX, kneeY, toeX, toeY, ink, 2);
      line(ctx, x + side * 7, rootY, kneeX, kneeY, PALETTE.creamDark);
      line(ctx, kneeX, kneeY, toeX, toeY, PALETTE.stoneTop);
    }
  }
  oval(ctx, x, y - 7 - hop, 9, 7, ink);
  oval(ctx, x, y - 8 - hop, 7, 6, PALETTE.creamShade);
  oval(ctx, x - 2, y - 10 - hop, 5, 3, PALETTE.white);
  line(ctx, x, y - 13 - hop, x, y - 3 - hop, PALETTE.stoneLight);
  pixel(ctx, x - 6, y - 8 - hop, 3, 2, PALETTE.blue);
  pixel(ctx, x + 4, y - 8 - hop, 3, 2, PALETTE.blue);
  pixel(ctx, x - 3, y - 11 - hop, 1, 1, PALETTE.gold);
  pixel(ctx, x + 3, y - 11 - hop, 1, 1, PALETTE.gold);
  // Separate head plate and jointed antennae break the egg silhouette.
  pixel(ctx, x - 4, y - 18 - hop, 9, 6, ink);
  pixel(ctx, x - 3, y - 17 - hop, 7, 4, PALETTE.tealDark);
  pixel(ctx, x - 3, y - 17 - hop, 2, 2, PALETTE.blue);
  pixel(ctx, x + 2, y - 17 - hop, 2, 2, PALETTE.blue);
  for (const side of [-1, 1]) {
    line(
      ctx,
      x + side * 2,
      y - 18 - hop,
      x + side * 5,
      y - 21 - hop,
      PALETTE.creamDark,
    );
    line(
      ctx,
      x + side * 5,
      y - 21 - hop,
      x + side * 8,
      y - 21 - hop,
      PALETTE.cream,
    );
    pixel(ctx, x + side * 8, y - 22 - hop, 2, 2, PALETTE.gold);
  }
}
function moth(ctx, e, time, ink) {
  const x = Math.round(e.x),
    y = Math.round(e.y),
    flap = Math.round(Math.sin(Math.floor(time * 12) * 0.65 + (e.id || 0)) * 2);
  shadow(ctx, x, y, 10);
  for (const side of [-1, 1]) {
    oval(ctx, x + side * 7, y - 13 + flap, 8, 6, ink);
    oval(ctx, x + side * 7, y - 14 + flap, 6, 5, PALETTE.violet);
    oval(ctx, x + side * 8, y - 16 + flap, 4, 2, PALETTE.cream);
    pixel(ctx, x + side * 9 - 1, y - 13 + flap, 3, 2, PALETTE.purple);
    line(
      ctx,
      x + side * 3,
      y - 12 + flap,
      x + side * 12,
      y - 16 + flap,
      PALETTE.creamShade,
    );
    pixel(ctx, x + side * 16, y - 14 + flap, 2, 2, PALETTE.creamShade);
  }
  oval(ctx, x, y - 12 + flap, 3, 8, ink);
  pixel(ctx, x - 2, y - 18 + flap, 5, 8, PALETTE.creamShade);
  pixel(ctx, x - 1, y - 10 + flap, 3, 4, PALETTE.wood);
  line(ctx, x - 1, y - 20 + flap, x - 4, y - 24 + flap, PALETTE.creamDark);
  line(ctx, x + 1, y - 20 + flap, x + 4, y - 24 + flap, PALETTE.creamDark);
  pixel(
    ctx,
    x - 1,
    y - 19 + flap,
    1,
    1,
    e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
  );
  pixel(
    ctx,
    x + 1,
    y - 19 + flap,
    1,
    1,
    e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
  );
}
function armor(ctx, e, time, ink) {
  const gait = pose(e, time, { stride: 5 });
  const x = Math.round(e.x),
    y = Math.round(e.y),
    sway = Math.floor(time * 6 + (e.id || 0)) % 2;
  shadow(ctx, x, y, 12);
  for (const side of [-1, 1]) {
    const stride = side < 0 ? gait.leftStride : gait.rightStride,
      lift = side < 0 ? gait.leftLift : gait.rightLift;
    const footX = x + side * 5 - 2 + stride,
      footY = y - 7 - lift;
    line(ctx, x + side * 4, y - 11, footX + 2, footY + 2, ink, 5);
    pixel(ctx, footX, footY, 6, 7, ink);
    pixel(ctx, footX + 1, footY, 4, 4, PALETTE.stoneLight);
    pixel(ctx, footX, footY + 5, 6, 1, PALETTE.stoneTop);
    oval(ctx, x + side * 9, y - 20 + sway, 5, 5, ink);
    oval(ctx, x + side * 9, y - 21 + sway, 4, 3, PALETTE.stoneTop);
    line(ctx, x + side * 11, y - 18, x + side * 13, y - 8, PALETTE.stone, 3);
  }
  pixel(ctx, x - 8, y - 26, 17, 19, ink);
  pixel(ctx, x - 7, y - 25, 15, 16, PALETTE.stone);
  pixel(ctx, x - 5, y - 23, 11, 9, PALETTE.stoneLight);
  pixel(ctx, x - 2, y - 22, 5, 6, PALETTE.gold);
  pixel(ctx, x - 4, y - 14, 9, 2, PALETTE.stoneTop);
  pixel(ctx, x - 8, y - 34, 17, 11, ink);
  pixel(ctx, x - 7, y - 33, 15, 8, PALETTE.stoneLight);
  pixel(ctx, x - 5, y - 31, 11, 3, PALETTE.stoneTop);
  pixel(ctx, x - 5, y - 28, 11, 3, ink);
  pixel(
    ctx,
    x - 3,
    y - 28,
    7,
    2,
    e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
  );
  pixel(ctx, x - 2, y - 35, 5, 1, PALETTE.gold);
  aimedEmitter(ctx, e, ink, PALETTE.stoneTop, 3);
}
function curator(ctx, e, time, ink) {
  const x = Math.round(e.x),
    y = Math.round(e.y),
    bob = Math.round(Math.sin(Math.floor(time * 12) * 0.24));
  shadow(ctx, x, y, 29);
  for (const side of [-1, 1]) {
    pixel(ctx, x + side * 12 - 5, y - 16, 11, 16, ink);
    pixel(ctx, x + side * 12 - 3, y - 15, 7, 13, PALETTE.wood);
    oval(ctx, x + side * 22, y - 38 + bob, 11, 11, ink);
    oval(ctx, x + side * 22, y - 40 + bob, 9, 9, PALETTE.gold);
    oval(ctx, x + side * 22, y - 40 + bob, 5, 5, PALETTE.wood);
    pixel(ctx, x + side * 22 - 2, y - 44 + bob, 5, 2, PALETTE.cream);
    line(ctx, x + side * 22, y - 31 + bob, x + side * 27, y - 13, ink, 6);
    line(
      ctx,
      x + side * 22,
      y - 31 + bob,
      x + side * 27,
      y - 13,
      PALETTE.stone,
      3,
    );
    pixel(ctx, x + side * 25 - 3, y - 14, 8, 6, PALETTE.gold);
  }
  pixel(ctx, x - 16, y - 49 + bob, 33, 39, ink);
  pixel(ctx, x - 14, y - 47 + bob, 29, 36, PALETTE.wood);
  pixel(ctx, x - 12, y - 45 + bob, 25, 31, PALETTE.gold);
  pixel(ctx, x - 10, y - 43 + bob, 21, 28, PALETTE.stone);
  for (const dx of [-9, 8])
    pixel(ctx, x + dx, y - 43 + bob, 2, 28, PALETTE.creamShade);
  oval(ctx, x, y - 28 + bob, 12, 12, ink);
  oval(ctx, x, y - 29 + bob, 10, 10, PALETTE.creamShade);
  oval(ctx, x, y - 29 + bob, 7, 7, PALETTE.cream);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    pixel(
      ctx,
      x + Math.cos(a) * 8,
      y - 29 + bob + Math.sin(a) * 8,
      1,
      1,
      PALETTE.wood,
    );
  }
  line(ctx, x, y - 29 + bob, x + 4, y - 34 + bob, PALETTE.ink);
  line(ctx, x, y - 29 + bob, x - 1, y - 23 + bob, PALETTE.redDark);
  pixel(ctx, x - 2, y - 63 + bob, 5, 13, ink);
  pixel(ctx, x - 1, y - 62 + bob, 3, 10, PALETTE.stoneTop);
  oval(ctx, x, y - 65 + bob, 12, 4, PALETTE.gold);
  oval(ctx, x, y - 55 + bob, 14, 9, ink);
  oval(ctx, x, y - 56 + bob, 11, 7, PALETTE.creamShade);
  pixel(ctx, x - 7, y - 57 + bob, 5, 2, PALETTE.redLight);
  pixel(ctx, x + 3, y - 57 + bob, 5, 2, PALETTE.redLight);
  pixel(ctx, x - 2, y - 50 + bob, 5, 2, PALETTE.gold);
  if (e.stage >= 2) pixel(ctx, x - 14, y - 21, 28, 3, PALETTE.redDark);
  if (e.stage >= 3) pixel(ctx, x - 5, y - 30 + bob, 11, 3, PALETTE.redLight);
  // The radial volley exits a real brass clock rim, including diagonal ports.
  const rim = bodyCircle(e);
  for (let i = 0; i < 144; i++) {
    const a = (i * Math.PI) / 72;
    pixel(
      ctx,
      rim.x + Math.cos(a) * 27,
      rim.y + Math.sin(a) * 27,
      2,
      2,
      PALETTE.gold,
    );
  }
  aimedEmitter(ctx, e, ink, PALETTE.gold, 4);
}
export function drawEnemy(ctx, e, time, settings = {}) {
  const hit = e.hit > 0 || settings.state === "hit",
    ink = hit ? PALETTE.white : PALETTE.ink;
  if (e.type === "moth") {
    moth(ctx, e, time, ink);
    aimedEmitter(ctx, e, ink, PALETTE.creamShade, 1);
  } else if (e.type === "thorn") armor(ctx, e, time, ink);
  else if (e.type === "warden") curator(ctx, e, time, ink);
  else beetle(ctx, e, time, ink);
}
// The simulation still names supply stations `flowers` for save/replay stability.
export function drawFlower(ctx, f, time) {
  const x = Math.round(f.x),
    y = Math.round(f.y),
    charge = Math.max(0, Math.min(1, f.charge || 0)),
    ready = charge >= 0.85,
    shine = Math.floor(time * 6 + (f.id || 0)) % 2;
  shadow(ctx, x, y, 13);
  // Two caster wheels and a tall push handle identify a working supply cart.
  for (const dx of [-8, 8]) {
    pixel(ctx, x + dx - 2, y - 5, 5, 5, PALETTE.ink);
    pixel(ctx, x + dx - 1, y - 4, 3, 3, PALETTE.stoneLight);
    pixel(ctx, x + dx, y - 3, 1, 1, PALETTE.creamShade);
  }
  line(ctx, x - 12, y - 6, x - 12, y - 23, PALETTE.ink, 3);
  line(ctx, x - 11, y - 7, x - 11, y - 22, PALETTE.stoneLight);
  line(ctx, x - 16, y - 23, x - 10, y - 23, PALETTE.gold, 2);
  pixel(ctx, x - 10, y - 13, 23, 8, PALETTE.ink);
  pixel(ctx, x - 9, y - 12, 21, 6, PALETTE.wood);
  pixel(ctx, x - 9, y - 7, 21, 1, PALETTE.gold);
  // Bandage rolls stacked beside the medical kit.
  pixel(ctx, x + 6, y - 19, 6, 5, PALETTE.ink);
  pixel(ctx, x + 7, y - 18, 4, 3, PALETTE.creamShade);
  pixel(ctx, x + 7, y - 21, 4, 2, PALETTE.cream);
  pixel(ctx, x + 8, y - 18, 1, 2, PALETTE.wood);
  const opening = Math.round(charge * 4);
  pixel(ctx, x - 2, y - 16, 8, 8, PALETTE.ink);
  pixel(ctx, x - 1, y - 15, 6, 6, PALETTE.creamShade);
  pixel(ctx, x - 2, y - 17 - opening, 8, 2, PALETTE.cream);
  pixel(ctx, x, y - 14, 4, 1, PALETTE.red);
  pixel(ctx, x + 1, y - 15, 2, 4, PALETTE.red);
  // Charge is a physical liquid level, readable before the ready sparkle.
  pixel(ctx, x - 8, y - 23, 6, 11, PALETTE.ink);
  pixel(ctx, x - 7, y - 22, 4, 9, PALETTE.stone);
  const fill = Math.round(charge * 8);
  if (fill) pixel(ctx, x - 7, y - 13 - fill, 4, fill, PALETTE.tealLight);
  pixel(ctx, x - 7, y - 22, 1, 8, PALETTE.creamShade);
  pixel(ctx, x - 6, y - 25, 2, 2, PALETTE.white);
  if (ready) {
    pixel(ctx, x + 14, y - 23 - shine, 1, 5, PALETTE.gold);
    pixel(ctx, x + 12, y - 21 - shine, 5, 1, PALETTE.white);
  }
}
// Kept as a small museum plant for any older art callers.
export function drawFern(ctx, x, y, variant = 0) {
  pixel(ctx, x - 5, y - 5, 10, 5, PALETTE.wood);
  pixel(ctx, x - 4, y - 5, 8, 2, PALETTE.gold);
  for (const side of [-1, 1]) {
    line(ctx, x, y - 5, x + side * (variant ? 8 : 6), y - 15, PALETTE.leaf, 2);
    line(ctx, x, y - 5, x + side * 4, y - 12, PALETTE.grass, 2);
  }
}
