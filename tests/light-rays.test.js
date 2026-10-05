import test from "node:test";
import assert from "node:assert/strict";
import {
  raycastObstacles,
  segmentHit,
  collectBounceLights,
  buildShaftField,
} from "../src/light-rays.js";

test("ray finds the nearest face and outward normal regardless of rectangle order", () => {
  const boxes = [
    { id: "far", x: 40, y: -10, w: 10, h: 20 },
    { id: "near", x: 20, y: -10, w: 10, h: 20 },
  ];
  const hit = raycastObstacles(boxes, 0, 0, 4, 0, 100);
  assert.equal(hit.obstacle.id, "near");
  assert.equal(hit.distance, 20);
  assert.deepEqual([hit.x, hit.y, hit.normalX, hit.normalY], [20, 0, -1, 0]);
  assert.equal(raycastObstacles(boxes, 0, 11, 1, 0, 100), null);
  assert.equal(raycastObstacles(boxes, 0, 0, 1, 0, 19), null);
  assert.equal(segmentHit(boxes, { x: 0, y: 0 }, { x: 20, y: 0 }).distance, 20);
  assert.equal(raycastObstacles(boxes, 0, 0, 0, 0), null);
});

test("inside rays report exit faces explicitly and vertical rays have correct normals", () => {
  const boxes = [{ x: 20, y: 20, w: 10, h: 10 }];
  const inside = raycastObstacles(boxes, 25, 25, 0, -3, 100);
  assert.equal(inside.inside, true);
  assert.equal(inside.distance, 5);
  assert.deepEqual([inside.normalX, inside.normalY], [0, -1]);
  const below = raycastObstacles(boxes, 25, 40, 0, -1, 100);
  assert.deepEqual([below.y, below.normalX, below.normalY], [30, 0, 1]);
});

test("diffuse bounce stays outside the receiving near face and cannot emit from an occluded far case", () => {
  const map = {
    id: "antiquities",
    obstacles: [
      { id: "near", x: 20, y: -20, w: 10, h: 40 },
      { id: "hidden", x: 45, y: -15, w: 10, h: 30 },
    ],
  };
  const direct = [
      { x: 0, y: 0, radius: 150, power: 0.8, color: [255, 220, 160] },
    ],
    before = JSON.stringify({ map, direct });
  const bounced = collectBounceLights(map, direct);
  assert.ok(bounced.length > 0);
  assert.ok(bounced.every((l) => l.sourceObstacle === "near"));
  for (const light of bounced) {
    assert.ok(light.x < 20);
    assert.equal(light.normalX, -1);
    assert.equal(light.normalY, 0);
    assert.ok(light.power < direct[0].power);
    assert.ok(light.radius <= 96);
    assert.ok(light.bounce);
  }
  assert.equal(JSON.stringify({ map, direct }), before);
  assert.deepEqual(bounced, collectBounceLights(map, direct));
  assert.deepEqual(collectBounceLights(map, bounced), []);
  assert.deepEqual(collectBounceLights(map, [{ ...direct[0], x: 25 }]), []);
});

test("bounce work has a four-light cap and preserves material tint", () => {
  const obstacles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 20 + i * 45,
    y: 20,
    w: 20,
    h: 20,
    kind: i % 2 ? "plinth" : "case",
  }));
  const lights = obstacles.map((o) => ({
    x: o.x + 10,
    y: 0,
    radius: 100,
    power: 0.8,
    color: [255, 255, 255],
  }));
  const bounce = collectBounceLights(
    { id: "clock_gallery", obstacles },
    lights,
  );
  assert.ok(bounce.length <= 4);
  assert.ok(bounce.length > 0);
  assert.ok(bounce.some((l) => l.color[0] !== l.color[2]));
});

test("a bounce offset cannot cross a narrow gap into the neighboring solid", () => {
  const map = {
    id: "antiquities",
    obstacles: [
      { x: 16, y: -20, w: 2, h: 40 },
      { x: 20, y: -20, w: 10, h: 40 },
    ],
  };
  const bounced = collectBounceLights(map, [
    { x: 19, y: 0, radius: 100, power: 0.8, color: [255, 255, 255] },
  ]);
  assert.deepEqual(bounced, []);
});

test("window rays stop on the first obstacle, with a mullion cut and visible floor beyond the center", () => {
  const aperture = [
      {
        x: 100,
        top: -106,
        bottom: -24,
        width: 24,
        slope: 0,
        color: [150, 180, 210],
      },
    ],
    clear = buildShaftField({ obstacles: [] }, aperture),
    blocked = buildShaftField(
      { obstacles: [{ x: 50, y: 80, w: 100, h: 20 }] },
      aperture,
    ),
    alpha = (field, x, y) =>
      field.data[
        (Math.floor(y / field.cell) * field.width +
          Math.floor(x / field.cell)) *
          4 +
          3
      ];
  assert.ok(alpha(clear, 110, 40) > 0);
  assert.ok(alpha(blocked, 110, 40) > 0);
  assert.ok(alpha(clear, 110, 150) > 0);
  assert.equal(alpha(blocked, 110, 150), 0);
  assert.equal(alpha(clear, 100, 150), 0);
  assert.ok(alpha(clear, 110, 380) > 0);
  let maximum = 0;
  for (let i = 3; i < clear.data.length; i += 4)
    maximum = Math.max(maximum, clear.data[i]);
  assert.ok(maximum <= 77);
});
