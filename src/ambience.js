// Shared physical location for the walkable water, wakes and spatial audio.
export const WATER_POOL = Object.freeze({ x: 600, y: 405, rx: 82, ry: 50 });
export function inWater(mapId, x, y) {
  return (
    mapId === "sculpture_court" &&
    ((x - WATER_POOL.x) / WATER_POOL.rx) ** 2 +
      ((y - WATER_POOL.y) / WATER_POOL.ry) ** 2 <
      1
  );
}
