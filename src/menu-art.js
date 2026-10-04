// Hand-built 32px menu illustrations. Every mark is an integer fillRect;
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
      oval(14, 10, 9, 8, "ink", true);
      oval(14, 10, 7, 6, "brass", true);
      for (let i = 0; i < 6; i++)
        r(8 + i, 5 - Math.floor(i / 3), 1, 1, "light");
      r(6, 16, 3, 11, "ink");
      r(7, 17, 1, 10, "cream");
      r(7, 23, 5, 2, "cream");
      r(7, 27, 5, 2, "cream");
      oval(15, 17, 4, 4, "ink");
      oval(15, 17, 3, 3, "gold");
      r(14, 16, 2, 2, "brown");
      r(14, 20, 4, 10, "ink");
      r(15, 20, 2, 9, "brass");
      r(15, 20, 1, 7, "light");
      r(17, 24, 4, 2, "gold");
      r(17, 28, 4, 2, "gold");
      r(21, 12, 7, 11, "ink");
      r(22, 13, 5, 9, "red");
      r(23, 14, 2, 2, "brass");
      r(23, 18, 2, 3, "cream");
      break;
    }
    case "staff": {
      const attendant = (x, y, shirt, cap) => {
        r(x + 1, y, 9, 5, "ink");
        r(x + 2, y + 1, 7, 2, cap);
        r(x, y + 4, 11, 2, "ink");
        r(x + 5, y + 2, 2, 2, "gold");
        r(x + 2, y + 6, 7, 5, "skin");
        r(x + 3, y + 7, 1, 1, "ink");
        r(x + 7, y + 7, 1, 1, "ink");
        r(x + 4, y + 10, 3, 1, "brown");
        r(x, y + 11, 11, 10, "ink");
        r(x + 1, y + 12, 9, 8, shirt);
        r(x + 3, y + 12, 5, 8, "cream");
        r(x + 5, y + 14, 2, 3, "brass");
        r(x + 1, y + 21, 4, 3, "navy");
        r(x + 7, y + 21, 4, 3, "navy");
        r(x, y + 24, 5, 2, "ink");
        r(x + 7, y + 24, 5, 2, "ink");
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
      r(5, 6, 21, 19, "wood");
      r(6, 7, 19, 15, "brown");
      r(5, 6, 21, 1, "gold");
      r(8, 8, 10, 13, "navy");
      r(9, 9, 8, 11, "blue");
      r(10, 8, 3, 4, "cream");
      r(14, 8, 3, 4, "cream");
      r(12, 11, 2, 8, "navy");
      r(14, 15, 2, 3, "gold");
      r(9, 19, 8, 1, "stone");
      r(20, 9, 3, 3, "gold");
      r(19, 12, 5, 8, "teal");
      r(20, 13, 1, 5, "ice");
      r(20, 15, 3, 2, "cream");
      r(3, 22, 25, 7, "ink");
      r(4, 23, 23, 4, "wood");
      r(4, 23, 23, 1, "brass");
      r(13, 24, 5, 4, "gold");
      r(14, 25, 3, 1, "brown");
      break;
    }
    case "gear": {
      const gear = (cx, cy, radius, color, highlight) => {
        oval(cx, cy, radius, radius, "ink");
        oval(cx, cy, radius - 2, radius - 2, color);
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
        oval(cx, cy, 3, 3, "ink");
        oval(cx, cy, 1, 1, highlight);
        r(cx - 4, cy - 5, 3, 1, highlight);
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
      r(12, 15, 8, 11, "ink");
      r(13, 16, 6, 10, "teal");
      r(15, 17, 1, 9, "shadow");
      r(14, 22, 1, 1, "gold");
      r(17, 22, 1, 1, "gold");
      for (const x of [5, 9, 22, 26]) {
        r(x, 14, 2, 12, "cream");
        r(x, 14, 1, 12, "light");
      }
      r(3, 26, 27, 2, "bone");
      r(2, 28, 29, 2, "cream");
      r(14, 8, 4, 2, "light");
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
