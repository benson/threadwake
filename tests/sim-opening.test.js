import test from "node:test";
import assert from "node:assert/strict";
import { createGame, addPlayer, startGame, step, chooseUpgrade, snapshot } from "../src/sim.js";
import { BALANCE as B, waveDuration } from "../src/config.js";

function quiet(size = 1) {
  const s = createGame(42);
  for (let i = 0; i < size; i++) addPlayer(s, String(i));
  startGame(s);
  s.enemies = []; s.flowers = []; s._spawn = s._flower = 100; s._opening = 2;
  for (const p of s.players) p._fire = 100;
  return s;
}

test("the opening transitions at its actual 38-second duration, later waves retain 65 seconds", () => {
  const s = quiet();
  assert.equal(s.waveDuration, 38);
  for (let i = 0; i < 1139; i++) step(s, {});
  assert.equal(s.phase, "playing");
  while (s.phase === "playing") step(s, {});
  assert.ok(s.waveTime >= waveDuration(1) && s.waveTime < waveDuration(1) + 1 / 30 + 1e-6);
  assert.equal(s.phase, "draft");
  chooseUpgrade(s, "0", s.choices["0"][0]);
  assert.equal(s.waveDuration, 65);
  assert.equal(s.waveDuration, waveDuration(2));
});

test("the paced opening introduces catchable shots early and remains fair to basic moving parties", () => {
  for (const size of [1, 2, 4]) {
    const s = createGame(42);
    for (let i = 0; i < size; i++) addPlayer(s, String(i));
    startGame(s);
    let firstEnemy = Infinity, firstShot = Infinity;
    for (let tick = 0; tick < 1200 && s.phase === "playing"; tick++) {
      const inputs = {};
      for (const [i, p] of s.players.entries()) {
        const angle = s.time * 0.3 + i * 0.7;
        inputs[p.id] = { x: (600 + Math.cos(angle) * 330 - p.x) / 35,
          y: (400 + Math.sin(angle) * 220 - p.y) / 35, cast: tick % 170 === 0 };
      }
      step(s, inputs);
      if (s.enemies.length) firstEnemy = Math.min(firstEnemy, s.waveTime);
      if (s.shots.some((b) => b.hostile) || s.caught) firstShot = Math.min(firstShot, s.waveTime);
    }
    assert.ok(firstEnemy < 1, `${size}p meets a creature in the first second`);
    assert.ok(firstShot < 8, `${size}p encounters the thread mechanic before eight seconds`);
    assert.equal(s.phase, "draft", `${size}p basic movement completes the opening`);
    assert.ok(s.players.some((p) => p.hp > p.maxHp * 0.5), `${size}p retains recovery room`);
    assert.ok(s.caught > 0, `${size}p practiced an actual catch`);
  }
});

test("public footsteps are bounded, chronological genuine samples of the last three seconds", () => {
  const s = quiet(), p = s.players[0];
  for (let i = 0; i < 110; i++) step(s, { 0: { x: 1 } });
  assert.ok(p.footsteps.length >= 12 && p.footsteps.length <= 18);
  for (const [i, q] of p.footsteps.entries()) {
    assert.ok(q.age >= 0 && q.age <= B.historySeconds);
    assert.ok(p._history.some((h) => h.x === q.x && h.y === q.y), "every footprint must have actually happened");
    if (i) assert.ok(p.footsteps[i - 1].age >= q.age);
  }
  assert.ok(p.footsteps.some((q) => q.x === p.echoPreview.x && q.y === p.echoPreview.y));
  assert.equal(p.footsteps.at(-1).age, 0);
  assert.equal(snapshot(s).players[0].footsteps.length, p.footsteps.length);
});

test("preview and actual anchor agree for stationary, moving and looped histories", () => {
  for (const policy of ["stationary", "moving", "loop"]) {
    const s = quiet(), p = s.players[0];
    if (policy === "moving") for (let i = 0; i < 75; i++) step(s, { 0: { x: 1 } });
    if (policy === "loop") p._history = [
      { x: p.x, y: p.y, t: s.time - 2 },
      { x: p.x - 180, y: p.y, t: s.time - 1 },
      { x: p.x, y: p.y, t: s.time },
    ];
    step(s, {});
    assert.equal(p.echoPreview.ready, true);
    step(s, { 0: { cast: true } });
    const e = s.echoes[0];
    assert.equal(e.x, p.echoPreview.x, `${policy} preview shares the cast anchor`);
    assert.equal(e.y, p.echoPreview.y);
    assert.equal(e.projected, p.echoPreview.projected);
    assert.equal(p.echoPreview.ready, false);
    assert.ok(Math.abs(p.echoPreview.length - Math.hypot(e.x - p.x, e.y - p.y)) < 1e-6);
    if (policy === "stationary") assert.ok(!p.footsteps.some((q) => q.x === e.x && q.y === e.y));
  }
});

test("fallen players' historical footsteps fade away and their preview stays unavailable", () => {
  const s = quiet(2), p = s.players[0];
  for (let i = 0; i < 30; i++) step(s, { 0: { y: 1 } });
  p.dead = true; p.hp = 0;
  s.players[1].y = 100;
  for (let i = 0; i < 100; i++) step(s, {});
  assert.equal(p.dead, true);
  assert.deepEqual(p.footsteps, []);
  assert.equal(p.echoPreview.ready, false);
});

test("actual friendly volleys preserve their full state through JSON recovery", () => {
  const s = quiet(), p = s.players[0];
  s.enemies = [{ id: 2000, type: "mite", x: p.x + 250, y: p.y, hp: 1000,
    maxHp: 1000, r: 10, hit: 0, phase: 0, _fire: 100, slow: 0 }];
  p._fire = 0; step(s, {});
  assert.ok(s.shots.some((b) => !b.hostile));
  const recovered = JSON.parse(JSON.stringify(s));
  assert.deepEqual(s.shots, recovered.shots, "shot provenance cannot contain undefined fields");
  for (let i = 0; i < 60; i++) { step(s, { 0: { x: -1 } }); step(recovered, { 0: { x: -1 } }); }
  assert.deepEqual(s, recovered);
});
