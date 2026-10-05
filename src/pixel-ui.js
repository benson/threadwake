// UI symbols are nine-pixel bitmap drawings, never fallback font glyphs or SVG.
const shapes = {
  credit: [
    "000010000",
    "000111000",
    "001111100",
    "011111110",
    "111111111",
    "011111110",
    "001111100",
    "000111000",
    "000010000",
  ],
  empty: [
    "000010000",
    "000101000",
    "001000100",
    "010000010",
    "100000001",
    "010000010",
    "001000100",
    "000101000",
    "000010000",
  ],
  heart: [
    "011000110",
    "111101111",
    "111111111",
    "111111111",
    "011111110",
    "001111100",
    "000111000",
    "000010000",
    "000000000",
  ],
  cross: [
    "000111000",
    "000111000",
    "000111000",
    "111111111",
    "111111111",
    "111111111",
    "000111000",
    "000111000",
    "000111000",
  ],
  pause: [
    "011000110",
    "011000110",
    "011000110",
    "011000110",
    "011000110",
    "011000110",
    "011000110",
    "011000110",
    "011000110",
  ],
  arrow: [
    "000010000",
    "000001000",
    "000000100",
    "000000010",
    "111111111",
    "000000010",
    "000000100",
    "000001000",
    "000010000",
  ],
  chevron: [
    "001000000",
    "001100000",
    "001110000",
    "001111000",
    "001111100",
    "001111000",
    "001110000",
    "001100000",
    "001000000",
  ],
  down: [
    "000000000",
    "000000000",
    "111111111",
    "011111110",
    "001111100",
    "000111000",
    "000010000",
    "000000000",
    "000000000",
  ],
  museum: [
    "000010000",
    "000111000",
    "001111100",
    "011111110",
    "000000000",
    "010010010",
    "010010010",
    "010010010",
    "111111111",
  ],
};
const gold = "#d8b775";
function paint(ctx, kind, x = 0, color = gold) {
  ctx.fillStyle = color;
  (shapes[kind] || shapes.credit).forEach((row, y) => {
    for (let col = 0; col < row.length; col++)
      if (row[col] === "1") ctx.fillRect(x + col, y, 1, 1);
  });
}
export function drawPixelIcon(canvas, kind, color = gold) {
  canvas.width = canvas.height = 9;
  paint(canvas.getContext("2d"), kind, 0, color);
}
export function pixelIcon(kind, size = 18, color = gold) {
  const canvas = document.createElement("canvas");
  canvas.className = "pixel-icon";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.width = canvas.style.height = `${size}px`;
  drawPixelIcon(canvas, kind, color);
  return canvas;
}
export function iconText(target, kind, text, color = gold) {
  const key = `${kind}:${text}:${color}`;
  if (target.dataset.pixelText === key) return;
  target.dataset.pixelText = key;
  target.replaceChildren(
    pixelIcon(kind, 18, color),
    document.createTextNode(` ${text}`),
  );
}
export function pixelMeter(target, count, maximum, color = gold) {
  count = Math.max(0, Math.min(maximum, count));
  const key = `${count}/${maximum}/${color}`;
  if (target.dataset.pixelMeter === key) return;
  target.dataset.pixelMeter = key;
  target.setAttribute("aria-label", `${count} of ${maximum}`);
  const canvas = document.createElement("canvas");
  canvas.width = maximum * 12 - 3;
  canvas.height = 9;
  canvas.className = "pixel-icon";
  canvas.style.width = `${canvas.width * 2}px`;
  canvas.style.height = "18px";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  for (let i = 0; i < maximum; i++)
    paint(ctx, i < count ? "credit" : "empty", i * 12, color);
  target.replaceChildren(canvas);
}
export function pixelTransition(target, before, after) {
  const arrow = pixelIcon("arrow", 14);
  arrow.removeAttribute("aria-hidden");
  arrow.setAttribute("role", "img");
  arrow.setAttribute("aria-label", "to");
  target.append(
    document.createTextNode(`${before} `),
    arrow,
    document.createTextNode(` ${after}`),
  );
}
export function initializePixelIcons(root = document) {
  for (const canvas of root.querySelectorAll("canvas[data-pixel-icon]"))
    drawPixelIcon(canvas, canvas.dataset.pixelIcon);
  const arrow = pixelIcon("down");
  for (const select of root.querySelectorAll("select:not([multiple])"))
    select.style.backgroundImage = `url(${arrow.toDataURL()})`;
}
export function pixelLine(
  ctx,
  x0,
  y0,
  x1,
  y1,
  color,
  width = 1,
  dashed = false,
) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0),
    sx = x0 < x1 ? 1 : -1,
    dy = -Math.abs(y1 - y0),
    sy = y0 < y1 ? 1 : -1;
  let error = dx + dy,
    step = 0;
  ctx.fillStyle = color;
  while (true) {
    if (!dashed || step % 9 < 4) ctx.fillRect(x0, y0, width, width);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twice <= dx) {
      error += dx;
      y0 += sy;
    }
    step++;
  }
}
const letters = {
  A: [14, 17, 17, 31, 17, 17, 17],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  L: [16, 16, 16, 16, 16, 16, 31],
  N: [17, 25, 25, 21, 19, 19, 17],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  0: [14, 17, 19, 21, 25, 17, 14],
  1: [4, 12, 4, 4, 4, 4, 14],
  2: [14, 17, 1, 2, 4, 8, 31],
  3: [30, 1, 1, 14, 1, 1, 30],
  4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 16, 30, 1, 1, 30],
  6: [14, 16, 16, 30, 17, 17, 14],
  7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 1, 14],
  ".": [0, 0, 0, 0, 0, 12, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
};
export function pixelText(ctx, text, x, y, scale = 1, color = "#f3e6c8") {
  ctx.fillStyle = color;
  for (const char of String(text).toUpperCase()) {
    const rows = letters[char] || letters[" "];
    rows.forEach((row, r) => {
      for (let col = 0; col < 5; col++)
        if (row & (1 << (4 - col)))
          ctx.fillRect(
            Math.round(x + col * scale),
            Math.round(y + r * scale),
            scale,
            scale,
          );
    });
    x += 6 * scale;
  }
}
