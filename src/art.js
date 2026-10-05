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
  const ratio = ctx._pixelRatio || 1;
  const left = Math.round(x * ratio),
    top = Math.round(y * ratio);
  ctx.fillStyle = color;
  ctx.fillRect(
    left / ratio,
    top / ratio,
    (Math.round((x + w) * ratio) - left) / ratio,
    (Math.round((y + h) * ratio) - top) / ratio,
  );
}
function snap(ctx, value) {
  const ratio = ctx._pixelRatio || 1;
  return Math.round(value * ratio) / ratio;
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
  const ratio = ctx._pixelRatio || 1;
  x0 = Math.round(x0 * ratio);
  y0 = Math.round(y0 * ratio);
  x1 = Math.round(x1 * ratio);
  y1 = Math.round(y1 * ratio);
  const dx = Math.abs(x1 - x0),
    sx = x0 < x1 ? 1 : -1,
    dy = -Math.abs(y1 - y0),
    sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (let i = 0; i < 4096; i++) {
    pixel(ctx, x0 / ratio, y0 / ratio, width, width, color);
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
  const ratio = ctx._pixelRatio || 1;
  ctx.fillStyle = color;
  for (let row = -Math.ceil(ry * ratio); row <= ry * ratio; row++) {
    const yy = row / ratio;
    const xx =
      Math.round(
        rx * ratio * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))),
      ) / ratio;
    pixel(ctx, x - xx, y + yy, xx * 2 + 1 / ratio, 1 / ratio, color);
  }
}
export function shadow(ctx, x, y, r = 10) {
  const alpha = ctx.globalAlpha ?? 1;
  ctx.globalAlpha = alpha * 0.18;
  oval(ctx, x + 3, y + 1.5, r + 3, 4.5, PALETTE.ink);
  ctx.globalAlpha = alpha * 0.24;
  oval(ctx, x + 2, y + 1, r, 3, PALETTE.ink);
  ctx.globalAlpha = alpha * 0.42;
  oval(ctx, x, y, r * 0.65, 1.5, PALETTE.ink);
  ctx.globalAlpha = alpha;
}

