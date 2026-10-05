// Detailed 64px exhibit art on a 32-unit design grid. Half-unit marks become
// single physical pixels; all rasterization ends at bounded integer fillRects.
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
const MATERIAL = {
  brass: [
    "#443832",
    "#715238",
    "#987345",
    "#bea064",
    "#dbc38a",
    "#f1dfab",
    "#fff0c8",
  ],
  steel: [
    "#263b4c",
    "#476170",
    "#758b93",
    "#a6b9b9",
    "#cad7cc",
    "#e2e8d4",
    "#fff6da",
  ],
  porcelain: [
    "#596971",
    "#8c9691",
    "#b3b9a9",
    "#d2d4bd",
    "#e9e5cb",
    "#fff0d6",
    "#fff8e7",
  ],
  blue: [
    "#1c344b",
    "#2f5168",
    "#4e768a",
    "#7199a5",
    "#91b7b8",
    "#bdd9cc",
    "#e9efe0",
  ],
  red: [
    "#492b3b",
    "#743d4e",
    "#a25562",
    "#c67779",
    "#df9b93",
    "#ecc1a8",
    "#ffe6c3",
  ],
  wood: [
    "#352e32",
    "#523a34",
    "#79543f",
    "#9b7553",
    "#ba9268",
    "#d3b384",
    "#ebcfa1",
  ],
  skin: [
    "#604844",
    "#8f6451",
    "#b78a6b",
    "#d4af87",
    "#e9cda2",
    "#f7e3bc",
    "#fff0d0",
  ],
};

