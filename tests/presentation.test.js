import test from "node:test";
import assert from "node:assert/strict";
import { capturePresentation, presentState } from "../src/presentation.js";
import { TICK_RATE, WORLD } from "../src/config.js";

const STEP = 1 / TICK_RATE;
function world() {
  return {
    version: 2,
    seed: 1,
    runNumber: 1,
    phase: "playing",
    wave: 1,
    time: 1,
    tick: 30,
    players: [
      {
        id: "a",
        x: 600,
        y: 400,
        vx: 155,
        vy: 0,
        speed: 155,
        face: 1,
        hp: 110,
        dead: false,
        castAge: 999,
        castCooldown: 0,
        orbitPhase: 2.7,
        _history: [{ x: 500, y: 400 }],
        footsteps: [{ x: 500, y: 400, age: 1 }],
        echoPreview: { x: 500, y: 400, ready: true },
        stats: { catches: 1 },
      },
    ],
    enemies: [
      { id: 2, type: "moth", x: 300, y: 400, hp: 38, phase: 1, fireIn: 1 },
    ],
    shots: [
      {
        id: 3,
        owner: "a",
        hostile: false,
        x: 610,
        y: 400,
        vx: 360,
        vy: 0,
        life: 2,
      },
    ],
    echoes: [{ id: 4, owner: "a", x: 500, y: 400, life: 7, maxLife: 7.2 }],
    effects: [
      { id: 5, type: "cast", x: 600, y: 400, life: 0.2, maxLife: 0.35 },
    ],
    flowers: [{ id: 6, x: 400, y: 400, charge: 0.28 }],
    choices: {},
    stats: { catches: 1 },
  };
}
function pair() {
  const current = world(),
    previous = capturePresentation(current);
  current.time += STEP;
  current.tick++;
  current.players[0].x += 155 * STEP;
  current.players[0].orbitPhase += 2.7 * STEP;
  current.enemies[0].x += 39 * STEP;
  current.enemies[0].phase += STEP;
  current.shots[0].x += 360 * STEP;
  current.echoes[0].x += 2;
  return { previous, current };
}

test("capture retains immutable motion values without copying simulation history", () => {
  const current = world(),
    before = capturePresentation(current);
  current.players[0].x += 50;
  current.players[0]._history.push({ x: 650, y: 400 });
  assert.equal(before.players[0].x, 600);
  assert.ok(!("_history" in before.players[0]));
  assert.ok(!("footsteps" in before.players[0]));
  assert.ok(!("stats" in before.players[0]));
  assert.ok(!("flowers" in before));
});

test("all moving groups interpolate with bounded alpha while gameplay values stay current", () => {
  const { previous, current } = pair();
  current.players[0].hp = 90;
  current.players[0].stats.catches = 2;
  current.enemies[0].hp = 12;
  current.enemies[0].stage = 2;
  const view = presentState(previous, current, { alpha: 0.5 });
  for (const key of ["players", "enemies", "shots", "echoes"])
    assert.ok(
      Math.abs(view[key][0].x - (previous[key][0].x + current[key][0].x) / 2) <
        1e-6,
    );
  assert.equal(view.players[0].hp, 90);
  assert.equal(view.players[0].stats.catches, 2);
  assert.equal(view.enemies[0].stage, 2);
  assert.equal(view.players[0].echoPreview, current.players[0].echoPreview);
  assert.equal(view.players[0].footsteps, current.players[0].footsteps);
  assert.equal(
    presentState(previous, current, { alpha: -5 }).enemies[0].x,
    previous.enemies[0].x,
  );
  assert.equal(
    presentState(previous, current, { alpha: 500 }).enemies[0].x,
    current.enemies[0].x,
  );
});

test("optional network prediction uses current position plus bounded lead", () => {
  const { previous, current } = pair(),
    p = current.players[0];
  const view = presentState(previous, current, {
    alpha: 0.1,
    localId: "a",
    input: { x: -1, y: 0 },
    leadSeconds: STEP / 2,
  });
  assert.equal(view.players[0].x, p.x - (155 * STEP) / 2);
  assert.equal(view.players[0].vx, -155);
  assert.equal(view.players[0].face, -1);
  assert.ok(view.enemies[0].x < current.enemies[0].x);
  assert.equal(p.vx, 155, "presentation cannot change the simulated heading");
  assert.equal(p.face, 1);
});