function broom(ctx, hx, hy, tx, ty, face, striking) {
  const s = MATERIAL,
    dx = tx - hx,
    dy = ty - hy,
    d = Math.hypot(dx, dy) || 1,
    nx = -dy / d,
    ny = dx / d,
    ax = dx / d,
    ay = dy / d;
  line(ctx, hx, hy, tx, ty, PALETTE.ink, 2);
  line(ctx, hx + 0.5, hy, tx + 0.5, ty, s.wood[2], 1);
  line(ctx, hx + 0.5, hy, tx + 0.5, ty, s.wood[4], 0.5);
  const bx = tx + ax,
    by = ty + ay,
    pts = (points) =>
      points.map(([cross, along]) => [
        nx * cross + ax * along,
        ny * cross + ay * along,
      ]);
  shape(
    ctx,
    bx,
    by,
    pts([
      [-4, -2],
      [4, -2],
      [6, 5],
      [-6, 5],
    ]),
    s.wood[0],
  );
  shape(
    ctx,
    bx,
    by,
    pts([
      [-3.5, -1],
      [3.5, -1],
      [5, 4.5],
      [-5, 4.5],
    ]),
    s.ivory[2],
  );
  shape(
    ctx,
    bx,
    by,
    pts([
      [-3, -1],
      [0, -1],
      [-1, 4.5],
      [-4.5, 4.5],
    ]),
    s.ivory[4],
  );
  for (let i = -4; i <= 4; i++)
    line(
      ctx,
      bx + nx * i * 0.7,
      by + ny * i * 0.7,
      bx + nx * i + ax * (4.5 + (i % 2) * 0.5),
      by + ny * i + ay * (4.5 + (i % 2) * 0.5),
      i % 2 ? s.ivory[1] : s.brass[3],
      0.5,
    );
  line(ctx, bx - nx * 4, by - ny * 4, bx + nx * 4, by + ny * 4, s.brass[1], 1);
  line(
    ctx,
    bx - nx * 3.5 - ax * 0.5,
    by - ny * 3.5 - ay * 0.5,
    bx + nx * 3.5 - ax * 0.5,
    by + ny * 3.5 - ay * 0.5,
    s.brass[4],
    0.5,
  );
}
function weaponArm(ctx, actor, p, sx, sy, hx, hy) {
  const c =
      actor.character === "conservator"
        ? MATERIAL.ivory[3]
        : actor.character === "guard"
          ? MATERIAL.steel[2]
          : UNIFORMS[(actor.color || 0) % 4][1],
    mx = sx + (hx - sx) * 0.55,
    my = sy + (hy - sy) * 0.55 + 1;
  line(ctx, sx, sy, mx, my, PALETTE.ink, 3.5);
  line(ctx, mx, my, hx, hy, PALETTE.ink, 3);
  line(ctx, sx + 0.5, sy, mx + 0.5, my, c, 2);
  line(ctx, mx + 0.5, my, hx + 0.5, hy, c, 1.5);
  line(
    ctx,
    mx,
    my - 0.5,
    hx,
    hy - 0.5,
    actor.character === "conservator" ? MATERIAL.ivory[5] : MATERIAL.steel[3],
    0.5,
  );
  oval(ctx, hx, hy, 1.5, 1.5, MATERIAL.skin[2]);
  pixel(ctx, hx - 0.5, hy - 1, 1, 1.5, MATERIAL.skin[4]);
}
function slingshot(ctx, actor, p, sx, sy) {
  const m = weaponMuzzle(actor),
    ax = p.aimX,
    ay = p.aimY,
    nx = -ay,
    ny = ax,
    gx = m.x - ax * (5 + p.recoil),
    gy = m.y - ay * (5 + p.recoil),
    fx = m.x - ax * 2,
    fy = m.y - ay * 2,
    s = MATERIAL;
  weaponArm(ctx, actor, p, sx, sy, gx, gy);
  for (const side of [-1, 1]) {
    const px = fx + nx * side * 3.5,
      py = fy + ny * side * 3.5;
    line(ctx, gx, gy, px, py, PALETTE.ink, 2);
    line(ctx, gx + 0.5, gy, px + 0.5, py, s.wood[3], 1);
    line(ctx, gx + 0.5, gy, px + 0.5, py, s.brass[4], 0.5);
    line(ctx, px - ax, py - ay, px + ax, py + ay, s.brass[2], 1);
    const pull = p.firing
      ? 0
      : 3 + (p.recoil > 0 ? (p.recoil % 2 ? 1 : -1) : 0);
    line(ctx, px, py, m.x - ax * pull, m.y - ay * pull, s.ivory[4], 0.5);
  }
  oval(ctx, m.x, m.y, 1, 1, p.firing ? PALETTE.white : s.ivory[2]);
  pixel(ctx, m.x - 0.5, m.y - 0.5, 0.5, 0.5, s.ivory[5]);
  if (p.firing)
    for (const side of [-1, 1])
      line(
        ctx,
        m.x + nx * side * 5,
        m.y + ny * side * 5,
        m.x + nx * side * 7,
        m.y + ny * side * 7,
        PALETTE.white,
        0.5,
      );
}
function heldWeapon(ctx, actor, p, sx, sy) {
  const starting =
      actor.character === "conservator"
        ? "lantern"
        : actor.character === "guard"
          ? "disc"
          : "slingshot",
    owned = Array.isArray(actor.weapons) ? actor.weapons : [],
    weapon =
      actor.lastWeapon && owned.includes(actor.lastWeapon)
        ? actor.lastWeapon
        : owned[0] || starting;
  if (weapon === "slingshot") return slingshot(ctx, actor, p, sx, sy);
  const m = weaponMuzzle(actor),
    ax = p.aimX,
    ay = p.aimY,
    nx = -ay,
    ny = ax,
    hx = m.x - ax * (7 + p.recoil),
    hy = m.y - ay * (7 + p.recoil),
    s = MATERIAL;
  weaponArm(ctx, actor, p, sx, sy, hx, hy);
  if (weapon === "lantern") {
    const lx = m.x - ax * 4,
      ly = m.y - ay * 4;
    // A six-sided brass cage surrounding a shaded, translucent amber core.
    shape(
      ctx,
      lx,
      ly,
      [
        [-4, -5],
        [-2.5, -7],
        [2.5, -7],
        [4, -5],
        [5, 3],
        [3, 6],
        [-3, 6],
        [-5, 3],
      ],
      PALETTE.ink,
    );
    shape(
      ctx,
      lx,
      ly,
      [
        [-3, -4],
        [-2, -5],
        [2, -5],
        [3, -4],
        [3.5, 3],
        [2, 4.5],
        [-2, 4.5],
        [-3.5, 3],
      ],
      s.brass[1],
    );
    shape(
      ctx,
      lx,
      ly,
      [
        [-2.5, -3.5],
        [2, -3.5],
        [2.5, 3],
        [-2.5, 3],
      ],
      "#bb863c",
    );
    shape(
      ctx,
      lx,
      ly,
      [
        [-1.5, -3],
        [1, -3],
        [2, 2],
        [-2, 2],
      ],
      "#efd080",
    );
    shape(
      ctx,
      lx,
      ly,
      [
        [-0.5, -2.5],
        [0.5, -1],
        [1, 1.5],
        [-1, 1.5],
      ],
      s.ivory[5],
    );
    for (const side of [-1, 1])
      line(
        ctx,
        lx + side * 3,
        ly - 4,
        lx + side * 3.5,
        ly + 3,
        s.brass[3],
        0.5,
      );
    line(ctx, lx, ly - 4, lx, ly + 3, s.brass[1], 0.5);
    shape(
      ctx,
      lx,
      ly,
      [
        [-4, -5],
        [-2, -6],
        [2, -6],
        [4, -5],
        [3, -4],
        [-3, -4],
      ],
      s.brass[3],
    );
    shape(
      ctx,
      lx,
      ly,
      [
        [-4, 3],
        [4, 3],
        [3, 5],
        [-3, 5],
      ],
      s.brass[2],
    );
    line(ctx, lx - 2.5, ly + 3.5, lx + 2.5, ly + 3.5, s.brass[4], 0.5);
    line(ctx, lx - 2, ly - 6, lx - 1, ly - 8, s.brass[1], 0.5);
    line(ctx, lx - 1, ly - 8, lx + 1, ly - 8, s.brass[3], 0.5);
    line(ctx, lx + 1, ly - 8, lx + 2, ly - 6, s.brass[1], 0.5);
    oval(ctx, m.x, m.y, 1, 1, p.firing ? PALETTE.white : s.ivory[3]);
  } else if (weapon === "disc") {
    const dx = m.x - ax * 2,
      dy = m.y - ay * 2;
    line(ctx, hx, hy, dx, dy, PALETTE.ink, 2);
    oval(ctx, dx, dy, 6, 3.5, PALETTE.ink);
    oval(ctx, dx, dy - 0.5, 5.5, 2.5, s.steel[1]);
    oval(ctx, dx - 0.5, dy - 1, 4.5, 2, s.steel[3]);
    oval(ctx, dx - 0.5, dy - 1, 3, 1.5, s.steel[4]);
    line(ctx, dx - 4, dy - 1.5, dx + 1, dy - 2, s.steel[5], 0.5);
    oval(ctx, dx + 0.5, dy - 0.5, 1.5, 1, s.brass[2]);
    pixel(ctx, dx, dy - 1, 1, 0.5, s.brass[4]);
    line(ctx, dx - 3, dy + 1.5, dx + 3, dy + 1.5, s.steel[2], 0.5);
  } else {
    line(ctx, hx, hy, m.x, m.y, PALETTE.ink, 3.5);
    line(ctx, hx, hy, m.x, m.y, s.wood[2], 2);
    for (let i = 1; i < 5; i++)
      line(
        ctx,
        hx + ax * i - nx,
        hy + ay * i - ny,
        hx + ax * i + nx,
        hy + ay * i + ny,
        s.brass[3],
        0.5,
      );
    for (const side of [-1, 1]) {
      line(
        ctx,
        m.x - ax * 5 + nx * side * 2.5,
        m.y - ay * 5 + ny * side * 2.5,
        m.x + nx * side * 3.5,
        m.y + ny * side * 3.5,
        s.brass[1],
        2,
      );
      line(
        ctx,
        m.x - ax * 5 + nx * side * 2.5,
        m.y - ay * 5 + ny * side * 2.5,
        m.x + nx * side * 3.5,
        m.y + ny * side * 3.5,
        s.brass[4],
        0.5,
      );
    }
    oval(ctx, m.x, m.y, 2, 2, p.firing ? PALETTE.white : PALETTE.blue);
    oval(ctx, m.x - 0.5, m.y - 0.5, 1, 1, PALETTE.white);
  }
  if (p.firing)
    for (const side of [-1, 1])
      pixel(
        ctx,
        m.x + nx * side * 5,
        m.y + ny * side * 5,
        1,
        1,
        side < 0 ? PALETTE.gold : PALETTE.white,
      );
}
function aimedEmitter(ctx, actor, ink, color, width) {
  const c = bodyCircle(actor),
    m = weaponMuzzle(actor),
    dx = m.x - c.x,
    dy = m.y - c.y,
    len = Math.hypot(dx, dy) || 1,
    ax = dx / len,
    ay = dy / len,
    nx = -ay,
    ny = ax,
    recoil =
      actor.shotAge >= 0 && actor.shotAge < 0.18
        ? 2 * (1 - actor.shotAge / 0.18)
        : 0,
    sx = c.x + dx * 0.35 - ax * recoil,
    sy = c.y + dy * 0.35 - ay * recoil,
    barrel = Math.hypot(m.x - sx, m.y - sy),
    r = width * 0.5,
    ramp =
      actor.type === "warden"
        ? MATERIAL.brass
        : actor.type === "soldier"
          ? MATERIAL.wood
          : MATERIAL.steel,
    form = (points) =>
      points.map(([along, cross]) => [
        ax * along + nx * cross,
        ay * along + ny * cross,
      ]);
  shape(
    ctx,
    sx,
    sy,
    form([
      [0, -r - 1],
      [barrel - 2, -r - 0.5],
      [barrel + 0.5, -r],
      [barrel + 0.5, r],
      [barrel - 2, r + 0.5],
      [0, r + 1],
    ]),
    ink,
  );
  shape(
    ctx,
    sx,
    sy,
    form([
      [0.5, -r],
      [barrel - 1, -r * 0.7],
      [barrel, -r * 0.5],
      [barrel, r * 0.5],
      [barrel - 1, r * 0.7],
      [0.5, r],
    ]),
    ramp[2],
  );
  shape(
    ctx,
    sx,
    sy,
    form([
      [1, -r],
      [barrel - 1, -r * 0.7],
      [barrel - 1, 0],
      [1, -0.25],
    ]),
    ramp[3],
  );
  line(
    ctx,
    sx + ax - nx * r * 0.7,
    sy + ay - ny * r * 0.7,
    m.x - ax - nx * r * 0.5,
    m.y - ay - ny * r * 0.5,
    ramp[4],
    0.5,
  );
  for (const along of [2, barrel - 2])
    line(
      ctx,
      sx + ax * along - nx * r,
      sy + ay * along - ny * r,
      sx + ax * along + nx * r,
      sy + ay * along + ny * r,
      ramp[1],
      0.5,
    );
  oval(
    ctx,
    m.x,
    m.y,
    Math.max(0.5, r * 0.6),
    Math.max(0.5, r * 0.6),
    actor.shotAge >= 0 && actor.shotAge < 0.08
      ? PALETTE.white
      : MATERIAL.brass[3],
  );
  pixel(ctx, m.x - 0.5, m.y - 0.5, 0.5, 0.5, MATERIAL.brass[5]);
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
  if (actor.type !== "mite") {
    line(ctx, m.x - 2, m.y - 2, m.x + 2, m.y + 2, PALETTE.redLight);
    line(ctx, m.x - 2, m.y + 2, m.x + 2, m.y - 2, PALETTE.redLight);
  }
}
// Half-unit scanlines give each staff member a 64–72 pixel authored silhouette.
function shape(ctx, x, y, points, color) {
  const step = ctx._pixelRatio >= 2 ? 0.5 : 1,
    lo = Math.min(...points.map((p) => p[1])),
    hi = Math.max(...points.map((p) => p[1]));
  for (let yy = Math.ceil(lo / step) * step; yy < hi; yy += step) {
    const cuts = [],
      scan = yy + step / 2;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan))
        cuts.push(a[0] + ((scan - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length; i += 2) {
      const left = Math.round(cuts[i] / step) * step;
      pixel(
        ctx,
        x + left,
        y + yy,
        Math.max(step, Math.round(cuts[i + 1] / step) * step - left),
        step,
        color,
      );
    }
  }
}
const MATERIAL = Object.freeze({
  skin: ["#6b4c48", "#976452", "#bf8770", "#dba48a", "#edc2a0", "#ffe0b8"],
  ivory: ["#59535a", "#897d76", "#b5a18a", "#d5c4a3", "#e8d9b7", "#fff0cf"],
  brass: ["#5b483e", "#8b6747", "#b58a52", "#d9b76b", "#ecd494", "#fff0b9"],
  steel: ["#273442", "#405061", "#627787", "#91a6ad", "#bdcbcb", "#e4e9d8"],
  wood: ["#322e38", "#513b3b", "#765143", "#9b7153", "#bf976b", "#ddba83"],
  violet: ["#302f48", "#514660", "#716083", "#a48dad", "#cfb8cb", "#efdbc9"],
});
function boot(ctx, x, y, face, shade, ink) {
  shape(
    ctx,
    x,
    y,
    [
      [-2, -7],
      [2, -7],
      [2.5, -2.5],
      [4 * face, -1.5],
      [4 * face, 0],
      [-2.5, 0],
      [-3, -1.5],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-1.5, -6.5],
      [1.5, -6.5],
      [1.5, -2],
      [3 * face, -1],
      [3 * face, -0.5],
      [-2, -0.5],
      [-2, -2],
    ],
    shade,
  );
  pixel(ctx, x - 1.5, y - 5, 1, 3, MATERIAL.steel[1]);
  line(ctx, x - 2, y - 1, x + face * 2.5, y - 1, MATERIAL.steel[3], 0.5);
  for (const yy of [-4, -3])
    pixel(ctx, x - 0.5, y + yy, 1.5, 0.5, MATERIAL.ivory[2]);
}
function staffFace(ctx, x, y, p, kind, ink) {
  const s = MATERIAL.skin,
    turn = p.aimX * 0.8,
    profile = Math.abs(p.aimX) > 0.8;
  shape(
    ctx,
    x,
    y,
    [
      [-5, -9],
      [-7, -6.5],
      [-7, -1],
      [-5.5, 2],
      [-2.5, 4],
      [2.5, 4],
      [6, 1],
      [7, -4],
      [5, -8],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-4.5, -8.5],
      [-6, -6],
      [-6, -1],
      [-4.5, 1.5],
      [-2, 3],
      [2, 3],
      [5, 1],
      [6, -4],
      [4.5, -8],
    ],
    s[2],
  );
  shape(
    ctx,
    x,
    y,
    [
      [-3.5, -7.5],
      [-5, -4],
      [-4, 0],
      [-1, 2],
      [3, 1],
      [4.5, -2],
      [4, -7],
    ],
    s[3],
  );
  shape(
    ctx,
    x,
    y,
    [
      [-3, -7],
      [-4, -4],
      [-1, -3],
      [2.5, -4],
      [3, -7],
    ],
    s[4],
  );
  pixel(ctx, x - 1.5, y + 3, 3, 2.5, s[1]);
  pixel(ctx, x - 1, y + 3, 2, 1.5, s[3]);
  for (const side of [-1, 1]) {
    oval(ctx, x + side * 6.5, y - 2, 1, 1.5, s[2]);
    pixel(ctx, x + side * 6.5, y - 2, 0.5, 1, s[1]);
  }
  if (p.back) {
    shape(
      ctx,
      x,
      y,
      [
        [-5, -8],
        [-6, -5],
        [-5.5, 0.5],
        [-3, 2],
        [3, 2],
        [5.5, 0],
        [6, -5],
        [4, -8],
      ],
      MATERIAL.wood[1],
    );
    shape(
      ctx,
      x,
      y,
      [
        [-4, -7],
        [-4.5, -4],
        [-3, 0],
        [1, 1],
        [3, -1],
        [3, -6],
      ],
      MATERIAL.wood[2],
    );
    for (const dx of [-3, -1, 1, 3])
      line(ctx, x + dx, y - 6, x + dx + 0.5, y - 1, MATERIAL.wood[3], 0.5);
    return;
  }
  const ex = turn * 1.5,
    eyes = profile ? [p.face < 0 ? -4 : 0, p.face < 0 ? 0 : 4] : [-3, 3];
  for (const dx of eyes) {
    line(
      ctx,
      x + dx - 1 + ex * 0.4,
      y - 3.5,
      x + dx + 1 + ex * 0.4,
      y - 3.5,
      s[0],
      0.5,
    );
    pixel(ctx, x + dx - 1 + ex * 0.4, y - 2.5, 2, 1, p.blink ? s[1] : s[5]);
    if (!p.blink) {
      pixel(ctx, x + dx + turn * 0.5 + ex * 0.4, y - 2.5, 0.75, 1.5, ink);
      pixel(ctx, x + dx + turn * 0.5 + ex * 0.4, y - 2.5, 0.5, 0.5, s[5]);
    }
  }
  shape(
    ctx,
    x,
    y,
    [
      [turn, -2.5],
      [turn + 1.5, 0],
      [turn - 0.5, 0.5],
      [turn - 1, -0.5],
    ],
    s[4],
  );
  pixel(ctx, x + turn - 0.5, y + 0.5, 2, 0.5, s[1]);
  line(ctx, x - 1 + turn, y + 1.5, x + 2 + turn, y + 1.5, s[0], 0.5);
  pixel(ctx, x - 0.5 + turn, y + 2, 2, 0.5, s[4]);
  pixel(ctx, x - 4.5, y - 0.5, 2, 1, "#cc8a79");
  pixel(ctx, x + 3, y - 0.5, 1.5, 1, "#cc8a79");
  if (kind === "conservator") {
    for (const dx of eyes) {
      const xx = x + dx - 1.5 + ex * 0.4;
      line(ctx, xx, y - 3, xx + 3, y - 3, MATERIAL.brass[1], 0.5);
      line(ctx, xx, y - 1, xx + 3, y - 1, MATERIAL.brass[1], 0.5);
      line(ctx, xx, y - 3, xx, y - 1, MATERIAL.brass[2], 0.5);
      line(ctx, xx + 3, y - 3, xx + 3, y - 1, MATERIAL.brass[1], 0.5);
    }
    line(
      ctx,
      x - 0.8 + ex * 0.4,
      y - 2.5,
      x + 0.8 + ex * 0.4,
      y - 2.5,
      MATERIAL.brass[3],
      0.5,
    );
  }
}
function staffHat(ctx, x, y, p, kind, u, ink) {
  if (kind === "conservator") {
    shape(
      ctx,
      x,
      y,
      [
        [-6, -8],
        [-5, -11],
        [-1, -12],
        [4, -11],
        [6, -8],
        [5, -6],
        [-5, -6],
      ],
      MATERIAL.wood[0],
    );
    shape(
      ctx,
      x,
      y,
      [
        [-5, -8],
        [-3, -10.5],
        [1, -11],
        [4, -9],
        [4.5, -7],
        [-4, -6.5],
      ],
      MATERIAL.wood[2],
    );
    line(ctx, x - 4, y - 8.5, x + 1, y - 10, MATERIAL.wood[4], 0.5);
    line(ctx, x - 2, y - 7.5, x + 3, y - 8.5, MATERIAL.wood[3], 0.5);
    oval(ctx, x + 5.5, y - 10, 2.5, 3, MATERIAL.wood[0]);
    oval(ctx, x + 5.5, y - 10.5, 1.5, 2, MATERIAL.wood[2]);
    line(ctx, x + 5, y - 12, x + 6, y - 10, MATERIAL.wood[4], 0.5);
    pixel(ctx, x + 3.5, y - 8.5, 3, 1, PALETTE.tealLight);
    return;
  }
  const guard = kind === "guard";
  shape(
    ctx,
    x,
    y,
    [
      [-7, -7],
      [-8, -10],
      [-6, -12.5],
      [-2, -13.5],
      [4, -13],
      [7, -11],
      [7.5, -7],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-6.5, -8],
      [-7, -10],
      [-5.5, -12],
      [-2, -12.5],
      [4, -12],
      [6, -10],
      [6.5, -8],
    ],
    u[0],
  );
  shape(
    ctx,
    x,
    y,
    [
      [-6, -10],
      [-4.5, -12],
      [-1, -12],
      [2, -11],
      [3, -9],
      [-5, -9],
    ],
    u[1],
  );
  line(ctx, x - 4.5, y - 11.5, x + 0.5, y - 11.5, u[2], 0.5);
  pixel(ctx, x - 6.5, y - 8, 13, 1, guard ? MATERIAL.brass[2] : u[1]);
  shape(
    ctx,
    x,
    y,
    [
      [-7, -7.5],
      [6.5, -7.5],
      [8, -6],
      [4, -5],
      [-4, -5.5],
      [-8, -6],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-6.5, -7],
      [5.5, -7],
      [6, -6.5],
      [2, -6],
      [-5, -6.5],
    ],
    u[1],
  );
  if (!p.back) {
    oval(ctx, x + 0.5, y - 9.5, 1.5, 1.5, MATERIAL.brass[1]);
    pixel(ctx, x, y - 10.5, 1.5, 2, MATERIAL.brass[3]);
    pixel(ctx, x, y - 10.5, 0.5, 0.5, MATERIAL.brass[5]);
  } else pixel(ctx, x - 2, y - 8.5, 4, 1, u[2]);
}
function staffBody(ctx, x, y, p, kind, u, ink) {
  const ivory = kind === "conservator",
    guard = kind === "guard",
    c = ivory ? MATERIAL.ivory : [u[0], u[0], u[1], u[1], u[2], u[2]],
    sw = p.coatSwing * 0.8;
  shape(
    ctx,
    x,
    y,
    [
      [-3, -21],
      [-7, -20],
      [-10, -17.5],
      [-10.5, -13],
      [-8, -11],
      [-7, -8],
      [-8 + sw, -4.5],
      [-1, -4],
      [1, -5],
      [7 + sw, -4.5],
      [8, -8],
      [7, -12],
      [10, -14],
      [10, -17],
      [6, -20],
      [3, -21],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-3, -20.5],
      [-6, -19.5],
      [-8.5, -17],
      [-8.5, -13.5],
      [-6.5, -12],
      [-6, -8],
      [-7 + sw, -5.5],
      [-1, -5],
      [0, -7],
      [1, -5.5],
      [6 + sw, -5.5],
      [7, -8],
      [6, -13],
      [8.5, -14.5],
      [8.5, -17],
      [5.5, -19.5],
      [3, -20.5],
    ],
    c[2],
  );
  shape(
    ctx,
    x,
    y,
    [
      [-5, -19],
      [-7.5, -17],
      [-7.5, -14],
      [-5.5, -13],
      [-4, -9],
      [-4.5, -6],
      [-1, -5.5],
      [-1, -18],
    ],
    c[3],
  );
  shape(
    ctx,
    x,
    y,
    [
      [4, -19],
      [7.5, -17],
      [7.5, -14.5],
      [5.5, -13],
      [6, -8],
      [5.5, -6],
      [3, -6],
      [3, -15],
    ],
    c[1],
  );
  line(ctx, x - 6.5, y - 18, x - 8, y - 15, c[4], 1);
  line(ctx, x - 5, y - 11, x - 5.5 + sw, y - 7, c[4], 0.5);
  line(ctx, x + 4, y - 11, x + 5 + sw, y - 6, c[0], 0.5);
  if (p.back) {
    shape(
      ctx,
      x,
      y,
      [
        [-5, -18],
        [-3, -19.5],
        [3, -19.5],
        [5, -18],
        [3, -16],
        [-3, -16],
      ],
      c[3],
    );
    line(ctx, x, y - 17, x, y - 6, c[1], 0.5);
    if (!guard) {
      line(
        ctx,
        x - 4,
        y - 19,
        x + 4,
        y - 8,
        ivory ? c[4] : MATERIAL.ivory[2],
        1,
      );
      line(
        ctx,
        x + 4,
        y - 19,
        x - 4,
        y - 8,
        ivory ? c[4] : MATERIAL.ivory[2],
        1,
      );
      pixel(ctx, x - 1, y - 9, 2, 1.5, MATERIAL.ivory[3]);
    }
  } else {
    shape(
      ctx,
      x,
      y,
      [
        [-3, -21],
        [-4.5, -18],
        [-1.5, -16],
        [0, -19],
      ],
      ivory ? c[5] : MATERIAL.ivory[3],
    );
    shape(
      ctx,
      x,
      y,
      [
        [3, -21],
        [4.5, -18],
        [1, -16],
        [0, -19],
      ],
      ivory ? c[3] : MATERIAL.ivory[2],
    );
    if (guard) {
      shape(
        ctx,
        x,
        y,
        [
          [0, -19],
          [-1, -16],
          [0, -13],
          [1, -16],
        ],
        ink,
      );
      for (const side of [-1, 1]) {
        shape(
          ctx,
          x,
          y,
          [
            [side * 2, -15],
            [side * 5, -15],
            [side * 5, -12],
            [side * 2, -12],
          ],
          u[0],
        );
        line(ctx, x + side * 2, y - 15, x + side * 5, y - 15, u[2], 0.5);
        pixel(ctx, x + side * 3, y - 14, 0.5, 0.5, MATERIAL.brass[3]);
      }
      shape(
        ctx,
        x,
        y,
        [
          [4.5, -18],
          [6, -17],
          [5.5, -15],
          [4.5, -14.5],
          [3.5, -16],
          [3.5, -17],
        ],
        MATERIAL.brass[3],
      );
      pixel(ctx, x + 4.5, y - 17.5, 0.5, 1.5, MATERIAL.brass[5]);
      line(ctx, x - 6, y - 7, x + 6, y - 7, MATERIAL.wood[0], 2);
      pixel(ctx, x - 1, y - 7.5, 3, 2, MATERIAL.brass[2]);
      pixel(ctx, x - 0.5, y - 7, 2, 1, MATERIAL.wood[0]);
    } else {
      const apron = ivory
        ? ["#234854", "#386775", "#57929a", "#86b7b4"]
        : MATERIAL.ivory.slice(1, 5);
      shape(
        ctx,
        x,
        y,
        [
          [-3, -18],
          [3, -18],
          [4, -7],
          [2, -5.5],
          [-4, -6.5],
        ],
        apron[0],
      );
      shape(
        ctx,
        x,
        y,
        [
          [-2.5, -17.5],
          [2.5, -17.5],
          [3, -8],
          [1.5, -6.5],
          [-3, -7],
        ],
        apron[1],
      );
      shape(
        ctx,
        x,
        y,
        [
          [-2, -17],
          [0, -17],
          [0.5, -8],
          [-2.5, -7],
        ],
        apron[2],
      );
      line(ctx, x - 1.5, y - 17, x - 1.5, y - 12, apron[3], 0.5);
      shape(
        ctx,
        x,
        y,
        [
          [-2, -12],
          [2, -12],
          [2, -9],
          [-1.5, -9],
        ],
        apron[0],
      );
      line(ctx, x - 2, y - 12, x + 2, y - 12, apron[3], 0.5);
      pixel(ctx, x + 1.5, y - 16, 1, 2, ivory ? MATERIAL.brass[3] : u[2]);
      line(ctx, x - 2.5, y - 7.5, x + 1.5, y - 7, apron[2], 0.5);
      if (ivory) {
        pixel(ctx, x + 5, y - 15, 2.5, 3, c[1]);
        pixel(ctx, x + 5, y - 15, 2.5, 0.5, c[5]);
        line(ctx, x + 5.5, y - 16.5, x + 5.5, y - 13.5, MATERIAL.wood[1], 0.5);
        pixel(ctx, x + 5, y - 17.5, 1, 1, PALETTE.tealLight);
      } else {
        oval(ctx, x + 6.5, y - 9, 1.5, 1.5, MATERIAL.brass[3]);
        oval(ctx, x + 6.5, y - 9, 0.5, 0.5, u[0]);
        line(ctx, x + 6.5, y - 7.5, x + 7.5, y - 5, MATERIAL.brass[3], 0.5);
        pixel(ctx, x + 7.5, y - 5, 1, 0.5, MATERIAL.brass[5]);
      }
    }
  }
  for (const side of [-1, 1]) {
    line(ctx, x + side * 8, y - 15.5, x + side * 6.5, y - 14, c[0], 0.5);
    line(ctx, x + side * 8, y - 14, x + side * 6.5, y - 12.5, c[4], 0.5);
  }
}
function staff(ctx, actor, time, settings, kind) {
  const p = pose(actor, time, settings),
    face = p.face,
    x =
      snap(ctx, actor.x || 0) + (p.hit && Math.floor(time * 24) % 2 ? 0.5 : 0),
    y = snap(ctx, actor.y || 0),
    lean = Math.round(p.lean) * face - p.aimX * p.recoil * 0.5,
    lift = p.bob + Math.round(p.lift),
    tx = x + lean,
    ty = y - lift,
    u =
      kind === "guard"
        ? ["#24394d", "#3d6277", "#80a0a7"]
        : UNIFORMS[(actor.color || 0) % 4],
    ink = p.hit ? PALETTE.white : PALETTE.ink;
  shadow(ctx, x, y, kind === "custodian" ? 10 : 11);
  if (actor.dead) {
    shape(
      ctx,
      x,
      y,
      [
        [-13, -1],
        [-12, -4],
        [-7, -5],
        [-3, -7],
        [5, -7],
        [8, -5],
        [11, -4],
        [12, -1],
      ],
      ink,
    );
    shape(
      ctx,
      x,
      y,
      [
        [-10, -2],
        [-8, -4],
        [-3, -6],
        [4, -6],
        [7, -4],
        [6, -2],
      ],
      kind === "conservator" ? MATERIAL.ivory[2] : u[1],
    );
    oval(ctx, x + 8, y - 4, 3, 2, MATERIAL.skin[2]);
    line(
      ctx,
      x - 4,
      y - 5,
      x + 3,
      y - 5,
      kind === "conservator" ? MATERIAL.ivory[4] : u[2],
      0.5,
    );
    return;
  }
  for (const [dx, stride, fl] of [
    [-4, p.leftStride, p.leftLift],
    [4, p.rightStride, p.rightLift],
  ]) {
    const fx = x + dx + stride * face,
      fy = y - fl;
    line(ctx, x + dx * 0.7, y - 11, fx, fy - 4, ink, 4);
    line(
      ctx,
      x + dx * 0.7 + 0.5,
      y - 10,
      fx + 0.5,
      fy - 4,
      kind === "conservator" ? MATERIAL.ivory[1] : u[0],
      2.5,
    );
    line(
      ctx,
      x + dx * 0.7 + 0.5,
      y - 9,
      fx + 0.5,
      fy - 5,
      kind === "conservator" ? MATERIAL.ivory[3] : u[1],
      0.5,
    );
    boot(
      ctx,
      fx,
      fy,
      face,
      kind === "guard" ? MATERIAL.steel[1] : MATERIAL.wood[1],
      ink,
    );
  }
  staffBody(ctx, tx, ty, p, kind, u, ink);
  const hx = tx - face * 9.5,
    hy = ty - 13 + (p.moving ? p.leftLift * 0.5 : 0);
  line(ctx, tx - face * 6, ty - 18, hx, hy, ink, 3.5);
  line(
    ctx,
    tx - face * 6,
    ty - 18,
    hx,
    hy,
    kind === "conservator" ? MATERIAL.ivory[3] : u[1],
    2,
  );
  oval(ctx, hx, hy, 1.5, 1.5, MATERIAL.skin[2]);
  pixel(ctx, hx - 0.5, hy - 1, 1, 1.5, MATERIAL.skin[4]);
  if (kind === "custodian") {
    const carry = Math.atan2(13, -face * 20),
      aim = Math.atan2(p.aimY, p.aimX);
    let angle = carry;
    if (p.cast) {
      angle =
        aim +
        (p.actionPhase === "follow"
          ? p.actionProgress * 1.8
          : -0.5 + p.actionProgress * 0.5);
      if (p.actionPhase === "settle" || p.actionPhase === "recover") {
        const v =
            p.actionPhase === "settle"
              ? p.actionProgress * 0.55
              : 0.55 + p.actionProgress * 0.45,
          b = v * v * (3 - 2 * v),
          end = aim + 1.8;
        angle =
          end + Math.atan2(Math.sin(carry - end), Math.cos(carry - end)) * b;
      }
    }
    broom(
      ctx,
      hx,
      hy,
      hx + Math.cos(angle) * 24,
      hy + Math.sin(angle) * 24,
      face,
      p.cast,
    );
    pixel(ctx, hx - 0.5, hy - 0.5, 2, 1.5, MATERIAL.skin[3]);
  } else if (kind === "conservator") {
    const bx = hx - face * (p.cast ? 10 + p.broomReach : 5),
      by = hy - (p.cast ? 6 : 1);
    line(ctx, hx, hy, bx, by, ink, 1.5);
    line(ctx, hx, hy, bx, by, MATERIAL.wood[3], 0.5);
    shape(
      ctx,
      bx,
      by,
      [
        [-2, -2.5],
        [1.5, -3],
        [2.5, -1],
        [2, 1],
        [-1, 1],
      ],
      p.cast ? PALETTE.tealLight : MATERIAL.ivory[4],
    );
    line(ctx, bx - 1, by - 2, bx + 0.5, by - 2, MATERIAL.ivory[5], 0.5);
  } else {
    const sy = hy - (p.cast ? 8 : 3);
    shape(
      ctx,
      hx,
      sy,
      [
        [-5, -6],
        [3, -6],
        [4, -4],
        [3.5, 3],
        [0, 6],
        [-4, 3],
      ],
      ink,
    );
    shape(
      ctx,
      hx,
      sy,
      [
        [-4, -5],
        [2.5, -5],
        [3, -3.5],
        [2.5, 2.5],
        [0, 4.5],
        [-3, 2.5],
      ],
      MATERIAL.steel[2],
    );
    shape(
      ctx,
      hx,
      sy,
      [
        [-3, -4],
        [1.5, -4],
        [2, -2],
        [1.5, 1.5],
        [0, 3],
        [-2, 1.5],
      ],
      p.cast ? MATERIAL.brass[3] : "#8ebac2",
    );
    line(ctx, hx - 3, sy - 4, hx - 2.5, sy + 1, MATERIAL.steel[5], 0.5);
    line(ctx, hx + 0.5, sy - 3, hx + 1, sy + 1, MATERIAL.steel[3], 0.5);
    shape(
      ctx,
      hx,
      sy,
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [0, 2],
        [-1, 1],
      ],
      MATERIAL.ivory[4],
    );
  }
  const headY = ty - 24;
  staffFace(ctx, tx, headY, p, kind, ink);
  staffHat(ctx, tx, headY, p, kind, u, ink);
  heldWeapon(ctx, actor, p, tx + face * 6 - p.aimX * p.recoil, ty - 17);
}
function drawCustodian(ctx, actor, time, settings) {
  staff(ctx, actor, time, settings, "custodian");
}
function drawSpecialist(ctx, actor, time, settings) {
  staff(ctx, actor, time, settings, actor.character);
}
function drawSoldier(ctx, actor, time) {
  const p = pose(actor, time),
    x = snap(ctx, actor.x),
    y = snap(ctx, actor.y),
    b = p.bob,
    s = MATERIAL;
  shadow(ctx, x, y, 6);
  for (const [dx, stride, lift] of [
    [-3, p.leftStride, p.leftLift],
    [3, p.rightStride, p.rightLift],
  ]) {
    const fx = x + dx + stride * 0.5,
      fy = y - lift * 0.5;
    line(ctx, x + dx, y - 8, fx, fy - 2, PALETTE.ink, 3);
    line(ctx, x + dx + 0.5, y - 8, fx + 0.5, fy - 3, s.ivory[2], 1.5);
    boot(ctx, fx, fy, p.face, s.wood[1], PALETTE.ink);
  }
  shape(
    ctx,
    x,
    y - b,
    [
      [-3, -18],
      [-6, -16],
      [-5, -11],
      [-4, -5],
      [4, -5],
      [5, -11],
      [6, -16],
      [3, -18],
    ],
    PALETTE.ink,
  );
  shape(
    ctx,
    x,
    y - b,
    [
      [-3, -17],
      [-5, -15.5],
      [-3.5, -11],
      [-3, -6],
      [3, -6],
      [3.5, -12],
      [5, -15.5],
      [3, -17],
    ],
    PALETTE.redDark,
  );
  shape(
    ctx,
    x,
    y - b,
    [
      [-3, -16],
      [-1, -17],
      [1, -16],
      [2, -7],
      [-2, -7],
    ],
    PALETTE.red,
  );
  for (const side of [-1, 1]) {
    oval(ctx, x + side * 4.5, y - 16 - b, 2, 1.5, s.brass[2]);
    pixel(ctx, x + side * 4.5 - 1, y - 17 - b, 2, 0.5, s.brass[4]);
    for (const dy of [-14, -11, -8])
      line(ctx, x + side * 2.5, y + dy - b, x, y + dy + 1 - b, s.brass[3], 0.5);
  }
  shape(
    ctx,
    x,
    y - b,
    [
      [-4, -24],
      [-4.5, -20],
      [-2.5, -17],
      [2, -17],
      [4.5, -20],
      [4, -24],
    ],
    s.wood[0],
  );
  shape(
    ctx,
    x,
    y - b,
    [
      [-3, -23.5],
      [-3.5, -20],
      [-1.5, -18],
      [2, -18],
      [3.5, -20],
      [3, -23.5],
    ],
    s.ivory[2],
  );
  shape(
    ctx,
    x,
    y - b,
    [
      [-2.5, -23],
      [-2.5, -20],
      [0, -18.5],
      [1.5, -20],
      [1, -23],
    ],
    s.ivory[4],
  );
  if (!p.back) {
    for (const dx of [-2, 2]) {
      pixel(ctx, x + dx, y - 21.5 - b, 0.5, 1, PALETTE.ink);
      pixel(ctx, x + dx, y - 22 - b, 1, 0.5, s.wood[0]);
    }
    pixel(ctx, x + 0.5, y - 20.5 - b, 1, 1, s.wood[2]);
    pixel(ctx, x - 1, y - 18.5 - b, 2, 0.5, s.wood[0]);
    pixel(ctx, x - 3, y - 20 - b, 1, 1, PALETTE.redLight);
    pixel(ctx, x + 2.5, y - 20 - b, 1, 1, PALETTE.redLight);
  } else pixel(ctx, x - 3, y - 23 - b, 6, 4, s.wood[2]);
  shape(
    ctx,
    x,
    y - b,
    [
      [-5, -23],
      [-4, -25],
      [-3, -28],
      [2, -28],
      [4, -25],
      [5, -23],
    ],
    PALETTE.ink,
  );
  shape(
    ctx,
    x,
    y - b,
    [
      [-3.5, -25],
      [-2.5, -27.5],
      [1.5, -27.5],
      [3, -25],
    ],
    s.steel[1],
  );
  line(ctx, x - 3, y - 24.5 - b, x + 3, y - 24.5 - b, s.brass[3], 0.5);
  pixel(ctx, x - 0.5, y - 26.5 - b, 1.5, 2, s.brass[3]);
  aimedEmitter(ctx, actor, PALETTE.ink, s.wood[3], 1.5);
}
export function drawActor(ctx, actor, time, settings = {}) {
  if (actor.type === "soldier") return drawSoldier(ctx, actor, time);
  if (actor.type && actor.type !== "player")
    return drawEnemy(ctx, actor, time, settings);
  if (actor.character === "conservator" || actor.character === "guard")
    return drawSpecialist(ctx, actor, time, settings);
  drawCustodian(ctx, actor, time, settings);
}
function beetle(ctx, e, time, ink) {
  const x = snap(ctx, e.x),
    y = snap(ctx, e.y),
    h = Math.round(
      Math.abs(Math.sin(Math.floor(time * 12) * 0.8 + (e.id || 0))) * 2,
    ),
    s = MATERIAL;
  shadow(ctx, x, y, 9);
  for (const side of [-1, 1])
    for (let leg = 0; leg < 3; leg++) {
      const root = y - 12 + leg * 4 - h,
        kx = x + side * (10 + (leg === 1 ? 2 : 0)),
        ky = root + (leg - 1) * 2,
        tx = kx + side * 3,
        ty = ky + 3 + ((Math.floor(time * 12) + leg + (side > 0 ? 1 : 0)) % 2);
      line(ctx, x + side * 5, root, kx, ky, ink, 2);
      line(ctx, kx, ky, tx, ty, ink, 1.5);
      line(ctx, x + side * 5.5, root, kx, ky, s.steel[2], 1);
      line(ctx, kx, ky, tx, ty, s.steel[3], 0.5);
      oval(ctx, kx, ky, 1, 1, s.brass[2]);
      pixel(ctx, kx - 0.5, ky - 0.5, 0.5, 0.5, s.brass[4]);
    }
  oval(ctx, x, y - 8 - h, 8.5, 7.5, ink);
  for (const side of [-1, 1]) {
    shape(
      ctx,
      x,
      y - h,
      [
        [side * 0.5, -15],
        [side * 4, -14.5],
        [side * 7, -12],
        [side * 8, -8],
        [side * 6.5, -3.5],
        [side * 3, -1.5],
        [side * 0.5, -2],
      ],
      s.ivory[1],
    );
    shape(
      ctx,
      x,
      y - h,
      [
        [side * 1, -14.5],
        [side * 4, -14],
        [side * 6, -11.5],
        [side * 6.5, -8],
        [side * 5, -4],
        [side * 1, -3],
      ],
      s.ivory[3],
    );
    shape(
      ctx,
      x,
      y - h,
      [
        [side * 1.5, -14],
        [side * 3.5, -13],
        [side * 4.5, -10],
        [side * 3.5, -8],
        [side * 1.5, -8],
      ],
      s.ivory[5],
    );
    line(
      ctx,
      x + side * 1,
      y - 13 - h,
      x + side * 1,
      y - 4 - h,
      s.brass[2],
      0.5,
    );
    line(
      ctx,
      x + side * 3,
      y - 11.5 - h,
      x + side * 5,
      y - 9 - h,
      PALETTE.tealDark,
      0.5,
    );
    line(
      ctx,
      x + side * 5,
      y - 9 - h,
      x + side * 4,
      y - 6 - h,
      PALETTE.tealDark,
      0.5,
    );
    line(
      ctx,
      x + side * 4,
      y - 6 - h,
      x + side * 2.5,
      y - 7 - h,
      PALETTE.teal,
      0.5,
    );
    pixel(ctx, x + side * 5, y - 11 - h, 1, 1, PALETTE.teal);
    pixel(ctx, x + side * 6, y - 6.5 - h, 0.5, 1, PALETTE.teal);
  }
  shape(
    ctx,
    x,
    y - h,
    [
      [-4, -14],
      [-5, -17],
      [-3, -20],
      [2.5, -20],
      [4.5, -17],
      [3.5, -14],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y - h,
    [
      [-3.5, -15],
      [-4, -17],
      [-2.5, -19],
      [2, -19],
      [3.5, -17],
      [3, -15],
    ],
    PALETTE.tealDark,
  );
  shape(
    ctx,
    x,
    y - h,
    [
      [-2.5, -18.5],
      [0.5, -18.5],
      [1.5, -17],
      [-2, -16],
    ],
    PALETTE.teal,
  );
  for (const side of [-1, 1]) {
    oval(ctx, x + side * 2.5, y - 17 - h, 1, 1, PALETTE.blue);
    pixel(ctx, x + side * 2.5 - 0.5, y - 17.5 - h, 0.5, 0.5, PALETTE.white);
    line(
      ctx,
      x + side * 2,
      y - 19 - h,
      x + side * 4.5,
      y - 22 - h,
      s.steel[2],
      1,
    );
    line(
      ctx,
      x + side * 4.5,
      y - 22 - h,
      x + side * 7.5,
      y - 22.5 - h,
      s.ivory[2],
      0.5,
    );
    oval(ctx, x + side * 7.5, y - 22.5 - h, 0.75, 0.75, s.brass[3]);
  }
}
function moth(ctx, e, time, ink) {
  const x = snap(ctx, e.x),
    y = snap(ctx, e.y),
    f = Math.sin(Math.floor(time * 12) * 0.65 + (e.id || 0)) * 2,
    s = MATERIAL;
  shadow(ctx, x, y, 10);
  for (const side of [-1, 1]) {
    const mirror = (points) => points.map(([px, py]) => [side * px, py]);
    shape(
      ctx,
      x,
      y - f,
      mirror([
        [1, -13],
        [7, -13],
        [12, -9],
        [12, -5],
        [9, -2],
        [6, -3],
        [2, -8],
      ]),
      ink,
    );
    shape(
      ctx,
      x,
      y - f,
      mirror([
        [2, -12],
        [7, -12],
        [11, -8.5],
        [11, -5.5],
        [8.5, -3],
        [6, -4],
        [3, -8],
      ]),
      s.violet[1],
    );
    shape(
      ctx,
      x,
      y - f,
      mirror([
        [3, -11],
        [7, -10],
        [9, -7],
        [8, -5],
        [6, -5],
        [4, -8],
      ]),
      s.violet[3],
    );
    line(
      ctx,
      x + side * 3,
      y - 10 - f,
      x + side * 8,
      y - 5 - f,
      s.violet[4],
      0.5,
    );
    shape(
      ctx,
      x,
      y + f,
      mirror([
        [1, -16],
        [4, -20],
        [10, -22],
        [14, -20],
        [16, -16],
        [15, -12],
        [12, -10],
        [7, -11],
        [3, -13],
      ]),
      ink,
    );
    shape(
      ctx,
      x,
      y + f,
      mirror([
        [2, -16],
        [5, -19.5],
        [10, -21],
        [13.5, -19],
        [15, -16],
        [14, -12.5],
        [12, -11],
        [7, -12],
        [3, -14],
      ]),
      s.violet[2],
    );
    shape(
      ctx,
      x,
      y + f,
      mirror([
        [3, -16],
        [6, -19],
        [10, -20],
        [13, -18],
        [13.5, -15],
        [11, -13],
        [7, -13],
        [4, -14],
      ]),
      s.violet[3],
    );
    shape(
      ctx,
      x,
      y + f,
      mirror([
        [5, -18],
        [9, -20],
        [12, -18.5],
        [10, -17],
        [7, -16],
      ]),
      s.violet[5],
    );
    line(
      ctx,
      x + side * 3,
      y - 15 + f,
      x + side * 12,
      y - 19 + f,
      s.ivory[2],
      0.5,
    );
    oval(ctx, x + side * 10, y - 15.5 + f, 2.75, 2.5, s.violet[0]);
    oval(ctx, x + side * 10, y - 15.5 + f, 2, 1.75, s.brass[3]);
    oval(ctx, x + side * 10, y - 15.5 + f, 1.25, 1.25, s.violet[1]);
    pixel(ctx, x + side * 10 - 0.5, y - 16 + f, 0.5, 0.5, s.ivory[5]);
    for (const [dx, dy] of [
      [13, -18],
      [14, -15],
      [12, -12.5],
    ])
      pixel(ctx, x + side * dx, y + dy + f, 0.5, 1, s.ivory[3]);
  }
  oval(ctx, x, y - 12 + f, 2.5, 7.5, ink);
  oval(ctx, x - 0.5, y - 13 + f, 1.5, 6, s.wood[2]);
  for (let i = 0; i < 4; i++)
    line(
      ctx,
      x - 1,
      y - 14 + i * 2 + f,
      x + 1,
      y - 14 + i * 2 + f,
      s.ivory[2],
      0.5,
    );
  oval(ctx, x, y - 19 + f, 2, 2.5, s.ivory[1]);
  oval(ctx, x - 0.5, y - 20 + f, 1, 1.5, s.ivory[3]);
  for (const side of [-1, 1]) {
    line(ctx, x + side, y - 21 + f, x + side * 4, y - 25 + f, s.ivory[2], 0.5);
    pixel(ctx, x + side * 4, y - 25 + f, 1, 0.5, s.ivory[4]);
    pixel(
      ctx,
      x + side * 1.5,
      y - 19.5 + f,
      0.5,
      1,
      e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
    );
  }
}
function armor(ctx, e, time, ink) {
  const p = pose(e, time, { stride: 5 }),
    x = snap(ctx, e.x),
    y = snap(ctx, e.y),
    b = p.bob * 0.5,
    s = MATERIAL.steel,
    g = MATERIAL.brass;
  shadow(ctx, x, y, 11);
  for (const side of [-1, 1]) {
    const stride = side < 0 ? p.leftStride : p.rightStride,
      lift = side < 0 ? p.leftLift : p.rightLift,
      fx = x + side * 4 + stride,
      fy = y - lift;
    line(ctx, x + side * 3, y - 12, fx, fy - 3, ink, 4.5);
    line(ctx, x + side * 3 + 0.5, y - 11, fx + 0.5, fy - 3, s[2], 2.5);
    oval(ctx, fx, fy - 7, 2.5, 2.5, ink);
    oval(ctx, fx - 0.5, fy - 7.5, 1.5, 1.5, s[3]);
    boot(ctx, fx, fy, p.face, s[2], ink);
    const sy = y - 22 + b;
    shape(
      ctx,
      x + side * 8,
      sy,
      [
        [-4, 0],
        [-3, -3.5],
        [0, -5],
        [3, -3],
        [4, 1],
        [2, 3],
        [-2, 2],
      ],
      ink,
    );
    shape(
      ctx,
      x + side * 8,
      sy,
      [
        [-3, 0],
        [-2, -3],
        [0, -4],
        [2, -2.5],
        [3, 0.5],
        [1.5, 2],
        [-1.5, 1.5],
      ],
      s[2],
    );
    shape(
      ctx,
      x + side * 8,
      sy,
      [
        [-2.5, -1],
        [-1.5, -3],
        [0, -3.5],
        [1, -2],
        [0, 0],
      ],
      s[4],
    );
    line(ctx, x + side * 9, y - 19 + b, x + side * 11, y - 13 + b, ink, 3.5);
    line(ctx, x + side * 9, y - 19 + b, x + side * 11, y - 13 + b, s[2], 2);
    oval(ctx, x + side * 11, y - 13 + b, 2, 2, s[1]);
    pixel(ctx, x + side * 11 - 0.5, y - 14 + b, 1, 1, s[4]);
    line(ctx, x + side * 11, y - 11 + b, x + side * 12, y - 8, ink, 3);
    line(ctx, x + side * 11, y - 11 + b, x + side * 12, y - 8, s[3], 1.5);
  }
  shape(
    ctx,
    x,
    y + b,
    [
      [-5, -27],
      [-8, -23],
      [-6, -16],
      [-5, -12],
      [-7, -8],
      [-2, -7],
      [0, -9],
      [2, -7],
      [7, -8],
      [5, -12],
      [6, -16],
      [8, -23],
      [5, -27],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-4.5, -26],
      [-6.5, -23],
      [-5, -17],
      [-3, -14],
      [3, -14],
      [5, -17],
      [6.5, -23],
      [4.5, -26],
    ],
    s[2],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-4, -25],
      [-5.5, -22],
      [-4, -18],
      [0, -16],
      [1, -21],
      [-1, -25],
    ],
    s[3],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-3.5, -24],
      [-4.5, -22],
      [-3, -20],
      [-1, -20],
      [-1, -24],
    ],
    s[4],
  );
  line(ctx, x, y - 25 + b, x, y - 17 + b, s[1], 0.5);
  shape(
    ctx,
    x,
    y + b,
    [
      [-1.5, -23],
      [1.5, -23],
      [2, -20],
      [0, -18],
      [-2, -20],
    ],
    g[2],
  );
  pixel(ctx, x - 0.5, y - 22.5 + b, 1, 2, g[4]);
  for (const side of [-1, 1]) {
    shape(
      ctx,
      x,
      y + b,
      [
        [side * 0.5, -13],
        [side * 4.5, -13],
        [side * 6, -9],
        [side * 2, -8],
        [side * 0.5, -10],
      ],
      s[2],
    );
    line(ctx, x + side, y - 12 + b, x + side * 4.5, y - 11 + b, s[4], 0.5);
    pixel(ctx, x + side * 3, y - 10 + b, 0.5, 0.5, g[3]);
  }
  shape(
    ctx,
    x,
    y + b,
    [
      [-5, -35],
      [-7, -32],
      [-6.5, -27],
      [-4, -24.5],
      [4, -24.5],
      [6.5, -27],
      [7, -32],
      [5, -35],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-4.5, -34],
      [-6, -31.5],
      [-5.5, -27.5],
      [-3.5, -25.5],
      [3.5, -25.5],
      [5.5, -27.5],
      [6, -31.5],
      [4.5, -34],
    ],
    s[2],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-4, -33.5],
      [-5, -31],
      [-4, -29],
      [0, -29],
      [0, -34],
    ],
    s[4],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [0, -34],
      [4, -33],
      [5, -30],
      [3, -29],
      [0, -29],
    ],
    s[3],
  );
  line(ctx, x, y - 34 + b, x, y - 29 + b, g[3], 0.5);
  shape(
    ctx,
    x,
    y + b,
    [
      [-5, -29],
      [0, -28.5],
      [5, -29],
      [4.5, -27],
      [0, -26.5],
      [-4.5, -27],
    ],
    ink,
  );
  line(
    ctx,
    x - 3.5,
    y - 28 + b,
    x + 3.5,
    y - 28 + b,
    e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
    1,
  );
  for (const dx of [-3, -1, 1, 3])
    pixel(ctx, x + dx, y - 26 + b, 0.5, 0.5, s[0]);
  aimedEmitter(ctx, e, ink, s[3], 2.5);
}
function curator(ctx, e, time, ink) {
  const p = pose(e, time, { stride: 4.5 }),
    x = snap(ctx, e.x),
    y = snap(ctx, e.y),
    b = p.moving ? p.bob : Math.round(Math.sin(Math.floor(time * 12) * 0.24)),
    s = MATERIAL;
  shadow(ctx, x, y, 28);
  for (const side of [-1, 1]) {
    const stride = side < 0 ? p.leftStride : p.rightStride,
      lift = side < 0 ? p.leftLift : p.rightLift,
      fx = x + side * 11 + stride,
      fy = y - lift;
    shape(
      ctx,
      fx,
      fy,
      [
        [-4, -19],
        [-5, -12],
        [-4, -4],
        [-6, -1],
        [-6, 0],
        [6, 0],
        [6, -2],
        [3, -5],
        [4, -17],
      ],
      ink,
    );
    shape(
      ctx,
      fx,
      fy,
      [
        [-3, -18],
        [-3.5, -12],
        [-2.5, -4],
        [3, -4],
        [2, -8],
        [3, -17],
      ],
      s.wood[2],
    );
    line(ctx, fx - 2, fy - 17, fx - 2, fy - 6, s.wood[4], 1);
    line(ctx, fx - 4, fy - 2, fx + 4, fy - 2, s.brass[2], 0.5);
    const sx = x + side * 21,
      sy = y - 40 + b;
    oval(ctx, sx, sy, 9.5, 10, ink);
    oval(ctx, sx, sy - 0.5, 8, 8.5, s.brass[1]);
    oval(ctx, sx - 1, sy - 1.5, 6.5, 7, s.brass[3]);
    oval(ctx, sx, sy, 4.5, 5, s.wood[0]);
    oval(ctx, sx - 0.5, sy - 0.5, 3, 3.5, s.brass[2]);
    oval(ctx, sx - 0.5, sy - 1, 1.5, 2, s.brass[4]);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      pixel(
        ctx,
        sx + Math.cos(a) * 6.5,
        sy + Math.sin(a) * 7,
        1,
        1,
        s.brass[i < 6 ? 1 : 4],
      );
    }
    line(ctx, sx, y - 30 + b, x + side * 26, y - 19, ink, 5);
    line(ctx, sx, y - 30 + b, x + side * 26, y - 19, s.steel[2], 3);
    line(
      ctx,
      sx - 0.5,
      y - 29 + b,
      x + side * 26 - 0.5,
      y - 19,
      s.steel[4],
      0.5,
    );
    oval(ctx, x + side * 26, y - 18, 3, 3, s.brass[1]);
    oval(ctx, x + side * 26 - 0.5, y - 18.5, 1.5, 1.5, s.brass[3]);
    line(ctx, x + side * 26, y - 15, x + side * 25, y - 10, ink, 4);
    line(ctx, x + side * 26, y - 15, x + side * 25, y - 10, s.brass[2], 2.5);
    for (const dx of [-1.5, 0, 1.5])
      line(
        ctx,
        x + side * 25 + dx,
        y - 11,
        x + side * 25 + dx,
        y - 8,
        s.brass[3],
        0.5,
      );
  }
  shape(
    ctx,
    x,
    y + b,
    [
      [-15, -48],
      [-11, -52],
      [0, -54],
      [11, -52],
      [15, -48],
      [15, -16],
      [12, -10],
      [-12, -10],
      [-15, -16],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-13.5, -47],
      [-10, -50],
      [0, -52],
      [10, -50],
      [13.5, -47],
      [13, -17],
      [11, -12],
      [-11, -12],
      [-13, -17],
    ],
    s.wood[2],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-12, -46],
      [-9, -48],
      [0, -49],
      [9, -48],
      [12, -46],
      [11, -16],
      [-11, -16],
    ],
    s.brass[2],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-9.5, -44],
      [-7, -46],
      [0, -47],
      [7, -46],
      [9.5, -44],
      [9.5, -16],
      [-9.5, -16],
    ],
    s.steel[0],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-8, -43],
      [-5, -45],
      [0, -46],
      [3, -44],
      [1, -18],
      [-8, -18],
    ],
    s.steel[1],
  );
  for (const side of [-1, 1]) {
    line(
      ctx,
      x + side * 11.5,
      y - 44 + b,
      x + side * 11.5,
      y - 18 + b,
      s.brass[4],
      1,
    );
    line(
      ctx,
      x + side * 12.5,
      y - 42 + b,
      x + side * 12.5,
      y - 19 + b,
      s.wood[0],
      0.5,
    );
    for (const dy of [-44, -18]) {
      pixel(ctx, x + side * 11.5 - 1.5, y + dy + b, 3, 1.5, s.brass[3]);
      pixel(ctx, x + side * 11.5 - 1, y + dy + b, 1, 0.5, s.brass[5]);
    }
    line(
      ctx,
      x + side * 8,
      y - 46 + b,
      x + side * 3,
      y - 49 + b,
      s.brass[4],
      0.5,
    );
  }
  oval(ctx, x, y - 29 + b, 12, 12, ink);
  oval(ctx, x, y - 29.5 + b, 11, 11, s.brass[1]);
  oval(ctx, x - 0.5, y - 30 + b, 10, 10, s.brass[3]);
  oval(ctx, x, y - 29 + b, 8.5, 8.5, s.ivory[1]);
  oval(ctx, x - 0.5, y - 29.5 + b, 8, 8, s.ivory[4]);
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    pixel(
      ctx,
      x + Math.cos(a) * 7,
      y - 29 + b + Math.sin(a) * 7,
      i % 5 ? 0.5 : 1,
      i % 5 ? 0.5 : 1,
      s.wood[1],
    );
  }
  line(ctx, x, y - 29 + b, x + 3, y - 34 + b, ink, 1);
  line(ctx, x, y - 29 + b, x - 1, y - 23 + b, PALETTE.redDark, 0.5);
  oval(ctx, x, y - 29 + b, 1, 1, s.brass[2]);
  pixel(ctx, x - 0.5, y - 29.5 + b, 0.5, 0.5, s.brass[5]);
  line(ctx, x - 2, y - 16 + b, x - 2, y - 13 + b, s.brass[2], 0.5);
  oval(ctx, x - 2, y - 13 + b, 2, 1.5, s.brass[3]);
  shape(
    ctx,
    x,
    y + b,
    [
      [-9, -63],
      [-12, -59],
      [-11, -53],
      [-7, -49],
      [0, -47],
      [7, -49],
      [11, -53],
      [12, -59],
      [9, -63],
    ],
    ink,
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-8, -62],
      [-10.5, -58.5],
      [-9.5, -53.5],
      [-6, -50],
      [0, -48.5],
      [6, -50],
      [9.5, -53.5],
      [10.5, -58.5],
      [8, -62],
    ],
    s.ivory[2],
  );
  shape(
    ctx,
    x,
    y + b,
    [
      [-7, -61],
      [-9, -58],
      [-7, -54],
      [-3, -52],
      [1, -53],
      [2, -60],
    ],
    s.ivory[4],
  );
  for (const side of [-1, 1]) {
    shape(
      ctx,
      x,
      y + b,
      [
        [side * 2, -58],
        [side * 8, -59],
        [side * 8.5, -56],
        [side * 2, -55],
      ],
      s.wood[0],
    );
    line(
      ctx,
      x + side * 3,
      y - 56.5 + b,
      x + side * 7,
      y - 57 + b,
      PALETTE.redLight,
      1,
    );
    line(
      ctx,
      x + side * 2,
      y - 59 + b,
      x + side * 8,
      y - 60 + b,
      s.brass[2],
      1,
    );
    line(
      ctx,
      x + side * 3,
      y - 50.5 + b,
      x + side * 6,
      y - 52 + b,
      s.ivory[1],
      0.5,
    );
  }
  shape(
    ctx,
    x,
    y + b,
    [
      [-1, -58],
      [2, -57],
      [2, -53],
      [-1, -52.5],
      [-2, -54],
    ],
    s.brass[2],
  );
  pixel(ctx, x - 1, y - 56.5 + b, 1, 3, s.brass[4]);
  line(ctx, x - 3, y - 50.5 + b, x + 3, y - 50.5 + b, s.wood[0], 0.5);
  oval(ctx, x, y - 65 + b, 11, 3, s.brass[1]);
  oval(ctx, x - 0.5, y - 66 + b, 9, 2, s.brass[3]);
  line(ctx, x - 6, y - 66.5 + b, x + 2, y - 66.5 + b, s.brass[5], 0.5);
  if (e.stage >= 2) line(ctx, x - 8, y - 14, x + 8, y - 14, PALETTE.redDark, 1);
  if (e.stage >= 3)
    line(ctx, x - 3, y - 29 + b, x + 3, y - 29 + b, PALETTE.redLight, 1);
  const rim = bodyCircle(e);
  for (let i = 0; i < 288; i++) {
    const a = (i * Math.PI) / 144;
    pixel(
      ctx,
      rim.x + Math.cos(a) * 27,
      rim.y + Math.sin(a) * 27,
      1,
      1,
      i % 12 < 4 ? s.brass[4] : s.brass[2],
    );
  }
  aimedEmitter(ctx, e, ink, s.brass[3], 3.5);
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
  if (hit) {
    const c = bodyCircle(e),
      x = snap(ctx, c.x - (e.face || 1) * 4),
      y = snap(ctx, c.y),
      r = e.hit > 0.08 ? 7 : 5;
    line(ctx, x - r, y, x + r, y, PALETTE.gold);
    line(ctx, x, y - r, x, y + r, PALETTE.gold);
    pixel(ctx, x - 2, y - 2, 5, 5, PALETTE.creamShade);
    pixel(ctx, x - 1, y - 3, 3, 7, PALETTE.white);
    pixel(ctx, x - 3, y - 1, 7, 3, PALETTE.white);
  }
}
export function drawFlower(ctx, f, time) {
  const x = snap(ctx, f.x),
    y = snap(ctx, f.y),
    charge = Math.max(0, Math.min(1, f.charge || 0)),
    ready = charge >= 0.85,
    s = MATERIAL;
  shadow(ctx, x, y, 13);
  for (const dx of [-8, 8]) {
    line(ctx, x + dx, y - 8, x + dx, y - 3, s.steel[2], 1.5);
    oval(ctx, x + dx, y - 2, 2.5, 2.5, PALETTE.ink);
    oval(ctx, x + dx - 0.5, y - 2.5, 1.5, 1.5, s.steel[2]);
    pixel(ctx, x + dx - 0.5, y - 2.5, 0.5, 0.5, s.steel[5]);
  }
  line(ctx, x - 12, y - 5, x - 12, y - 24, PALETTE.ink, 2.5);
  line(ctx, x - 11.5, y - 6, x - 11.5, y - 23, s.steel[3], 1);
  line(ctx, x - 15, y - 24, x - 10, y - 24, PALETTE.ink, 2);
  line(ctx, x - 14.5, y - 24, x - 10.5, y - 24, s.brass[3], 1);
  shape(
    ctx,
    x,
    y,
    [
      [-11, -14],
      [10, -14],
      [13, -12],
      [13, -5],
      [-9, -5],
      [-11, -7],
    ],
    PALETTE.ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-10, -13],
      [9.5, -13],
      [12, -11.5],
      [12, -6],
      [-8.5, -6],
      [-10, -7.5],
    ],
    s.wood[1],
  );
  shape(
    ctx,
    x,
    y,
    [
      [-9, -12],
      [10, -12],
      [10, -7],
      [-9, -7],
    ],
    s.wood[2],
  );
  shape(
    ctx,
    x,
    y,
    [
      [10, -12],
      [12, -11],
      [12, -6],
      [10, -7],
    ],
    s.wood[0],
  );
  for (const dx of [-8, 2]) {
    pixel(ctx, x + dx, y - 11, 7, 3.5, s.wood[0]);
    pixel(ctx, x + dx + 0.5, y - 10.5, 6, 2.5, s.wood[2]);
    line(ctx, x + dx + 1, y - 8.5, x + dx + 5, y - 8.5, s.wood[3], 0.5);
    line(ctx, x + dx + 2, y - 9.5, x + dx + 4, y - 9.5, s.brass[3], 0.5);
  }
  line(ctx, x - 10, y - 13.5, x + 10, y - 13.5, s.brass[3], 0.5);
  for (const dy of [-18, -21]) {
    shape(
      ctx,
      x + 8,
      y + dy,
      [
        [-2, -1],
        [2, -1],
        [3, 0],
        [3, 2],
        [-2, 2],
        [-3, 1],
      ],
      s.ivory[1],
    );
    pixel(ctx, x + 6, y + dy - 1, 4, 1, s.ivory[4]);
    oval(ctx, x + 8.5, y + dy + 0.5, 1, 0.75, s.ivory[2]);
    pixel(ctx, x + 8.5, y + dy + 0.5, 0.5, 0.5, s.wood[1]);
  }
  const opening = Math.round(charge * 4);
  shape(
    ctx,
    x,
    y,
    [
      [-2, -18],
      [5, -18],
      [6, -16],
      [6, -9],
      [-2, -9],
      [-3, -11],
      [-3, -16],
    ],
    PALETTE.ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-1.5, -17],
      [4.5, -17],
      [5, -15.5],
      [5, -10],
      [-1.5, -10],
      [-2, -11],
    ],
    s.ivory[2],
  );
  pixel(ctx, x - 1.5, y - 16, 1, 5, s.ivory[5]);
  pixel(ctx, x + 4, y - 15.5, 1, 5, s.ivory[1]);
  pixel(ctx, x, y - 14.5, 3, 1, PALETTE.red);
  pixel(ctx, x + 1, y - 15.5, 1, 3, PALETTE.red);
  shape(
    ctx,
    x,
    y,
    [
      [-2, -18 - opening],
      [5, -18 - opening],
      [6, -17 - opening],
      [-2, -16.5 - opening],
    ],
    s.ivory[4],
  );
  line(ctx, x, y - 19 - opening, x + 3, y - 19 - opening, s.wood[1], 0.5);
  pixel(ctx, x - 8, y - 24, 5, 11, PALETTE.ink);
  pixel(ctx, x - 7.5, y - 23.5, 4, 10, s.steel[1]);
  const fill = charge * 9;
  if (fill > 0.2) pixel(ctx, x - 7, y - 14 - fill, 3, fill, PALETTE.teal);
  if (fill > 1) {
    line(
      ctx,
      x - 7,
      y - 14 - fill,
      x - 4.5,
      y - 14 - fill,
      PALETTE.tealLight,
      0.5,
    );
    pixel(ctx, x - 5, y - 14 - fill + 0.5, 0.5, 0.5, PALETTE.cream);
  }
  line(ctx, x - 7.5, y - 23, x - 7.5, y - 15, s.ivory[4], 0.5);
  pixel(ctx, x - 6.5, y - 22.5, 1, 0.5, s.steel[4]);
  pixel(ctx, x - 7, y - 25, 3, 1, s.brass[2]);
  pixel(ctx, x - 6.5, y - 25.5, 2, 0.5, s.brass[4]);
  if (ready) {
    const sh = Math.floor(time * 6 + (f.id || 0)) % 2;
    line(ctx, x + 14, y - 24 - sh, x + 14, y - 20 - sh, PALETTE.gold, 0.5);
    line(ctx, x + 12, y - 22 - sh, x + 16, y - 22 - sh, PALETTE.white, 0.5);
  }
}
export function drawFern(ctx, x, y, variant = 0) {
  const s = MATERIAL;
  shadow(ctx, x, y, 7);
  shape(
    ctx,
    x,
    y,
    [
      [-6, -8],
      [6, -8],
      [5, -1],
      [3, 1],
      [-3, 1],
      [-5, -1],
    ],
    PALETTE.ink,
  );
  shape(
    ctx,
    x,
    y,
    [
      [-5, -7],
      [5, -7],
      [4, -1],
      [2.5, 0],
      [-2.5, 0],
      [-4, -1],
    ],
    s.wood[2],
  );
  shape(
    ctx,
    x,
    y,
    [
      [-4, -7],
      [-1, -7],
      [-1.5, -1],
      [-3, -1],
    ],
    s.wood[4],
  );
  shape(
    ctx,
    x,
    y,
    [
      [2, -7],
      [4.5, -7],
      [3.5, -1],
      [2, -0.5],
    ],
    s.wood[1],
  );
  oval(ctx, x, y - 8, 6.5, 2, PALETTE.ink);
  oval(ctx, x, y - 8.5, 5.5, 1.5, s.brass[2]);
  oval(ctx, x, y - 8.5, 4.5, 1, s.wood[0]);
  for (const side of [-1, 1])
    for (let frond = 0; frond < 3; frond++) {
      const endX = side * (4 + frond * 4 + (variant ? 1 : 0)),
        endY = -23 + frond * 4;
      line(ctx, x, y - 8, x + endX, y + endY, "#436267", 0.5);
      for (let leaf = 1; leaf < 6; leaf++) {
        const t = leaf / 6,
          px = endX * t,
          py = -8 + (endY + 8) * t,
          len = (1 - t) * 3 + 1;
        shape(
          ctx,
          x,
          y,
          [
            [px, py],
            [px + side * len, py - 1],
            [px + side * (len + 1), py - 2],
            [px + side * 0.5, py - 1.5],
          ],
          leaf % 2 ? "#72938d" : "#587b79",
        );
        shape(
          ctx,
          x,
          y,
          [
            [px, py],
            [px - side * len * 0.6, py - 2],
            [px - side * len * 0.5, py - 3],
            [px + side * 0.5, py - 1],
          ],
          "#91aaa0",
        );
        pixel(ctx, x + px, y + py, 0.5, 0.5, "#aec0ac");
      }
    }
}
