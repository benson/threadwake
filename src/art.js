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
    x = Math.round(actor.x || 0),
    y = Math.round(actor.y || 0);
  if (actor.type && actor.type !== "player") {
    drawEnemy(ctx, actor, time, settings);
    return;
  }
  const color = TEALS[(actor.color || 0) % 4],
    ink = p.hit ? PALETTE.white : PALETTE.ink;
  const colors = {
    o: ink,
    d: PALETTE.creamDark,
    c: PALETTE.creamShade,
    w: PALETTE.cream,
    i: "#303538",
    s: PALETTE.skin,
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
    pixel(ctx, x + side * i, sy, 2, 4, PALETTE.redDark);
    pixel(ctx, x + side * i, sy, 2, 2, PALETTE.red);
    if (i % 5 === 0) pixel(ctx, x + side * i, sy, 1, 1, PALETTE.redLight);
  }
  // Feet move independently of the torso; body settles on planted foot.
  pixel(ctx, x - 5, y - 4 + p.step, 4, 4, ink);
  pixel(ctx, x + 2, y - 4 - p.step, 4, 4, ink);
  pixel(ctx, x - 5, y - 4 + p.step, 3, 1, PALETTE.creamDark);
  pixel(ctx, x + 2, y - 4 - p.step, 3, 1, PALETTE.creamDark);
  stamp(
    ctx,
    COAT,
    x - 7 + lean,
    top + 14,
    { o: ink, d: color[0], t: color[1], l: color[2] },
    p.face < 0,
  );
  // Bone needle, leather grip, and the hand over it.
  const handX = x + p.face * 10 + lean,
    handY = top + 20 - Math.round(p.lift * 1.5);
  line(ctx, handX, handY + 5, handX + p.face * 3, handY - 10, ink, 2);
  line(
    ctx,
    handX,
    handY + 4,
    handX + p.face * 3,
    handY - 9,
    PALETTE.creamShade,
  );
  pixel(ctx, handX, handY, 3, 3, PALETTE.skin);
  pixel(ctx, handX + p.face * 3, handY - 10, 1, 3, PALETTE.white);
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
      p.blink ? PALETTE.skin : PALETTE.ink,
    );
    pixel(
      ctx,
      x + 2 + faceOffset,
      top + 10,
      1,
      2,
      p.blink ? PALETTE.skin : PALETTE.ink,
    );
    if (!p.blink) {
      pixel(ctx, x - 3 + faceOffset, top + 10, 1, 1, PALETTE.white);
      pixel(ctx, x + 2 + faceOffset, top + 10, 1, 1, PALETTE.white);
    }
  }
  pixel(ctx, x - 5 + lean, top + 13, 11, 2, PALETTE.red);
  pixel(ctx, x - 5 + lean, top + 13, 5, 1, PALETTE.redLight);
}
export function drawEnemy(ctx, e, time, settings = {}) {
  const x = Math.round(e.x),
    y = Math.round(e.y),
    q = Math.floor(time * 12) / 12,
    hit = e.hit > 0 || settings.state === "hit";
  const ink = hit ? PALETTE.white : PALETTE.ink;
  shadow(ctx, x, y, e.type === "warden" ? 27 : 9);
  if (e.type === "moth") {
    const flap = Math.round(Math.sin(q * 12) * 2);
    stamp(ctx, MOTH, x - 11, y - 16 + flap, {
      o: ink,
      v: PALETTE.purple,
      l: PALETTE.violet,
      d: PALETTE.creamDark,
      r: PALETTE.creamShade,
      R: PALETTE.cream,
    });
    pixel(ctx, x - 1, y - 11 + flap, 1, 1, PALETTE.redLight);
    pixel(ctx, x + 2, y - 11 + flap, 1, 1, PALETTE.redLight);
  } else if (e.type === "thorn") {
    stamp(ctx, THORN, x - 8, y - 18, {
      o: ink,
      l: PALETTE.leaf,
      r: "#806976",
      R: "#b58898",
      w: PALETTE.gold,
      d: PALETTE.wood,
    });
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
    oval(ctx, x - 1, y - 23 + bob, 14, 21, PALETTE.bark);
    oval(ctx, x - 2, y - 29 + bob, 12, 14, PALETTE.wood);
    oval(ctx, x - 4, y - 32 + bob, 10, 10, PALETTE.stoneLight);
    pixel(ctx, x - 10, y - 34 + bob, 8, 4, ink);
    pixel(ctx, x + 3, y - 34 + bob, 7, 4, ink);
    pixel(ctx, x - 8, y - 33 + bob, 5, 2, PALETTE.redLight);
    pixel(ctx, x + 4, y - 33 + bob, 4, 2, PALETTE.redLight);
    pixel(ctx, x - 2, y - 27 + bob, 3, 11, ink);
    pixel(ctx, x - 5, y - 25 + bob, 2, 8, PALETTE.creamDark);
    for (let i = 0; i < 5; i++)
      line(ctx, x - 10 + i * 5, y - 12, x - 13 + i * 6, y, PALETTE.wood, 3);
    oval(ctx, x, y - 16, 4, 5, PALETTE.redDark);
    pixel(ctx, x - 1, y - 20, 2, 6, PALETTE.redLight);
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
    open = (f.charge || 0) > 0;
  shadow(ctx, x, y, 5);
  stamp(ctx, FLOWER, x - 5, y - 10, {
    w: open ? PALETTE.white : PALETTE.creamShade,
    g: open ? PALETTE.redLight : PALETTE.red,
    y: PALETTE.gold,
    d: PALETTE.grass,
    l: PALETTE.leaf,
  });
  if (open) {
    const q = Math.floor(time * 5);
    pixel(
      ctx,
      x + Math.round(Math.sin(q + f.id) * 8),
      y - 13,
      1,
      2,
      PALETTE.gold,
    );
  }
}
export function drawFern(ctx, x, y, variant = 0) {
  stamp(ctx, FERN, x - 6, y - 9, {
    l: variant ? PALETTE.grass : PALETTE.leaf,
    d: PALETTE.moss,
  });
}
