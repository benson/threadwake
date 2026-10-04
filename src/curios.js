// Original 32px exhibit illustrations. All coordinates land on the pixel grid.
const C = {
  ink: "#172830",
  shadow: "#253b3e",
  brass: "#b98950",
  gold: "#e4bd76",
  light: "#fff0c8",
  cream: "#dbd0ad",
  bone: "#a8a58a",
  wood: "#77584d",
  red: "#b85560",
  rose: "#e08d80",
  blue: "#6496af",
  ice: "#aedcd5",
  teal: "#457f7b",
  green: "#85ad91",
  navy: "#425168",
};

export function drawCurio(ctx, id, x = 0, y = 0, size = 32) {
  if (!ctx || !Number.isFinite(size) || size <= 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const originX = Math.round(x),
    originY = Math.round(y),
    scale = size / 32;
  const r = (gx, gy, w, h, color) => {
    const left = Math.max(0, Math.min(32, gx));
    const top = Math.max(0, Math.min(32, gy));
    const right = Math.max(0, Math.min(32, gx + w));
    const bottom = Math.max(0, Math.min(32, gy + h));
    const x0 = originX + Math.round(left * scale),
      y0 = originY + Math.round(top * scale);
    const x1 = originX + Math.round(right * scale),
      y1 = originY + Math.round(bottom * scale);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.fillStyle = C[color] || color;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  const line = (x0, y0, x1, y1, color, width = 1) => {
    const dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      r(x0, y0, width, width, color);
      if (x0 === x1 && y0 === y1) break;
      const twice = error * 2;
      if (twice >= dy) {
        error += dy;
        x0 += sx;
      }
      if (twice <= dx) {
        error += dx;
        y0 += sy;
      }
    }
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
  const spark = (x, y) => {
    r(x, y - 2, 1, 5, "light");
    r(x - 2, y, 5, 1, "light");
  };
  oval(16, 28, 11, 2, "shadow");
  switch (id) {
    case "fork": // Porcelain prism: ivory body and three colored beams.
      line(1, 16, 11, 16, "cream");
      for (let y = 5; y <= 25; y++) {
        const half = Math.floor((y - 5) / 2);
        r(14 - half, y, half * 2 + 1, 1, "ink");
        if (y > 8 && y < 24)
          r(15 - half, y, Math.max(1, half * 2 - 1), 1, "cream");
      }
      line(14, 9, 18, 22, "light");
      line(19, 16, 29, 11, "rose");
      line(20, 18, 30, 18, "gold");
      line(21, 20, 29, 25, "ice");
      break;
    case "pierce": {
      // Diagonal chipped point, two barbs and a wrapped short shaft.
      line(4, 27, 16, 15, "ink", 4);
      line(5, 27, 17, 15, "wood", 2);
      // Hand-set scanlines preserve the broad triangular stone and cut-in notches.
      const rows = [
        [26, 26],
        [23, 26],
        [21, 26],
        [18, 26],
        [16, 26],
        [13, 25],
        [10, 25],
        [7, 25],
        [8, 24],
        [9, 24],
        [12, 24],
        [14, 24],
        [13, 23],
        [14, 23],
        [17, 23],
        [17, 22],
        [16, 22],
        [17, 22],
        [18, 22],
        [19, 21],
        [20, 21],
      ];
      rows.forEach(([left, right], i) => {
        const y = i + 3;
        r(left, y, right - left + 1, 1, "ink");
        if (right - left > 1) r(left + 1, y, right - left - 1, 1, "bone");
        const ridge = 28 - y;
        if (ridge > left && ridge < right)
          r(left + 1, y, ridge - left, 1, "cream");
      });
      line(24, 6, 15, 15, "light");
      line(15, 10, 18, 11, "bone");
      line(21, 13, 22, 17, "shadow");
      line(10, 19, 13, 22, "brass");
      line(8, 21, 11, 24, "brass");
      line(6, 23, 9, 26, "brass");
      break;
    }
    case "quick": // Tapered metronome housing, scale and sliding pendulum weight.
      for (let y = 3; y <= 27; y++) {
        const half = 3 + Math.floor((y - 3) / 3);
        r(16 - half, y, half * 2 + 1, 1, "ink");
        r(17 - half, y, half * 2 - 1, 1, "wood");
        if (y > 5 && y < 23) r(18 - half, y, half * 2 - 3, 1, "brass");
      }
      r(14, 6, 5, 16, "ink");
      for (const y of [7, 10, 13, 16, 19]) r(15, y, 2, 1, "cream");
      line(16, 23, 9, 5, "ink", 2);
      line(16, 23, 9, 5, "light");
      r(9, 10, 6, 5, "ink");
      r(10, 11, 4, 3, "gold");
      r(10, 11, 3, 1, "light");
      oval(16, 23, 2, 2, "gold");
      r(5, 28, 23, 2, "ink");
      r(7, 27, 19, 1, "gold");
      break;
    case "heavy": // Rectangular bronze ingot with an engraved seal on loose papers.
      r(3, 17, 24, 13, "bone");
      r(5, 15, 25, 13, "cream");
      r(6, 16, 23, 11, "light");
      r(25, 24, 4, 1, "bone");
      r(6, 26, 9, 1, "bone");
      r(7, 11, 21, 13, "ink");
      r(4, 14, 21, 12, "ink");
      for (let y = 11; y <= 14; y++) {
        const left = 7 - (y - 11);
        r(left, y, 21, 1, "ink");
        r(left + 1, y, 19, 1, "gold");
      }
      r(5, 15, 19, 9, "brass");
      r(5, 15, 19, 1, "light");
      r(25, 14, 2, 9, "wood");
      line(25, 23, 27, 21, "wood");
      r(6, 16, 1, 7, "gold");
      r(8, 24, 16, 1, "wood");
      // Deep square maker's seal, visibly stamped into the flat bronze face.
      r(12, 18, 6, 4, "wood");
      r(13, 19, 1, 2, "gold");
      r(15, 19, 2, 1, "gold");
      break;
    case "orbit": // Orrery: distinct nested brass rings and colored planets.
      r(14, 18, 3, 8, "brass");
      r(9, 26, 14, 2, "gold");
      oval(16, 13, 12, 7, "ink", true);
      oval(16, 13, 11, 6, "gold", true);
      oval(16, 13, 6, 11, "brass", true);
      oval(16, 13, 3, 3, "gold");
      r(15, 11, 2, 2, "light");
      oval(5, 13, 3, 3, "ink");
      oval(5, 12, 2, 2, "blue");
      oval(24, 8, 3, 3, "ink");
      oval(24, 7, 2, 2, "rose");
      break;
    case "echo": // A proper broom brush, rather than a ghost.
      r(14, 2, 4, 14, "ink");
      r(15, 3, 2, 12, "wood");
      r(8, 13, 16, 5, "ink");
      r(9, 14, 14, 3, "brass");
      for (let y = 18; y <= 27; y++) {
        const spread = Math.floor((y - 18) / 3);
        r(8 - spread, y, 16 + spread * 2, 1, "ink");
        r(9 - spread, y, 14 + spread * 2, 1, "gold");
      }
      for (let i = 0; i < 5; i++) line(10 + i * 3, 19, 8 + i * 4, 27, "wood");
      break;
    case "recall": // Double-loop clockwork winding key.
      oval(10, 10, 7, 6, "ink");
      oval(22, 10, 7, 6, "ink");
      oval(10, 10, 5, 4, "gold");
      oval(22, 10, 5, 4, "gold");
      oval(10, 10, 2, 2, "shadow");
      oval(22, 10, 2, 2, "shadow");
      r(13, 11, 6, 16, "ink");
      r(14, 12, 4, 14, "brass");
      r(14, 13, 1, 11, "light");
      r(18, 20, 5, 3, "gold");
      r(18, 25, 5, 3, "gold");
      break;
    case "thread": // Museum velvet rope, draped between two stanchions.
      for (const x of [5, 25]) {
        r(x - 1, 8, 3, 17, "brass");
        oval(x, 7, 3, 3, "ink");
        oval(x, 6, 2, 2, "gold");
        r(x - 4, 25, 9, 3, "ink");
        r(x - 3, 25, 7, 1, "gold");
      }
      for (let x = 6; x <= 25; x++) {
        const y = 10 + Math.round(Math.sin(((x - 6) / 19) * Math.PI) * 6);
        r(x, y, 2, 4, "ink");
        r(x, y, 1, 2, "red");
        r(x, y, 1, 1, "rose");
      }
      break;
    case "bloom": // Conservator's cart: stacked trays and useful supplies.
      r(6, 10, 2, 15, "brass");
      r(25, 7, 2, 18, "brass");
      r(25, 6, 5, 2, "gold");
      for (const y of [13, 23]) {
        r(4, y, 24, 4, "ink");
        r(5, y, 22, 2, "teal");
      }
      r(9, 6, 5, 7, "cream");
      r(10, 4, 3, 3, "red");
      r(18, 7, 5, 6, "blue");
      r(19, 5, 3, 2, "light");
      r(10, 19, 9, 4, "wood");
      r(10, 19, 9, 1, "gold");
      oval(8, 28, 3, 3, "ink");
      oval(24, 28, 3, 3, "ink");
      r(7, 27, 2, 2, "bone");
      r(23, 27, 2, 2, "bone");
      break;
    case "heal": // Enamel first-aid case.
      r(11, 5, 10, 6, "ink");
      r(13, 6, 6, 3, "brass");
      r(4, 10, 24, 17, "ink");
      r(5, 11, 22, 14, "cream");
      r(5, 11, 22, 2, "light");
      r(5, 23, 22, 2, "bone");
      r(14, 13, 4, 10, "red");
      r(11, 16, 10, 4, "red");
      r(7, 16, 2, 4, "brass");
      r(23, 16, 2, 4, "brass");
      break;
    case "speed": // Pair of roller skates with conspicuous red wheels.
      for (const [x, y] of [
        [3, 6],
        [14, 13],
      ]) {
        r(x, y, 9, 13, "ink");
        r(x + 1, y + 1, 6, 10, "blue");
        r(x + 1, y + 9, 13, 5, "ink");
        r(x + 2, y + 9, 10, 3, "cream");
        r(x + 2, y + 2, 3, 1, "light");
        r(x + 4, y + 4, 3, 1, "light");
        oval(x + 3, y + 16, 2, 2, "red");
        oval(x + 11, y + 16, 2, 2, "red");
      }
      break;
    case "vitality": // Padded waistcoat, ivory shirt visible at the collar.
      r(9, 4, 14, 4, "ink");
      r(11, 5, 10, 4, "cream");
      r(6, 8, 20, 20, "ink");
      r(7, 9, 18, 17, "wood");
      r(6, 8, 4, 7, "shadow");
      r(22, 8, 4, 7, "shadow");
      line(10, 7, 15, 14, "gold");
      line(21, 7, 16, 14, "gold");
      r(15, 15, 2, 11, "ink");
      for (const y of [16, 20, 24]) r(16, y, 1, 1, "gold");
      r(9, 19, 4, 2, "brass");
      r(20, 19, 3, 2, "brass");
      break;
    case "frost": // Angular glacier shard on a dark specimen base.
      for (let y = 3; y <= 25; y++) {
        const left =
          y < 13 ? 17 - Math.floor(y / 2) : 9 + Math.floor((y - 13) / 4);
        const right =
          y < 13 ? 18 + Math.floor(y / 5) : 24 - Math.floor((y - 13) / 3);
        r(left - 1, y, right - left + 3, 1, "ink");
        r(left, y, right - left + 1, 1, "blue");
      }
      line(18, 5, 13, 19, "light");
      line(18, 5, 18, 23, "ice");
      line(13, 19, 18, 23, "teal");
      r(9, 26, 15, 2, "bone");
      spark(25, 7);
      break;
    case "mirror": // Tin soldier, tall black shako and red tunic.
      r(11, 3, 10, 8, "ink");
      r(12, 4, 8, 4, "navy");
      r(15, 4, 2, 3, "gold");
      r(12, 11, 8, 5, "cream");
      r(13, 12, 1, 1, "ink");
      r(18, 12, 1, 1, "ink");
      r(9, 16, 14, 9, "ink");
      r(11, 16, 10, 8, "red");
      r(15, 16, 2, 8, "gold");
      r(11, 22, 10, 2, "cream");
      r(11, 25, 4, 4, "navy");
      r(18, 25, 4, 4, "navy");
      r(9, 29, 6, 2, "ink");
      r(18, 29, 6, 2, "ink");
      r(25, 9, 2, 17, "wood");
      r(25, 6, 1, 5, "light");
      break;
    case "thorns": // Lifted lid, exposed zigzag spring and a bright jack's face.
      for (let y = 10; y <= 22; y++) {
        const x = 26 - Math.floor((y - 10) / 3);
        r(x, y, 5, 1, "ink");
        r(x + 1, y, 3, 1, "red");
        r(x + 1, y, 1, 1, "rose");
      }
      line(13, 12, 18, 15, "gold", 2);
      line(18, 15, 11, 18, "gold", 2);
      line(11, 18, 18, 21, "gold", 2);
      line(18, 21, 14, 23, "gold", 2);
      oval(13, 8, 5, 5, "ink");
      oval(13, 8, 4, 4, "cream");
      r(10, 7, 1, 1, "ink");
      r(15, 7, 1, 1, "ink");
      r(12, 9, 2, 1, "red");
      r(11, 11, 4, 1, "red");
      r(8, 3, 10, 3, "teal");
      r(10, 1, 3, 2, "green");
      r(16, 1, 3, 2, "green");
      r(5, 23, 21, 8, "ink");
      r(6, 24, 19, 6, "red");
      r(7, 24, 17, 1, "rose");
      r(9, 26, 3, 3, "gold");
      r(19, 26, 3, 3, "gold");
      break;
    case "magnet": // The reception bell: brass dome and dark red plinth.
      r(14, 5, 4, 5, "ink");
      r(13, 5, 6, 2, "gold");
      oval(16, 21, 10, 12, "ink");
      oval(16, 21, 8, 10, "brass");
      oval(13, 19, 4, 7, "gold");
      r(12, 13, 2, 5, "light");
      r(3, 24, 26, 6, "ink");
      r(5, 25, 22, 3, "red");
      r(6, 24, 20, 2, "gold");
      r(3, 20, 2, 1, "cream");
      r(27, 16, 2, 1, "cream");
      break;
    default:
      r(7, 8, 18, 20, "ink");
      r(8, 9, 16, 17, "wood");
      r(9, 10, 14, 1, "gold");
      spark(16, 17);
  }
  ctx.restore();
}
