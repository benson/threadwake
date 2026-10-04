import { pose } from "./animation.js";

export const PALETTE = Object.freeze({
  ink: "#14232c",
  shadow: "#172e32",
  ground: "#294337",
  moss: "#36513b",
  grass: "#436344",
  leaf: "#597b4a",
  light: "#82925a",
  bark: "#374039",
  wood: "#58604a",
  stone: "#415452",
  stoneLight: "#647568",
  stoneTop: "#83917a",
  cream: "#eee3b8",
  creamShade: "#c4bd8e",
  creamDark: "#949374",
  skin: "#d6a980",
  teal: "#428f8d",
  tealLight: "#78beb0",
  tealDark: "#2e646a",
  red: "#cf665e",
  redLight: "#f29b78",
  redDark: "#883f4e",
  gold: "#ecc881",
  white: "#fff3cf",
  violet: "#ad8bc0",
  purple: "#645078",
  blue: "#78b8d0",
  coral: "#ef8c87",
  echoDark: "#376c70",
  echoMid: "#65a5a3",
  echoLight: "#b4d2bd",
});
export const PLAYER_COLORS = ["#7ec7bb", "#efbb76", "#b4a0d4", "#d88fa5"];
const TEALS = [
  ["#2e646a", "#428f8d", "#78beb0"],
  ["#85563e", "#bd874b", "#edbc74"],
  ["#595378", "#82749f", "#b0a0cf"],
  ["#783f59", "#b3657a", "#e59caa"],
];

