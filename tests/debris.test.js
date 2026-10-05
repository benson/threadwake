import test from "node:test";
import assert from "node:assert/strict";
import { debrisFrame } from "../src/debris.js";

test("debris replays exactly and remains above its floor through bounce and settle", () => {
  const effect = { id: 17, type: "death", x: 600, y: 400, maxLife: 1 };
  assert.deepEqual(debrisFrame(effect, 0.37), debrisFrame(effect, 0.37));
  assert.notDeepEqual(
    debrisFrame(effect, 0.37),
    debrisFrame({ ...effect, id: 18 }, 0.37),
  );
  const initial = debrisFrame(effect, 0);
  const lifted = debrisFrame(effect, 0.1).some(
    (p, i) => p.z > initial[i].z + 2,
  );
  let bounced = false;
  for (let t = 0; t <= 1; t += 0.01)
    for (const p of debrisFrame(effect, t)) {
      assert.ok(
        Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.spin),
      );
      assert.ok(p.z >= 0);
      bounced ||= p.bounce > 0 && p.z > 0;
    }
  assert.ok(lifted && bounced, "pieces launch and rebound above the floor");
  for (const p of debrisFrame(effect, 1)) {
    assert.equal(p.z, 0);
    assert.equal(p.settled, true);
    assert.equal(p.alpha, 0);
  }
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(
    distance(debrisFrame(effect, 0.95)[0], debrisFrame(effect, 1)[0]) <
      distance(debrisFrame(effect, 0.05)[0], debrisFrame(effect, 0.1)[0]) * 0.1,
  );
});

test("fragment budgets and expiry remain bounded", () => {
  for (const [type, maxLife, count] of [
    ["death", 1, 8],
    ["chip", 0.8, 4],
    ["hit", 0.2, 8],
  ]) {
    const effect = { id: 9, type, x: 0, y: 0, maxLife };
    assert.equal(debrisFrame(effect, 0.1).length, count);
    assert.deepEqual(
      debrisFrame(effect, maxLife + 100),
      debrisFrame(effect, maxLife),
    );
  }
});
