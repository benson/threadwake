import test from "node:test";
import assert from "node:assert/strict";
import { drawActor, drawFlower } from "../src/art.js";

function marks(kind, x, y) {
  const rectangles = [];
  const ctx = {
    _pixelRatio: 2,
    globalAlpha: 1,
    fillRect: (...r) => rectangles.push([...r, ctx.fillStyle, ctx.globalAlpha]),
  };
  const actor = {
    id: 5,
    x,
    y,
    type: ["custodian", "conservator", "guard"].includes(kind)
      ? undefined
      : kind,
    character: kind,
    aimX: 1,
    aimY: 0,
    face: 1,
    vx: 0,
    vy: 0,
    hp: 100,
    hit: 0,
    castAge: 999,
    shotAge: 999,
    charge: 0.2,
    upgrades: [],
  };
  if (kind === "cart") drawFlower(ctx, actor, 0);
  else drawActor(ctx, actor, 0);
  return rectangles;
}

test("a one-pixel move translates bodies, shadows and weapon sockets together", () => {
  for (const kind of [
    "custodian",
    "conservator",
    "guard",
    "soldier",
    "mite",
    "moth",
    "thorn",
    "warden",
    "cart",
  ]) {
    const base = marks(kind, 100, 100);
    for (const axis of [0, 1]) {
      const moved = marks(
        kind,
        100 + (axis === 0 ? 0.5 : 0),
        100 + (axis === 1 ? 0.5 : 0),
      );
      const expected = base.map((r) =>
        r.map((v, i) => (i === axis ? v + 0.5 : v)),
      );
      assert.equal(
        moved.length,
        expected.length,
        `${kind} drawing changed shape`,
      );
      for (let i = 0; i < expected.length; i++)
        assert.deepEqual(
          moved[i],
          expected[i],
          `${kind} ${axis ? "vertical" : "horizontal"} mark ${i}`,
        );
    }
  }
});
