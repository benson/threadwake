// Canvas and DOM use one fixed game coordinate system. Letterboxing belongs to
// the page, never between the arena and its controls.
export const FIELD_WIDTH = 960;
export const FIELD_HEIGHT = 540;

export function fitField(width, height) {
  const scale = Math.max(
    0.01,
    Math.min(width / FIELD_WIDTH, height / FIELD_HEIGHT),
  );
  return { scale, width: FIELD_WIDTH * scale, height: FIELD_HEIGHT * scale };
}

export function installViewport(root = document.documentElement) {
  const resize = () => {
    const field = fitField(window.innerWidth, window.innerHeight);
    root.style.setProperty("--game-scale", String(field.scale));
    root.style.setProperty("--field-screen-width", `${field.width}px`);
    root.style.setProperty("--field-screen-height", `${field.height}px`);
  };
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  resize();
  return resize;
}
