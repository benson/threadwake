import {
  PALETTE as P,
  PLAYER_COLORS,
  drawActor,
  drawFlower,
  drawFern,
  stamp,
  pixel,
  line,
  oval,
  shadow,
} from "./art.js";

const W = 1200,
  H = 800;
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function surface(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function stone(ctx, x, y, w, h) {
  pixel(ctx, x + 2, y + 3, w, h, P.shadow);
  pixel(ctx, x, y, w, h, P.stone);
  pixel(ctx, x + 1, y, w - 2, 2, P.stoneTop);
  pixel(ctx, x, y + 2, 2, h - 2, P.stoneLight);
  pixel(ctx, x + w - 2, y + 3, 2, h - 3, P.bark);
  pixel(ctx, x + 3, y + 4, w - 6, 1, P.stoneLight);
}
function grassCluster(ctx, x, y, r, rand) {
  for (let j = 0; j < r; j++) {
    const gx = x + (rand() - 0.5) * r * 2,
      gy = y + (rand() - 0.5) * r * 0.65;
    const h = 2 + Math.floor(rand() * 4),
      color = rand() > 0.5 ? P.grass : P.moss;
    line(ctx, gx, gy, gx - 2, gy - h, color);
    line(ctx, gx + 1, gy, gx + 2, gy - h - 1, color);
    if (j % 4 === 0) pixel(ctx, gx + 2, gy - h, 1, 1, P.leaf);
  }
}
function loomSprite() {
  const c = surface(114, 96),
    ctx = c.getContext("2d");
  oval(ctx, 57, 88, 46, 6, P.shadow);
  // A weathered wooden loom with a half-woven constellation cloth.
  for (const x of [20, 87]) {
    pixel(ctx, x - 2, 13, 10, 74, P.ink);
    pixel(ctx, x, 13, 6, 72, P.bark);
    pixel(ctx, x, 13, 2, 69, P.wood);
    pixel(ctx, x - 5, 84, 15, 5, P.bark);
    pixel(ctx, x - 5, 84, 15, 2, P.wood);
    pixel(ctx, x - 3, 8, 12, 7, P.ink);
    pixel(ctx, x - 2, 8, 10, 5, P.wood);
    pixel(ctx, x, 8, 5, 2, P.stoneLight);
  }
  pixel(ctx, 21, 16, 72, 8, P.ink);
  pixel(ctx, 22, 17, 70, 5, P.wood);
  pixel(ctx, 23, 17, 67, 1, P.stoneLight);
  pixel(ctx, 24, 70, 65, 5, P.bark);
  pixel(ctx, 24, 70, 65, 1, P.wood);
  for (let x = 31; x < 84; x += 4) line(ctx, x, 24, x, 76, P.creamDark);
  for (let y = 34; y < 65; y++) {
    pixel(ctx, 30, y, 56, 1, y % 4 === 0 ? P.tealDark : "#3b7373");
    if (y % 4 === 0)
      for (let x = 32; x < 84; x += 4) pixel(ctx, x, y, 1, 1, P.teal);
  }
  for (let y = 0; y < 9; y++) {
    const span = Math.abs(4 - y) * 3;
    pixel(ctx, 56 - span, 41 + y * 2, 2, 2, P.creamShade);
    pixel(ctx, 58 + span, 41 + y * 2, 2, 2, P.creamShade);
  }
  pixel(ctx, 55, 45, 6, 8, P.gold);
  pixel(ctx, 57, 43, 2, 12, P.cream);
  for (let x = 32; x < 84; x += 4)
    pixel(ctx, x, 65, 1, 5 + (x % 3) * 2, P.creamDark);
  line(ctx, 29, 30, 87, 27, P.redDark, 2);
  line(ctx, 29, 29, 87, 26, P.red);
  oval(ctx, 96, 80, 7, 4, P.ink);
  oval(ctx, 96, 78, 6, 4, P.redDark);
  pixel(ctx, 94, 75, 3, 6, P.red);
  pixel(ctx, 97, 75, 1, 6, P.redLight);
  line(ctx, 94, 81, 79, 84, P.redDark);
  drawFern(ctx, 17, 86);
  drawFern(ctx, 86, 86, 1);
  return c;
}
function treeSprite(seed, scale = 1) {
  const c = surface(116, 144),
    ctx = c.getContext("2d"),
    r = random(seed);
  // Roots and trunk remain readable below overlapping, asymmetric leaf masses.
  oval(ctx, 58, 133, 37, 7, P.shadow);
  line(ctx, 55, 75, 45, 134, P.ink, 15);
  line(ctx, 60, 75, 70, 134, P.ink, 12);
  line(ctx, 55, 72, 47, 131, P.bark, 12);
  line(ctx, 59, 77, 66, 131, P.wood, 7);
  line(ctx, 54, 94, 45, 131, P.stoneLight, 2);
  line(ctx, 62, 82, 57, 128, P.bark, 4);
  line(ctx, 46, 124, 30, 136, P.bark, 5);
  line(ctx, 63, 126, 82, 137, P.bark, 5);
  line(ctx, 52, 103, 31, 72, P.bark, 7);
  line(ctx, 61, 89, 85, 65, P.wood, 6);
  const masses = [
    [42, 59, 32, 27],
    [75, 57, 32, 25],
    [56, 32, 36, 28],
    [27, 43, 24, 21],
    [87, 36, 23, 20],
    [60, 16, 22, 15],
  ];
  for (const [x, y, rx, ry] of masses) {
    oval(ctx, x, y + 3, rx, ry, P.shadow);
    oval(ctx, x - 2, y - 2, rx - 1, ry - 3, P.ground);
    oval(ctx, x - 4, y - 6, rx - 5, ry - 6, P.moss);
    oval(ctx, x - 7, y - 9, rx - 10, ry - 9, P.grass);
  }
  for (let i = 0; i < 115; i++) {
    const x = 10 + r() * 96,
      y = 7 + r() * 77;
    const covered = masses.some(
      ([a, b, rx, ry]) => ((x - a) / rx) ** 2 + ((y - b) / ry) ** 2 < 0.72,
    );
    if (!covered) continue;
    const color = r() > 0.65 ? P.leaf : P.grass;
    pixel(ctx, x, y, 3 + r() * 4, 2, color);
    pixel(ctx, x - 1, y + 2, 3, 1, color);
  }
  for (let i = 0; i < 6; i++) {
    const x = 25 + r() * 50,
      y = 115 + r() * 20;
    drawFern(ctx, x, y, 1);
  }
  return c;
}
function ruinSprite(kind = 0) {
  const c = surface(62, 80),
    ctx = c.getContext("2d");
  oval(ctx, 31, 73, 28, 5, P.shadow);
  stone(ctx, 8, 60, 45, 10);
  stone(ctx, 13, 55, 34, 7);
  stone(ctx, 18, 20, 24, 38);
  stone(ctx, 15, 15, 30, 7);
  stone(ctx, 20, 11, 20, 4);
  for (let y = 23; y < 55; y += 9) line(ctx, 19, y, 40, y, P.bark);
  line(ctx, 25, 17, 25, 56, P.stoneTop);
  line(ctx, 35, 22, 35, 55, P.bark);
  pixel(ctx, 30, 28, 3, 11, P.shadow);
  pixel(ctx, 27, 32, 9, 3, P.shadow);
  pixel(ctx, 30, 29, 1, 8, P.tealDark);
  pixel(ctx, 28, 33, 6, 1, P.tealDark);
  pixel(ctx, 16, 17, 9, 2, P.moss);
  pixel(ctx, 21, 19, 4, 7, P.grass);
  drawFern(ctx, 13, 69);
  drawFern(ctx, 45, 70, 1);
  return c;
}
function mushroom(ctx, x, y, r) {
  pixel(ctx, x, y - 6, 2, 7, P.creamDark);
  oval(ctx, x, y - 7, r, 3, P.redDark);
  oval(ctx, x - 1, y - 8, r - 1, 2, P.red);
  pixel(ctx, x - 3, y - 9, 2, 1, P.creamShade);
  pixel(ctx, x + 2, y - 8, 1, 1, P.creamShade);
}
function drawFootsteps(ctx, player, foreground = false) {
  const samples = player?.footsteps,
    preview = player?.echoPreview;
  if (player?.dead || !Array.isArray(samples) || !samples.length || !preview)
    return;
  let previous = null;
  for (let i = 0; i < samples.length; i++) {
    const step = samples[i];
    if (!Number.isFinite(step.x) || !Number.isFinite(step.y)) continue;
    if (previous && Math.hypot(step.x - previous.x, step.y - previous.y) < 9)
      continue;
    const next = samples[Math.min(samples.length - 1, i + 1)],
      heading =
        next && next !== step
          ? Math.atan2(next.y - step.y, next.x - step.x)
          : 0,
      side = i % 2 ? 1 : -1,
      x = Math.round(step.x - Math.sin(heading) * side * 3),
      y = Math.round(step.y + Math.cos(heading) * side * 2),
      age = Math.max(0, Math.min(3, step.age || 0)),
      sole = preview.ready
        ? age > 2
          ? P.echoDark
          : age > 1
            ? P.echoMid
            : P.echoLight
        : age > 2
          ? P.moss
          : P.echoDark;
    if (foreground) {
      // The recent steps remain legible when canopy and grass cross the route.
      if (age > 1.5) {
        previous = step;
        continue;
      }
      pixel(ctx, x - 2, y - 3, 5, 4, P.ink);
      pixel(ctx, x - 1, y - 2, 3, 2, preview.ready ? P.echoLight : P.echoMid);
      if (preview.ready && age < 0.55) pixel(ctx, x, y - 2, 1, 1, P.white);
      previous = step;
      continue;
    }
    pixel(ctx, x - 1, y - 2, 3, 2, sole);
    pixel(
      ctx,
      x + Math.round(Math.cos(heading) * 2),
      y - 1 + Math.round(Math.sin(heading) * 2),
      1,
      1,
      preview.ready && age < 1 ? P.white : sole,
    );
    previous = step;
  }
}
const MARKER_BOUNDS = { left: 16, right: 624, top: 16, bottom: 344 };
const HUD_ZONES = [
  { left: 0, right: 104, top: 0, bottom: 76 },
  { left: 255, right: 385, top: 0, bottom: 68 },
  { left: 520, right: 640, top: 0, bottom: 80 },
  { left: 253, right: 386, top: 301, bottom: 360 },
];
function inHudZone(x, y) {
  return HUD_ZONES.some(
    (zone) =>
      x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom,
  );
}
function safeMarkerPosition(sx, sy) {
  const { left, right, top, bottom } = MARKER_BOUNDS;
  if (
    sx >= left &&
    sx <= right &&
    sy >= top &&
    sy <= bottom &&
    !inHudZone(sx, sy)
  )
    return null;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const candidates = [
    { x: left, y: clamp(sy, 84, 294) },
    { x: right, y: clamp(sy, 88, 294) },
    { x: clamp(sx, 113, 246), y: top },
    { x: clamp(sx, 394, 511), y: top },
    { x: clamp(sx, left, 245), y: bottom },
    { x: clamp(sx, 394, right), y: bottom },
  ];
  return candidates.reduce((best, candidate) =>
    Math.hypot(sx - candidate.x, sy - candidate.y) <
    Math.hypot(sx - best.x, sy - best.y)
      ? candidate
      : best,
  );
}
function drawPreviewAnchor(ctx, player) {
  const preview = player?.echoPreview;
  if (
    player?.dead ||
    !preview ||
    !Number.isFinite(preview.x) ||
    !Number.isFinite(preview.y)
  )
    return;
  const x = Math.round(preview.x),
    y = Math.round(preview.y),
    radius = preview.projected ? 12 : 10,
    color = preview.ready
      ? preview.projected
        ? P.gold
        : PLAYER_COLORS[(player.color || 0) % 4]
      : P.echoDark;
  if (preview.projected && preview.ready) {
    const distance = Math.hypot(player.x - x, player.y - y),
      marks = Math.min(9, Math.floor(distance / 13));
    for (let i = 1; i < marks; i++) {
      const t = i / marks;
      pixel(
        ctx,
        player.x + (x - player.x) * t,
        player.y - 4 + (y - player.y) * t,
        1,
        1,
        i % 2 ? P.echoDark : P.gold,
      );
    }
  }
  // A hollow landing mark cannot be mistaken for an existing solid echo.
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      px = x + Math.cos(angle) * radius,
      py = y - 4 + Math.sin(angle) * radius * 0.45;
    pixel(ctx, px, py, i % 2 ? 1 : 2, 1, color);
  }
  pixel(ctx, x - 1, y - 5, 3, 3, preview.ready ? P.white : P.echoMid);
  if (preview.projected) {
    pixel(ctx, x - 2, y - 14, 5, 1, color);
    pixel(ctx, x, y - 16, 1, 5, color);
  }
}
function drawAttackTelegraph(ctx, enemy, time) {
  if (
    enemy.type === "mite" ||
    !Number.isFinite(enemy.fireIn) ||
    enemy.fireIn >= 0.9
  ) return;
  const charge = Math.max(0, 1 - enemy.fireIn / 0.9),
    boss = enemy.type === "warden",
    rad = (boss ? 34 : 16) - charge * 5,
    centerY = enemy.y - (boss ? 19 : 10),
    cue = charge > 0.7 ? P.white : P.redLight;
  for (let i = 0; i < (boss ? 12 : 8); i++) {
    const angle =
      (i * Math.PI * 2) / (boss ? 12 : 8) +
      Math.floor(time * 12) * 0.12;
    pixel(
      ctx,
      enemy.x + Math.cos(angle) * rad,
      centerY + Math.sin(angle) * rad * 0.75,
      charge > 0.75 ? 2 : 1,
      charge > 0.75 ? 2 : 1,
      cue,
    );
  }
  // Preview the committed volley direction. Boss stages all release a
  // ring; later stages add an aimed fan or a focused shot.
  const aim = Math.atan2(
      Number.isFinite(enemy.aimY) ? enemy.aimY : 0,
      Number.isFinite(enemy.aimX) ? enemy.aimX : enemy.face || 1,
    ),
    attack =
      enemy.attack ||
      (boss ? "ring" : enemy.type === "thorn" ? "fan" : "needle"),
    reach = (boss ? 42 : 34) * (0.55 + charge * 0.45);
  if (boss) {
    for (let j = 0; j < (attack === "spiral" ? 12 : 8); j++) {
      const a =
        (j * Math.PI * 2) / (attack === "spiral" ? 12 : 8) +
        (attack === "spiral" ? Math.floor(time * 8) * 0.13 : 0);
      pixel(
        ctx,
        enemy.x + Math.cos(a) * reach,
        centerY + Math.sin(a) * reach * 0.75,
        2,
        2,
        cue,
      );
    }
  }
  if (enemy.fireIn <= 0.65) {
    const rays = attack === "ring" ? 1 : attack === "fan" ? 3 : 1;
    for (let j = 0; j < rays; j++) {
      const a = aim + (j - (rays - 1) / 2) * (boss ? 0.2 : 0.22);
      for (let d = 10; d < reach; d += 7)
        pixel(
          ctx,
          enemy.x + Math.cos(a) * d,
          centerY + Math.sin(a) * d,
          charge > 0.75 ? 2 : 1,
          1,
          cue,
        );
    }
  }
  pixel(
    ctx,
    enemy.x - 1,
    centerY - 1,
    3,
    3 + charge * 2,
    charge > 0.75 ? P.white : P.redLight,
  );
}
function sceneryAlpha(players, prop, halfWidth, top, bottom, coreAlpha) {
  let fade = 0;
  for (const player of players || []) {
    const edge = Math.min(
      (halfWidth - Math.abs(player.x - prop.x)) / 18,
      (player.y - (prop.y - top)) / 16,
      ((prop.y - bottom) - player.y) / 16,
      1,
    );
    if (edge > 0) fade = Math.max(fade, edge * edge * (3 - 2 * edge));
  }
  return 1 - (1 - coreAlpha) * fade;
}
function bake(seed) {
  const c = surface(W, H),
    ctx = c.getContext("2d"),
    r = random(seed || 31337);
  pixel(ctx, 0, 0, W, H, P.ground);
  // Interlocking, low-contrast earth tiles avoid obvious procedural circles.
  for (let i = 0; i < 280; i++) {
    const x = Math.floor((r() * W) / 4) * 4,
      y = Math.floor((r() * H) / 3) * 3,
      wide = 12 + Math.floor(r() * 20) * 3;
    const color = i % 3 === 0 ? "#2d493a" : "#2b4538";
    for (let row = 0; row < 5; row++) {
      const inset = Math.floor(r() * 7) * 3;
      pixel(ctx, x + inset, y + row * 3, Math.max(3, wide - inset), 3, color);
    }
  }
  // The cracked circular shrine is a quiet piece of world geometry, not a UI ring.
  for (let i = 0; i < 52; i++) {
    const a = (i * Math.PI * 2) / 52,
      x = 600 + Math.cos(a) * 147,
      y = 400 + Math.sin(a) * 96;
    if (i % 7 === 0 || i % 11 === 0) continue;
    stone(
      ctx,
      Math.round(x) - 8,
      Math.round(y) - 4,
      14 + Math.floor(r() * 5),
      7 + Math.floor(r() * 4),
    );
    if (i % 3 === 0) pixel(ctx, x - 5, y - 5, 8, 2, P.moss);
    if (i % 4 === 0) {
      line(ctx, x, y - 3, x - 2, y + 2, P.shadow);
      pixel(ctx, x + 5, y + 2, 4, 3, P.ground);
    }
  }
  // Broken paths reach the ring from opposite forest gates.
  for (let i = 0; i < 34; i++) {
    const y = i * 25 + 6,
      x = 585 + Math.sin(y * 0.014) * 32;
    if (y > 300 && y < 500) continue;
    for (let j = 0; j < 3; j++)
      if (r() > 0.18)
        stone(
          ctx,
          x + j * 17 + Math.round(r() * 3),
          y + Math.round(r() * 4),
          12 + Math.floor(r() * 6),
          7 + Math.floor(r() * 5),
        );
  }
  for (let i = 0; i < 4400; i++) {
    const x = Math.floor(r() * W),
      y = Math.floor(r() * H),
      color = i % 5 === 0 ? P.grass : P.moss;
    pixel(ctx, x, y, 2 + Math.floor(r() * 4), 1, color);
    if (i % 4 === 0) {
      pixel(ctx, x + 1, y - 2, 1, 3, color);
      pixel(ctx, x + 3, y - 1, 1, 2, color);
    }
  }
  for (let i = 0; i < 125; i++)
    grassCluster(ctx, r() * W, r() * H, 8 + Math.floor(r() * 9), r);
  // Flowering banks flank the paths. Tiny pale buds stay dimmer than spell shots.
  for (const [cx, cy] of [
    [412, 376],
    [788, 450],
    [509, 552],
    [734, 259],
    [315, 493],
  ]) {
    for (let i = 0; i < 25; i++) {
      const x = cx + (r() - 0.5) * 65,
        y = cy + (r() - 0.5) * 23;
      line(ctx, x, y, x - 1, y - 4, P.grass);
      if (i % 3 === 0) {
        pixel(ctx, x - 2, y - 5, 3, 2, "#a98d83");
        pixel(ctx, x - 1, y - 6, 1, 1, P.creamDark);
      } else {
        pixel(ctx, x, y - 4, 2, 1, P.leaf);
      }
    }
  }
  for (let i = 0; i < 110; i++) {
    const x = r() * W,
      y = r() * H;
    if (i % 5 === 0) mushroom(ctx, x, y, 3 + Math.floor(r() * 3));
    else if (i % 3 === 0) {
      oval(ctx, x, y, 4, 2, P.shadow);
      oval(ctx, x - 1, y - 1, 3, 2, P.stone);
      pixel(ctx, x - 2, y - 2, 3, 1, P.stoneLight);
    } else drawFern(ctx, x, y, i % 2);
  }
  // The physical boundary is a dense hedge. Collision remains unobscured inside it.
  for (let x = 0; x < W; x += 9) {
    oval(ctx, x, 7, 13, 10, P.shadow);
    oval(ctx, x, H - 5, 15, 10, P.shadow);
  }
  for (let y = 0; y < H; y += 9) {
    oval(ctx, 6, y, 10, 13, P.shadow);
    oval(ctx, W - 5, y, 10, 15, P.shadow);
  }
  const trees = [
    treeSprite(seed + 4),
    treeSprite(seed + 8),
    treeSprite(seed + 17),
  ];
  const props = [];
  // Thick woodland around the perimeter, small islands well clear of the center.
  for (let x = -15; x < W + 60; x += 65) {
    props.push({
      x,
      y: 78 + Math.floor(r() * 25),
      type: "tree",
      variant: Math.floor(r() * 3),
    });
    props.push({
      x: x + 20,
      y: H + 45 + Math.floor(r() * 20),
      type: "tree",
      variant: Math.floor(r() * 3),
    });
  }
  for (let y = 140; y < H; y += 90) {
    props.push({
      x: 25 + r() * 20,
      y,
      type: "tree",
      variant: Math.floor(r() * 3),
    });
    props.push({
      x: W - 25 - r() * 15,
      y: y + 25,
      type: "tree",
      variant: Math.floor(r() * 3),
    });
  }
  for (const [x, y] of [
    [270, 225],
    [930, 235],
    [300, 340],
    [907, 357],
    [280, 540],
    [960, 600],
    [408, 240],
    [823, 256],
    [367, 650],
    [855, 630],
  ])
    props.push({ x, y, type: "tree", variant: Math.floor(r() * 3) });
  for (const [x, y] of [
    [445, 315],
    [755, 315],
    [445, 530],
    [755, 530],
  ])
    props.push({ x, y, type: "ruin" });
  props.push({ x: 606, y: 326, type: "loom" });
  // Knotted roots curl around the old walls, grounded in the grass layer.
  for (const [x, y, dir] of [
    [368, 391, -1],
    [846, 455, 1],
    [373, 600, 1],
  ]) {
    line(ctx, x, y, x + dir * 48, y + 10, P.shadow, 6);
    line(ctx, x, y, x + dir * 48, y + 10, P.bark, 4);
    line(ctx, x, y - 1, x + dir * 46, y + 9, P.wood);
    line(ctx, x + dir * 20, y + 4, x + dir * 33, y - 7, P.bark, 3);
    grassCluster(ctx, x + dir * 38, y + 12, 18, r);
  }
  // Low broken wall fragments give the forest an inhabited past.
  for (const [x, y] of [
    [329, 355],
    [849, 355],
    [340, 530],
    [845, 530],
  ])
    for (let j = 0; j < 3; j++) stone(ctx, x + j * 18, y, 16, 9);
  props.sort((a, b) => a.y - b.y);
  return { ground: c, props, trees, ruin: ruinSprite(), loom: loomSprite() };
}
export function createRenderer(canvas) {
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const camera = { x: 600, y: 400 };
  let art = null,
    lastSeed = null,
    lastTime = null,
    damage = 0,
    previousHP = null;
  const sorted = [];
  function screenToWorld(x, y) {
    return { x: x + camera.x - 320, y: y + camera.y - 180 };
  }
  function draw(state, localId, time = 0, options = {}) {
    const seed = state?.seed || 17;
    if (!art || seed !== lastSeed) {
      art = bake(seed);
      lastSeed = seed;
    }
    const player =
      state?.players?.find((p) => p.id === localId) || state?.players?.[0];
    const dt =
      lastTime === null ? 1 / 60 : Math.min(0.05, Math.max(0, time - lastTime));
    lastTime = time;
    const tx = player?.x ?? 600,
      ty = player?.y ?? 400;
    const follow = 1 - Math.exp(-dt * 8);
    camera.x += (Math.max(320, Math.min(W - 320, tx)) - camera.x) * follow;
    camera.y += (Math.max(180, Math.min(H - 180, ty)) - camera.y) * follow;
    if (player && previousHP !== null && player.hp < previousHP) damage = 0.15;
    previousHP = player?.hp ?? null;
    damage = Math.max(0, damage - dt);
    const shake =
      options.reducedMotion || options.shake === false
        ? 0
        : Math.round(Math.sin(time * 87) * damage * 12);
    const ox = Math.round(camera.x - 320) + shake,
      oy = Math.round(camera.y - 180);
    pixel(ctx, 0, 0, 640, 360, P.shadow);
    ctx.save();
    ctx.translate(-ox, -oy);
    ctx.drawImage(art.ground, 0, 0);
    // Only the local keeper's real last-three-second footsteps are shown.
    drawFootsteps(ctx, player);
    // The dark body of each thread lives in the world; a sparse bright core is
    // repeated above scenery below so a useful segment cannot disappear there.
    for (const echo of state?.echoes || []) {
      const owner = state.players.find((p) => p.id === echo.owner);
      if (!owner) continue;
      const color = PLAYER_COLORS[(owner.color || 0) % 4],
        weave = (owner.upgrades || []).filter((id) => id === "thread").length,
        outer = Math.min(6, 2 + weave),
        core = Math.min(3, 1 + Math.ceil(weave / 2));
      line(
        ctx,
        echo.x - Math.floor(outer / 2),
        echo.y - 8 - Math.floor(outer / 2),
        owner.x - Math.floor(outer / 2),
        owner.y - 8 - Math.floor(outer / 2),
        P.echoDark,
        outer,
      );
      line(
        ctx,
        echo.x - Math.floor(core / 2),
        echo.y - 8 - Math.floor(core / 2),
        owner.x - Math.floor(core / 2),
        owner.y - 8 - Math.floor(core / 2),
        echo.resonance > 0 ? P.gold : color,
        core,
      );
    }
    for (const f of state?.flowers || []) drawFlower(ctx, f, time);
    sorted.length = 0;
    for (const prop of art.props)
      if (
        prop.x > ox - 120 &&
        prop.x < ox + 760 &&
        prop.y > oy - 20 &&
        prop.y < oy + 510
      )
        sorted.push(prop);
    for (const e of state?.enemies || [])
      if (e.x > ox - 60 && e.x < ox + 700 && e.y > oy - 20 && e.y < oy + 440)
        sorted.push(e);
    for (const p of state?.players || []) sorted.push(p);
    sorted.sort((a, b) => a.y - b.y);
    for (const item of sorted) {
      if (item.type === "tree") {
        // Feather inside the same overlap bounds, with full visibility at core.
        ctx.globalAlpha = sceneryAlpha(state?.players, item, 43, 125, 25, 0.4);
        ctx.drawImage(
          art.trees[item.variant],
          Math.round(item.x - 58),
          Math.round(item.y - 140),
        );
        ctx.globalAlpha = 1;
      } else if (item.type === "ruin") {
        ctx.globalAlpha = sceneryAlpha(state?.players, item, 27, 69, 0, 0.45);
        ctx.drawImage(
          art.ruin,
          Math.round(item.x - 31),
          Math.round(item.y - 74),
        );
        ctx.globalAlpha = 1;
      } else if (item.type === "loom") {
        ctx.globalAlpha = sceneryAlpha(state?.players, item, 51, 84, 0, 0.45);
        ctx.drawImage(
          art.loom,
          Math.round(item.x - 57),
          Math.round(item.y - 90),
        );
        ctx.globalAlpha = 1;
      } else {
        drawActor(ctx, item, time, options.animation || {});
        if (!item.type && !item.dead && item.stitchCharge > 0) {
          const count = Math.min(3, Math.floor(item.stitchCharge));
          for (let i = 0; i < count; i++) {
            const angle =
              (i * Math.PI * 2) / count + Math.floor(time * 10) * 0.2;
            pixel(
              ctx,
              item.x + Math.cos(angle) * 11,
              item.y - 18 + Math.sin(angle) * 8,
              2,
              2,
              i === 0 ? P.white : P.gold,
            );
          }
        }
        if (!item.type && item.hit > 0) {
          const side = Math.floor(time * 24) % 2 ? -1 : 1;
          pixel(ctx, item.x + side * 10, item.y - 21, 3, 1, P.white);
          pixel(ctx, item.x + side * 12, item.y - 24, 1, 6, P.redLight);
        }
        if (item.type && item.hit > 0 && item.type !== "warden") {
          const side = (item.id || 0) % 2 ? -1 : 1;
          pixel(ctx, item.x + side * 10, item.y - 14, 2, 2, P.white);
          pixel(ctx, item.x + side * 14, item.y - 11, 2, 1, P.redLight);
        }
        if (item.type && item.slow > 0) {
          for (const dx of [-8, -2, 5]) {
            pixel(ctx, item.x + dx, item.y - 2, 5, 2, P.blue);
            pixel(ctx, item.x + dx + 2, item.y - 5, 1, 4, P.white);
          }
          if (item.brittle > 0) {
            pixel(
              ctx,
              item.x - 2,
              item.y - (item.type === "warden" ? 27 : 12),
              5,
              1,
              P.white,
            );
            pixel(
              ctx,
              item.x,
              item.y - (item.type === "warden" ? 29 : 14),
              1,
              5,
              P.blue,
            );
          }
        }
        if (item.type === "warden") {
          pixel(ctx, item.x - 23, item.y - 67, 46, 4, P.ink);
          pixel(
            ctx,
            item.x - 22,
            item.y - 66,
            Math.max(0, (44 * item.hp) / item.maxHp),
            2,
            P.red,
          );
        }
        if (!item.type && item.id !== localId && !item.dead) {
          pixel(ctx, item.x - 8, item.y - 34, 16, 2, P.shadow);
          pixel(
            ctx,
            item.x - 8,
            item.y - 34,
            (16 * item.hp) / item.maxHp,
            2,
            PLAYER_COLORS[(item.color || 0) % 4],
          );
        }
        if (item.dead) {
          const t = Math.floor(time * 3) % 2;
          pixel(ctx, item.x - 2, item.y - 25 - t, 5, 2, P.cream);
          pixel(ctx, item.x, item.y - 27 - t, 1, 6, P.cream);
          for (const [dx, dy] of [
            [-15, -8],
            [15, -8],
            [-10, 1],
            [10, 1],
          ])
            pixel(
              ctx,
              item.x + dx,
              item.y + dy,
              2,
              2,
              PLAYER_COLORS[(item.color || 0) % 4],
            );
          if (item.revive > 0) {
            pixel(ctx, item.x - 9, item.y - 17, 18, 2, P.shadow);
            pixel(
              ctx,
              item.x - 9,
              item.y - 17,
              18 * item.revive,
              2,
              P.tealLight,
            );
          }
        }
      }
    }
    // A hidden caster still has to show the locked direction of its volley.
    for (const enemy of state?.enemies || []) drawAttackTelegraph(ctx, enemy, time);
    drawFootsteps(ctx, player, true);
    drawPreviewAnchor(ctx, player);
    // A thin inner strand stays readable through ruins and canopies while the
    // wider thread body still sits behind them. The clock of lit notches around
    // each anchor gives its remaining life at a glance.
    for (const echo of state?.echoes || []) {
      const owner = state.players.find((p) => p.id === echo.owner);
      if (!owner) continue;
      const color = PLAYER_COLORS[(owner.color || 0) % 4],
        life = Math.max(0, Math.min(1, echo.life / (echo.maxLife || 1))),
        len = Math.hypot(owner.x - echo.x, owner.y - echo.y),
        steps = Math.min(80, Math.floor(len / 8));
      if (len > 20) {
        const inset = 10 / len;
        ctx.globalAlpha = 0.68;
        line(
          ctx,
          echo.x + (owner.x - echo.x) * inset,
          echo.y - 8 + (owner.y - echo.y) * inset,
          owner.x - (owner.x - echo.x) * inset,
          owner.y - 8 - (owner.y - echo.y) * inset,
          echo.resonance > 0 ? P.gold : P.echoMid,
        );
        ctx.globalAlpha = 1;
      }
      for (let i = 1; i < steps; i++) {
        if (i % 3 === 0 && (life > 0.2 || i % 2 === 0)) {
          const travel = options.reducedMotion
            ? 0
            : (time * (0.4 + (echo.tension || 0) * 1.2)) % 1;
          const t = (i + travel) / steps;
          pixel(
            ctx,
            echo.x + (owner.x - echo.x) * t,
            echo.y - 8 + (owner.y - echo.y) * t,
            2,
            1,
            echo.resonance > 0 ? P.gold : P.white,
          );
        }
      }
      drawActor(
        ctx,
        { ...owner, x: echo.x, y: echo.y, hit: 0, vx: 0, vy: 0 },
        time + echo.id * 0.13,
        { state: "idle", ghost: true },
      );
      const ticks = Math.ceil(life * 12);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6 - Math.PI / 2,
          radius = echo.projected ? 17 : 15;
        pixel(
          ctx,
          echo.x + Math.cos(a) * radius,
          echo.y - 5 + Math.sin(a) * radius * 0.42,
          2,
          2,
          i < ticks ? (echo.projected ? P.gold : color) : P.echoDark,
        );
      }
      if (echo.projected) {
        pixel(ctx, echo.x - 3, echo.y - 1, 7, 1, P.gold);
        pixel(ctx, echo.x, echo.y - 4, 1, 7, P.gold);
      }
      if (echo.tension > 0.5) {
        pixel(ctx, echo.x - 1, echo.y - 34, 3, 2, P.white);
        pixel(ctx, echo.x, echo.y - 36, 1, 6, P.gold);
      }
    }
    for (const player of state?.players || []) {
      if (player.dead) continue;
      const count = (player.upgrades || []).filter(
        (id) => id === "orbit",
      ).length;
      for (let i = 0; i < count; i++) {
        const angle = (player.orbitPhase || 0) + (i * 6.283) / count;
        const x = player.x + Math.cos(angle) * 49,
          y = player.y + Math.sin(angle) * 49;
        for (let trail = 1; trail <= 3; trail++) {
          const a = angle - trail * 0.11;
          pixel(
            ctx,
            player.x + Math.cos(a) * 49,
            player.y + Math.sin(a) * 49,
            2,
            2,
            trail === 1 ? P.teal : P.tealDark,
          );
        }
        line(
          ctx,
          x - Math.sin(angle) * 6,
          y + Math.cos(angle) * 6,
          x + Math.sin(angle) * 6,
          y - Math.cos(angle) * 6,
          P.ink,
          3,
        );
        line(
          ctx,
          x - Math.sin(angle) * 5,
          y + Math.cos(angle) * 5,
          x + Math.sin(angle) * 5,
          y - Math.cos(angle) * 5,
          P.cream,
          2,
        );
        pixel(ctx, x, y, 2, 2, P.gold);
      }
    }
    for (const shot of state?.shots || []) {
      if (
        shot.x < ox - 10 ||
        shot.x > ox + 650 ||
        shot.y < oy - 10 ||
        shot.y > oy + 370
      )
        continue;
      const hostile = shot.hostile,
        angle = Math.atan2(shot.vy, shot.vx),
        tail = hostile ? 4 : 7;
      line(
        ctx,
        shot.x - Math.cos(angle) * tail,
        shot.y - Math.sin(angle) * tail,
        shot.x,
        shot.y,
        hostile ? P.redDark : P.tealDark,
        hostile ? 3 : 2,
      );
      if (hostile) {
        oval(ctx, shot.x, shot.y, shot.r || 3, shot.r || 3, P.red);
        pixel(ctx, shot.x - 1, shot.y - 1, 2, 2, P.cream);
      } else {
        line(
          ctx,
          shot.x - 2 * Math.cos(angle),
          shot.y - 2 * Math.sin(angle),
          shot.x + 2 * Math.cos(angle),
          shot.y + 2 * Math.sin(angle),
          P.white,
        );
      }
    }
    for (const effect of state?.effects || []) {
      const progress = 1 - effect.life / (effect.maxLife || 0.4),
        size =
          effect.radius ||
          (effect.type === "death" ? 14 : effect.type === "cast" ? 23 : 10);
      const color =
        effect.type === "catch" ||
        effect.type === "bloom" ||
        effect.type === "resonance"
          ? P.gold
          : effect.type === "cast" || effect.type === "heal"
            ? P.tealLight
            : effect.type === "shatter"
              ? P.blue
              : P.redLight;
      if (effect.type === "bloom") {
        const radius = size * Math.min(1, progress * 2.7);
        const segments = 64;
        for (let i = 0; i < segments; i++) {
          const angle = (i * Math.PI * 2) / segments;
          if (progress > 0.65 && i % 3 === 0) continue;
          const x = effect.x + Math.cos(angle) * radius,
            y = effect.y + Math.sin(angle) * radius;
          pixel(
            ctx,
            x,
            y,
            progress < 0.4 ? 3 : 2,
            progress < 0.4 ? 3 : 2,
            progress < 0.3 ? P.cream : progress < 0.65 ? P.gold : P.redDark,
          );
          if (i % 4 === 0) {
            pixel(ctx, x - 2, y - 2, 2, 2, P.redLight);
            pixel(ctx, x + 2, y + 2, 2, 2, P.red);
          }
        }
        if (progress < 0.45) {
          const petal = Math.max(7, Math.round(radius * 0.46));
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const x = effect.x + Math.cos(a) * petal,
              y = effect.y - 7 + Math.sin(a) * petal;
            pixel(ctx, x - 2, y - 1, 5, 3, i % 2 ? P.redLight : P.cream);
            pixel(ctx, x, y - 3, 1, 7, P.gold);
          }
          pixel(ctx, effect.x - 3, effect.y - 10, 7, 7, P.white);
        }
      }
      if (effect.type === "catch" && progress < 0.75) {
        const arm = 4 + Math.round(progress * 7);
        line(
          ctx,
          effect.x - arm,
          effect.y - 7,
          effect.x + arm,
          effect.y - 7,
          P.gold,
        );
        line(
          ctx,
          effect.x,
          effect.y - 7 - arm,
          effect.x,
          effect.y - 7 + arm,
          P.white,
        );
      }
      if (effect.type === "resonance" && progress < 0.8) {
        const arm = 7 + Math.round(progress * 12);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          pixel(
            ctx,
            effect.x + Math.cos(a) * arm,
            effect.y - 7 + Math.sin(a) * arm,
            2,
            2,
            i % 2 ? P.white : P.gold,
          );
        }
        pixel(ctx, effect.x - 2, effect.y - 9, 5, 5, P.white);
      }
      if (effect.type === "heal" && progress < 0.8) {
        const rise = Math.round(progress * 12);
        pixel(ctx, effect.x - 1, effect.y - 16 - rise, 3, 10, P.tealLight);
        pixel(ctx, effect.x - 5, effect.y - 12 - rise, 11, 3, P.white);
        pixel(ctx, effect.x - 10, effect.y - 5 - rise, 2, 2, P.teal);
        pixel(ctx, effect.x + 8, effect.y - 8 - rise, 2, 2, P.teal);
      }
      if (effect.type === "shatter" && progress < 0.7) {
        const reach = 4 + Math.round(progress * 14);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          line(
            ctx,
            effect.x + Math.cos(a) * (reach - 4),
            effect.y - 7 + Math.sin(a) * (reach - 4),
            effect.x + Math.cos(a) * reach,
            effect.y - 7 + Math.sin(a) * reach,
            i % 2 ? P.white : P.blue,
          );
        }
      }
      if (effect.type === "hit" && progress < 0.6) {
        const arm = 6 + Math.round(progress * 11);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          pixel(
            ctx,
            effect.x + Math.cos(a) * arm,
            effect.y - 10 + Math.sin(a) * arm,
            3,
            2,
            i % 2 ? P.white : P.redLight,
          );
        }
      }
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + (effect.id % 5),
          r = 3 + progress * size;
        const x = effect.x + Math.cos(a) * r,
          y =
            effect.y +
            Math.sin(a) * r * (effect.type === "bloom" ? 1 : 0.65) -
            7;
        if (progress < 0.7 || i % 2 === 0)
          pixel(
            ctx,
            x,
            y,
            progress < 0.3 ? 2 : 1,
            progress < 0.3 ? 2 : 1,
            progress < 0.2 ? P.white : color,
          );
      }
      if (progress < 0.2) {
        pixel(ctx, effect.x - 3, effect.y - 8, 7, 1, P.white);
        pixel(ctx, effect.x, effect.y - 11, 1, 7, P.white);
      }
    }
    // Sparse drifting leaves and fireflies, deterministic and outside the simulation.
    if (!options.reducedMotion)
      for (let i = 0; i < 25; i++) {
        const x = (i * 149 + Math.sin(time * 0.17 + i) * 16 + W) % W,
          y = (i * 83 - time * ((i % 3) + 1) * 2 + H * 100) % H;
        if (i % 3 === 0) {
          pixel(ctx, x, y, 2, 1, P.light);
          pixel(ctx, x + 1, y + 1, 2, 1, P.leaf);
        } else if (Math.sin(time * 1.2 + i * 4) > 0.6)
          pixel(ctx, x, y, 1, 1, P.gold);
      }
    ctx.restore();
    // A local echo can leave the viewport before it expires. Point to its
    // anchor at the nearest screen edge while keeping the gameplay uncluttered.
    for (const echo of state?.echoes || []) {
      if (echo.owner !== localId) continue;
      const sx = echo.x - ox,
        sy = echo.y - oy,
        marker = safeMarkerPosition(sx, sy);
      if (!marker) continue;
      const px = marker.x,
        py = marker.y,
        dx = sx - px,
        dy = sy - py,
        color = echo.projected
          ? P.gold
          : PLAYER_COLORS[(player?.color || 0) % 4];
      pixel(ctx, px - 6, py - 6, 13, 13, P.ink);
      if (Math.abs(dx) > Math.abs(dy)) {
        const side = Math.sign(dx);
        line(ctx, px + side * 5, py, px - side * 2, py - 4, color, 2);
        line(ctx, px + side * 5, py, px - side * 2, py + 4, color, 2);
      } else {
        const side = Math.sign(dy);
        line(ctx, px, py + side * 5, px - 4, py - side * 2, color, 2);
        line(ctx, px, py + side * 5, px + 4, py - side * 2, color, 2);
      }
      pixel(ctx, px - 1, py - 1, 3, 3, P.white);
    }
    const preview = player?.echoPreview;
    if (
      preview?.ready &&
      Number.isFinite(preview.x) &&
      Number.isFinite(preview.y)
    ) {
      const sx = preview.x - ox,
        sy = preview.y - oy,
        covered = (state?.echoes || []).some(
          (e) =>
            e.owner === player.id &&
            Math.hypot(e.x - preview.x, e.y - preview.y) < 16,
        );
      const marker = !covered && safeMarkerPosition(sx, sy);
      if (marker) {
        const px = marker.x,
          py = marker.y,
          dx = sx - px,
          dy = sy - py,
          color = preview.projected
            ? P.gold
            : PLAYER_COLORS[(player.color || 0) % 4];
        pixel(ctx, px - 6, py - 6, 13, 13, P.ink);
        if (Math.abs(dx) > Math.abs(dy)) {
          const side = Math.sign(dx);
          line(ctx, px + side * 5, py, px - side * 2, py - 4, color, 2);
          line(ctx, px + side * 5, py, px - side * 2, py + 4, color, 2);
        } else {
          const side = Math.sign(dy);
          line(ctx, px, py + side * 5, px - 4, py - side * 2, color, 2);
          line(ctx, px, py + side * 5, px + 4, py - side * 2, color, 2);
        }
        pixel(ctx, px, py, 1, 1, P.white);
      }
    }
  }
  return { draw, screenToWorld, camera };
}