test("visual prediction normalizes diagonal input and shares the simulation's 18px bounds", () => {
  const { previous, current } = pair();
  let view = presentState(previous, current, {
    localId: "a",
    input: { x: 999, y: 999 },
    leadSeconds: 9,
  });
  const p = current.players[0],
    q = view.players[0];
  assert.ok(Math.abs(Math.hypot(q.x - p.x, q.y - p.y) - p.speed * STEP) < 1e-6);
  assert.ok(Math.abs(Math.hypot(q.vx, q.vy) - p.speed) < 1e-6);
  current.players[0].x = previous.players[0].x = WORLD.width - 18;
  current.players[0].y = previous.players[0].y = 18;
  view = presentState(previous, current, {
    localId: "a",
    input: { x: 1, y: -1 },
    leadSeconds: STEP,
  });
  assert.equal(view.players[0].x, WORLD.width - 18);
  assert.equal(view.players[0].y, 18);
});

test("current membership handles spawn and removal immediately without ghost bodies or shots", () => {
  const { previous, current } = pair();
  current.enemies = [{ id: 99, type: "thorn", x: 200, y: 300, hp: 70 }];
  current.shots = [];
  current.echoes = [];
  const view = presentState(previous, current, { alpha: 0 });
  assert.deepEqual(view.enemies, current.enemies);
  assert.deepEqual(view.shots, []);
  assert.deepEqual(view.echoes, []);
});

test("teleports, deaths and revives show the current body instead of a swept transition", () => {
  for (const transition of ["teleport", "death", "revive"]) {
    const { previous, current } = pair();
    if (transition === "teleport") current.players[0].x = 100;
    if (transition === "death") {
      current.players[0].dead = true;
      current.players[0].hp = 0;
    }
    if (transition === "revive") previous.players[0].dead = true;
    const view = presentState(previous, current, {
      alpha: 0,
      localId: "a",
      leadSeconds: STEP,
    });
    assert.equal(view.players[0].x, current.players[0].x, transition);
    assert.equal(view.players[0].dead, current.players[0].dead);
  }
});

test("wave, run, seed and version changes never blend unrelated snapshots", () => {
  for (const key of ["wave", "runNumber", "seed", "version"]) {
    const { previous, current } = pair();
    current[key]++;
    const view = presentState(previous, current, { alpha: 0 });
    assert.equal(view.players[0].x, current.players[0].x, key);
    assert.equal(view.shots[0].x, current.shots[0].x, key);
  }
});

test("presentation freezes in pause and nonplaying phases", () => {
  const { previous, current } = pair();
  assert.equal(
    presentState(previous, current, { paused: true, leadSeconds: STEP }),
    current,
  );
  for (const phase of ["draft", "won", "lost", "lobby"]) {
    current.phase = phase;
    assert.equal(
      presentState(previous, current, { leadSeconds: STEP }),
      current,
    );
  }
});

test("the render clock and cast advance smoothly while cooldown and idle sentinel stay authoritative", () => {
  const { previous, current } = pair();
  current.players[0].castAge = 0;
  current.players[0].castCooldown = 5.5;
  const view = presentState(previous, current, {
    alpha: 0.5,
    leadSeconds: STEP / 2,
  });
  assert.equal(view.time, current.time + STEP / 2);
  assert.equal(
    view.players[0].castAge,
    STEP / 2,
    "a new cast starts from its reset, not the old sentinel",
  );
  assert.equal(view.players[0].castCooldown, 5.5);
  assert.ok(
    Math.abs(
      view.players[0].orbitPhase -
        current.players[0].orbitPhase -
        (2.7 * STEP) / 2,
    ) < 1e-6,
  );
  current.players[0].castAge = 999;
  assert.equal(
    presentState(previous, current, { leadSeconds: STEP }).players[0].castAge,
    999,
  );
});

test("snapshot gaps and malformed presentation timing cannot create unbounded motion", () => {
  const { previous, current } = pair();
  const view = presentState(previous, current, {
    alpha: NaN,
    leadSeconds: Infinity,
  });
  assert.equal(view.players[0].x, current.players[0].x);
  assert.equal(view.time, current.time);
  current.time += 3;
  assert.equal(
    presentState(previous, current, { alpha: 0 }).players[0].x,
    current.players[0].x,
  );
  const bounded = presentState(previous, current, {
    leadSeconds: 100,
    maxLeadSeconds: 100,
  });
  assert.equal(bounded.time, current.time + 0.1);
});

