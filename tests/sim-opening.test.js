import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  startGame,
  step,
  chooseUpgrade,
} from "../src/sim.js";
import { waveDuration } from "../src/config.js";

test("the first shift introduces enemies immediately and advances at 38 seconds with level drafts during combat", () => {
  const s = createGame(42);
  addPlayer(s, "a");
  startGame(s);
  let firstEnemy = 0,
    firstShot = 0;
  for (let i = 0; i < 1180 && s.wave === 1; i++) {
    if (s.phase === "draft") { chooseUpgrade(s, "a", s.choices.a[0]); continue; }
    const p = s.players[0],
      angle = s.time * 0.3;
    step(s, {
      a: {
        x: (600 + Math.cos(angle) * 180 - p.x) / 35,
        y: (400 + Math.sin(angle) * 80 - p.y) / 35,
        cast: true,
      },
    });
    if (!firstEnemy && s.enemies.length) firstEnemy = s.time;
    if (!firstShot && s.shots.some((b) => b.hostile)) firstShot = s.time;
  }
  assert.ok(firstEnemy <= 1);
  assert.ok(firstShot <= 8);
  assert.equal(s.phase, "playing");
  assert.ok(s.time >= 38 && s.time < 38.04);
  assert.equal(s.wave, 2);
  assert.equal(s.players[0].wavesSurvived, 1);
  assert.ok(s.players[0].hp > 0);
  assert.equal(s.waveDuration, waveDuration(2));
  s._spawn = 1000;
  s._flower = 1000;
  s.enemies = [];
  s.flowers = [];
  s.pickups = [];
  for (let i = 0; i < 1949; i++) step(s, {});
  assert.equal(s.phase, "playing");
  step(s, {});
  step(s, {});
  assert.equal(s.phase, "playing");
  assert.equal(s.wave, 3);
  assert.ok(s.waveTime < .04);
});
test("late staff earn only shifts with meaningful participation", () => {
  const s = createGame(42);
  addPlayer(s, "a");
  startGame(s);
  s.waveTime = 37;
  addPlayer(s, "late");
  s.players[0]._waveTime = 37;
  s._spawn = s._flower = 100;
  for (let i = 0; i < 31; i++) step(s, {});
  assert.equal(s.phase, "playing");
  assert.equal(s.wave, 2);
  assert.equal(s.players[0].wavesSurvived, 1);
  assert.equal(s.players[1].wavesSurvived, 0);
});
