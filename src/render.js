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
import { bodyCircle, weaponMuzzle } from "./combat-geometry.js";
import { collectLights, createLighting } from "./lighting.js";
import { drawAtmosphereGround, drawAtmosphereDetails } from "./atmosphere.js";
import { drawDebris } from "./debris.js";

const W = 1200,
  H = 800,
  BACK_WALL = 125,
  SIDE_WALL = 49;
export const RASTER_SCALE = 2;
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function surface(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w * RASTER_SCALE;
  canvas.height = h * RASTER_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(RASTER_SCALE, RASTER_SCALE);
  ctx._pixelRatio = RASTER_SCALE;
  ctx.imageSmoothingEnabled = false;
  return canvas;
}
// Quantized directional lighting on the finer raster: no paths, filtering or
// gradients. A material is a short hand-tuned ramp, not a flat nested oval.
const SCENE_MATERIAL = {
  marble: [
    "#566270",
    "#78838b",
    "#a2aaab",
    "#c4c6b9",
    "#dedcc5",
    "#f3e9cc",
    "#fff1d5",
  ],
  porcelain: [
    "#526b76",
    "#7f959c",
    "#aeb9b5",
    "#d1d5c6",
    "#e9e7d1",
    "#fff0d7",
    "#fff7e5",
  ],
  bronze: [
    "#4b3d35",
    "#72553e",
    "#927049",
    "#b39761",
    "#d1b982",
    "#ebd69e",
    "#fff0bd",
  ],
  clay: [
    "#594137",
    "#7b5140",
    "#9b6a4e",
    "#b98761",
    "#d2a277",
    "#e3bf90",
    "#f0d5aa",
  ],
  fossil: [
    "#4c514d",
    "#696b5d",
    "#858473",
    "#a3a08a",
    "#bcb69a",
    "#d4c8a8",
    "#e5d8b5",
  ],
};
function materialOval(ctx, cx, cy, rx, ry, material = "marble") {
  const ramp = SCENE_MATERIAL[material],
    step = 1 / (ctx._pixelRatio || 1);
  for (let y = -ry; y <= ry; y += step) {
    let run = null,
      start = 0,
      end = 0;
    for (let x = -rx; x <= rx; x += step) {
      const nx = x / rx,
        ny = y / ry,
        inside = 1 - nx * nx - ny * ny;
      if (inside < 0) continue;
      const nz = Math.sqrt(inside),
        light = Math.max(0, -0.48 * nx - 0.56 * ny + 0.68 * nz);
      let shade = Math.min(ramp.length - 1, Math.floor(light * 6.1));
      // A narrow cool terminator keeps the object grounded on its shadow side.
      if (inside < 0.055) shade = Math.min(shade, 2);
      if (shade !== run) {
        if (run !== null)
          pixel(ctx, cx + start, cy + y, x - start, step, ramp[run]);
        run = shade;
        start = x;
      }
      end = x + step;
    }
    if (run !== null)
      pixel(ctx, cx + start, cy + y, end - start, step, ramp[run]);
  }
}
// Baked collection details use the same hard pixel clusters as the live actors.
function brassGear(ctx, x, y, radius, pale = false) {
  const metal = pale ? "#b7a580" : "#a88554";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    pixel(
      ctx,
      x + Math.cos(a) * radius - 2,
      y + Math.sin(a) * radius - 2,
      5,
      5,
      P.wood,
    );
    pixel(
      ctx,
      x + Math.cos(a) * radius - 1,
      y + Math.sin(a) * radius - 1,
      3,
      3,
      metal,
    );
  }
  oval(ctx, x, y, radius, radius, P.ink);
  materialOval(ctx, x, y, radius - 2, radius - 2, "bronze");
  oval(ctx, x, y, Math.max(2, radius - 5), Math.max(2, radius - 5), "#29343b");
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.35;
    line(
      ctx,
      x,
      y,
      x + Math.cos(a) * (radius - 3),
      y + Math.sin(a) * (radius - 3),
      metal,
      2,
    );
  }
  oval(ctx, x, y, 3, 3, P.wood);
  pixel(ctx, x - 1, y - 1, 2, 2, P.gold);
  pixel(ctx, x - radius + 4, y - 4, 1, 5, P.creamShade);
}
function collectionDial(ctx, x, y, radius, hand = 0) {
  oval(ctx, x, y, radius, radius, P.ink);
  materialOval(ctx, x, y, radius - 1, radius - 1, "bronze");
  oval(ctx, x, y, radius - 3, radius - 3, "#969f9b");
  oval(ctx, x - 0.5, y - 0.5, radius - 4, radius - 4, "#d5ceb5");
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    pixel(
      ctx,
      x + Math.sin(a) * (radius - 5),
      y - Math.cos(a) * (radius - 5),
      i % 3 ? 0.5 : 1,
      i % 3 ? 1 : 2,
      P.wood,
    );
  }
  line(ctx, x, y, x + (hand % 2 ? -4 : 4), y - radius + 6, P.ink);
  line(ctx, x, y, x + radius - 6, y + 3, P.wood);
  pixel(ctx, x - 1, y - 1, 3, 3, P.ink);
  pixel(ctx, x - 1.5, y - radius + 4.5, 3, 0.5, "#f1e3c6");
}
function frame(ctx, cx, y, w, h, motif, gallery) {
  const x = Math.round(cx - w / 2);
  pixel(ctx, x - 2, y + 3, w + 5, h + 5, P.ink);
  pixel(ctx, x, y, w, h, P.gold);
  pixel(ctx, x + 3, y + 3, w - 6, h - 6, P.wood);
  pixel(ctx, x + 6, y + 6, w - 12, h - 12, P.shadow);
  pixel(ctx, x + 1, y + 1, w - 3, 0.5, "#f0d8a2");
  pixel(ctx, x + 1, y + 1, 0.5, h - 3, "#dfc18c");
  pixel(ctx, x + w - 3, y + 2, 2, h - 3, "#897047");
  pixel(ctx, x + 2, y + h - 3, w - 3, 2, "#70533d");
  pixel(ctx, x + 4.5, y + 5, w - 10, 0.5, "#302f32");
  pixel(ctx, x + 5, y + 5, 0.5, h - 10, "#302f32");
  pixel(ctx, x + 7, y + 7, w - 14, h - 14, motif % 2 ? "#394353" : "#475464");
  // Mitred gilding, corner leaves, and canvas weave stay inside each frame.
  for (const px of [x + 1, x + w - 5])
    for (const py of [y + 1, y + h - 5]) {
      pixel(ctx, px, py, 4, 4, "#ac8654");
      pixel(ctx, px + 1, py + 1, 2, 2, P.creamShade);
    }
  for (let py = y + 10; py < y + h - 8; py += 5)
    pixel(ctx, x + 9, py, w - 18, 1, motif % 2 ? "#3c4553" : "#4b5764");
  if (gallery === "natural_history") {
    pixel(ctx, x + 8, y + 8, w - 16, h - 16, "#75847b");
    pixel(ctx, x + 10, y + 10, w - 20, h - 20, "#b4b49a");
    if (motif % 3 === 0) {
      line(ctx, cx, y + 48, cx + 2, y + 17, "#4b6555", 2);
      for (let i = 0; i < 5; i++) {
        const py = y + 22 + i * 5,
          span = 5 + i;
        line(ctx, cx + 1, py + 4, cx - span, py - 2, "#627a60", 3);
        line(ctx, cx + 1, py + 4, cx + span + 1, py - 3, "#566e57", 3);
        line(ctx, cx, py + 3, cx - span, py - 2, "#88916e");
      }
    } else if (motif % 3 === 1) {
      for (const side of [-1, 1]) {
        oval(ctx, cx + side * 10, y + 29, 10, 9, "#817363");
        oval(ctx, cx + side * 9, y + 41, 7, 7, "#968b6c");
        oval(ctx, cx + side * 11, y + 29, 4, 4, "#beb092");
        oval(ctx, cx + side * 11, y + 29, 2, 2, "#586756");
        line(ctx, cx, y + 22, cx + side * 6, y + 17, "#57604f");
      }
      pixel(ctx, cx - 1, y + 23, 3, 25, "#4e5e52");
    } else {
      oval(ctx, cx, y + 34, 18, 17, "#8f947b");
      for (let i = 0; i < 34; i++) {
        const a = i * 0.4,
          radius = 1 + i * 0.45;
        pixel(
          ctx,
          cx + Math.cos(a) * radius,
          y + 34 + Math.sin(a) * radius,
          2,
          2,
          "#d0c6a6",
        );
      }
    }
    pixel(ctx, cx - 10, y + h - 12, 20, 1, "#777e69");
  } else if (gallery === "clock_gallery") {
    if (motif % 3 === 0) {
      collectionDial(ctx, cx, y + 34, 20, 1);
    } else if (motif % 3 === 1) {
      brassGear(ctx, cx - 8, y + 28, 12, false);
      brassGear(ctx, cx + 11, y + 43, 10, true);
    } else {
      pixel(ctx, cx - 15, y + 15, 30, 4, "#a38960");
      line(ctx, cx, y + 19, cx - 9, y + 45, "#bba77f", 2);
      oval(ctx, cx - 8, y + 46, 7, 7, "#ac9466");
      oval(ctx, cx - 10, y + 44, 3, 3, "#d0bd91");
      for (let i = 0; i < 7; i++)
        pixel(ctx, cx - 18 + i * 6, y + 53 - Math.abs(i - 3), 2, 1, "#978264");
    }
  } else if (motif % 3 === 0) {
    oval(ctx, cx, y + h * 0.45, w * 0.17, h * 0.22, P.creamDark);
    pixel(ctx, cx - 4, y + h * 0.56, 8, 7, P.redDark);
    pixel(ctx, cx - 2, y + h * 0.34, 4, 2, P.cream);
    pixel(ctx, cx - 8, y + h * 0.25, 16, 3, P.wood);
    pixel(ctx, cx + 3, y + h * 0.44, 2, 2, P.shadow);
    line(ctx, cx - 6, y + h * 0.57, cx, y + h * 0.65, P.gold);
  } else if (motif % 3 === 1) {
    oval(ctx, cx, y + h * 0.6, w * 0.24, h * 0.13, P.wood);
    line(ctx, cx - 9, y + h * 0.61, cx + 9, y + h * 0.36, P.creamShade, 2);
    pixel(ctx, cx + 3, y + h * 0.36, 5, 4, P.gold);
    line(ctx, cx - 16, y + h * 0.65, cx + 17, y + h * 0.65, "#67717a");
    pixel(ctx, cx - 14, y + h * 0.38, 5, 8, "#718181");
  } else {
    pixel(ctx, cx - 8, y + h * 0.3, 16, 17, P.redDark);
    pixel(ctx, cx - 6, y + h * 0.3, 12, 4, P.creamShade);
    pixel(ctx, cx - 2, y + h * 0.37, 4, 9, P.gold);
    for (const dx of [-6, 5]) pixel(ctx, cx + dx, y + h * 0.4, 2, 8, "#975e59");
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
  // The full solid footprint is still exact. Its upper plane, shaded right side
  // and substantial front face now read as a cabinet or stone block in space.
  pixel(ctx, 0, 0, w, h, "#111a25");
  if (o.kind === "plinth") {
    pixel(ctx, 2, h - 15, w - 4, 12, "#5b6a75");
    pixel(ctx, 4, h - 14, w - 17, 8, "#849198");
    pixel(ctx, w - 13, 4, 11, h - 8, "#4b5a69");
    for (let y = 2; y < h - 15; y += 0.5) {
      const inset = y < 7 ? 7 - y : 2;
      pixel(ctx, inset, y, w - 11 - inset, 0.5, y < 6 ? "#c0c6bf" : "#929f9f");
    }
    pixel(ctx, 4, h - 18, w - 17, 3, "#c7c9bb");
    pixel(ctx, 5, h - 14, w - 19, 0.5, "#b6c0b8");
    pixel(ctx, 5, h - 6, w - 18, 1, "#3e4d5d");
    line(ctx, w - 12, 6, w - 12, h - 17, "#78888e", 0.5);
    for (const [x, y] of [
      [12, 17],
      [w - 35, h - 32],
    ]) {
      line(ctx, x, y, x + 9, y + 3, "#808e90", 0.5);
      line(ctx, x + 9, y + 3, x + 13, y + 12, "#808e90", 0.5);
      line(ctx, x + 9, y + 3, x + 18, y + 2, "#aab3af", 0.5);
    }
    // Sculpture occlusion is a broad, quiet contact shadow on the top slab.
    oval(ctx, cx + 3, cy + 19, 26, 10, "#738385");
    oval(ctx, cx + 1, cy + 18, 23, 7, "#5f7379");
  } else {
    const lip = h - 14;
    pixel(ctx, 2, lip, w - 4, 12, "#493730");
    pixel(ctx, 3, lip + 1, w - 15, 9, "#71523c");
    pixel(ctx, w - 11, 5, 9, h - 8, "#3e3330");
    for (let y = 2; y < lip; y += 0.5) {
      const inset = y < 6 ? 6 - y : 2;
      pixel(ctx, inset, y, w - 10 - inset, 0.5, y < 5 ? "#d0b180" : "#8e7454");
    }
    pixel(ctx, 4, 5, w - 17, lip - 8, "#141e29");
    pixel(ctx, 6, 7, w - 21, lip - 12, "#20333e");
    for (let y = 8; y < lip - 5; y += 1) {
      const shade = y < 12 ? "#1c2e39" : y < 21 ? "#293d46" : "#30464e";
      pixel(ctx, 9, y, w - 27, 1, shade);
    }
    // Inset furniture panels and tiny recessed screws replace a flat gilded border.
    const panels = Math.max(1, Math.floor(w / 58));
    for (let i = 0; i < panels; i++) {
      const x = 7 + (i * (w - 24)) / panels,
        panelW = (w - 24) / panels - 5;
      pixel(ctx, x, lip + 3, panelW, 5, "#45372f");
      pixel(ctx, x + 1, lip + 4, panelW - 2, 3, "#614b39");
      pixel(ctx, x + 2, lip + 6, panelW - 4, 0.5, "#9b7550");
    }
    pixel(ctx, 3, lip - 1, w - 15, 1.5, "#ba9b68");
    pixel(ctx, 4, lip + 0.5, w - 17, 0.5, "#e0c396");
    pixel(ctx, 4, h - 3, w - 16, 1, "#29272a");
    for (const x of [7, w - 18]) {
      pixel(ctx, x, lip + 2, 1, 1, "#c7ae7d");
      pixel(ctx, x + 0.5, lip + 2.5, 0.5, 0.5, "#40382e");
    }
  }
  pixel(ctx, cx - 8, h - 11, 16, 5, "#403b33");
  pixel(ctx, cx - 7.5, h - 10.5, 15, 4, "#bea980");
  pixel(ctx, cx - 5, h - 9, 7, 0.5, "#69563e");
  pixel(ctx, cx - 5, h - 7.5, 10, 0.5, "#887353");
  ctx.save();
  if (o.kind !== "plinth") ctx.translate(-1, -4);
  if (o.kind === "plinth") {
    // Stepped stone bases read as sculpture stands rather than framed coins.
    pixel(ctx, cx - 24, cy + 18, 48, 6, "#6d777d");
    pixel(ctx, cx - 24, cy + 15, 44, 5, "#b8bbae");
    pixel(ctx, cx - 22, cy + 14, 42, 2, "#e2dec4");
    pixel(ctx, cx + 20, cy + 16, 4, 6, "#8d9795");
    pixel(ctx, cx - 18, cy + 10, 34, 5, "#c6c8b8");
    pixel(ctx, cx - 17, cy + 9.5, 33, 1, "#f0e8cd");
    pixel(ctx, cx + 16, cy + 11, 3, 4, "#8c999a");
    if (o.id === "bird") {
      materialOval(ctx, cx - 2, cy, 17, 9);
      materialOval(ctx, cx - 4, cy - 3, 14, 8);
      line(ctx, cx + 7, cy - 3, cx + 11, cy - 17, P.creamShade, 5);
      materialOval(ctx, cx + 13, cy - 17, 7, 5);
      pixel(ctx, cx + 15, cy - 19, 1, 1, P.wood);
      pixel(ctx, cx + 14.5, cy - 19.5, 0.5, 0.5, P.white);
      line(ctx, cx + 19, cy - 16, cx + 26, cy - 14, P.creamDark, 2);
      for (let i = 0; i < 5; i++)
        line(
          ctx,
          cx - 14 + i * 4,
          cy - 5,
          cx - 9 + i * 3,
          cy + 4,
          "#9aa7a3",
          0.5,
        );
      line(ctx, cx - 16, cy, cx - 27, cy - 8, P.creamShade, 3);
      for (const dx of [-6, 4])
        line(ctx, cx + dx, cy + 6, cx + dx - 2, cy + 14, P.creamDark, 2);
    } else if (o.id === "column") {
      pixel(ctx, cx - 15, cy - 24, 30, 7, P.creamDark);
      pixel(ctx, cx - 17, cy - 25, 34, 3, P.cream);
      pixel(ctx, cx - 12, cy - 17, 24, 29, P.creamShade);
      for (const dx of [-9, -3, 3, 9]) {
        line(ctx, cx + dx, cy - 17, cx + dx, cy + 12, P.cream, 2);
        line(ctx, cx + dx + 2, cy - 16, cx + dx + 2, cy + 11, P.creamDark);
        line(
          ctx,
          cx + dx + 0.5,
          cy - 16.5,
          cx + dx + 0.5,
          cy + 11.5,
          "#fff0d6",
          0.5,
        );
        line(
          ctx,
          cx + dx + 2.5,
          cy - 16,
          cx + dx + 2.5,
          cy + 11,
          "#8d9898",
          0.5,
        );
      }
      for (const dx of [-14, 14]) {
        oval(ctx, cx + dx, cy - 19, 4, 4, P.creamDark);
        oval(ctx, cx + dx, cy - 20, 2, 2, P.cream);
      }
      line(ctx, cx - 7, cy - 5, cx, cy - 1, "#a39883");
      line(ctx, cx, cy - 1, cx - 3, cy + 6, "#a39883");
    } else if (o.id === "hand") {
      pixel(ctx, cx - 5, cy + 3, 13, 13, P.creamDark);
      materialOval(ctx, cx, cy - 2, 12, 14);
      for (const [dx, height] of [
        [-10, 17],
        [-5, 24],
        [0, 27],
        [5, 22],
      ]) {
        pixel(ctx, cx + dx, cy - 9 - height, 4, height + 13, P.creamShade);
        pixel(ctx, cx + dx, cy - 8 - height, 2, height + 8, P.cream);
        pixel(ctx, cx + dx, cy - 10, 3, 1, P.creamDark);
        pixel(ctx, cx + dx + 0.5, cy - 7 - height, 0.5, height + 6, "#fff0d6");
        pixel(ctx, cx + dx + 3, cy - 8 - height, 0.5, height + 10, "#929e9e");
      }
      line(ctx, cx + 8, cy + 3, cx + 18, cy - 10, P.creamShade, 5);
      line(ctx, cx + 8, cy + 1, cx + 16, cy - 10, P.cream, 2);
      line(ctx, cx - 7, cy - 1, cx + 5, cy + 4, P.creamDark);
    } else if (o.id === "mask" || o.id === "bust") {
      pixel(ctx, cx - 6, cy + 2, 12, 10, P.creamShade);
      if (o.id === "bust") materialOval(ctx, cx, cy + 8, 20, 6);
      materialOval(ctx, cx, cy - 6, 13, 16);
      for (const dx of [-6, 5]) {
        materialOval(ctx, cx + dx, cy - 10, 3.5, 2.5);
        pixel(ctx, cx + dx - 1, cy - 10, 3, 0.5, "#626f75");
        pixel(ctx, cx + dx, cy - 10, 0.5, 1.5, "#465963");
      }
      pixel(ctx, cx - 3, cy + 1.5, 6, 0.5, "#758382");
      line(ctx, cx, cy - 9, cx - 2, cy - 2, "#abb3a7", 1.5);
      line(ctx, cx - 0.5, cy - 9, cx - 2.5, cy - 2, "#eee8d0", 0.5);
      pixel(ctx, cx - 2, cy - 2, 4, 1, "#c6c7b3");
      line(ctx, cx - 9, cy - 15, cx - 3, cy - 13, P.creamDark);
      line(ctx, cx + 3, cy - 13, cx + 9, cy - 15, P.creamDark);
      if (o.id === "bust") {
        for (let i = 0; i < 7; i++)
          materialOval(
            ctx,
            cx - 12 + i * 4,
            cy - 17 + Math.abs(i - 3),
            3,
            4,
            "marble",
          );
        for (const dx of [-12, -6, 5, 11])
          line(ctx, cx + dx, cy + 5, cx + dx * 1.4, cy + 11, P.creamDark);
      } else {
        for (const dx of [-12, 12])
          oval(ctx, cx + dx, cy - 4, 3, 5, P.creamShade);
        pixel(ctx, cx - 4, cy + 2, 9, 4, P.wood);
        pixel(ctx, cx - 3, cy + 2, 7, 1, P.creamShade);
      }
    } else {
      materialOval(ctx, cx + 5, cy - 23, 6, 7);
      line(ctx, cx + 2, cy - 15, cx - 3, cy + 3, P.creamShade, 8);
      line(ctx, cx + 1, cy - 14, cx - 13, cy - 2, P.cream, 4);
      line(ctx, cx - 13, cy - 2, cx - 20, cy - 11, P.creamShade, 3);
      line(ctx, cx + 7, cy - 12, cx + 17, cy - 3, P.creamShade, 4);
      for (const dx of [-5, 1, 7])
        line(ctx, cx + dx, cy, cx + dx - 9, cy + 15, P.cream, 3);
      line(ctx, cx - 7, cy + 1, cx - 15, cy + 17, P.creamDark);
      for (const dx of [-4, 2, 8])
        line(ctx, cx + dx, cy + 1, cx + dx - 9, cy + 14, "#919f9f", 0.5);
    }
  } else if (gallery === "clock_gallery") {
    if (o.id === "pendulums") {
      pixel(ctx, 18, 17, w - 36, h - 35, "#332f33");
      collectionDial(ctx, cx, 37, 18);
      for (const dx of [-11, 10]) {
        line(ctx, cx + dx, 54, cx + dx, 106, "#8f7650");
        pixel(ctx, cx + dx - 3, 75 + dx, 7, 15, "#a88b5c");
        pixel(ctx, cx + dx - 2, 76 + dx, 1, 11, P.creamShade);
      }
      line(ctx, cx, 53, cx + 2, 104, P.gold, 2);
      oval(ctx, cx + 2, 107, 10, 10, P.wood);
      materialOval(ctx, cx + 1, 106, 8, 8, "bronze");
      line(ctx, cx - 3.5, 101, cx - 3.5, 105, "#fff0bc", 0.5);
      pixel(ctx, 21, 120, 28, 2, P.wood);
    } else if (o.id === "gears") {
      for (const [x, y, radius, pale] of [
        [29, 32, 12, false],
        [43, 54, 11, true],
        [27, 76, 13, false],
        [43, 103, 12, true],
      ])
        brassGear(ctx, x, y, radius, pale);
      line(ctx, 19, 30, 19, 105, "#83735b");
      for (const y of [31, 76, 109]) pixel(ctx, 17, y, 5, 3, P.gold);
      pixel(ctx, 27, 120, 21, 3, "#8b6e50");
    } else if (o.id === "watches") {
      for (let i = 0; i < 4; i++) {
        const x = 34 + i * 41;
        oval(ctx, x, 17, 3, 4, "#b8a276");
        oval(ctx, x, 17, 1, 2, P.ink);
        collectionDial(ctx, x, 29, 12, i);
        if (i % 2 === 0)
          for (let k = 0; k < 10; k++)
            pixel(
              ctx,
              x + 12 + Math.sin(k * 0.65) * 3,
              19 + k * 2,
              2,
              1,
              "#a18a60",
            );
      }
    } else {
      // Tiny mechanical birds and attendants, each on its own numbered mount.
      for (let i = 0; i < 4; i++) {
        const x = 34 + i * 41;
        pixel(ctx, x - 12, 39, 25, 3, P.wood);
        if (i % 2) {
          oval(ctx, x, 18, 4, 4, P.creamShade);
          pixel(ctx, x - 5, 23, 10, 10, "#788d8d");
          pixel(ctx, x - 1, 23, 2, 10, P.gold);
          line(ctx, x - 5, 25, x - 11, 21, P.gold, 2);
          line(ctx, x + 5, 25, x + 10, 30, P.gold, 2);
          for (const dx of [-4, 3]) pixel(ctx, x + dx, 33, 3, 6, P.creamDark);
          pixel(ctx, x - 5, 13, 10, 3, P.wood);
        } else {
          oval(ctx, x, 29, 9, 6, "#a18f6c");
          oval(ctx, x + 8, 22, 4, 4, P.creamShade);
          pixel(ctx, x + 10, 21, 2, 1, P.ink);
          pixel(ctx, x + 12, 23, 4, 2, P.gold);
          for (let k = 0; k < 4; k++)
            line(ctx, x - 7 + k * 3, 27, x - 4 + k * 3, 32, P.wood);
          line(ctx, x - 7, 28, x - 14, 21, P.gold, 2);
          for (const dx of [-3, 3])
            line(ctx, x + dx, 34, x + dx - 1, 38, P.gold);
        }
      }
    }
  } else if (gallery === "natural_history") {
    if (o.id === "skeleton") {
      line(ctx, 28, cy + 3, w - 50, cy - 5, P.creamShade, 3);
      for (let x = 63; x < w - 68; x += 10) {
        const y = cy + 2 - Math.floor((x - 30) / 26);
        pixel(ctx, x - 1, y - 2, 5, 5, P.cream);
        line(ctx, x + 1, y, x + 3, y - 12, P.creamShade, 2);
        line(ctx, x + 3, y - 12, x + 8, y - 15, P.creamDark);
        line(ctx, x + 1, y + 2, x + 4, y + 13, P.creamShade, 2);
        line(ctx, x + 4, y + 13, x + 9, y + 15, P.creamDark);
      }
      // Long skull, jaw and short articulated limbs distinguish it from a fern.
      materialOval(ctx, w - 44, cy - 7, 15, 9, "fossil");
      pixel(ctx, w - 38, cy - 7, 18, 8, P.creamShade);
      oval(ctx, w - 47, cy - 9, 3, 2.5, "#4d5b5e");
      line(ctx, w - 52, cy - 13, w - 42, cy - 14, "#ded1af", 0.5);
      line(ctx, w - 41, cy + 2, w - 20, cy + 2, P.creamDark, 2);
      for (let x = w - 37; x < w - 20; x += 4) pixel(ctx, x, cy, 2, 3, P.cream);
      for (const x of [58, w - 77]) {
        line(ctx, x, cy + 3, x - 9, cy + 13, P.creamShade, 3);
        line(ctx, x - 9, cy + 13, x + 1, cy + 18, P.creamDark, 2);
        line(ctx, x, cy + 18, x + 12, cy + 18, P.creamShade, 2);
      }
      line(ctx, 28, cy + 3, 17, cy - 2, P.creamDark, 2);
    } else if (o.id === "fossils") {
      for (let i = 0; i < 3; i++) {
        const x = 46 + i * 74,
          y = cy;
        materialOval(ctx, x, y, 25, 20, "fossil");
        let prior = { x: x + 1, y };
        for (let a = 0; a < 100; a++) {
          const angle = a * 0.12,
            radius = 1 + a * 0.15;
          const next = {
            x: x + Math.cos(angle) * radius,
            y: y + Math.sin(angle) * radius,
          };
          line(ctx, prior.x, prior.y, next.x, next.y, "#d2c7a8", 0.5);
          line(
            ctx,
            prior.x + 0.5,
            prior.y + 0.5,
            next.x + 0.5,
            next.y + 0.5,
            "#757461",
            0.5,
          );
          if (a > 48 && a % 4 === 0)
            line(
              ctx,
              next.x,
              next.y,
              x + Math.cos(angle) * (radius + 3),
              y + Math.sin(angle) * (radius + 3),
              "#666654",
              0.5,
            );
          prior = next;
        }
        pixel(ctx, x - 18, y - 10, 3, 2, "#a2977e");
      }
    } else if (o.id === "insects") {
      for (let i = 0; i < 5; i++) {
        const x = 29 + i * 28,
          y = cy;
        pixel(ctx, x - 11, 15, 23, h - 30, "#445354");
        const wing = i % 2 ? "#a39471" : "#819d96";
        materialOval(ctx, x - 5, y - 2, 5, 8, i % 2 ? "fossil" : "marble");
        materialOval(ctx, x + 5, y - 2, 5, 8, i % 2 ? "fossil" : "marble");
        for (const side of [-1, 1]) {
          line(ctx, x + side * 3, y - 2, x + side * 8, y - 6, "#52635f");
          line(ctx, x + side * 2, y + 3, x + side * 7, y + 7, "#52635f");
          line(ctx, x, y - 7, x + side * 4, y - 12, P.creamDark);
        }
        pixel(ctx, x - 0.5, y - 7, 1.5, 16, P.wood);
        pixel(ctx, x, y - 10, 0.5, 2, P.cream);
        for (const side of [-1, 1])
          for (const dy of [-4, 0, 4])
            pixel(ctx, x + side * 7, y + dy, 0.5, 1.5, wing);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const x = 31 + i * 36,
          y = cy + 5;
        for (let row = 0; row < 23; row += 0.5) {
          const spread =
            row < 8 ? row + 3 : Math.max(3, 15 - Math.floor((row - 8) * 0.8));
          for (let dx = -spread; dx < spread; dx += 0.5) {
            const nx = dx / spread;
            const lit = Math.max(
              0,
              Math.min(6, Math.floor(2.3 + (1 - nx * nx) * 2.4 - nx * 1.5)),
            );
            pixel(
              ctx,
              x + dx,
              y - 19 + row,
              0.5,
              0.5,
              SCENE_MATERIAL[i % 2 ? "fossil" : "porcelain"][lit],
            );
          }
        }
        for (const dx of [-9, -6, -3, 0, 3, 6, 9]) {
          line(
            ctx,
            x,
            y + 3,
            x + dx,
            y - 13,
            i % 2 ? "#d0bea3" : "#c5d2c5",
            0.5,
          );
          line(ctx, x + 0.5, y + 3, x + dx + 0.5, y - 13, "#86968e", 0.5);
        }
        pixel(ctx, x - 3, y + 2, 6, 3, P.creamShade);
      }
    }
  } else {
    // Distinct archaeological silhouettes under glass: handles, necks and bases.
    for (const x of [Math.round(w * 0.28), Math.round(w * 0.72)]) {
      pixel(ctx, x - 13, cy + 14, 26, 4, P.shadow);
      if (o.id === "coins") {
        pixel(ctx, x - 22, cy - 18, 44, 35, "#29333d");
        pixel(ctx, x - 20, cy - 16, 40, 31, "#4b4540");
        for (let row = 2; row >= 0; row--) {
          oval(ctx, x, cy + row * 5, 12, 5, P.wood);
          materialOval(ctx, x, cy + row * 5 - 2, 11, 4, "bronze");
          pixel(ctx, x - 4, cy + row * 5 - 3, 8, 0.5, P.cream);
        }
        for (const [dx, dy] of [
          [-15, -10],
          [4, -11],
          [15, 3],
        ]) {
          oval(ctx, x + dx, cy + dy, 6, 5, P.wood);
          materialOval(ctx, x + dx, cy + dy - 1, 5, 4, "bronze");
          pixel(ctx, x + dx - 1, cy + dy - 3, 1, 3, "#765c40");
          pixel(ctx, x + dx - 2, cy + dy - 1, 3, 0.5, "#765c40");
        }
      } else if (o.id === "tablets") {
        pixel(ctx, x - 10, cy - 17, 21, 31, P.creamDark);
        pixel(ctx, x - 8, cy - 15, 17, 27, P.creamShade);
        pixel(ctx, x - 8, cy - 15, 1, 26, "#efe0bc");
        pixel(ctx, x + 7, cy - 14, 2, 27, "#a6977f");
        pixel(ctx, x - 7, cy - 15, 15, 0.5, "#f3dfb7");
        for (let row = 0; row < 4; row++) {
          pixel(ctx, x - 5, cy - 10 + row * 5, row % 2 ? 7 : 11, 0.5, P.wood);
          pixel(ctx, x - 4 + row, cy - 11 + row * 5, 0.5, 3, P.wood);
          pixel(
            ctx,
            x - 4.5,
            cy - 9 + row * 5,
            row % 2 ? 6 : 10,
            0.5,
            "#e3d1ad",
          );
        }
        pixel(ctx, x - 10, cy - 17, 4, 3, "#344e59");
        pixel(ctx, x + 8, cy + 11, 3, 3, "#344e59");
        line(ctx, x + 3, cy - 16, x + 6, cy - 11, P.creamDark);
        line(ctx, x + 6, cy - 11, x + 4, cy - 5, P.creamDark);
        for (let k = 0; k < 6; k++)
          pixel(ctx, x - 5 + k * 2, cy + 10, 1, 1, "#b4a082");
      } else {
        for (const side of [-1, 1]) {
          materialOval(
            ctx,
            x + side * 11,
            cy - 5,
            5,
            8,
            o.id === "urns" ? "clay" : "porcelain",
          );
          oval(ctx, x + side * 11.5, cy - 5, 3, 5, "#293d46");
        }
        materialOval(
          ctx,
          x,
          cy + 1,
          10,
          12,
          o.id === "urns" ? "clay" : "porcelain",
        );
        pixel(ctx, x - 4, cy - 20, 9, 15, P.creamShade);
        pixel(ctx, x - 6, cy - 21, 13, 4, P.gold);
        pixel(ctx, x - 3, cy - 21, 7, 1, P.wood);
        pixel(ctx, x - 7, cy - 2, 15, 3, P.wood);
        pixel(ctx, x - 4, cy + 11, 9, 4, P.creamShade);
        pixel(ctx, x - 7, cy + 14, 15, 3, P.gold);
        if (o.id === "urns") {
          pixel(ctx, x - 7, cy - 4, 15, 1.5, "#604b42");
          pixel(ctx, x - 6, cy + 7, 13, 1, "#604b42");
          for (let k = 0; k < 3; k++) {
            pixel(ctx, x - 5 + k * 4, cy, 2, 4, "#6b5547");
            pixel(ctx, x - 4 + k * 4, cy - 1, 3, 1, "#6b5547");
          }
        } else {
          pixel(ctx, x - 5, cy + 4, 11, 1, "#607985");
          for (const dx of [-4, 0, 4])
            line(ctx, x + dx, cy - 1, x + dx + 2, cy + 3, "#607985", 0.5);
          pixel(ctx, x - 3, cy - 17, 0.5, 8, P.white);
        }
      }
    }
  }
  ctx.restore();
  if (o.kind !== "plinth") {
    // A raised glass plane catches the room's high windows at grazing angles.
    // Thin paired reflections and cool edge refraction leave specimens uncovered.
    line(ctx, 7, 6.5, w - 16, 6.5, "#9bafb2", 0.5);
    line(ctx, 7.5, 7, 7.5, h - 22, "#758e9a", 0.5);
    line(ctx, w - 15, 8, w - 15, h - 19, "#4b6a7a", 1);
    for (const offset of [0, 4]) {
      line(
        ctx,
        w - 38 + offset,
        9,
        w - 18 + offset,
        Math.min(h - 23, 27),
        "#7d969c",
        0.5,
      );
      line(ctx, 11 + offset, h - 25, 17 + offset, h - 19, "#506f7b", 0.5);
    }
    pixel(ctx, 8, 7.5, 17, 0.5, "#c0c9bd");
    pixel(ctx, 7.5, h - 19, w - 23, 0.5, "#68818a");
  }
  return c;
}
function bake(seed, gallery) {
  const c = surface(W + SIDE_WALL * 2, H + BACK_WALL),
    ctx = c.getContext("2d"),
    r = random(seed || 42);
  ctx.translate(SIDE_WALL, BACK_WALL);
  pixel(
    ctx,
    -SIDE_WALL,
    -BACK_WALL,
    W + SIDE_WALL * 2,
    H + BACK_WALL,
    "#1a2633",
  );
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
      pixel(ctx, x, y, tile, 0.5, seam);
      pixel(ctx, x, y, 0.5, tile, seam);
      pixel(
        ctx,
        x + 0.5,
        y + 0.5,
        tile - 1,
        0.5,
        sculpture ? "#677786" : clock ? "#38424d" : "#3b4b55",
      );
      pixel(
        ctx,
        x + tile - 0.5,
        y + 0.5,
        0.5,
        tile - 1,
        sculpture ? "#415361" : seam,
      );
      pixel(
        ctx,
        x + 2,
        y + 2,
        Math.min(10, tile - 4),
        1,
        sculpture ? "#617180" : "#374959",
      );
      const variation = Math.floor(r() * 5);
      if (sculpture && variation < 2) {
        // Long, quiet mineral veins describe marble rather than scattered glitter.
        line(ctx, x + 5, y + 9, x + 14, y + 14, "#586879");
        line(ctx, x + 14, y + 14, x + 20, y + 25, "#586879");
        if (!variation) line(ctx, x + 14, y + 14, x + 28, y + 17, "#5b6d7d");
      } else if (clock) {
        // Narrow parquet grain, brass pins only at the quiet outer perimeter.
        const vertical = (x / tile + y / tile) % 2;
        for (const inset of [7, 14, 21])
          line(
            ctx,
            x + (vertical ? inset : 4),
            y + (vertical ? 4 : inset),
            x + (vertical ? inset : tile - 4),
            y + (vertical ? tile - 4 : inset),
            "#2c3845",
          );
        if (x < 70 || x > W - 90) pixel(ctx, x + 4, y + 4, 1, 1, "#6b604e");
      } else if (variation === 0) {
        line(
          ctx,
          x + 8,
          y + 20,
          x + 15,
          y + 21,
          natural ? "#344a4c" : "#344453",
        );
        pixel(ctx, x + 16, y + 22, 4, 1, natural ? "#344a4c" : "#344453");
      }
    }
  if (natural) {
    // The long fossil spine and paired ribs point through Natural History.
    line(ctx, 355, 405, 845, 405, "#667773", 3);
    for (let x = 380; x < 835; x += 24) {
      const bend = Math.sin(x * 0.017) * 8;
      line(ctx, x, 404, x - 10, 375 + bend, "#6e7f7c", 2);
      line(ctx, x, 406, x + 8, 435 - bend, "#6e7f7c", 2);
      pixel(ctx, x - 2, 402, 5, 5, "#758078");
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
          "#71807a",
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
          radius % 2 ? "#81939b" : "#687f8d",
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
          i % 4 ? "#625b4e" : "#827457",
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
        "#8d7b59",
        2,
      );
    }
    line(ctx, 600, 405, 600, 316, "#8b8069", 3);
    line(ctx, 600, 405, 677, 445, "#69594b", 4);
    oval(ctx, 600, 405, 8, 8, "#9a835c");
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
  // A complete perimeter mosaic gives the room a built edge. The active center
  // stays quiet; this detail is most visible while exploring the gallery walls.
  const tessera = sculpture
    ? "#697e89"
    : clock
      ? "#5b5548"
      : natural
        ? "#49615e"
        : "#53606b";
  for (let x = 16; x < W - 15; x += 16)
    for (const y of [16, H - 20]) {
      pixel(ctx, x, y, 11, 4, seam);
      pixel(ctx, x + 1, y + 1, 8, 2, tessera);
    }
  for (let y = 32; y < H - 30; y += 16)
    for (const x of [16, W - 20]) {
      pixel(ctx, x, y, 4, 11, seam);
      pixel(ctx, x + 1, y + 1, 2, 8, tessera);
    }
  // Back wall, wainscoting and framed collection art ground the museum theme.
  // The wall sits beyond the north floor boundary, never on walkable tiles.
  ctx.save();
  ctx.translate(0, -BACK_WALL);
  const wallBase = sculpture
      ? "#48535e"
      : natural
        ? "#253b3c"
        : clock
          ? "#342e32"
          : "#313443",
    wallInset = sculpture
      ? "#3d4854"
      : natural
        ? "#1c3034"
        : clock
          ? "#24262e"
          : "#252b39",
    moulding = sculpture
      ? "#78868b"
      : natural
        ? "#58706a"
        : clock
          ? "#846447"
          : "#766755";
  pixel(ctx, -SIDE_WALL, 0, W + SIDE_WALL * 2, 125, wallBase);
  for (let x = -45; x < W + SIDE_WALL; x += 95) {
    pixel(ctx, x, 9, 87, 97, P.ink);
    pixel(ctx, x + 2, 11, 83, 93, moulding);
    pixel(ctx, x + 4, 13, 79, 89, wallInset);
    pixel(ctx, x + 7, 16, 73, 82, wallBase);
    pixel(ctx, x + 7, 96, 73, 2, wallInset);
    // Deep cut panel reveals: a lit sill and dark soffit give the flat wall depth.
    pixel(ctx, x + 4, 13, 79, 1.5, "#18222c");
    pixel(ctx, x + 4, 14, 2, 86, "#1b2831");
    pixel(ctx, x + 6, 98, 76, 1, moulding);
    pixel(ctx, x + 81, 15, 0.5, 84, moulding);
    pixel(
      ctx,
      x + 2,
      11,
      81,
      0.5,
      sculpture ? "#a3aaa3" : clock ? "#a98c5f" : "#8e9382",
    );
    if (sculpture) {
      for (let y = 30; y < 94; y += 24) {
        pixel(ctx, x + 7, y, 73, 1, "#56616b");
        pixel(ctx, x + 26 + (y % 48 ? 21 : 0), y - 22, 1, 22, "#56616b");
      }
      line(ctx, x + 14, 23, x + 25, 29, "#505d68", 0.5);
      line(ctx, x + 25, 29, x + 29, 41, "#505d68", 0.5);
    } else if (clock) {
      for (let y = 19; y < 92; y += 7) {
        pixel(ctx, x + 10, y, 24 + (y % 13), 1, "#423637");
        pixel(ctx, x + 51, y + 2, 25, 1, "#2c292e");
      }
      for (const px of [x + 10, x + 75]) pixel(ctx, px, 20, 2, 2, "#9b8057");
    } else if (natural) {
      for (let y = 22; y < 92; y += 13) {
        line(ctx, x + 12, y, x + 17, y + 5, "#304847");
        line(ctx, x + 17, y + 5, x + 22, y, "#304847");
        pixel(ctx, x + 67, y + 3, 2, 4, "#304847");
      }
    } else {
      for (let y = 24; y < 90; y += 15)
        for (let dx = 16; dx < 78; dx += 19) {
          pixel(ctx, x + dx, y, 3, 1, "#41414c");
          pixel(ctx, x + dx + 1, y - 1, 1, 3, "#41414c");
        }
    }
  }
  // Layered cornice and skirting are architecture outside the walkable floor.
  for (const [y, height, color] of [
    [0, 4, P.ink],
    [4, 3, moulding],
    [7, 2, wallInset],
    [108, 4, wallInset],
    [112, 3, moulding],
    [115, 5, wallBase],
  ])
    pixel(ctx, -SIDE_WALL, y, W + SIDE_WALL * 2, height, color);
  for (let x = -40; x < W + SIDE_WALL; x += 12)
    pixel(ctx, x, 7, 6, 4, moulding);
  pixel(ctx, -SIDE_WALL, 120, W + SIDE_WALL * 2, 6, P.shadow);
  for (let x = 42; x < W; x += 190) {
    pixel(ctx, x, 0, 18, 116, P.ink);
    pixel(ctx, x + 2, 10, 14, 99, moulding);
    const columnRamp = sculpture
      ? SCENE_MATERIAL.marble
      : clock
        ? SCENE_MATERIAL.bronze
        : [
            "#303e42",
            "#465959",
            "#63736c",
            "#809080",
            "#a2a996",
            "#b8bda6",
            "#ccd0b6",
          ];
    for (let dx = 2; dx < 16; dx += 0.5) {
      const nx = (dx - 9) / 7,
        curved = Math.sqrt(Math.max(0, 1 - nx * nx));
      const shade = Math.max(
        0,
        Math.min(6, Math.floor((curved * 0.7 - nx * 0.4) * 5.5)),
      );
      pixel(ctx, x + dx, 17, 0.5, 88, columnRamp[shade]);
    }
    for (const dx of [4, 8, 12]) {
      pixel(
        ctx,
        x + dx,
        16,
        0.5,
        87,
        sculpture ? "#9aa49f" : clock ? "#a0835c" : "#7c8982",
      );
      pixel(ctx, x + dx + 1, 17, 0.5, 87, wallInset);
    }
    pixel(ctx, x - 5, 10, 28, 5, moulding);
    pixel(ctx, x - 2, 15, 22, 3, wallBase);
    pixel(ctx, x - 5, 107, 28, 7, moulding);
    pixel(ctx, x - 7, 112, 32, 4, wallInset);
    pixel(ctx, x - 5, 10, 27, 0.5, columnRamp[5]);
    pixel(ctx, x - 5, 107, 27, 0.5, columnRamp[4]);
    pixel(ctx, x + 20, 108, 3, 5, columnRamp[1]);
    pixel(ctx, x - 7, 113, 32, 0.5, columnRamp[2]);
    if (sculpture)
      for (const dx of [-2, 16]) {
        materialOval(ctx, x + dx, 15, 4, 4);
        oval(ctx, x + dx, 15, 2, 2, wallBase);
      }
  }
  const motifOffset = natural ? 2 : sculpture ? 1 : clock ? 0 : 0;
  for (const [x, motif] of [
    [150, 0],
    [330, 1],
    [600, 2],
    [870, 0],
    [1050, 1],
  ])
    frame(ctx, x, 23, 70, 66, (motif + motifOffset) % 3, gallery);
  for (const x of [252, 440, 758, 952]) {
    // Frosted sconces: stepped warm pools contained entirely on the back wall.
    for (let y = 40; y < 88; y += 4) {
      const spread = Math.floor((y - 40) / 5);
      for (let dx = -spread; dx <= spread; dx += 3)
        pixel(ctx, x + dx, y, 1, 2, clock ? "#534436" : "#48534f");
    }
    pixel(ctx, x - 3, 56, 7, 21, P.wood);
    pixel(ctx, x - 2, 57, 2, 17, "#b69866");
    pixel(ctx, x - 9, 38, 19, 3, P.ink);
    pixel(ctx, x - 7, 41, 15, 16, "#9b997e");
    pixel(ctx, x - 5, 41, 10, 13, "#c5bea0");
    pixel(ctx, x - 3, 42, 3, 11, "#ded7b7");
    pixel(ctx, x - 2, 42, 2, 10, "#fff0cb");
    pixel(ctx, x + 3, 42, 1.5, 13, "#d6c498");
    pixel(ctx, x + 6, 42, 1, 14, "#6c7269");
    for (const dx of [-6, -3, 1, 5]) pixel(ctx, x + dx, 42, 0.5, 14, "#7e8b7f");
    pixel(ctx, x - 9, 57, 19, 3, P.wood);
    pixel(ctx, x - 3, 76, 7, 3, "#a88b5e");
  }
  ctx.restore();
  // Low wall panels and a few ceiling-light reflections appear at the sides.
  for (let y = 160; y < H; y += 128)
    for (const x of [-SIDE_WALL + 6, W + 6]) {
      pixel(ctx, x, y, 37, 76, P.ink);
      pixel(ctx, x + 3, y + 3, 31, 70, moulding);
      pixel(ctx, x + 6, y + 6, 25, 64, wallInset);
      pixel(ctx, x + 9, y + 9, 19, 58, wallBase);
      for (const py of [y + 13, y + 61]) {
        pixel(ctx, x + 13, py, 11, 2, moulding);
        pixel(ctx, x + 17, py - 2, 3, 6, moulding);
      }
    }
  for (let i = 0; i < 180; i++) {
    const x = Math.floor(r() * W),
      y = 135 + Math.floor(r() * (H - 145));
    pixel(
      ctx,
      x,
      y,
      2 + (i % 3),
      1,
      sculpture
        ? "#546676"
        : natural
          ? "#344749"
          : clock
            ? "#303b47"
            : "#344352",
    );
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
  const width = sprite.width / RASTER_SCALE,
    height = sprite.height / RASTER_SCALE;
  ctx.drawImage(
    sprite,
    Math.round(prop.x - width / 2),
    Math.round(prop.y - height),
    width,
    height,
  );
}
function drawAttackTelegraph(ctx, enemy, time) {
  if (
    enemy.type === "mite" ||
    !Number.isFinite(enemy.fireIn) ||
    enemy.fireIn >= 0.9
  )
    return;
  if (enemy.type === "warden") {
    const charge = Math.max(0, 1 - enemy.fireIn / 0.9),
      center = bodyCircle(enemy),
      stage = enemy.stage || 1,
      count = stage === 1 ? 12 : stage === 2 ? 8 : 16,
      // Preview the radial orientation at discharge, not an unrelated spin.
      phase = ((enemy.phase || 0) + enemy.fireIn) * (stage === 3 ? 0.65 : 0.3),
      radius = 37 + charge * 5,
      color = charge > 0.7 ? P.redLight : P.red;
    for (let i = 0; i < count; i++) {
      const a = phase + (i * Math.PI * 2) / count,
        x = center.x + Math.cos(a) * radius,
        y = center.y + Math.sin(a) * radius;
      line(ctx, x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, P.ink, 3);
      line(ctx, x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, color, 1);
    }
    if (enemy.fireIn <= 0.65) {
      const muzzle = weaponMuzzle(enemy),
        aim = Math.atan2(
          Number.isFinite(enemy.aimY) ? enemy.aimY : 0,
          Number.isFinite(enemy.aimX) ? enemy.aimX : enemy.face || 1,
        ),
        rays = stage === 1 ? 1 : stage === 2 ? 5 : 3;
      for (let j = 0; j < rays; j++) {
        const a = aim + (j - (rays - 1) / 2) * 0.2;
        for (let d = 8; d <= 24; d += 8) {
          const x = muzzle.x + Math.cos(a) * d,
            y = muzzle.y + Math.sin(a) * d;
          pixel(ctx, x - 1, y - 1, 4, 4, P.ink);
          pixel(ctx, x, y, 2, 2, color);
        }
      }
    }
    return;
  }
  const charge = Math.max(0, 1 - enemy.fireIn / 0.9),
    radius = 17 - charge * 5,
    centerY = enemy.y - (enemy.type === "thorn" ? 18 : 12),
    cue = charge > 0.7 ? P.white : P.redLight;
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10 + Math.floor(time * 12) * 0.12;
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
    attack = enemy.attack || (enemy.type === "thorn" ? "fan" : "needle"),
    reach = 38 * (0.55 + charge * 0.45);
  if (enemy.fireIn <= 0.65) {
    const rays = attack === "fan" ? 3 : 1;
    for (let j = 0; j < rays; j++) {
      const a = aim + (j - (rays - 1) / 2) * 0.22;
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
// Scan-converted facets use the renderer's half-world-pixel material grid.
// Shapes stay raster-only: no antialiased paths or blended vector edges.
function effectFacet(ctx, x, y, points, color) {
  const minY = Math.min(...points.map((p) => p[1])),
    maxY = Math.max(...points.map((p) => p[1]));
  for (let row = minY; row < maxY; row += 0.5) {
    const cuts = [],
      scan = row + 0.25;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan))
        cuts.push(a[0] + ((scan - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i += 2)
      pixel(
        ctx,
        x + cuts[i],
        y + row,
        Math.max(0.5, cuts[i + 1] - cuts[i]),
        0.5,
        color,
      );
  }
}
function relicDisc(ctx, x, y, tilt = 1, returning = false) {
  oval(ctx, x, y, 6, 2.5 * tilt, P.ink);
  oval(ctx, x, y - 0.5, 5.5, 2 * tilt, "#586b7a");
  oval(ctx, x - 0.5, y - 1, 5, 1.5 * tilt, returning ? "#88b9bb" : "#b1beb8");
  oval(ctx, x, y - 0.5, 3.5, 0.75 * tilt, "#586b7a");
  oval(ctx, x, y - 0.5, 2.5, 0.5 * tilt, "#d3bb80");
  oval(ctx, x, y - 0.5, 1, 0.5, P.ink);
  line(ctx, x - 4, y - 1.5, x - 1.5, y - 2 * tilt, P.white, 0.5);
  line(ctx, x + 2, y + tilt, x + 4.5, y + tilt - 0.5, "#8a6a46", 0.5);
  pixel(ctx, x - 4, y + 0.5, 1, 0.5, "#e6d7ac");
}
function drawOrrery(ctx, player) {
  if (player.dead) return;
  const count = (player.upgrades || []).filter((id) => id === "orbit").length;
  for (let i = 0; i < count; i++) {
    const angle = (player.orbitPhase || 0) + (i * Math.PI * 2) / count,
      x = player.x + Math.cos(angle) * 49,
      y = player.y + Math.sin(angle) * 49;
    oval(ctx, x, y, 6, 3, P.ink);
    oval(ctx, x, y - 1, 3.5, 3, "#896843");
    oval(ctx, x - 0.5, y - 1.5, 3, 2.5, P.gold);
    oval(ctx, x - 1, y - 2, 1.5, 1.5, "#f2d797");
    oval(ctx, x - 1.5, y - 2.5, 0.5, 0.5, P.white);
    // Fine equatorial brass band passes across the shaded globe.
    line(ctx, x - 5, y - 1.5, x - 1, y + 1.5, "#675744", 1);
    line(ctx, x - 1, y + 1.5, x + 5, y - 0.5, P.gold, 0.5);
    pixel(ctx, x + 4, y - 1, 1.5, 0.5, P.cream);
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
function drawWeaponGlyph(ctx, weapon, x, y) {
  if (weapon === "lantern") {
    oval(ctx, x, y - 5.5, 2.5, 2, P.ink);
    oval(ctx, x, y - 5.5, 2, 1.5, "#c2a370");
    oval(ctx, x, y - 5.5, 1.5, 1, P.shadow);
    effectFacet(
      ctx,
      x,
      y,
      [
        [-3, -4],
        [3, -4],
        [5, -2],
        [4, 4],
        [-4, 4],
        [-5, -2],
      ],
      P.ink,
    );
    effectFacet(
      ctx,
      x,
      y,
      [
        [-3, -2],
        [3, -2],
        [3.5, 2.5],
        [2, 4],
        [-2, 4],
        [-3.5, 2.5],
      ],
      "#bd9757",
    );
    effectFacet(
      ctx,
      x,
      y,
      [
        [-2.5, -2],
        [1, -2],
        [1.5, 3],
        [-2, 3],
      ],
      "#f0d598",
    );
    effectFacet(
      ctx,
      x,
      y,
      [
        [1, -2],
        [3, -1],
        [3, 2.5],
        [1.5, 3],
      ],
      "#ac7546",
    );
    pixel(ctx, x - 2, y - 1.5, 0.5, 3, P.white);
    pixel(ctx, x - 1, y - 1, 0.5, 2, "#fff1bf");
    pixel(ctx, x + 1, y - 2, 0.5, 5, "#76513c");
    pixel(ctx, x - 3.5, y - 2, 0.5, 5, "#e2c590");
    pixel(ctx, x + 3, y - 2, 0.5, 5, "#6b4935");
    oval(ctx, x, y - 3, 4.5, 1, "#a37a45");
    line(ctx, x - 3.5, y - 3.5, x + 2, y - 3.5, "#e6cc8b", 0.5);
    oval(ctx, x, y + 4, 4.5, 1, "#8d663d");
    line(ctx, x - 3, y + 3.5, x + 3, y + 3.5, "#d1ad66", 0.5);
  } else if (weapon === "disc") {
    relicDisc(ctx, x, y - 1, 1.3);
  } else if (weapon === "storm") {
    // Porcelain insulator, wound copper coil, and a forked conductor.
    pixel(ctx, x - 1, y - 5, 2, 9, P.ink);
    for (const dx of [-2.5, 2.5]) {
      line(ctx, x + dx, y - 6, x + dx, y - 3, P.ink, 1.5);
      line(ctx, x + dx, y - 6, x + dx, y - 3, "#c3b28e", 0.5);
      oval(ctx, x + dx, y - 6, 1, 0.5, P.blue);
    }
    oval(ctx, x, y - 3, 3, 1, "#5f7780");
    oval(ctx, x - 0.5, y - 3.5, 2.5, 0.5, "#d7e0d0");
    pixel(ctx, x - 2, y - 2.5, 4, 6, "#614531");
    for (let row = -2; row < 3; row += 1.5) {
      oval(ctx, x, y + row, 2.5, 0.75, "#8e603e");
      line(ctx, x - 2, y + row - 0.5, x + 1, y + row - 0.5, "#d0a16a", 0.5);
      pixel(ctx, x - 1.5, y + row - 0.5, 1, 0.5, "#f2d6a0");
    }
    oval(ctx, x, y + 4, 3, 1, P.ink);
    oval(ctx, x, y + 3.5, 2.5, 0.5, "#9caea5");
    pixel(ctx, x - 1.5, y + 3, 1, 0.5, P.white);
  } else {
    line(ctx, x, y + 4, x, y - 3, P.wood, 2);
    line(ctx, x, y - 3, x - 4, y - 6, P.wood, 2);
    line(ctx, x, y - 3, x + 4, y - 6, P.wood, 2);
    line(ctx, x - 4, y - 6, x + 4, y - 6, P.creamShade);
    pixel(ctx, x - 1, y - 2, 3, 2, P.gold);
    line(ctx, x - 1, y + 3, x - 1, y, P.creamDark);
    pixel(ctx, x - 4, y - 6, 2, 2, P.cream);
    pixel(ctx, x + 3, y - 6, 2, 2, P.gold);
    pixel(ctx, x - 1, y - 6, 3, 2, P.ink);
    pixel(ctx, x, y - 6, 1, 1, P.stoneLight);
    line(ctx, x - 0.5, y + 3.5, x - 0.5, y - 2, "#be9770", 0.5);
    line(ctx, x - 0.5, y - 3, x - 3.5, y - 5.5, "#d6b384", 0.5);
    line(ctx, x + 1, y - 3, x + 4, y - 5.5, "#513d32", 0.5);
    line(ctx, x - 3.5, y - 5.5, x, y - 4.5, "#d3c8ae", 0.5);
    line(ctx, x, y - 4.5, x + 3.5, y - 5.5, "#aa9472", 0.5);
    for (let row = 0.5; row < 4; row += 1)
      line(ctx, x - 0.5, y + row, x + 1, y + row - 0.5, "#594238", 0.5);
  }
}
function drawPickup(ctx, pickup, time) {
  const x = Math.round(pickup.x),
    y = Math.round(pickup.y),
    bob = Math.round(Math.sin(time * 6 + (pickup.id || 0)) * 2),
    cy = y - 8 - bob;
  shadow(ctx, x, y, pickup.kind === "weapon" ? 10 : 6);
  if (pickup.kind === "xp") {
    effectFacet(
      ctx,
      x,
      cy,
      [
        [0, -6],
        [-4, -3],
        [-3, 1],
        [0, 5],
        [4, 1],
        [4, -3],
      ],
      P.ink,
    );
    effectFacet(
      ctx,
      x,
      cy,
      [
        [0, -5],
        [-3.5, -2.5],
        [-2.5, 1],
        [0, 4],
        [3.5, 0.5],
        [3, -2.5],
      ],
      "#387286",
    );
    effectFacet(
      ctx,
      x,
      cy,
      [
        [0, -5],
        [-3.5, -2.5],
        [-0.5, -1],
        [1, -3],
      ],
      "#c9e8de",
    );
    effectFacet(
      ctx,
      x,
      cy,
      [
        [-3.5, -2.5],
        [-0.5, -1],
        [0, 4],
        [-2.5, 1],
      ],
      "#70b2bb",
    );
    effectFacet(
      ctx,
      x,
      cy,
      [
        [-0.5, -1],
        [3, -2.5],
        [3.5, 0.5],
        [0, 4],
      ],
      "#5893ac",
    );
    effectFacet(
      ctx,
      x,
      cy,
      [
        [0, -5],
        [1, -3],
        [3, -2.5],
      ],
      "#8cc2c8",
    );
    line(ctx, x - 0.5, cy - 1, x, cy + 3.5, "#abd6d1", 0.5);
    line(ctx, x - 2.5, cy - 3, x - 0.5, cy - 4.5, P.white, 0.5);
    pixel(ctx, x + 2.5, cy, 1, 0.5, "#a8d3d0");
  } else if (pickup.kind === "weapon") {
    pixel(ctx, x - 10, cy - 10, 21, 20, P.ink);
    pixel(ctx, x - 9, cy - 9, 19, 18, P.gold);
    pixel(ctx, x - 7, cy - 7, 15, 14, P.stone);
    pixel(ctx, x - 6, cy - 6, 13, 12, P.shadow);
    // Fine miters, a recessed velvet bed, and edge bevels use the new raster grid.
    pixel(ctx, x - 8.5, cy - 8.5, 18, 0.5, "#eed49c");
    pixel(ctx, x - 8.5, cy - 8, 0.5, 16, "#b58b52");
    pixel(ctx, x + 9, cy - 8.5, 0.5, 17, "#6f5437");
    pixel(ctx, x - 8.5, cy + 8.5, 18, 0.5, "#765a3f");
    pixel(ctx, x - 6.5, cy - 6.5, 14, 0.5, "#71808a");
    pixel(ctx, x - 6.5, cy - 6, 0.5, 12, "#536976");
    pixel(ctx, x - 5.5, cy - 5.5, 12, 11, "#253441");
    for (const sx of [-8, 7]) {
      line(ctx, x + sx, cy - 8, x + sx + 1, cy - 7, "#8c6b47", 0.5);
      line(ctx, x + sx, cy + 7, x + sx + 1, cy + 8, "#8c6b47", 0.5);
    }
    drawWeaponGlyph(ctx, pickup.weapon, x, cy + 1);
    pixel(ctx, x - 9, cy - 9, 4, 1, P.white);
    pixel(ctx, x + 6, cy + 8, 3, 1, P.creamShade);
    // Recessed fitted case: mitered corners and small brass catches.
    for (const sx of [-8, 7]) {
      pixel(ctx, x + sx, cy - 7, 2, 2, P.wood);
      pixel(ctx, x + sx, cy + 6, 2, 2, P.wood);
      pixel(ctx, x + sx, cy, 2, 2, P.creamShade);
    }
    pixel(ctx, x - 4, cy + 7, 8, 1, P.wood);
    pixel(ctx, x - 2, cy + 8, 5, 1, P.gold);
    pixel(ctx, x - 1.5, cy + 7.5, 3.5, 0.5, "#f1d599");
    pixel(ctx, x, cy + 8, 0.5, 0.5, P.ink);
    for (const sx of [-8, 7])
      pixel(ctx, x + sx + 0.5, cy + 0.5, 0.5, 0.5, P.ink);
  } else if (pickup.kind === "heal") {
    pixel(ctx, x - 7, cy - 7, 15, 15, P.ink);
    pixel(ctx, x - 6, cy - 6, 13, 13, P.creamShade);
    pixel(ctx, x - 5, cy - 5, 11, 10, P.cream);
    pixel(ctx, x - 5, cy + 5, 11, 1, P.creamDark);
    pixel(ctx, x - 4, cy - 8, 9, 1, P.ink);
    pixel(ctx, x - 3, cy - 8, 7, 1, P.wood);
    pixel(ctx, x - 2, cy - 5, 5, 11, P.red);
    pixel(ctx, x - 5, cy - 2, 11, 5, P.red);
    pixel(ctx, x - 1, cy - 4, 3, 7, P.redLight);
    pixel(ctx, x - 6, cy + 2, 2, 1, P.gold);
    pixel(ctx, x + 5, cy + 2, 2, 1, P.gold);
    // Stitched leather lid and raised enamel cross, including its cast edge.
    line(ctx, x - 5.5, cy - 5.5, x + 5, cy - 5.5, "#fff0d2", 0.5);
    line(ctx, x + 5.5, cy - 4.5, x + 5.5, cy + 4.5, "#ab9370", 0.5);
    line(ctx, x - 4.5, cy + 4.5, x + 4.5, cy + 4.5, "#b69e7e", 0.5);
    pixel(ctx, x + 2.5, cy - 4.5, 0.5, 2.5, "#7b3742");
    pixel(ctx, x + 3, cy + 2.5, 2.5, 0.5, "#7b3742");
    pixel(ctx, x - 1.5, cy - 4.5, 3, 0.5, "#f5b59c");
    pixel(ctx, x - 4.5, cy - 1.5, 2.5, 0.5, "#f5b59c");
    pixel(ctx, x - 2.5, cy - 8, 5, 0.5, "#c3a67d");
    pixel(ctx, x - 1.5, cy - 7.5, 3, 0.5, P.ink);
  } else if (pickup.kind === "haste") {
    oval(ctx, x, cy, 7, 7, P.ink);
    oval(ctx, x, cy - 0.5, 6.5, 6, "#9b7848");
    oval(ctx, x - 0.5, cy - 1, 5.5, 5.5, "#e2c787");
    oval(ctx, x, cy, 5, 5, "#685844");
    oval(ctx, x, cy, 4.5, 4.5, "#263440");
    oval(ctx, x, cy - 7.5, 2, 1.5, P.ink);
    pixel(ctx, x - 1.5, cy - 8, 3, 1, "#c9ac70");
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      line(
        ctx,
        x + Math.sin(a) * 3.5,
        cy - Math.cos(a) * 3.5,
        x + Math.sin(a) * 4,
        cy - Math.cos(a) * 4,
        "#bcbda5",
        0.5,
      );
    }
    line(ctx, x, cy, x + 2.5, cy - 2.5, P.white, 0.5);
    line(ctx, x, cy, x - 1.5, cy + 2.5, P.creamShade, 1);
    oval(ctx, x, cy, 0.75, 0.75, P.gold);
    line(ctx, x - 4, cy - 4, x - 1.5, cy - 5.5, P.white, 0.5);
    line(ctx, x + 3.5, cy + 4, x + 5, cy + 2.5, "#f0d99d", 0.5);
    pixel(ctx, x - 11, cy - 2, 3, 1, P.tealLight);
    pixel(ctx, x - 12, cy + 2, 4, 1, P.tealLight);
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
    // Warm danger core over a dark rim, even when crossing a friendly strike.
    pixel(ctx, shot.x + 1, shot.y + 1, 2, 1, P.red);
    oval(ctx, shot.x - 0.5, shot.y - 0.5, 1.5, 1.5, "#f7bc9d");
    oval(ctx, shot.x - 1, shot.y - 1, 0.75, 0.75, P.white);
    line(
      ctx,
      shot.x + 1.5,
      shot.y - 0.5,
      shot.x + 2,
      shot.y + 1,
      "#d96967",
      0.5,
    );
  } else if (shot.weapon === "disc") {
    const spin = Math.floor((shot.age || 0) * 18) % 2;
    pixel(
      ctx,
      shot.x - Math.cos(angle) * 6 - 2,
      shot.y - Math.sin(angle) * 6,
      4,
      2,
      P.tealDark,
    );
    relicDisc(ctx, shot.x, shot.y, spin ? 1.2 : 0.8, shot.returning);
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
    pixel(ctx, shot.x + 1, shot.y, 1, 2, P.creamDark);
    effectFacet(
      ctx,
      shot.x,
      shot.y,
      [
        [-1.5, -2],
        [1, -2],
        [2, 0],
        [0.5, 1.5],
        [-1.5, 1],
      ],
      "#c6b89b",
    );
    effectFacet(
      ctx,
      shot.x,
      shot.y,
      [
        [-1.5, -2],
        [1, -2],
        [0, -0.5],
        [-1.5, 0],
      ],
      "#f2e3c3",
    );
    line(ctx, shot.x + 0.5, shot.y + 0.5, shot.x + 1.5, shot.y, "#8f8675", 0.5);
  }
}
function drawSweep(ctx, effect, progress, map) {
  const radius = Number.isFinite(effect.radius) ? effect.radius : 96,
    restore = effect.ability === "restore",
    repel = effect.ability === "repel",
    main = restore ? P.tealLight : repel ? P.blue : P.gold,
    glint = restore ? P.white : repel ? P.cream : P.white;
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
      bright ? glint : main,
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
      i < 3 ? glint : main,
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
      i % 3 ? main : glint,
    );
  }
  if (restore) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + progress * 0.4,
        px = effect.x + Math.cos(a) * radius * 0.55,
        py = effect.y + Math.sin(a) * radius * 0.55;
      pixel(ctx, px - 1, py - 4, 3, 9, P.tealLight);
      pixel(ctx, px - 4, py - 1, 9, 3, P.white);
      pixel(ctx, px - 3.5, py - 0.5, 8, 0.5, "#d6ede0");
      pixel(ctx, px - 0.5, py - 3.5, 0.5, 8, "#f3f4d9");
      pixel(ctx, px + 1.5, py + 2, 0.5, 2.5, "#507e88");
    }
  } else if (repel) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        inner = radius * 0.64,
        outer = radius * 0.72;
      line(
        ctx,
        effect.x + Math.cos(a) * inner,
        effect.y + Math.sin(a) * inner,
        effect.x + Math.cos(a) * outer,
        effect.y + Math.sin(a) * outer,
        i % 2 ? P.white : P.blue,
        2,
      );
    }
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
  if (kind === "lantern") {
    // The pulse damages at its full radius immediately; the visible ring agrees.
    const radius = effect.radius || 88;
    for (let i = 0; i < 96; i++) {
      const a = (i * Math.PI * 2) / 96,
        px = x + Math.cos(a) * radius,
        py = y + Math.sin(a) * radius;
      if (map && lineBlocked(map, effect, { x: px, y: py })) continue;
      pixel(
        ctx,
        px,
        py,
        i % 8 ? 2 : 3,
        i % 8 ? 2 : 3,
        i % 8 ? P.gold : P.white,
      );
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        px = x + Math.cos(a) * radius * (0.3 + progress * 0.35),
        py = y + Math.sin(a) * radius * (0.3 + progress * 0.35);
      effectFacet(
        ctx,
        px,
        py,
        [
          [0, -3.5],
          [1, -1],
          [3.5, 0],
          [1, 1],
          [0, 3.5],
          [-1, 1],
          [-3.5, 0],
          [-1, -1],
        ],
        "#b68e58",
      );
      effectFacet(
        ctx,
        px,
        py,
        [
          [0, -3],
          [0.5, -0.5],
          [3, 0],
          [0.5, 0.5],
          [0, 3],
          [-0.5, 0.5],
          [-3, 0],
          [-0.5, -0.5],
        ],
        "#f1d9a3",
      );
      pixel(ctx, px - 0.5, py - 0.5, 1, 1, P.white);
    }
    return;
  }
  if (kind === "storm") {
    const strike = progress < 0.2;
    // Keep the impact immediate, then let enemy silhouettes emerge beneath it.
    ctx.globalAlpha = progress < 0.55 ? 1 : Math.max(0, (1 - progress) / 0.45);
    const x0 = Number.isFinite(effect.fromX) ? effect.fromX : x,
      y0 = Number.isFinite(effect.fromY) ? effect.fromY : y,
      dx = x - x0,
      dy = y - y0,
      length = Math.hypot(dx, dy) || 1,
      steps = Math.max(2, Math.ceil(length / 8));
    let px = x0,
      py = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps,
        jitter = i === steps ? 0 : i % 2 ? 3 : -3,
        nx = x0 + dx * t - (dy / length) * jitter,
        ny = y0 + dy * t + (dx / length) * jitter;
      line(ctx, px, py, nx, ny, P.ink, strike ? 5 : 3);
      line(ctx, px, py, nx, ny, i % 2 ? P.blue : P.tealLight, strike ? 3 : 1);
      if (strike) {
        line(ctx, px, py, nx, ny, "#c6e0db", 1);
        line(ctx, px, py, nx, ny, P.white, 0.5);
      } else {
        line(ctx, px, py, nx, ny, "#b0d3d2", 0.5);
      }
      px = nx;
      py = ny;
    }
    for (const [ex, ey] of [
      [x0, y0],
      [x, y],
    ]) {
      const reach = strike ? 5 : progress < 0.55 ? 3 : 1;
      pixel(
        ctx,
        ex,
        ey - reach,
        1,
        reach * 2 + 1,
        strike ? P.white : P.tealLight,
      );
      pixel(ctx, ex - reach, ey, reach * 2 + 1, 1, P.blue);
      if (strike) {
        pixel(ctx, ex - 2, ey - 2, 1, 1, P.tealLight);
        pixel(ctx, ex + 2, ey + 2, 1, 1, P.blue);
      }
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (kind === "xp" || kind === "weapon" || kind === "haste") {
    const reach = 4 + progress * (kind === "weapon" ? 18 : 12),
      count = kind === "weapon" ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count,
        px = x + Math.cos(a) * reach,
        py = y - 7 + Math.sin(a) * reach;
      pixel(
        ctx,
        px,
        py,
        kind === "weapon" ? 3 : 2,
        2,
        kind === "haste" ? P.blue : kind === "weapon" ? P.gold : P.tealLight,
      );
      if (i % 2 === 0)
        pixel(ctx, px, py, 1, 1, kind === "weapon" ? P.cream : P.white);
    }
    if (kind === "weapon")
      drawWeaponGlyph(ctx, effect.weapon, x, y - 12 - progress * 7);
    return;
  }
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
    pixel(ctx, x + 2, y - 8 - rise, 1, 4, P.teal);
    pixel(ctx, x - 1, y - 15 - rise, 2, 3, P.cream);
  }
  if (kind === "resonance") {
    // A small, complete shield silhouette distinguishes protection from impact.
    const rise = Math.round(progress * 9),
      sy = y - 19 - rise;
    for (let row = 0; row < 15; row++) {
      const half = row < 8 ? 8 : Math.max(1, 8 - (row - 7));
      if (row < 2 || half <= 3) {
        pixel(ctx, x - half - 1, sy + row, half * 2 + 3, 1, P.ink);
        pixel(ctx, x - half, sy + row, half * 2 + 1, 1, P.tealLight);
      } else {
        // Leave the coat visible inside the protection outline in co-op.
        pixel(ctx, x - half - 1, sy + row, 4, 1, P.ink);
        pixel(ctx, x + half - 2, sy + row, 4, 1, P.ink);
        pixel(ctx, x - half, sy + row, 2, 1, P.tealLight);
        pixel(ctx, x + half - 1, sy + row, 2, 1, P.tealLight);
      }
    }
    pixel(ctx, x - 6, sy + 1, 4, 1, P.white);
    pixel(ctx, x + 5, sy + 3, 1, 3, P.teal);
    pixel(ctx, x - 1, sy + 13, 3, 1, P.creamShade);
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
      pixel(
        ctx,
        x + Math.cos(a) * reach,
        y - 7 + Math.sin(a) * reach,
        1,
        1,
        P.cream,
      );
    }
  if (kind === "hit" || kind === "death" || kind === "chip")
    drawDebris(ctx, effect);
}
export function createRenderer(canvas) {
  canvas.width = 640 * RASTER_SCALE;
  canvas.height = 360 * RASTER_SCALE;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  ctx.scale(RASTER_SCALE, RASTER_SCALE);
  ctx._pixelRatio = RASTER_SCALE;
  const camera = { x: 600, y: 400 };
  const lighting = createLighting();
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
      camera.x = Math.max(320 - SIDE_WALL, Math.min(W - 320 + SIDE_WALL, tx));
      camera.y = Math.max(180 - BACK_WALL, Math.min(H - 180, ty));
    }
    camera.x +=
      (Math.max(320 - SIDE_WALL, Math.min(W - 320 + SIDE_WALL, tx)) -
        camera.x) *
      follow;
    camera.y +=
      (Math.max(180 - BACK_WALL, Math.min(H - 180, ty)) - camera.y) * follow;
    if (player && previousHP !== null && player.hp < previousHP) damage = 0.15;
    previousHP = player?.hp ?? null;
    damage = Math.max(0, damage - dt);
    const shake =
        options.reducedMotion || options.shake === false
          ? 0
          : Math.round(Math.sin(time * 87) * damage * 12),
      ox = Math.round((camera.x - 320) * RASTER_SCALE) / RASTER_SCALE + shake,
      oy = Math.round((camera.y - 180) * RASTER_SCALE) / RASTER_SCALE;
    pixel(ctx, 0, 0, 640, 360, P.shadow);
    ctx.save();
    ctx.translate(-ox, -oy);
    ctx.drawImage(
      art.ground,
      -SIDE_WALL,
      -BACK_WALL,
      art.ground.width / RASTER_SCALE,
      art.ground.height / RASTER_SCALE,
    );
    const map = mapById(gallery),
      lights = collectLights(state, options.reducedMotion);
    drawAtmosphereGround(ctx, state, time, map, options);
    lighting.shadows(ctx, state, lights);
    for (const station of state?.flowers || []) drawFlower(ctx, station, time);
    for (const pickup of state?.pickups || [])
      if (
        pickup.x > ox - 16 &&
        pickup.x < ox + 656 &&
        pickup.y > oy - 20 &&
        pickup.y < oy + 380
      )
        drawPickup(ctx, pickup, time);
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
    drawAtmosphereDetails(ctx, state, time, map, options);
    lighting.illuminate(ctx, map, lights, ox, oy);
    // A hidden armored exhibit still shows the direction of its committed volley.
    for (const enemy of state?.enemies || [])
      drawAttackTelegraph(ctx, enemy, time);
    for (const p of state?.players || []) drawOrrery(ctx, p);
    for (const shot of state?.shots || [])
      if (
        !shot.hostile &&
        shot.x > ox - 12 &&
        shot.x < ox + 652 &&
        shot.y > oy - 12 &&
        shot.y < oy + 372
      )
        drawShot(ctx, shot);
    for (const effect of state?.effects || [])
      drawEffect(ctx, effect, mapById(gallery));
    // Friendly feedback must never conceal a projectile that can still hurt staff.
    for (const shot of state?.shots || [])
      if (
        shot.hostile &&
        shot.x > ox - 12 &&
        shot.x < ox + 652 &&
        shot.y > oy - 12 &&
        shot.y < oy + 372
      )
        drawShot(ctx, shot);
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
