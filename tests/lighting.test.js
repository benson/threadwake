import test from "node:test";
import assert from "node:assert/strict";
import {
  collectLights,
  lightStrength,
  createLighting,
} from "../src/lighting.js";
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

test("cached light rasters match traced occlusion and bounce hemispheres", () => {
  const original = globalThis.document;
  globalThis.document = {
    createElement() {
      const canvas = { width: 0, height: 0, drawn: [] };
      const ctx = {
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (data) => {
          canvas.bitmap = data;
        },
        clearRect() {},
        drawImage: (source) => canvas.drawn.push(source),
      };
      canvas.getContext = () => ctx;
      return canvas;
    },
  };
  try {
    for (const obstacles of [[], [{ x: 20, y: -12, w: 8, h: 40 }]])
      for (const bounce of [false, true]) {
        const light = {
          x: 10,
          y: 12,
          radius: 48,
          power: 0.5,
          color: [244, 178, 88],
          bounce,
          normalX: 1,
          normalY: 0,
        };
        let exposure;
        const ctx = {
          save() {},
          restore() {},
          fillRect() {},
          drawImage: (canvas) => {
            exposure = canvas;
          },
        };
        createLighting().illuminate(
          ctx,
          { id: "test", obstacles },
          [light],
          -100,
          -100,
        );
        const field = exposure.drawn[0];
        for (let row = 0; row < field.height; row++)
          for (let col = 0; col < field.width; col++) {
            const expected = Math.round(
              lightStrength(
                light,
                light.x - 48 + col * 2,
                light.y - 48 + row * 2,
                obstacles,
              ) * 255,
            );
            assert.equal(
              field.bitmap.data[(row * field.width + col) * 4 + 3],
              expected,
              `${bounce} ${col},${row}`,
            );
          }
      }
  } finally {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  }
});
