import test from "node:test";
import assert from "node:assert/strict";
import { collectLights, lightStrength } from "../src/lighting.js";
import { pixel, line } from "../src/art.js";
import { inWater, WATER_POOL } from "../src/ambience.js";

test("a case shadows the floor behind it without blacking out the receiving case", () => {
  const lamp = { x: 0, y: 0, radius: 100 };
  const obstacles = [{ x: 20, y: -10, w: 10, h: 20 }];
  assert.ok(
    lightStrength(lamp, 50, 0, obstacles) < lightStrength(lamp, 50, 0) * 0.2,
  );
  assert.equal(
    lightStrength(lamp, 25, 0, obstacles),
    lightStrength(lamp, 25, 0),
  );
  assert.equal(lightStrength(lamp, 101, 0, obstacles), 0);
  assert.ok(lightStrength(lamp, 0, 40, obstacles) > 0);
});

test("lighting snapshots are deterministic, bounded and calmer with reduced motion", () => {
  const state = {
    players: [],
    flowers: [],
    effects: Array.from({ length: 80 }, (_, id) => ({
      id,
      type: "storm",
      x: 600 + id,
      y: 400,
      life: 0.35,
      maxLife: 0.35,
    })),
  };
  const snapshot = JSON.stringify(state),
    normal = collectLights(state),
    calm = collectLights(state, true);
  assert.deepEqual(normal, collectLights(state));
  assert.ok(normal.length <= 17);
  assert.ok(
    Math.max(...calm.map((l) => l.power)) <
      Math.max(...normal.map((l) => l.power)),
  );
  assert.equal(JSON.stringify(state), snapshot);
});

test("fine raster preserves half-unit geometry as complete physical pixels", () => {
  const rectangles = [],
    ctx = { _pixelRatio: 2, fillRect: (...r) => rectangles.push(r) };
  pixel(ctx, 0.5, 1, 0.5, 0.5, "white");
  assert.deepEqual(rectangles[0], [0.5, 1, 0.5, 0.5]);
  line(ctx, 0, 0, 2, 1, "white", 0.5);
  assert.ok(rectangles.every((r) => r.every((v) => Number.isInteger(v * 2))));
  assert.ok(rectangles.slice(1).some((r) => r[0] === 0.5));
});

test("water audio and wakes share the walkable reflecting pool footprint", () => {
  assert.equal(inWater("sculpture_court", WATER_POOL.x, WATER_POOL.y), true);
  assert.equal(inWater("antiquities", WATER_POOL.x, WATER_POOL.y), false);
  assert.equal(
    inWater("sculpture_court", WATER_POOL.x + WATER_POOL.rx + 1, WATER_POOL.y),
    false,
  );
});