// A sprite is a carefully authored cluster map. Dots are transparent; no image assets.
const HOOD = [
  "......oooooo......",
  "....ooddddddoo....",
  "...odcccccccddo...",
  "..odccccccccccdo..",
  ".odccwwccccccccdo.",
  ".odcwwccccccccddo.",
  "odccwccccccccccdo.",
  "odcccddddddddccdo.",
  "odccdoiiiiiiodcdo.",
  ".ocdoiissssioddo..",
  ".oddoiisissiioo...",
  "..odoiissssioo....",
  "...ooddssddoo.....",
  ".....oooooo.......",
];
const BACK = [
  "......oooooo......",
  "....ooddddddoo....",
  "...odcccccccddo...",
  "..odccccccccccdo..",
  ".odccwwccccccccdo.",
  ".odcwwccccccccddo.",
  "odccwccccccccccdo.",
  "odcccccccccccccdo.",
  "odccccccccccccddo.",
  ".odcccccccccdddo..",
  ".odccccccccdddoo..",
  "..odccccddddoo....",
  "...odddddddoo.....",
  ".....oooooo.......",
];
const COAT = [
  "....ooooooo....",
  "...ottllltto...",
  "..ottllllttto..",
  ".odtllltltttto.",
  "oddttlltltttdo.",
  "odtttlltltttdo.",
  "odttttttltttdo.",
  ".odttttttttdo..",
  ".oddtttttttddo.",
  "odddttttttdddo.",
  "oddddttttdddoo.",
  ".ooooo..ooooo..",
];
const MITE = [
  "....oo.....oo....",
  "...ollo...ollo...",
  "....ollo.ollo....",
  "...oodoooooodo...",
  "..odddrrrrddddo..",
  ".odrrRRRRRRrrdo..",
  "odrRRRRRRRRRRrdo.",
  "odrRRRrrrRRRRrdo.",
  "odrrRroorRRorrdo.",
  ".odrrrooRRroodo..",
  "..odrrrrrrrddo...",
  "...oddddddddo....",
  "..oodoooooodoo...",
  ".oo..........oo..",
];
const THORN = [
  ".......oo........",
  "......oloo.......",
  "...oo.olllo......",
  "..olloollllo.....",
  "..ollllolloo.....",
  "...olloollo......",
  "....oooooo.......",
  "...orrRRrro......",
  "..orrRRRRrro.....",
  ".orrRRRRRRrro....",
  ".orRooRRooRro....",
  ".orRwoRRwoRro....",
  "..orrrrrrrro.....",
  "...odddddo.......",
  "..odddddddo......",
  ".oddooddooddo....",
  "oo...oooo...oo...",
];
const MOTH = [
  "..oo..............oo..",
  ".ovvo............ovvo.",
  "ovvvvo...oo.....ovvvvo",
  "ovllvvo.ollo..ovvllvo.",
  "ovlllvvooddooovvlllvvo",
  ".ovllvvvoRRovvvllvvo..",
  "..ovvvvvorrovvvvvvo...",
  "...ovvvvoRRovvvvvo....",
  "....ovvoorroovvo......",
  "...ovvo.orro.ovvo.....",
  "...ovo..oooo..ovo.....",
  "....o..........o......",
];
const FERN = [
  "......l......",
  "..l...l...l..",
  "...l..l..l...",
  "ll..l.l.l..ll",
  "..ll.lll.ll..",
  "....lllll....",
  "lll..lll..lll",
  "...lllllll...",
  ".....lll.....",
  "......d......",
];
const FLOWER = [
  "....ww....",
  "..wwggww..",
  "..wggggw..",
  ".wggyyggw.",
  ".wggyyggw.",
  "..wggggw..",
  "..wwggww..",
  "....dd....",
  ".ll.dd.ll.",
  "..llddll..",
  "....dd....",
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
export function drawActor(ctx, actor, time, settings = {}) {
  const p = pose(actor, time, settings),
    x =
      Math.round(actor.x || 0) +
      (p.hit ? (Math.floor(time * 24) % 2 ? -1 : 1) : 0),
    y = Math.round(actor.y || 0);
  if (actor.type && actor.type !== "player") {
    drawEnemy(ctx, actor, time, settings);
    return;
  }
  const ghost = settings.ghost === true,
    color = ghost
      ? [PALETTE.echoDark, PALETTE.echoMid, PALETTE.echoLight]
      : TEALS[(actor.color || 0) % 4],
    ink = p.hit ? PALETTE.white : ghost ? PALETTE.echoLight : PALETTE.ink,
    scarfDark = ghost ? PALETTE.echoDark : PALETTE.redDark,
    scarfMid = ghost ? PALETTE.echoMid : PALETTE.red,
    scarfLight = ghost ? PALETTE.echoLight : PALETTE.redLight;
  const colors = {
    o: ink,
    d: ghost ? PALETTE.echoDark : PALETTE.creamDark,
    c: ghost ? PALETTE.echoMid : PALETTE.creamShade,
    w: ghost ? PALETTE.echoLight : PALETTE.cream,
    i: ghost ? PALETTE.echoDark : "#303538",
    s: ghost ? PALETTE.echoLight : PALETTE.skin,
  };
  if (actor.dead) {
    shadow(ctx, x, y, 10);
    stamp(ctx, HOOD, x - 9, y - 11, colors);
    pixel(ctx, x - 5, y - 4, 10, 3, color[0]);
    return;
  }
  shadow(ctx, x, y, 10);
  const top = y - 28 - p.bob - Math.round(p.lift),
    lean = Math.round(p.lean) * p.face;
  // Cloth bends in integer segments, keeping its authored pixel edge crisp.
  const side = -p.face,
    scarfLength = Math.round(16 + p.scarf * 5);
  for (let i = scarfLength; i >= 0; i--) {
    const sy =
      top +
      14 +
      Math.round(Math.sin(p.q * 7 - i * 0.25) * p.scarf * 2) +
      Math.floor(i / 9);
    pixel(ctx, x + side * i, sy, 2, 4, scarfDark);
    pixel(ctx, x + side * i, sy, 2, 2, scarfMid);
    if (i % 5 === 0) pixel(ctx, x + side * i, sy, 1, 1, scarfLight);
  }
  // The swinging boot rises; the planted one never dips below the ground line.
  const leftBootX = x - 5 + p.leftStride * p.face,
    rightBootX = x + 2 + p.rightStride * p.face,
    leftBootY = y - 4 - p.leftLift,
    rightBootY = y - 4 - p.rightLift;
  pixel(ctx, leftBootX, leftBootY, 4, 4, ink);
  pixel(ctx, rightBootX, rightBootY, 4, 4, ink);
  pixel(ctx, leftBootX, leftBootY, 3, 1, PALETTE.creamDark);
  pixel(ctx, rightBootX, rightBootY, 3, 1, PALETTE.creamDark);
  pixel(ctx, leftBootX + (p.face > 0 ? 2 : 0), leftBootY + 2, 2, 1, color[0]);
  pixel(ctx, rightBootX + (p.face > 0 ? 2 : 0), rightBootY + 2, 2, 1, color[0]);
  stamp(
    ctx,
    COAT,
    x - 7 + lean + p.coatSwing,
    top + 14 + Math.round(p.stretch),
    { o: ink, d: color[0], t: color[1], l: color[2] },
    p.face < 0,
  );
  if (!ghost) {
    // A tiny woven clasp and hem motif stay legible at the 640×360 game scale.
    pixel(ctx, x - 1 + lean, top + 17, 3, 2, PALETTE.creamDark);
    pixel(ctx, x + lean, top + 17, 1, 2, PALETTE.gold);
    pixel(ctx, x - 4 + lean + p.coatSwing, top + 23 + Math.round(p.stretch), 2, 1, color[2]);
    pixel(ctx, x + 3 + lean + p.coatSwing, top + 23 + Math.round(p.stretch), 2, 1, color[2]);
  }
  // The free sleeve counter-swings while running and tucks in for the unwind.
  const freeX = x - p.face * (9 - p.coatSwing) + lean,
    freeY = top + 21 + (p.moving ? p.rightLift - p.leftLift : 0) - Math.max(0, Math.round(p.needleReach * 0.35));
  line(ctx, x - p.face * 5 + lean, top + 18, freeX, freeY, ink, 2);
  pixel(ctx, freeX - 1, freeY - 1, 3, 3, color[0]);
  pixel(ctx, freeX, freeY + 1, 2, 2, ghost ? PALETTE.echoLight : PALETTE.skin);
  // Bone needle, leather grip, and the hand over it.
  const handX = x + p.face * (10 + Math.round(p.needleReach)) + lean,
    handY =
      top +
      20 -
      Math.round(p.lift * 1.5) -
      (p.actionPhase === "impact" ? 2 : 0);
  line(ctx, handX, handY + 5, handX + p.face * 3, handY - 10, ink, 2);
  line(
    ctx,
    handX,
    handY + 4,
    handX + p.face * 3,
    handY - 9,
    PALETTE.creamShade,
  );
  pixel(ctx, handX, handY, 3, 3, ghost ? PALETTE.echoLight : PALETTE.skin);
  pixel(ctx, handX + p.face * 3, handY - 10, 1, 3, PALETTE.white);
  if (p.actionPhase === "impact" && !ghost) {
    const tipX = handX + p.face * 3,
      tipY = handY - 11;
    pixel(ctx, tipX - 2, tipY, 5, 1, PALETTE.white);
    pixel(ctx, tipX, tipY - 2, 1, 5, PALETTE.gold);
  }
  stamp(
    ctx,
    p.back ? BACK : HOOD,
    x - 9 + (p.moving ? p.face : 0) + lean,
    top,
    colors,
    p.face < 0,
  );
  if (!p.back) {
    const faceOffset = (p.face < 0 ? -1 : 1) + lean;
    pixel(
      ctx,
      x - 3 + faceOffset,
      top + 10,
      1,
      2,
      p.blink ? colors.s : ghost ? PALETTE.echoLight : PALETTE.ink,
    );
    pixel(
      ctx,
      x + 2 + faceOffset,
      top + 10,
      1,
      2,
      p.blink ? colors.s : ghost ? PALETTE.echoLight : PALETTE.ink,
    );
    if (!p.blink) {
      pixel(ctx, x - 3 + faceOffset, top + 10, 1, 1, PALETTE.white);
      pixel(ctx, x + 2 + faceOffset, top + 10, 1, 1, PALETTE.white);
    }
  }
  pixel(ctx, x - 5 + lean, top + 13, 11, 2, scarfMid);
  pixel(ctx, x - 5 + lean, top + 13, 5, 1, scarfLight);
  // The two bright stitches identify each keeper in a crowded party.
  if (!ghost) {
    pixel(
      ctx,
      x - 5 + lean,
      top + 18,
      2,
      2,
      PLAYER_COLORS[(actor.color || 0) % 4],
    );
    pixel(
      ctx,
      x + 4 + lean,
      top + 18,
      2,
      2,
      PLAYER_COLORS[(actor.color || 0) % 4],
    );
  }
}
export function drawEnemy(ctx, e, time, settings = {}) {
  const x = Math.round(e.x) + (e.hit > 0 ? ((e.id || 0) % 2 ? -1 : 1) : 0),
    y = Math.round(e.y),
    q = Math.floor(time * 12) / 12,
    hit = e.hit > 0 || settings.state === "hit";
  const ink = hit ? PALETTE.white : PALETTE.ink;
  shadow(ctx, x, y, e.type === "warden" ? 27 : 9);
  if (e.type === "moth") {
    const flap = Math.round(
      Math.sin(q * (e.fireIn < 0.65 ? 20 : 12)) * (e.fireIn < 0.65 ? 3 : 2),
    );
    stamp(ctx, MOTH, x - 11, y - 16 + flap, {
      o: ink,
      v: PALETTE.purple,
      l: PALETTE.violet,
      d: PALETTE.creamDark,
      r: PALETTE.creamShade,
      R: PALETTE.cream,
    });
    pixel(
      ctx,
      x - 1,
      y - 11 + flap,
      1,
      1,
      e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
    );
    pixel(
      ctx,
      x + 2,
      y - 11 + flap,
      1,
      1,
      e.fireIn < 0.65 ? PALETTE.white : PALETTE.redLight,
    );
    // Paired wing veins keep the broad lilac silhouette from reading flat.
    line(ctx, x - 10, y - 11 + flap, x - 6, y - 9 + flap, PALETTE.creamDark);
    line(ctx, x + 10, y - 11 + flap, x + 6, y - 9 + flap, PALETTE.creamDark);
  } else if (e.type === "thorn") {
    stamp(ctx, THORN, x - 8, y - 18, {
      o: ink,
      l: PALETTE.leaf,
      r: "#806976",
      R: "#b58898",
      w: e.fireIn < 0.65 ? PALETTE.white : PALETTE.gold,
      d: PALETTE.wood,
    });
    pixel(ctx, x - 10, y - 13, 3, 1, PALETTE.leaf);
    pixel(ctx, x + 8, y - 16, 3, 1, PALETTE.light);
  } else if (e.type === "warden") {
    const bob = Math.round(Math.sin(q * 3));
    // Ancient hollow-tree guardian; branch antlers and a mask formed from bark.
    for (const side of [-1, 1]) {
      line(
        ctx,
        x + side * 12,
        y - 29 + bob,
        x + side * 28,
        y - 52 + bob,
        ink,
        5,
      );
      line(
        ctx,
        x + side * 13,
        y - 29 + bob,
        x + side * 28,
        y - 52 + bob,
        PALETTE.wood,
        3,
      );
      line(
        ctx,
        x + side * 22,
        y - 42 + bob,
        x + side * 36,
        y - 43 + bob,
        PALETTE.wood,
        3,
      );
      line(
        ctx,
        x + side * 21,
        y - 42 + bob,
        x + side * 19,
        y - 56 + bob,
        PALETTE.stoneLight,
        2,
      );
      line(
        ctx,
        x + side * 20,
        y - 53 + bob,
        x + side * 16,
        y - 59 + bob,
        PALETTE.stoneLight,
      );
      oval(ctx, x + side * 17, y - 18, 9, 15, ink);
      oval(ctx, x + side * 17, y - 20, 6, 13, PALETTE.bark);
      pixel(ctx, x + side * 19 - 2, y - 11, 5, 9, PALETTE.wood);
    }
    oval(ctx, x, y - 21 + bob, 17, 23, ink);
    oval(
      ctx,
      x - 1,
      y - 23 + bob,
      14,
      21,
      e.ward ? PALETTE.tealDark : PALETTE.bark,
    );
    oval(
      ctx,
      x - 2,
      y - 29 + bob,
      12,
      14,
      e.ward ? PALETTE.stone : PALETTE.wood,
    );
    oval(ctx, x - 4, y - 32 + bob, 10, 10, PALETTE.stoneLight);
    pixel(ctx, x - 10, y - 34 + bob, 8, 4, ink);
    pixel(ctx, x + 3, y - 34 + bob, 7, 4, ink);
    pixel(ctx, x - 8, y - 33 + bob, 5, 2, PALETTE.redLight);
    pixel(ctx, x + 4, y - 33 + bob, 4, 2, PALETTE.redLight);
    pixel(ctx, x - 2, y - 27 + bob, 3, 11, ink);
    pixel(ctx, x - 5, y - 25 + bob, 2, 8, PALETTE.creamDark);
    for (let i = 0; i < 5; i++)
      line(ctx, x - 10 + i * 5, y - 12, x - 13 + i * 6, y, PALETTE.wood, 3);
    oval(
      ctx,
      x,
      y - 16,
      4,
      5,
      e.ward
        ? PALETTE.echoDark
        : e.exposed > 0
          ? PALETTE.gold
          : e.stage >= 3
            ? PALETTE.red
            : PALETTE.redDark,
    );
    pixel(
      ctx,
      x - 1,
      y - 20,
      2,
      6,
      e.exposed > 0 || e.fireIn < 0.65
        ? PALETTE.white
        : e.ward
          ? PALETTE.echoLight
          : PALETTE.redLight,
    );
    if (e.ward) {
      for (const [dx, dy] of [
        [-15, -20],
        [14, -20],
        [-12, -31],
        [11, -31],
        [-8, -42],
        [7, -42],
      ])
        pixel(ctx, x + dx, y + dy + bob, 2, 3, PALETTE.echoMid);
    }
    if (e.stage >= 2) {
      pixel(ctx, x - 11, y - 19, 2, 7, PALETTE.redDark);
      pixel(ctx, x + 9, y - 24, 2, 8, PALETTE.redLight);
    }
  } else {
    const hop = Math.round(Math.abs(Math.sin(q * 9 + (e.id || 0))) * 2);
    stamp(ctx, MITE, x - 8, y - 14 - hop, {
      o: ink,
      l: PALETTE.leaf,
      d: "#483d48",
      r: "#81505e",
      R: "#be7780",
    });
    pixel(ctx, x - 3, y - 6 - hop, 1, 1, PALETTE.gold);
    pixel(ctx, x + 3, y - 6 - hop, 1, 1, PALETTE.gold);
  }
}
export function drawFlower(ctx, f, time) {
  const x = Math.round(f.x),
    y = Math.round(f.y),
    charge = Math.max(0, Math.min(1, f.charge || 0)),
    waking = charge >= 0.45,
    ready = charge >= 0.85;
  shadow(ctx, x, y, 5);
  stamp(ctx, FLOWER, x - 5, y - 10, {
    w: ready ? PALETTE.white : waking ? PALETTE.cream : PALETTE.creamShade,
    g: ready ? PALETTE.gold : waking ? PALETTE.redLight : PALETTE.red,
    y: ready ? PALETTE.white : PALETTE.gold,
    d: PALETTE.grass,
    l: PALETTE.leaf,
  });
  if (waking) {
    const q = Math.floor(time * 8),
      orbit = ready ? 9 : 7;
    for (let i = 0; i < (ready ? 4 : 2); i++) {
      const angle = ((q + i * 8 + (f.id || 0)) * Math.PI) / 16;
      pixel(
        ctx,
        x + Math.round(Math.cos(angle) * orbit),
        y - 5 + Math.round(Math.sin(angle) * orbit * 0.6),
        1,
        1,
        ready ? PALETTE.white : PALETTE.gold,
      );
    }
    if (ready) {
      pixel(ctx, x - 1, y - 13 - (q % 2), 3, 1, PALETTE.white);
      pixel(ctx, x, y - 15 - (q % 2), 1, 4, PALETTE.gold);
    }
  }
}
export function drawFern(ctx, x, y, variant = 0) {
  stamp(ctx, FERN, x - 6, y - 9, {
    l: variant ? PALETTE.grass : PALETTE.leaf,
    d: PALETTE.moss,
  });
}
