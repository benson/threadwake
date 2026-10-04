import {
  PALETTE as P,
  PLAYER_COLORS,
  drawActor,
  drawCombatGeometry,
  drawFlower,
  pixel,
  line,
  oval,
  shadow,
} from "./art.js";
import { lineBlocked, mapById } from "./maps.js";

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
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}
function frame(ctx, cx, y, w, h, motif) {
  const x = Math.round(cx - w / 2);
  pixel(ctx, x - 2, y + 3, w + 5, h + 5, P.ink);
  pixel(ctx, x, y, w, h, P.gold);
  pixel(ctx, x + 3, y + 3, w - 6, h - 6, P.wood);
  pixel(ctx, x + 6, y + 6, w - 12, h - 12, P.shadow);
  pixel(ctx, x + 7, y + 7, w - 14, h - 14, motif % 2 ? "#394353" : "#475464");
  if (motif % 3 === 0) {
    oval(ctx, cx, y + h * 0.45, w * 0.17, h * 0.22, P.creamDark);
    pixel(ctx, cx - 4, y + h * 0.56, 8, 7, P.redDark);
    pixel(ctx, cx - 2, y + h * 0.34, 4, 2, P.cream);
  } else if (motif % 3 === 1) {
    oval(ctx, cx, y + h * 0.6, w * 0.24, h * 0.13, P.wood);
    line(ctx, cx - 9, y + h * 0.61, cx + 9, y + h * 0.36, P.creamShade, 2);
    pixel(ctx, cx + 3, y + h * 0.36, 5, 4, P.gold);
  } else {
    pixel(ctx, cx - 8, y + h * 0.3, 16, 17, P.redDark);
    pixel(ctx, cx - 6, y + h * 0.3, 12, 4, P.creamShade);
    pixel(ctx, cx - 2, y + h * 0.37, 4, 9, P.gold);
  }
  pixel(ctx, cx - 8, y + h + 4, 16, 3, P.gold);
  pixel(ctx, cx - 5, y + h + 5, 10, 1, P.creamDark);
  pixel(ctx, x + 2, y + 1, w - 4, 1, P.white);
}
function exhibitSprite(o, gallery) {
  const c = surface(o.w, o.h),
    ctx = c.getContext("2d");
  const w = o.w,
    h = o.h,
    cx = Math.round(w / 2),
    cy = Math.round(h / 2);
  // The complete painted footprint matches the solid world rectangle exactly.
  pixel(ctx, 0, 0, w, h, P.ink);
  pixel(ctx, 3, 3, w - 6, h - 6, o.kind === "plinth" ? P.stone : P.wood);
  pixel(ctx, 6, 6, w - 12, h - 12, P.gold);
  pixel(
    ctx,
    9,
    9,
    w - 18,
    h - 18,
    o.kind === "plinth" ? P.stoneLight : "#263b49",
  );
  pixel(ctx, 12, 12, w - 24, h - 24, o.kind === "plinth" ? P.stone : "#344e59");
  if (o.kind === "plinth") {
    // Stepped stone bases read as sculpture stands rather than framed coins.
    pixel(ctx, cx - 25, cy + 18, 50, 9, P.shadow);
    pixel(ctx, cx - 23, cy + 14, 46, 8, P.creamDark);
    pixel(ctx, cx - 18, cy + 10, 36, 7, P.creamShade);
    if (o.id === "bird") {
      line(ctx, cx - 18, cy + 5, cx + 15, cy - 10, P.white, 5);
      pixel(ctx, cx + 14, cy - 11, 8, 4, P.gold);
    } else if (o.id === "column") {
      for (const dx of [-9, -3, 3, 9])
        line(ctx, cx + dx, cy - 19, cx + dx, cy + 15, P.white, 2);
    } else if (o.id === "hand") {
      for (const dx of [-8, -3, 2, 7])
        pixel(ctx, cx + dx, cy - 20 - (dx % 3), 4, 20, P.white);
    } else if (o.id === "mask" || o.id === "bust") {
      pixel(ctx, cx - 6, cy + 2, 12, 10, P.creamShade);
      if (o.id === "bust") oval(ctx, cx, cy + 8, 20, 6, P.cream);
      oval(ctx, cx, cy - 6, 13, 16, P.white);
      for (const dx of [-6, 5]) pixel(ctx, cx + dx, cy - 11, 3, 3, P.shadow);
      pixel(ctx, cx - 3, cy + 1, 7, 2, P.stone);
    } else {
      line(ctx, cx - 10, cy + 16, cx + 10, cy - 17, P.white, 7);
    }
  } else if (gallery === "clock_gallery") {
    for (let i = 0; i < Math.max(2, Math.floor(w / 37)); i++) {
      const x = 24 + i * 34;
      oval(ctx, x, cy, 12, 12, P.ink);
      oval(ctx, x, cy, 10, 10, P.gold);
      oval(ctx, x, cy, 7, 7, P.creamShade);
      line(ctx, x, cy, x + 4, cy - 5, P.wood, 2);
      pixel(ctx, x - 1, cy - 1, 3, 3, P.ink);
    }
  } else if (gallery === "natural_history") {
    line(ctx, 23, cy + 4, w - 23, cy - 3, P.cream, 4);
    for (let x = 30; x < w - 24; x += 18) {
      const y = cy + 4 - ((x - 23) * 7) / Math.max(1, w - 46);
      line(ctx, x, y, x - 5, y - 12, P.creamShade, 3);
      line(ctx, x, y, x + 5, y + 11, P.creamDark, 3);
    }
    for (const x of [18, w - 18]) oval(ctx, x, cy, 7, 8, P.gold);
  } else {
    // Distinct archaeological silhouettes under glass: handles, necks and bases.
    for (const x of [Math.round(w * 0.28), Math.round(w * 0.72)]) {
      pixel(ctx, x - 13, cy + 14, 26, 4, P.shadow);
      if (o.id === "coins") {
        for (let row = 2; row >= 0; row--) {
          oval(ctx, x, cy + row * 5, 12, 5, P.wood);
          oval(ctx, x, cy + row * 5 - 2, 11, 4, P.gold);
          pixel(ctx, x - 4, cy + row * 5 - 3, 8, 1, P.cream);
        }
      } else if (o.id === "tablets") {
        pixel(ctx, x - 10, cy - 17, 21, 31, P.creamDark);
        pixel(ctx, x - 8, cy - 15, 17, 27, P.creamShade);
        for (let row = 0; row < 4; row++) {
          pixel(ctx, x - 5, cy - 10 + row * 5, row % 2 ? 7 : 11, 2, P.wood);
          pixel(ctx, x - 4 + row, cy - 11 + row * 5, 2, 4, P.wood);
        }
      } else {
        for (const side of [-1, 1]) {
          oval(ctx, x + side * 11, cy - 5, 5, 8, P.creamShade);
          oval(ctx, x + side * 12, cy - 5, 2, 4, "#344e59");
        }
        oval(ctx, x, cy + 1, 10, 12, P.creamShade);
        oval(ctx, x - 2, cy, 6, 10, P.cream);
        pixel(ctx, x - 4, cy - 20, 9, 15, P.creamShade);
        pixel(ctx, x - 6, cy - 21, 13, 4, P.gold);
        pixel(ctx, x - 3, cy - 21, 7, 1, P.wood);
        pixel(ctx, x - 7, cy - 2, 15, 3, P.wood);
        pixel(ctx, x - 4, cy + 11, 9, 4, P.creamShade);
        pixel(ctx, x - 7, cy + 14, 15, 3, P.gold);
      }
    }
  }
  if (o.kind !== "plinth") {
    line(ctx, 13, 14, Math.min(w - 15, 49), 14, "#91a5a8", 2);
    line(ctx, 14, 18, 14, Math.min(h - 16, 38), "#718b96", 2);
  }
  return c;
}
function bake(seed, gallery) {
  const c = surface(W, H),
    ctx = c.getContext("2d"),
    r = random(seed || 42);
  const sculpture = gallery === "sculpture_court",
    clock = gallery === "clock_gallery",
    natural = gallery === "natural_history",
    tile = sculpture ? 40 : clock ? 28 : 32,
    floorA = sculpture
      ? "#4b5968"
      : clock
        ? "#222d3b"
        : natural
          ? "#2b3e43"
          : "#2c3a49",
    floorB = sculpture
      ? "#536272"
      : clock
        ? "#283444"
        : natural
          ? "#30454a"
          : "#293847",
    seam = sculpture
      ? "#384857"
      : clock
        ? "#192432"
        : natural
          ? "#223638"
          : "#1f2d3a";
  // Each gallery has its own tile rhythm and focal inlay, not a palette swap.
  pixel(ctx, 0, 0, W, H, P.ground);
  for (let y = 0; y < H; y += tile)
    for (let x = 0; x < W; x += tile) {
      pixel(
        ctx,
        x,
        y,
        tile,
        tile,
        (Math.floor(x / tile) + Math.floor(y / tile)) % 2 ? floorB : floorA,
      );
      pixel(ctx, x, y, tile, 1, seam);
      pixel(ctx, x, y, 1, tile, seam);
      pixel(
        ctx,
        x + 2,
        y + 2,
        Math.min(10, tile - 4),
        1,
        sculpture ? "#617180" : "#374959",
      );
      if (!sculpture && !clock && (x + y) % 128 === 0) {
        pixel(ctx, x + 15, y + 15, 2, 2, P.creamDark);
        pixel(ctx, x + 16, y + 16, 1, 1, P.gold);
      }
      if (sculpture && (x / tile + y / tile) % 3 === 0) {
        pixel(ctx, x + tile / 2 - 2, y + tile / 2 - 2, 5, 5, "#82909b");
        pixel(ctx, x + tile / 2, y + tile / 2, 1, 1, P.creamShade);
      }
    }
  if (natural) {
    // The long fossil spine and paired ribs point through Natural History.
    line(ctx, 355, 405, 845, 405, "#8e8978", 3);
    for (let x = 380; x < 835; x += 24) {
      const bend = Math.sin(x * 0.017) * 8;
      line(ctx, x, 404, x - 10, 375 + bend, "#6e7f7c", 2);
      line(ctx, x, 406, x + 8, 435 - bend, "#6e7f7c", 2);
      pixel(ctx, x - 2, 402, 5, 5, P.creamDark);
    }
    for (const cx of [385, 815]) {
      oval(ctx, cx, 405, 64, 48, "#25383d");
      oval(ctx, cx, 405, 59, 43, "#354d50");
      for (let a = 0; a < 12; a++) {
        const angle = (a * Math.PI) / 6;
        pixel(
          ctx,
          cx + Math.cos(angle) * 54,
          405 + Math.sin(angle) * 38,
          3,
          2,
          P.creamDark,
        );
      }
    }
  } else if (sculpture) {
    // Broad marble compass rings leave a clear arena between sculpture plinths.
    for (const radius of [164, 158, 113, 107])
      for (let i = 0; i < 112; i++) {
        const a = (i * Math.PI * 2) / 112;
        pixel(
          ctx,
          600 + Math.cos(a) * radius,
          405 + Math.sin(a) * radius,
          2,
          2,
          radius % 2 ? "#a4ada9" : "#768b98",
        );
      }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      line(
        ctx,
        600 + Math.cos(a) * 30,
        405 + Math.sin(a) * 30,
        600 + Math.cos(a) * 95,
        405 + Math.sin(a) * 95,
        "#697e8d",
        2,
      );
    }
  } else if (clock) {
    // Giant dial and gear teeth make the final gallery legible at a glance.
    for (const radius of [172, 166, 121, 116])
      for (let i = 0; i < 128; i++) {
        const a = (i * Math.PI * 2) / 128;
        pixel(
          ctx,
          600 + Math.cos(a) * radius,
          405 + Math.sin(a) * radius,
          2,
          2,
          i % 4 ? "#806d54" : P.gold,
        );
      }
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      line(
        ctx,
        600 + Math.cos(a) * 138,
        405 + Math.sin(a) * 138,
        600 + Math.cos(a) * (i % 2 ? 150 : 158),
        405 + Math.sin(a) * (i % 2 ? 150 : 158),
        P.gold,
        2,
      );
    }
    line(ctx, 600, 405, 600, 316, P.creamShade, 3);
    line(ctx, 600, 405, 677, 445, P.wood, 4);
    oval(ctx, 600, 405, 8, 8, P.gold);
  } else {
    // The Antiquities entrance has a burgundy admissions runner.
    pixel(ctx, 539, 286, 122, 472, P.ink);
    pixel(ctx, 543, 290, 114, 464, "#513846");
    pixel(ctx, 546, 293, 108, 458, "#603e4a");
    for (const x of [542, 658]) line(ctx, x, 287, x, 755, P.gold, 2);
    for (let y = 306; y < 750; y += 27) {
      pixel(ctx, 596, y, 8, 8, P.redDark);
      pixel(ctx, 599, y + 2, 2, 4, P.creamDark);
      pixel(ctx, 566, y + 2, 4, 4, P.wood);
      pixel(ctx, 630, y + 2, 4, 4, P.wood);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      line(
        ctx,
        600,
        402,
        600 + Math.cos(a) * 24,
        402 + Math.sin(a) * 24,
        "#73505a",
      );
    }
    oval(ctx, 600, 402, 6, 4, "#73505a");
    oval(ctx, 600, 402, 3, 2, "#603e4a");
  }
  // Back wall, wainscoting and framed collection art ground the museum theme.
  pixel(ctx, 0, 0, W, 125, "#1a2633");
  for (let y = 0; y < 125; y += 24) pixel(ctx, 0, y, W, 2, "#293848");
  pixel(ctx, 0, 112, W, 8, P.wood);
  pixel(ctx, 0, 112, W, 2, P.gold);
  pixel(ctx, 0, 120, W, 6, P.shadow);
  for (let x = 42; x < W; x += 190) {
    pixel(ctx, x, 0, 18, 116, P.ink);
    pixel(ctx, x + 2, 0, 14, 113, P.stone);
    pixel(ctx, x + 4, 1, 3, 109, P.stoneLight);
    pixel(ctx, x - 5, 107, 28, 7, P.gold);
  }
  const motifOffset = natural ? 2 : sculpture ? 1 : clock ? 0 : 0;
  for (const [x, motif] of [
    [150, 0],
    [330, 1],
    [600, 2],
    [870, 0],
    [1050, 1],
  ])
    frame(ctx, x, 23, 70, 66, (motif + motifOffset) % 3);
  // Low wall panels and a few ceiling-light reflections appear at the sides.
  for (let y = 160; y < H; y += 128)
    for (const x of [12, W - 49]) {
      pixel(ctx, x, y, 37, 76, "#263444");
      pixel(ctx, x + 3, y + 3, 31, 70, P.stone);
      pixel(ctx, x + 6, y + 6, 25, 64, P.shadow);
      pixel(ctx, x + 5, y + 5, 27, 1, P.gold);
    }
  for (let i = 0; i < 450; i++) {
    const x = Math.floor(r() * W),
      y = 135 + Math.floor(r() * (H - 145));
    pixel(ctx, x, y, 1 + (i % 5 === 0), 1, i % 3 ? "#344454" : "#405161");
  }
  const map = mapById(gallery);
  const sprites = { exhibit: {} };
  const props = map.obstacles.map((o) => {
    sprites.exhibit[o.id] = exhibitSprite(o, gallery);
    return { x: o.x + o.w / 2, y: o.y + o.h, type: "exhibit", variant: o.id };
  });
  props.sort((a, b) => a.y - b.y);
  return { ground: c, props, sprites };
}
function drawProp(ctx, art, prop) {
  const sprite = art.sprites[prop.type][prop.variant];
  ctx.drawImage(
    sprite,
    Math.round(prop.x - sprite.width / 2),
    Math.round(prop.y - sprite.height),
  );
}
function drawAttackTelegraph(ctx, enemy, time) {
  if (
    enemy.type === "mite" ||
    !Number.isFinite(enemy.fireIn) ||
    enemy.fireIn >= 0.9
  )
    return;
  const charge = Math.max(0, 1 - enemy.fireIn / 0.9),
    boss = enemy.type === "warden",
    radius = (boss ? 34 : 17) - charge * 5,
    centerY = enemy.y - (boss ? 25 : enemy.type === "thorn" ? 18 : 12),
    cue = charge > 0.7 ? P.white : P.redLight;
  for (let i = 0; i < (boss ? 16 : 10); i++) {
    const a =
      (i * Math.PI * 2) / (boss ? 16 : 10) + Math.floor(time * 12) * 0.12;
    pixel(
      ctx,
      enemy.x + Math.cos(a) * radius,
      centerY + Math.sin(a) * radius * 0.72,
      charge > 0.75 ? 2 : 1,
      charge > 0.75 ? 2 : 1,
      cue,
    );
  }
  const aim = Math.atan2(
      Number.isFinite(enemy.aimY) ? enemy.aimY : 0,
      Number.isFinite(enemy.aimX) ? enemy.aimX : enemy.face || 1,
    ),
    attack =
      enemy.attack ||
      (boss ? "ring" : enemy.type === "thorn" ? "fan" : "needle"),
    reach = (boss ? 44 : 38) * (0.55 + charge * 0.45);
  if (boss)
    for (let i = 0; i < (attack === "spiral" ? 12 : 8); i++) {
      const a =
        (i * Math.PI * 2) / (attack === "spiral" ? 12 : 8) +
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
  if (enemy.fireIn <= 0.65) {
    const rays = attack === "fan" ? 3 : 1;
    for (let j = 0; j < rays; j++) {
      const a = aim + (j - (rays - 1) / 2) * (boss ? 0.2 : 0.22);
      for (let d = 10; d < reach; d += 7)
        pixel(
          ctx,
          enemy.x + Math.cos(a) * d,
          centerY + Math.sin(a) * d,
          charge > 0.75 ? 3 : 2,
          2,
          cue,
        );
    }
  }
  pixel(ctx, enemy.x - 1, centerY - 1, 3, 3 + charge * 2, cue);
}
function drawOrrery(ctx, player) {
  if (player.dead) return;
  const count = (player.upgrades || []).filter((id) => id === "orbit").length;
  for (let i = 0; i < count; i++) {
    const angle = (player.orbitPhase || 0) + (i * Math.PI * 2) / count,
      x = player.x + Math.cos(angle) * 49,
      y = player.y + Math.sin(angle) * 49;
    oval(ctx, x, y, 6, 3, P.ink);
    oval(ctx, x, y - 1, 4, 3, P.gold);
    pixel(ctx, x - 1, y - 3, 2, 2, P.white);
    pixel(ctx, x + 4, y, 2, 1, P.creamShade);
    for (let j = 1; j < 4; j++) {
      const a = angle - j * 0.13;
      pixel(
        ctx,
        player.x + Math.cos(a) * 49,
        player.y + Math.sin(a) * 49,
        1,
        1,
        j === 1 ? P.gold : P.creamDark,
      );
    }
  }
}
function drawShot(ctx, shot) {
  const hostile = shot.hostile,
    angle = Math.atan2(shot.vy, shot.vx);
  if (hostile) {
    oval(ctx, shot.x, shot.y, (shot.r || 3) + 1, (shot.r || 3) + 1, P.ink);
    line(
      ctx,
      shot.x - Math.cos(angle) * 5,
      shot.y - Math.sin(angle) * 5,
      shot.x,
      shot.y,
      P.redDark,
      2,
    );
    oval(
      ctx,
      shot.x,
      shot.y,
      Math.max(2, shot.r || 3),
      Math.max(2, shot.r || 3),
      P.redLight,
    );
    pixel(ctx, shot.x - 1, shot.y - 1, 2, 2, P.white);
  } else {
    pixel(
      ctx,
      shot.x - 3 - Math.cos(angle) * 3,
      shot.y - 1 - Math.sin(angle) * 3,
      3,
      2,
      P.tealLight,
    );
    oval(ctx, shot.x, shot.y, 3, 3, P.ink);
    oval(ctx, shot.x, shot.y - 1, 2, 2, P.creamShade);
    pixel(ctx, shot.x - 1, shot.y - 2, 2, 1, P.white);
  }
}
function drawSweep(ctx, effect, progress, map) {
  const radius = Number.isFinite(effect.radius) ? effect.radius : 96;
  // Full true collision radius appears on frame one; only its brightness fades.
  ctx.globalAlpha = Math.max(0, Math.min(1, 0.9 * (1 - progress)));
  for (let i = 0; i < 96; i++) {
    const a0 = (i * Math.PI * 2) / 96,
      a1 = ((i + 1) * Math.PI * 2) / 96,
      bright = (i + Math.floor(progress * 96)) % 12 < 3;
    if (
      map &&
      lineBlocked(map, effect, {
        x: effect.x + Math.cos((a0 + a1) / 2) * radius,
        y: effect.y + Math.sin((a0 + a1) / 2) * radius,
      })
    )
      continue;
    line(
      ctx,
      effect.x + Math.cos(a0) * radius,
      effect.y + Math.sin(a0) * radius,
      effect.x + Math.cos(a1) * radius,
      effect.y + Math.sin(a1) * radius,
      bright ? P.white : P.gold,
      bright ? 2 : 1,
    );
  }
  ctx.globalAlpha = 1;
  const sweepAngle = progress * Math.PI * 2;
  for (let i = 0; i < 9; i++) {
    const a = sweepAngle - i * 0.14,
      r = 21 + i * 3;
    pixel(
      ctx,
      effect.x + Math.cos(a) * r,
      effect.y + Math.sin(a) * r - 9,
      i < 3 ? 3 : 2,
      2,
      i < 3 ? P.white : P.creamShade,
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12 + progress * 0.3,
      r = radius * (0.7 + 0.15 * progress);
    pixel(
      ctx,
      effect.x + Math.cos(a) * r,
      effect.y + Math.sin(a) * r,
      1,
      1,
      i % 3 ? P.creamDark : P.gold,
    );
  }
}
function drawEffect(ctx, effect, map) {
  const progress = Math.max(
      0,
      Math.min(1, 1 - effect.life / (effect.maxLife || 0.35)),
    ),
    kind = effect.type,
    x = effect.x,
    y = effect.y;
  if (kind === "sweep") return drawSweep(ctx, effect, progress, map);
  if (kind === "supply" || kind === "bloom") {
    const radius = (effect.radius || 118) * Math.min(1, progress * 2.5);
    for (let i = 0; i < 72; i++) {
      if (progress > 0.65 && i % 3 === 0) continue;
      const a = (i * Math.PI * 2) / 72;
      if (
        map &&
        lineBlocked(map, effect, {
          x: x + Math.cos(a) * radius,
          y: y + Math.sin(a) * radius,
        })
      )
        continue;
      pixel(
        ctx,
        x + Math.cos(a) * radius,
        y + Math.sin(a) * radius,
        progress < 0.3 ? 2 : 1,
        progress < 0.3 ? 2 : 1,
        i % 3 ? P.tealLight : P.gold,
      );
    }
    if (progress < 0.4) {
      pixel(ctx, x - 2, y - 12, 5, 12, P.cream);
      pixel(ctx, x - 6, y - 8, 13, 4, P.white);
    }
    return;
  }
  if (kind === "heal") {
    const rise = Math.round(progress * 14);
    pixel(ctx, x - 2, y - 16 - rise, 5, 12, P.tealLight);
    pixel(ctx, x - 6, y - 12 - rise, 13, 4, P.white);
  }
  if (kind === "resonance") {
    // A small, complete shield silhouette distinguishes protection from impact.
    const rise = Math.round(progress * 9),
      sy = y - 19 - rise;
    for (let row = 0; row < 15; row++) {
      const half = row < 8 ? 8 : Math.max(1, 8 - (row - 7));
      pixel(ctx, x - half - 1, sy + row, half * 2 + 3, 1, P.ink);
      pixel(ctx, x - half, sy + row, half * 2 + 1, 1, P.tealLight);
      if (row > 1 && row < 11 && half > 3)
        pixel(ctx, x - half + 2, sy + row, half * 2 - 3, 1, P.tealDark);
    }
    return;
  }
  if (kind === "catch") {
    const reach = 5 + progress * 12;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      pixel(
        ctx,
        x + Math.cos(a) * reach,
        y - 8 + Math.sin(a) * reach,
        i % 2 ? 2 : 4,
        i % 2 ? 4 : 2,
        i % 2 ? P.white : P.tealLight,
      );
    }
  }
  if (kind === "shatter")
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3,
        reach = 5 + progress * 14;
      line(
        ctx,
        x + Math.cos(a) * (reach - 4),
        y - 7 + Math.sin(a) * (reach - 4),
        x + Math.cos(a) * reach,
        y - 7 + Math.sin(a) * reach,
        i % 2 ? P.white : P.blue,
        2,
      );
    }
  if (kind === "hit" || kind === "death" || kind === "chip")
    for (let i = 0; i < (kind === "chip" ? 4 : 8); i++) {
      const a = (i * Math.PI) / 4 + (effect.id || 0),
        reach =
          4 + progress * (kind === "death" ? 20 : kind === "chip" ? 8 : 12);
      pixel(
        ctx,
        x + Math.cos(a) * reach,
        y - 9 + Math.sin(a) * reach,
        kind === "death" ? 4 : progress < 0.4 ? 3 : 2,
        kind === "death" ? (i % 2 ? 2 : 4) : 2,
        kind === "hit"
          ? i % 2
            ? P.white
            : P.redLight
          : kind === "chip"
            ? P.gold
            : i % 2
              ? P.creamShade
              : P.white,
      );
    }
}
export function createRenderer(canvas) {
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const camera = { x: 600, y: 400 };
  let art = null,
    lastSeed = null,
    lastGallery = null,
    lastTime = null,
    damage = 0,
    previousHP = null;
  const sorted = [];
  function screenToWorld(x, y) {
    return { x: x + camera.x - 320, y: y + camera.y - 180 };
  }
  function draw(state, localId, time = 0, options = {}) {
    const seed = state?.seed || 42;
    const gallery =
      state?.mapId ||
      (state?.wave >= 7
        ? "clock_gallery"
        : state?.wave >= 5
          ? "sculpture_court"
          : state?.wave >= 3
            ? "natural_history"
            : "antiquities");
    const galleryChanged = gallery !== lastGallery;
    if (!art || seed !== lastSeed || galleryChanged) {
      art = bake(seed, gallery);
      lastSeed = seed;
      lastGallery = gallery;
    }
    const player =
        state?.players?.find((p) => p.id === localId) || state?.players?.[0],
      dt =
        lastTime === null
          ? 1 / 60
          : Math.min(0.05, Math.max(0, time - lastTime));
    lastTime = time;
    const tx = player?.x ?? 600,
      ty = player?.y ?? 400,
      follow = 1 - Math.exp(-dt * 8);
    if (galleryChanged) {
      camera.x = Math.max(320, Math.min(W - 320, tx));
      camera.y = Math.max(180, Math.min(H - 180, ty));
    }
    camera.x += (Math.max(320, Math.min(W - 320, tx)) - camera.x) * follow;
    camera.y += (Math.max(180, Math.min(H - 180, ty)) - camera.y) * follow;
    if (player && previousHP !== null && player.hp < previousHP) damage = 0.15;
    previousHP = player?.hp ?? null;
    damage = Math.max(0, damage - dt);
    const shake =
        options.reducedMotion || options.shake === false
          ? 0
          : Math.round(Math.sin(time * 87) * damage * 12),
      ox = Math.round(camera.x - 320) + shake,
      oy = Math.round(camera.y - 180);
    pixel(ctx, 0, 0, 640, 360, P.shadow);
    ctx.save();
    ctx.translate(-ox, -oy);
    ctx.drawImage(art.ground, 0, 0);
    for (const station of state?.flowers || []) drawFlower(ctx, station, time);
    sorted.length = 0;
    for (const prop of art.props)
      if (
        prop.x > ox - 130 &&
        prop.x < ox + 770 &&
        prop.y > oy - 30 &&
        prop.y < oy + 500
      )
        sorted.push(prop);
    for (const enemy of state?.enemies || [])
      if (
        enemy.x > ox - 60 &&
        enemy.x < ox + 700 &&
        enemy.y > oy - 60 &&
        enemy.y < oy + 440
      )
        sorted.push(enemy);
    for (const p of state?.players || []) sorted.push(p);
    for (const toy of state?.companions || []) sorted.push(toy);
    sorted.sort((a, b) => a.y - b.y);
    for (const item of sorted) {
      if (art.sprites[item.type]) {
        drawProp(ctx, art, item);
        continue;
      }
      drawActor(ctx, item, time, options.animation || {});
      if (item.type === "warden") {
        pixel(ctx, item.x - 24, item.y - 75, 48, 5, P.ink);
        pixel(
          ctx,
          item.x - 23,
          item.y - 74,
          Math.max(0, (46 * item.hp) / item.maxHp),
          3,
          P.red,
        );
      } else if (item.type && item.type !== "soldier") {
        if (item.stagger > 0) {
          pixel(ctx, item.x - 5, item.y - 28, 3, 2, P.gold);
          pixel(ctx, item.x + 5, item.y - 27, 3, 2, P.white);
        }
        if (item.slow > 0) {
          pixel(ctx, item.x - 7, item.y - 3, 5, 2, P.blue);
          pixel(ctx, item.x + 4, item.y - 4, 5, 2, P.blue);
        }
      } else if (!item.type && item.id !== localId && !item.dead) {
        pixel(ctx, item.x - 8, item.y - 40, 16, 2, P.shadow);
        pixel(
          ctx,
          item.x - 8,
          item.y - 40,
          (16 * item.hp) / item.maxHp,
          2,
          PLAYER_COLORS[(item.color || 0) % 4],
        );
      }
      if (!item.type && item.dead) {
        pixel(ctx, item.x - 2, item.y - 29, 5, 2, P.cream);
        pixel(ctx, item.x, item.y - 31, 1, 6, P.cream);
        if (item.revive > 0) {
          pixel(ctx, item.x - 9, item.y - 19, 18, 2, P.shadow);
          pixel(ctx, item.x - 9, item.y - 19, 18 * item.revive, 2, P.tealLight);
        }
      }
    }
    // A hidden armored exhibit still shows the direction of its committed volley.
    for (const enemy of state?.enemies || [])
      drawAttackTelegraph(ctx, enemy, time);
    for (const p of state?.players || []) drawOrrery(ctx, p);
    for (const shot of state?.shots || [])
      if (
        shot.x > ox - 12 &&
        shot.x < ox + 652 &&
        shot.y > oy - 12 &&
        shot.y < oy + 372
      )
        drawShot(ctx, shot);
    for (const effect of state?.effects || [])
      drawEffect(ctx, effect, mapById(gallery));
    if (options.hitboxes)
      for (const actor of [
        ...(state?.players || []),
        ...(state?.enemies || []),
        ...(state?.companions || []),
      ])
        drawCombatGeometry(ctx, actor);
    // Sparse, slow dust in museum light; there are no leaves or fantasy motes.
    if (!options.reducedMotion)
      for (let i = 0; i < 18; i++) {
        const x = (i * 149 + Math.sin(time * 0.17 + i) * 8 + W) % W,
          y = (i * 97 - time * ((i % 3) + 1) + H * 100) % H;
        pixel(ctx, x, y, 1, 1, i % 4 ? "#657788" : P.creamDark);
      }
    ctx.restore();
  }
  return { draw, screenToWorld, camera };
}