export function createIconTools(ctx, x, y, size, palette = C) {
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
    ctx.fillStyle = palette[color] || color;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  const line = (x0, y0, x1, y1, color, width = 1) => {
    x0 = Math.round(x0 * 2);
    y0 = Math.round(y0 * 2);
    x1 = Math.round(x1 * 2);
    y1 = Math.round(y1 * 2);
    const dx = Math.abs(x1 - x0),
      sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0),
      sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      r(x0 / 2, y0 / 2, width, width, color);
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
    for (let y = -ry; y <= ry; y += 0.5)
      for (let x = -rx; x <= rx; x += 0.5) {
        const outer = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        const inner =
          (x * x) / Math.max(1, (rx - 1) ** 2) +
          (y * y) / Math.max(1, (ry - 1) ** 2);
        if (outer <= 1 && (!hollow || inner >= 1))
          r(cx + x, cy + y, 0.5, 0.5, color);
      }
  };
  const spark = (x, y) => {
    r(x, y - 2, 1, 5, "light");
    r(x - 2, y, 5, 1, "light");
  };
  const poly = (points, color) => {
    const low = Math.floor(Math.min(...points.map((p) => p[1])) * 2) / 2;
    const high = Math.max(...points.map((p) => p[1]));
    for (let y = low; y < high; y += 0.5) {
      const hits = [],
        sample = y + 0.25;
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        if (
          (a[1] <= sample && b[1] > sample) ||
          (b[1] <= sample && a[1] > sample)
        )
          hits.push(a[0] + ((sample - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2)
        r(
          Math.round(hits[i] * 2) / 2,
          y,
          Math.max(0.5, Math.round((hits[i + 1] - hits[i]) * 2) / 2),
          0.5,
          color,
        );
    }
  };
  const volume = (cx, cy, rx, ry, material = "brass", hole = 0) => {
    const ramp = MATERIAL[material];
    for (let yy = -ry; yy <= ry; yy += 0.5)
      for (let xx = -rx; xx <= rx; xx += 0.5) {
        const nx = xx / rx,
          ny = yy / ry,
          radius = nx * nx + ny * ny;
        if (radius > 1 || (hole && radius < hole * hole)) continue;
        const nz = Math.sqrt(Math.max(0, 1 - radius));
        const light = hole
          ? 0.45 -
            nx * 0.25 -
            ny * 0.35 +
            Math.sin(Math.sqrt(radius) * 18) * 0.12
          : Math.max(0, -nx * 0.46 - ny * 0.52 + nz * 0.72);
        const shade = Math.max(0, Math.min(6, Math.floor(light * 6.2)));
        r(cx + xx, cy + yy, 0.5, 0.5, ramp[shade]);
      }
  };
  const bevel = (x, y, w, h, material = "brass") => {
    const colors = MATERIAL[material];
    r(x, y, w, h, colors[0]);
    r(x + 0.5, y + 0.5, w - 1, h - 1, colors[2]);
    r(x + 1, y + 1, w - 2, h - 2, colors[3]);
    r(x + 0.5, y + 0.5, w - 1, 0.5, colors[5]);
    r(x + 0.5, y + 1, 0.5, h - 2, colors[4]);
    r(x + w - 1, y + 1, 0.5, h - 2, colors[1]);
    r(x + 1, y + h - 1, w - 2, 0.5, colors[1]);
  };
  return { r, line, oval, spark, poly, volume, bevel };
}

export function drawCurio(ctx, id, x = 0, y = 0, size = 32) {
  if (!ctx || !Number.isFinite(size) || size <= 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const { r, line, oval, spark, poly, volume, bevel } = createIconTools(
    ctx,
    x,
    y,
    size,
  );
  oval(16, 28, 11, 2, "shadow");
  switch (id) {
    case "fork": // Three polished faces and refracted light describe a solid prism.
      poly(
        [
          [4, 25],
          [13, 4],
          [22, 7],
          [29, 26],
          [20, 29],
        ],
        "ink",
      );
      poly(
        [
          [5.5, 24.5],
          [13.5, 5.5],
          [21, 26],
        ],
        "#c4d9d0",
      );
      poly(
        [
          [13.5, 5.5],
          [21, 8],
          [27.5, 25],
          [21, 26],
        ],
        "#658999",
      );
      poly(
        [
          [5.5, 24.5],
          [21, 26],
          [27.5, 25],
          [20, 28],
        ],
        "#4c697e",
      );
      poly(
        [
          [8, 22],
          [13.5, 8],
          [17.5, 22],
        ],
        "#e6ebd7",
      );
      poly(
        [
          [15, 9],
          [21, 10],
          [25, 22],
          [20.5, 22],
        ],
        "#91b8bd",
      );
      line(13.5, 5.5, 21, 26, "#fff6df", 0.5);
      line(6, 24, 13, 7, "#f4efdb", 0.5);
      line(1, 16, 10, 16, "#e5d7b2", 0.5);
      line(18, 16, 30, 10, "#d79288", 0.5);
      line(19, 18, 31, 18, "#dfc383", 0.5);
      line(20, 20, 30, 25, "#98c5bd", 0.5);
      line(14, 17, 18.5, 18, "#b4d9cf", 0.5);
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
      poly(
        [
          [25.5, 4],
          [12, 12],
          [17, 14],
          [21, 10],
        ],
        "#e0dcc4",
      );
      poly(
        [
          [25.5, 5],
          [22, 19],
          [19, 17],
          [21, 10],
        ],
        "#89978e",
      );
      poly(
        [
          [10, 11],
          [15, 13],
          [13, 15],
        ],
        "#85908a",
      );
      poly(
        [
          [16, 15],
          [19, 17],
          [20, 22],
        ],
        "#c4c6ad",
      );
      line(24.5, 5.5, 15, 15, "light", 0.5);
      line(14, 10, 17, 11.5, "#a3ab99", 0.5);
      line(21, 12.5, 22, 17, "#61776f", 0.5);
      line(17.5, 8, 21, 10, "#b4bca6", 0.5);
      line(13, 14, 16, 16, "#647870", 0.5);
      for (let i = 0; i < 5; i++)
        line(
          6.5 + i,
          23.5 - i,
          9 + i,
          26 - i,
          i % 2 ? "#d0b886" : "#917349",
          0.5,
        );
      line(4.5, 27, 7, 24.5, "#c19b70", 0.5);
      break;
    }
    case "quick": // Tapered metronome housing, scale and sliding pendulum weight.
      for (let y = 3; y <= 27; y++) {
        const half = 3 + Math.floor((y - 3) / 3);
        r(16 - half, y, half * 2 + 1, 1, "ink");
        r(17 - half, y, half * 2 - 1, 1, "#856044");
        if (y > 5 && y < 23) r(18 - half, y, half * 2 - 3, 1, "#b18a59");
      }
      poly(
        [
          [18, 4],
          [26, 26],
          [22, 25],
          [16.5, 5],
        ],
        "#573c32",
      );
      poly(
        [
          [13, 4],
          [7, 26],
          [9, 25],
          [14.5, 5],
        ],
        "#c4a271",
      );
      line(13, 5, 8, 25, "#e0bb87", 0.5);
      r(14, 6, 5, 16, "ink");
      for (let y = 7; y < 22; y += 1.5)
        r(15, y, y % 3 === 1 ? 2 : 1, 0.5, "cream");
      line(16, 23, 9, 5, "ink", 2);
      line(16, 23, 9, 5, "#cad4cd", 0.5);
      r(9, 10, 6, 5, "ink");
      bevel(9.5, 10.5, 5, 4, "brass");
      volume(16, 23, 2, 2, "brass");
      r(5, 28, 23, 2, "ink");
      r(7, 27, 19, 1, "gold");
      line(9, 21, 7, 25, "wood");
      line(23, 16, 25, 24, "wood");
      r(8, 25, 16, 1, "brass");
      r(12, 11, 0.5, 3, "cream");
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
      r(5, 15, 19, 0.5, "light");
      r(5.5, 15.5, 18, 2, "#c3a56a");
      r(5.5, 17.5, 18, 4, "#ad8954");
      r(5.5, 21.5, 18, 2, "#9b7547");
      r(25, 14, 2, 9, "wood");
      line(25, 23, 27, 21, "wood");
      r(6, 16, 1, 7, "gold");
      r(8, 24, 16, 1, "wood");
      // Deep square maker's seal, visibly stamped into the flat bronze face.
      bevel(11.5, 17.5, 7, 5, "wood");
      r(12.5, 18.5, 5, 3, "#725239");
      line(13, 21, 13, 19, "#d9b879", 0.5);
      line(13, 19, 15, 19, "#d9b879", 0.5);
      line(15, 19, 15, 21, "#d9b879", 0.5);
      line(15, 21, 17, 21, "#d9b879", 0.5);
      r(8, 17, 2, 1, "gold");
      r(20, 21, 3, 1, "wood");
      r(9, 12, 11, 1, "light");
      r(8, 28, 13, 1, "bone");
      break;
    case "orbit": // Orrery: distinct nested brass rings and colored planets.
      bevel(14.5, 18, 3, 8, "brass");
      volume(16, 27, 8, 2.5, "wood");
      volume(16, 25.5, 6.5, 1.5, "brass");
      volume(16, 13, 12, 7, "brass", 0.87);
      volume(16, 13, 6.5, 11.5, "brass", 0.87);
      volume(16, 13, 3.5, 3.5, "brass");
      line(6, 12, 24, 7, "#806445", 0.5);
      volume(5.5, 12.5, 3, 3, "blue");
      volume(25, 7.5, 3, 3, "red");
      volume(20, 19, 1.5, 1.5, "porcelain");
      line(16.5, 21.5, 16.5, 24.5, "#f4dfad", 0.5);
      break;
    case "echo": // A proper broom brush, rather than a ghost.
      r(14, 2, 4, 14, "ink");
      r(15, 3, 2, 12, "wood");
      r(15, 3, 0.5, 11, "#c5a071");
      r(16.5, 3, 0.5, 11, "#48372f");
      r(8, 13, 16, 5, "ink");
      bevel(8.5, 13.5, 15, 4.5, "brass");
      for (let y = 18; y <= 27; y++) {
        const spread = Math.floor((y - 18) / 3);
        r(8 - spread, y, 16 + spread * 2, 1, "ink");
        r(9 - spread, y, 14 + spread * 2, 1, "gold");
      }
      for (let i = 0; i < 22; i++) {
        const x = 9 + i * 0.65;
        line(
          x,
          18,
          x + (i - 11) * 0.27,
          27 - (i % 4) * 0.5,
          ["#80623c", "#c49a57", "#f1d294", "#a67c47"][i % 4],
          0.5,
        );
      }
      r(15, 4, 1, 9, "brass");
      for (const x of [10, 15, 20]) volume(x, 15.5, 0.75, 0.75, "steel");
      break;
    case "recall": // Double-loop clockwork winding key.
      volume(9.5, 9.5, 6.5, 5.5, "brass", 0.53);
      volume(22, 9.5, 6.5, 5.5, "brass", 0.53);
      bevel(13.5, 11, 5, 17, "brass");
      r(14.5, 14, 0.5, 12, "#fff0c2");
      r(16.5, 15, 0.5, 11, "#775237");
      volume(16, 13, 3, 2, "brass");
      bevel(18, 20, 6, 3, "brass");
      bevel(18, 25, 6, 3, "brass");
      r(20.5, 21.5, 1, 1.5, "#503d2f");
      r(22, 26, 1, 2, "#503d2f");
      break;
    case "thread": // Museum velvet rope, draped between two stanchions.
      for (const x of [5, 25]) {
        r(x - 1, 8, 3, 17, "brass");
        volume(x, 6, 3, 3, "brass");
        volume(x, 26, 4.5, 2, "brass");
        r(x - 1, 10, 0.5, 13, "light");
        r(x + 0.5, 10, 0.5, 13, "#715139");
        r(x - 2, 22, 5, 1, "gold");
        r(x + 1, 26, 2, 1, "wood");
      }
      for (let x = 6; x <= 25; x += 0.5) {
        const y = 10 + Math.sin(((x - 6) / 19) * Math.PI) * 6;
        r(x, y, 0.5, 3.5, "#422d3b");
        r(x, y, 0.5, 0.5, "#e3a69a");
        r(x, y + 0.5, 0.5, 1, "#c6757a");
        r(x, y + 1.5, 0.5, 1, "#9b4d61");
        if (x % 2 === 0) r(x, y + 1, 0.5, 0.5, "#daa08b");
      }
      break;
    case "bloom": // Conservator's cart: stacked trays and useful supplies.
      bevel(5.5, 8, 2.5, 18, "steel");
      bevel(24.5, 6, 2.5, 20, "steel");
      bevel(25, 5.5, 5, 2, "brass");
      for (const y of [13, 23]) {
        poly(
          [
            [3, y],
            [6, y - 3],
            [29, y - 3],
            [26, y],
            [26, y + 4],
            [3, y + 4],
          ],
          "ink",
        );
        poly(
          [
            [4, y],
            [7, y - 2.5],
            [28, y - 2.5],
            [25, y],
          ],
          "#8cb1b2",
        );
        r(4, y, 22, 3, "#426f7d");
        r(4, y, 22, 0.5, "#bdd3c9");
        r(4, y + 2.5, 22, 0.5, "#203b50");
      }
      bevel(8, 5, 7, 8, "porcelain");
      r(10.5, 7, 1.5, 4, "red");
      r(9.5, 8.5, 3.5, 1, "red");
      volume(21, 9, 3, 5, "blue");
      bevel(19, 3.5, 4, 2, "brass");
      r(19.5, 6, 0.5, 5, "#d5eee1");
      r(20, 8, 3, 2, "cream");
      bevel(10, 18, 10, 4, "wood");
      r(11, 18.5, 8, 0.5, "#d4bd8a");
      oval(8, 28, 3, 3, "ink");
      oval(24, 28, 3, 3, "ink");
      volume(8, 28, 2, 2, "steel");
      volume(24, 28, 2, 2, "steel");
      r(10, 8, 1, 4, "light");
      r(19, 8, 1, 4, "ice");
      r(11, 21, 6, 1, "cream");
      r(6, 14, 19, 1, "green");
      r(6, 24, 19, 1, "shadow");
      break;
    case "heal": // Enamel first-aid case.
      r(11, 5, 10, 6, "ink");
      r(13, 6, 6, 3, "brass");
      poly(
        [
          [4, 11],
          [7, 8],
          [28, 8],
          [29, 10],
          [29, 25],
          [26, 28],
          [4, 28],
          [3, 26],
          [3, 13],
        ],
        "ink",
      );
      poly(
        [
          [4, 11],
          [7, 8.5],
          [27.5, 8.5],
          [25, 11],
        ],
        "#eff0d6",
      );
      poly(
        [
          [25, 11],
          [28, 9],
          [28, 24.5],
          [25, 27],
        ],
        "#7f9597",
      );
      bevel(4, 11, 22, 16, "porcelain");
      r(5.5, 12.5, 18, 9, "#e2dfc7");
      r(5.5, 21.5, 18, 3.5, "#c4c7b5");
      r(14, 13, 4, 10, "red");
      r(11, 16, 10, 4, "red");
      bevel(6.5, 16, 2, 4, "brass");
      bevel(22.5, 16, 2, 4, "brass");
      r(6, 13, 1, 9, "bone");
      r(25, 13, 1, 9, "bone");
      r(7, 16, 1, 2, "light");
      r(23, 16, 1, 2, "light");
      r(14, 14, 0.5, 7, "#e6a391");
      r(6, 24, 2, 1, "brass");
      r(24, 24, 2, 1, "brass");
      break;
    case "speed": // Pair of roller skates with conspicuous red wheels.
      for (const [x, y] of [
        [3, 6],
        [14, 13],
      ]) {
        poly(
          [
            [x, y],
            [x + 8, y],
            [x + 8, y + 8],
            [x + 14, y + 10],
            [x + 15, y + 13],
            [x + 1, y + 14],
          ],
          "ink",
        );
        poly(
          [
            [x + 1, y + 1],
            [x + 6.5, y + 1],
            [x + 6.5, y + 9],
            [x + 12, y + 10],
            [x + 13.5, y + 12],
            [x + 1, y + 12],
          ],
          "#7294a4",
        );
        poly(
          [
            [x + 6.5, y + 1],
            [x + 7.5, y + 1],
            [x + 7.5, y + 9],
            [x + 13, y + 10],
            [x + 14, y + 12],
            [x + 10, y + 12],
            [x + 5, y + 9],
          ],
          "#3e637a",
        );
        line(x + 1, y + 1.5, x + 1, y + 10, "#b2cbbb", 0.5);
        bevel(x + 1, y + 12, 13, 2, "porcelain");
        line(x + 2, y + 14, x + 12, y + 14, "#9ab0b1", 0.5);
        for (const axle of [3, 11]) {
          volume(x + axle, y + 16, 2.5, 2.5, "red");
          volume(x + axle, y + 16, 1, 1, "steel");
        }
        r(x + 2, y + 4, 2, 1, "navy");
        for (const yy of [3, 5, 7]) {
          line(x + 3, y + yy, x + 6, y + yy + 1.5, "cream", 0.5);
          line(x + 6, y + yy, x + 3, y + yy + 1.5, "cream", 0.5);
        }
        r(x + 3, y + 16, 1, 1, "gold");
        r(x + 11, y + 16, 1, 1, "gold");
      }
      break;
    case "vitality": // Padded waistcoat, ivory shirt visible at the collar.
      r(9, 4, 14, 4, "ink");
      r(11, 5, 10, 4, "cream");
      poly(
        [
          [8, 7],
          [12, 6],
          [16, 12],
          [20, 6],
          [24, 7],
          [23, 13],
          [25, 26],
          [19, 29],
          [16, 26],
          [12, 29],
          [6, 26],
          [9, 13],
        ],
        "ink",
      );
      poly(
        [
          [9, 8],
          [12, 7],
          [15.5, 13],
          [15.5, 25],
          [12, 27.5],
          [7.5, 25],
          [10, 13],
        ],
        "#ad8362",
      );
      poly(
        [
          [20, 7],
          [23, 8],
          [21.5, 13],
          [23.5, 25],
          [19, 27.5],
          [16.5, 25],
          [16.5, 13],
        ],
        "#795441",
      );
      poly(
        [
          [9, 9],
          [11, 8],
          [13, 12],
          [12, 24],
          [9, 25],
          [10.5, 14],
        ],
        "#c49a70",
      );
      poly(
        [
          [20, 9],
          [22, 9],
          [20.5, 14],
          [22.5, 25],
          [20, 24],
          [18, 12],
        ],
        "#947055",
      );
      line(10, 7, 15, 14, "#e1c293", 0.5);
      line(21, 7, 16, 14, "#bd986e", 0.5);
      r(15, 15, 2, 11, "ink");
      for (const y of [16, 20, 24]) volume(16, y, 0.75, 0.75, "brass");
      bevel(9, 19, 4, 2, "wood");
      bevel(19, 19, 4, 2, "wood");
      for (const [x, y] of [
        [9, 13],
        [19, 13],
        [8, 22],
        [19, 22],
      ])
        line(x, y, x + 3, y + 3, "#bf9870", 0.5);
      r(9, 21, 4, 1, "ink");
      r(20, 21, 3, 1, "ink");
      break;
    case "frost": // Angular glacier shard on a dark specimen base.
      poly(
        [
          [18, 2],
          [23, 7],
          [25, 17],
          [20, 27],
          [10, 25],
          [7, 17],
          [11, 8],
        ],
        "ink",
      );
      poly(
        [
          [18, 3],
          [22, 8],
          [18, 23],
          [11, 24],
          [8, 17],
          [12, 9],
        ],
        "#89b7c2",
      );
      poly(
        [
          [18, 3],
          [16, 14],
          [11, 24],
          [8, 17],
          [12, 9],
        ],
        "#d1e5dd",
      );
      poly(
        [
          [18, 3],
          [22, 8],
          [24, 17],
          [18, 23],
          [16, 14],
        ],
        "#5e94a8",
      );
      poly(
        [
          [24, 17],
          [20, 26],
          [11, 24],
          [18, 23],
        ],
        "#326377",
      );
      poly(
        [
          [14, 10],
          [15.5, 15],
          [12, 21],
          [11, 17],
        ],
        "#e4eee1",
      );
      poly(
        [
          [19, 12],
          [22, 16],
          [19, 21],
          [17, 17],
        ],
        "#9dcbc9",
      );
      line(18, 3, 16, 14, "#f4f3de", 0.5);
      line(16, 14, 11, 24, "#f4f3de", 0.5);
      line(16, 14, 18, 23, "#b1d9cd", 0.5);
      line(18, 23, 23, 17, "#bfd9d0", 0.5);
      line(13, 9, 16, 10, "#789daf", 0.5);
      line(17.5, 18, 20, 17, "#dce7d7", 0.5);
      volume(16, 27.5, 8, 1.5, "steel");
      break;
    case "mirror": // Tin soldier, tall black shako and red tunic.
      r(11, 3, 10, 8, "ink");
      volume(16, 4, 5, 2, "blue");
      r(11.5, 4, 9, 5, "#31455b");
      r(12, 4.5, 2, 4.5, "#587789");
      r(18.5, 4.5, 1.5, 5, "#1f3246");
      r(10.5, 9, 11, 1.5, "ink");
      line(11, 9, 20, 9, "#a3b5aa", 0.5);
      volume(16, 6, 1, 1.5, "brass");
      volume(16, 12.5, 4, 4, "porcelain");
      r(13.5, 12, 1, 0.5, "ink");
      r(17.5, 12, 1, 0.5, "ink");
      r(16, 12.5, 0.5, 1.5, "bone");
      poly(
        [
          [10, 16],
          [13, 15],
          [16, 17],
          [19, 15],
          [22, 16],
          [23, 24],
          [9, 24],
        ],
        "ink",
      );
      poly(
        [
          [11, 16],
          [15, 17],
          [15, 23],
          [10, 23],
        ],
        "#c67779",
      );
      poly(
        [
          [16, 17],
          [20, 16],
          [22, 23],
          [16, 23],
        ],
        "#8b475b",
      );
      r(15, 16, 1, 8, "gold");
      r(11, 22, 10, 2, "cream");
      bevel(11, 25, 4, 4, "blue");
      bevel(18, 25, 4, 4, "blue");
      r(9, 29, 6, 2, "ink");
      r(18, 29, 6, 2, "ink");
      bevel(25, 9, 1.5, 17, "wood");
      line(25.5, 5, 25.5, 11, "#e4e9d2", 0.5);
      r(12, 5, 1, 3, "blue");
      r(13, 14, 5, 1, "wood");
      r(11, 17, 2, 1, "gold");
      r(19, 17, 2, 1, "gold");
      for (const y of [18, 20]) {
        volume(13, y, 0.5, 0.5, "brass");
        volume(18, y, 0.5, 0.5, "brass");
        line(13.5, y, 17.5, y, "#d6b77f", 0.5);
      }
      r(11, 26, 1, 2, "cream");
      r(18, 26, 1, 2, "cream");
      break;
    case "thorns": // Lifted lid, exposed zigzag spring and a bright jack's face.
      for (let y = 10; y <= 22; y++) {
        const x = 26 - Math.floor((y - 10) / 3);
        r(x, y, 5, 1, "ink");
        r(x + 1, y, 3, 1, "red");
        r(x + 1, y, 1, 1, "rose");
      }
      for (const [a, b] of [
        [
          [13, 12],
          [18, 15],
        ],
        [
          [18, 15],
          [11, 18],
        ],
        [
          [11, 18],
          [18, 21],
        ],
        [
          [18, 21],
          [14, 23],
        ],
      ]) {
        line(...a, ...b, "#503d34", 1.5);
        line(a[0], a[1] - 0.5, b[0], b[1] - 0.5, "#dbc083", 0.5);
      }
      oval(13, 8, 5, 5, "ink");
      volume(13, 8, 4, 4, "porcelain");
      r(10, 7, 1, 1, "ink");
      r(15, 7, 1, 1, "ink");
      r(12, 9, 2, 1, "red");
      r(11, 11, 4, 1, "red");
      poly(
        [
          [8, 5],
          [8.5, 1],
          [12, 3.5],
          [15.5, 1],
          [18, 5],
        ],
        "#456e7e",
      );
      poly(
        [
          [9, 4.5],
          [9, 2],
          [12.5, 4.5],
          [15.5, 2],
          [17, 4.5],
        ],
        "#8eb5aa",
      );
      volume(8.5, 1, 1, 1, "brass");
      volume(15.5, 1, 1, 1, "brass");
      r(5, 23, 21, 8, "ink");
      poly(
        [
          [5.5, 23.5],
          [9, 21.5],
          [25.5, 21.5],
          [25.5, 29],
          [23, 30],
          [5.5, 30],
        ],
        "#542e3d",
      );
      poly(
        [
          [6, 23.5],
          [9, 22],
          [25, 22],
          [22.5, 23.5],
        ],
        "#dd9a85",
      );
      bevel(6, 23.5, 17, 6.5, "red");
      poly(
        [
          [23, 23.5],
          [25, 22],
          [25, 29],
          [23, 30],
        ],
        "#763a4c",
      );
      r(9, 26, 3, 3, "gold");
      r(19, 26, 3, 3, "gold");
      r(10, 27, 1, 1, "red");
      r(20, 27, 1, 1, "red");
      r(7, 26, 1, 3, "brass");
      r(23, 26, 1, 3, "wood");
      r(10, 9, 1, 1, "rose");
      r(16, 9, 1, 1, "rose");
      r(11, 4, 4, 1, "green");
      break;
    case "magnet": // The reception bell: brass dome and dark red plinth.
      r(14, 5, 4, 5, "ink");
      r(13, 5, 6, 2, "gold");
      oval(16, 21, 10, 12, "ink");
      volume(16, 21, 9, 11, "brass");
      volume(16, 6, 3, 1.5, "brass");
      r(3, 24, 26, 6, "ink");
      volume(16, 27, 12, 3, "red");
      volume(16, 24, 10.5, 2, "brass");
      r(3, 20, 2, 1, "cream");
      r(27, 16, 2, 1, "cream");
      line(12, 13, 11, 18, "#fff0ba", 0.5);
      line(8, 22.5, 23, 22.5, "#ccab6b", 0.5);
      r(10, 28, 13, 0.5, "#b98173");
      r(14, 5, 3, 0.5, "light");
      break;
    default:
      r(7, 8, 18, 20, "ink");
      r(8, 9, 16, 17, "wood");
      r(9, 10, 14, 1, "gold");
      spark(16, 17);
  }
  ctx.restore();
}
