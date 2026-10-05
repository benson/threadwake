import {
  beetleMotion,
  drawEnemyBody,
  drawEnemyDetails,
  shadow,
} from "./art.js";

const SIZE = 42,
  X = 21,
  Y = 34,
  LIMIT = 128;

// Reuse the exact production drawing while its authored pose is unchanged.
// Transparent contact shadows and aimed emitters stay live: compositing either
// into a sprite could change alpha rounding or move a weapon off its socket.
export function createSpriteCache(scale = 2) {
  const entries = new Map();
  function frame(actor, time, settings) {
    const hit = actor.hit > 0 || settings.state === "hit";
    if (actor.type === "mite" && time >= 0) {
      const motion = beetleMotion(actor, time);
      return `mite:${motion.hop}:${motion.step % 2}:${hit}`;
    }
    if (actor.type === "moth")
      return `moth:${actor.id || 0}:${Math.floor(time * 12)}:${actor.fireIn < 0.65}:${hit}`;
    return null;
  }
  function draw(ctx, actor, time, settings = {}) {
    const key = frame(actor, time, settings);
    if (key === null) return false;
    let sprite = entries.get(key);
    if (sprite) {
      entries.delete(key);
      entries.set(key, sprite);
    } else {
      if (entries.size === LIMIT) {
        const oldest = entries.keys().next().value;
        sprite = entries.get(oldest);
        entries.delete(oldest);
        sprite.ctx.clearRect(0, 0, SIZE, SIZE);
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SIZE * scale;
        const context = canvas.getContext("2d");
        context.scale(scale, scale);
        context._pixelRatio = scale;
        context.imageSmoothingEnabled = false;
        sprite = { canvas, ctx: context };
      }
      drawEnemyBody(sprite.ctx, { ...actor, x: X, y: Y }, time, {
        ...settings,
        omitShadow: true,
      });
      entries.set(key, sprite);
    }
    const x = Math.round(actor.x * scale) / scale,
      y = Math.round(actor.y * scale) / scale;
    shadow(ctx, x, y, actor.type === "moth" ? 10 : 9);
    ctx.drawImage(sprite.canvas, x - X, y - Y, SIZE, SIZE);
    drawEnemyDetails(ctx, actor, time, settings);
    return true;
  }
  return { draw };
}
