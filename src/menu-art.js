import { createIconTools } from "./curios.js";
// Hand-built 64px menu illustrations. Every mark is an integer fillRect;
// destination rounding preserves hard pixel edges at non-integer UI scales.
const C = {
  ink: "#17252f",
  shadow: "#23343e",
  brass: "#b68b53",
  gold: "#e2bc75",
  light: "#fff0c6",
  cream: "#d8d2b6",
  stone: "#899899",
  blue: "#527d95",
  navy: "#344b62",
  teal: "#608b89",
  green: "#8eaaa0",
  red: "#ac5b66",
  rose: "#d78f86",
  wood: "#78584d",
  brown: "#4e3c39",
  skin: "#d0a886",
  ice: "#aedcd5",
  bone: "#a8a58a",
};

export function drawMenuArt(ctx, kind, x = 0, y = 0, size = 32) {
  if (!ctx || !Number.isFinite(size) || size <= 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const ox = Math.round(x),
    oy = Math.round(y),
    scale = size / 32;
  const { line, poly, volume, bevel } = createIconTools(ctx, x, y, size, C);
  const r = (x, y, w, h, color) => {
    const a = Math.round(Math.max(0, Math.min(32, x)) * scale);
    const b = Math.round(Math.max(0, Math.min(32, y)) * scale);
    const c = Math.round(Math.max(0, Math.min(32, x + w)) * scale);
    const d = Math.round(Math.max(0, Math.min(32, y + h)) * scale);
    if (c <= a || d <= b) return;
    ctx.fillStyle = C[color] || color;
    ctx.fillRect(ox + a, oy + b, c - a, d - b);
  };
  const oval = (cx, cy, rx, ry, color, hollow = false) => {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const outer = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        const inner =
          (x * x) / Math.max(1, (rx - 1) ** 2) +
          (y * y) / Math.max(1, (ry - 1) ** 2);
        if (outer <= 1 && (!hollow || inner >= 1))
          r(cx + x, cy + y, 1, 1, color);
      }
  };
  oval(16, 29, 12, 2, "shadow");
  switch (kind) {
    case "keyring": {
      // Three distinct keys hang from a broad metal ring and leather tag.
      volume(14, 10, 9, 8, "steel", 0.79);
      for (let i = 0; i < 6; i++)
        r(8 + i, 5 - Math.floor(i / 3), 1, 1, "light");
      r(6, 16, 3, 11, "ink");
      r(7, 17, 1, 10, "cream");
      r(7, 23, 5, 2, "cream");
      r(7, 27, 5, 2, "cream");
      oval(15, 17, 4, 4, "ink");
      volume(15, 17, 3.5, 3.5, "brass");
      r(14, 16, 2, 2, "brown");
      r(14, 20, 4, 10, "ink");
      bevel(15, 20, 2.5, 9, "brass");
      bevel(17, 24, 4.5, 2, "brass");
      bevel(17, 28, 4.5, 2, "brass");
      r(21, 12, 7, 11, "ink");
      bevel(21.5, 12.5, 6, 10, "red");
      r(23, 14, 2, 2, "brass");
      r(23, 18, 2, 3, "cream");
      r(25, 14, 1, 7, "brown");
      r(22, 20, 1, 1, "rose");
      r(17, 12, 2, 1, "light");
      r(10, 25, 1, 1, "brass");
      line(7, 18, 7, 27, "#f0efe0", 0.5);
      line(8, 18, 8, 22, "#809aa3", 0.5);
      for (const yy of [16.5, 18.5, 20.5]) r(22, yy, 0.5, 0.5, "#e4b79b");
      break;
    }
    case "staff": {
      const attendant = (x, y, shirt, cap) => {
        r(x + 1, y, 9, 5, "ink");
        r(x + 2, y + 1, 7, 2, cap);
        r(x, y + 4, 11, 2, "ink");
        r(x + 5, y + 2, 2, 2, "gold");
        volume(x + 5.5, y + 8, 3.5, 3.5, "skin");
        r(x + 3.5, y + 7.5, 1, 0.5, "ink");
        r(x + 7, y + 7.5, 1, 0.5, "ink");
        r(x + 4, y + 10, 3, 1, "brown");
        r(x, y + 11, 11, 10, "ink");
        r(x + 1, y + 12, 9, 8, shirt);
        poly(
          [
            [x + 1, y + 12],
            [x + 4, y + 11.5],
            [x + 5, y + 20],
            [x + 1, y + 20],
          ],
          shirt === "red" ? "#c07a7d" : "#7aa4a0",
        );
        poly(
          [
            [x + 7, y + 12],
            [x + 10, y + 12],
            [x + 10, y + 20],
            [x + 7, y + 20],
          ],
          shirt === "red" ? "#744456" : "#36586b",
        );
        r(x + 3, y + 12, 5, 8, "cream");
        r(x + 5, y + 14, 2, 3, "brass");
        bevel(x + 1, y + 21, 4, 3, "blue");
        bevel(x + 7, y + 21, 4, 3, "blue");
        r(x, y + 24, 5, 2, "ink");
        r(x + 7, y + 24, 5, 2, "ink");
        r(x + 2, y + 1, 5, 1, "blue");
        r(x + 2, y + 9, 1, 1, "rose");
        r(x + 3, y + 13, 1, 2, "light");
        r(x + 7, y + 13, 1, 2, "light");
        r(x + 5, y + 18, 2, 1, "gold");
        r(x + 1, y + 25, 3, 1, "stone");
        line(x + 3, y + 12, x + 5, y + 15, "#fff0d7", 0.5);
        line(x + 8, y + 12, x + 6, y + 15, "#c4c8b8", 0.5);
        volume(x + 6, y + 17, 0.75, 0.75, "brass");
        r(x + 2, y + 1, 6, 0.5, "#9eb8b6");
        r(x + 2, y + 3.5, 7, 0.5, "#8f9e9a");
      };
      attendant(17, 2, "red", "wood");
      attendant(3, 4, "teal", "blue");
      r(1, 15, 2, 11, "brass");
      r(0, 25, 4, 4, "gold");
      r(1, 26, 1, 3, "wood");
      break;
    }
    case "kit": {
      // Folded uniform and a brush/bottle packed into an open leather case.
      r(4, 5, 23, 22, "ink");
      bevel(4.5, 5.5, 22, 21, "wood");
      r(6, 7, 19, 15, "#342e33");
      poly(
        [
          [6, 7],
          [25, 7],
          [24, 10],
          [7, 10],
        ],
        "#665147",
      );
      r(8, 8, 10, 13, "navy");
      poly(
        [
          [9, 9],
          [12, 8.5],
          [17, 9.5],
          [17, 20],
          [9, 20],
        ],
        "#668d9b",
      );
      poly(
        [
          [13, 11],
          [16.5, 10],
          [17, 20],
          [14, 19],
        ],
        "#365770",
      );
      poly(
        [
          [9, 11],
          [11, 12],
          [10.5, 19],
          [9, 19],
        ],
        "#a1c0b6",
      );
      r(10, 8, 3, 4, "cream");
      r(14, 8, 3, 4, "cream");
      r(12, 11, 2, 8, "navy");
      r(14, 15, 2, 3, "gold");
      r(9, 19, 8, 1, "stone");
      r(20, 9, 3, 3, "gold");
      volume(21.5, 16, 2.5, 4.5, "blue");
      r(20, 13, 0.5, 5, "ice");
      r(20, 15, 3, 2, "cream");
      r(3, 22, 25, 7, "ink");
      bevel(3.5, 22.5, 24, 6, "wood");
      bevel(13, 24, 5, 4, "brass");
      r(14, 25, 3, 1, "brown");
      r(5, 8, 1, 12, "brass");
      r(25, 8, 1, 12, "brass");
      r(8, 24, 1, 2, "cream");
      r(22, 24, 1, 2, "cream");
      r(10, 16, 2, 1, "ice");
      r(20, 10, 2, 1, "light");
      r(5, 27, 6, 1, "brown");
      r(20, 27, 6, 1, "brown");
      for (let xx = 5; xx < 26; xx += 1.5) r(xx, 23.5, 0.5, 0.5, "#d2ac7d");
      line(10, 17, 12, 18, "#bdd1c4", 0.5);
      break;
    }
    case "gear": {
      const gear = (cx, cy, radius, color, highlight) => {
        oval(cx, cy, radius, radius, "ink");
        volume(
          cx,
          cy,
          radius - 1.5,
          radius - 1.5,
          color === "blue" ? "steel" : "brass",
        );
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ]) {
          r(
            cx + dx * (radius - 1) - 2,
            cy + dy * (radius - 1) - 2,
            5,
            5,
            "ink",
          );
          r(
            cx + dx * (radius - 1) - 1,
            cy + dy * (radius - 1) - 1,
            3,
            3,
            color,
          );
        }
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          const q = Math.round(radius * 0.64);
          r(cx + dx * q - 1, cy + dy * q - 1, 3, 3, "ink");
          r(cx + dx * q, cy + dy * q, 1, 1, color);
        }
        volume(
          cx,
          cy,
          radius * 0.56,
          radius * 0.56,
          color === "blue" ? "steel" : "brass",
          0.69,
        );
        oval(cx, cy, 2.5, 2.5, "ink");
        line(cx - 1.5, cy - 1.5, cx + 0.5, cy - 2, "#d0d8c5", 0.5);
        r(cx - 4, cy - 5, 3, 1, highlight);
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const q = Math.max(4, radius - 4);
          r(cx + dx * q, cy + dy * q, 1, 1, "brown");
        }
        r(cx + 3, cy + 3, 1, 0.5, "shadow");
      };
      gear(12, 12, 10, "brass", "light");
      gear(23, 23, 6, "blue", "ice");
      r(9, 7, 2, 1, "gold");
      r(7, 9, 1, 3, "gold");
      break;
    }
    case "museum": {
      // Pediment, lit windows, three visible columns, and the staff entrance.
      for (let y = 3; y <= 11; y++) {
        const half = Math.floor((y - 3) * 1.55);
        r(16 - half, y, half * 2 + 1, 1, "ink");
        if (y > 5 && y < 10) r(17 - half, y, half * 2 - 1, 1, "brass");
      }
      r(3, 11, 26, 3, "ink");
      r(4, 11, 24, 1, "light");
      r(5, 14, 22, 12, "wood");
      r(5, 14, 22, 2, "#715e52");
      r(24, 15, 3, 10, "#443f42");
      r(12, 15, 8, 11, "ink");
      r(13, 16, 6, 10, "teal");
      r(15, 17, 1, 9, "shadow");
      r(14, 22, 1, 1, "gold");
      r(17, 22, 1, 1, "gold");
      for (const x of [5, 9, 22, 26]) {
        r(x, 14, 2, 12, "#8f9b98");
        r(x, 14, 0.5, 12, "#eee6c9");
        r(x + 0.5, 14, 0.5, 12, "#c3c7b2");
        r(x + 1.5, 14, 0.5, 12, "#667982");
      }
      r(3, 26, 27, 2, "bone");
      r(2, 28, 29, 2, "cream");
      r(14, 8, 4, 2, "light");
      for (const x of [5, 9, 22, 26]) {
        r(x - 1, 14, 4, 1, "bone");
        r(x - 1, 24, 4, 2, "bone");
        r(x, 15, 1, 8, "light");
      }
      r(13, 16, 2, 3, "ice");
      r(17, 16, 2, 3, "blue");
      r(7, 12, 18, 1, "brass");
      r(6, 27, 20, 1, "stone");
      poly(
        [
          [16, 3.5],
          [27, 10],
          [23.5, 9.5],
          [16, 5.5],
        ],
        "#917b5d",
      );
      line(5.5, 9.5, 16, 3.5, "#f2dfb9", 0.5);
      line(6, 10, 25, 10, "#d4bd95", 0.5);
      r(12.5, 16, 6.5, 0.5, "#bccbb8");
      r(13, 17, 0.5, 7, "#aac8bd");
      for (const yy of [19, 22]) r(13.5, yy, 5, 0.5, "#2c4653");
      line(3, 28, 30, 28, "#eef0d6", 0.5);
      r(4, 29, 25, 0.5, "#788b91");
      break;
    }
    default:
      r(9, 8, 14, 20, "ink");
      r(10, 9, 12, 17, "wood");
      r(12, 12, 8, 1, "gold");
      r(12, 16, 6, 1, "cream");
  }
  ctx.restore();
}