test("presentation never writes to current state, captured history or simulation arrays", () => {
  const { previous, current } = pair();
  const before = structuredClone(current),
    captured = structuredClone(previous);
  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  freeze(previous);
  freeze(current);
  const view = presentState(previous, current, {
    alpha: 0.5,
    localId: "a",
    leadSeconds: STEP,
  });
  assert.notEqual(view, current);
  assert.notEqual(view.players[0], current.players[0]);
  assert.deepEqual(current, before);
  assert.deepEqual(previous, captured);
});

test("optional prediction fills repeated 30Hz simulation frames with bounded local movement", () => {
  const current = world();
  current.time = 0;
  current.tick = 0;
  let previous = null,
    accumulator = 0,
    repeats = 0,
    visualRepeats = 0;
  let lastSimulation = null,
    lastVisual = null;
  for (let frame = 0; frame < 120; frame++) {
    accumulator += 1 / 120;
    while (accumulator + 1e-9 >= STEP) {
      previous = capturePresentation(current);
      current.time += STEP;
      current.tick++;
      current.players[0].x += 155 * STEP;
      accumulator = Math.max(0, accumulator - STEP);
    }
    const view = presentState(previous, current, {
      alpha: accumulator / STEP,
      leadSeconds: accumulator,
      localId: "a",
      input: { x: 1, y: 0 },
    });
    const actual = current.players[0].x,
      displayed = view.players[0].x;
    if (actual === lastSimulation) repeats++;
    if (displayed === lastVisual) visualRepeats++;
    assert.ok(displayed >= actual && displayed - actual <= 155 * STEP + 1e-6);
    lastSimulation = actual;
    lastVisual = displayed;
  }
  assert.equal(current.tick, 30, "simulation cadence stays authoritative");
  assert.equal(repeats, 89);
  assert.ok(
    visualRepeats <= 2,
    `only startup may repeat, got ${visualRepeats}`,
  );
});

test("solo interpolation stops without a backwards correction and reverses monotonically", () => {
  const current = world();
  current.time = 0;
  current.tick = 0;
  let previous = null,
    accumulator = 0,
    lastVisual = current.players[0].x;
  let stoppedAt = null;
  for (let frame = 0; frame < 120; frame++) {
    // A release after sustained movement, then a reversal after resting. The
    // simulated position changes only at 30Hz; presentation runs at 120Hz.
    const direction = frame < 40 ? 1 : frame < 80 ? 0 : -1;
    accumulator += 1 / 120;
    while (accumulator + 1e-9 >= STEP) {
      previous = capturePresentation(current);
      current.time += STEP;
      current.tick++;
      current.players[0].vx = direction * 155;
      current.players[0].x += current.players[0].vx * STEP;
      accumulator = Math.max(0, accumulator - STEP);
    }
    const view = presentState(previous, current, {
      alpha: accumulator / STEP,
      leadSeconds: accumulator,
      localId: null,
    });
    const actual = current.players[0].x,
      displayed = view.players[0].x;
    if (frame < 80)
      assert.ok(
        displayed >= lastVisual - 1e-6,
        `release must never correct backwards: frame ${frame}, ${lastVisual}→${displayed}`,
      );
    else
      assert.ok(
        displayed <= lastVisual + 1e-6,
        `reversal must continue smoothly: frame ${frame}, ${lastVisual}→${displayed}`,
      );
    assert.ok(
      Math.abs(displayed - actual) <= 155 * STEP + 1e-6,
      "interpolation delay stays within one simulation tick",
    );
    if (frame >= 48 && frame < 80) {
      stoppedAt ??= displayed;
      assert.equal(displayed, stoppedAt, "stopped presentation stays fixed");
      assert.equal(
        displayed,
        actual,
        "release settles at the actual endpoint without overshoot",
      );
    }
    lastVisual = displayed;
  }
  assert.equal(current.tick, 30);
  assert.ok(lastVisual < stoppedAt, "reversal actually moves left");
});
