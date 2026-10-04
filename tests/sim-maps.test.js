import test from "node:test";
import assert from "node:assert/strict";
import {
  MAPS,
  mapById,
  mapForWave,
  isBlocked,
  safePosition,
  moveInMap,
  coverHit,
  steerAroundCover,
} from "../src/maps.js";
import {
  createGame,
  addPlayer,
  startGame,
  step,
  chooseUpgrade,
} from "../src/sim.js";

const run = () => {
  const s = createGame(24);
  addPlayer(s, "a");
  startGame(s);
  s._spawn = s._flower = 100;
  s._opening = 2;
  s.flowers = [];
  s.players[0]._fire = 100;
  return s;
};
const enemy = (id, x, y) => ({
  id,
  type: "mite",
  x,
  y,
  hp: 500,
  maxHp: 500,
  r: 10,
  hit: 0,
  phase: 0,
  slow: 0,
  stagger: 100,
  _fire: 100,
});
const shot = (id, x, y, vx, hostile) => ({
  id,
  owner: "a",
  source: null,
  x,
  y,
  vx,
  vy: 0,
  hostile,
  damage: 20,
  pierce: 0,
  r: 3,
  life: 10,
  color: 0,
  _hits: [],
});

test("four galleries have distinct playable plans and safe party/exhibit placement", () => {
  assert.deepEqual(
    MAPS.map((m) => m.id),
    ["antiquities", "natural_history", "sculpture_court", "clock_gallery"],
  );
  assert.equal(new Set(MAPS.map((m) => JSON.stringify(m.obstacles))).size, 4);
  for (const map of MAPS) {
    for (const wave of map.waves) assert.equal(mapForWave(wave), map);
    for (let color = 0; color < 4; color++)
      assert.equal(
        isBlocked(
          map,
          { x: map.spawn.x + (color - 1.5) * 30, y: map.spawn.y },
          10,
        ),
        false,
      );
    for (const o of map.obstacles)
      assert.equal(
        isBlocked(
          map,
          safePosition(map, { x: o.x + o.w / 2, y: o.y + o.h / 2 }, 29),
          29,
        ),
        false,
      );
  }
});
test("rounded actor and projectile corners agree with visible rectangular cover", () => {
  const map = mapForWave(1),
    point = { x: 244, y: 234 };
  assert.equal(isBlocked(map, point, 8), false);
  assert.equal(isBlocked(map, point, 9), true);
  assert.equal(coverHit(map, point, point, 8), Infinity);
  assert.equal(coverHit(map, point, point, 9), 0);
  assert.equal(isBlocked(map, { x: 240, y: 270 }, 10), false);
});
test("diagonal motion slides around case edges and strong knockback cannot tunnel", () => {
  const map = mapForWave(1),
    slide = moveInMap(map, { x: 230, y: 230 }, 50, 80, 10);
  assert.equal(isBlocked(map, slide, 10), false);
  assert.ok(slide.y > 270);
  assert.ok(slide.x < 250);
  const fast = moveInMap(map, { x: 180, y: 275 }, 300, 0, 10);
  assert.ok(fast.x <= 240);
  assert.equal(isBlocked(map, fast, 10), false);
});
test("navigation advances around both case corners instead of stalling at the first waypoint", () => {
  const map = mapForWave(1);
  let point = { x: 200, y: 275 };
  const goal = { x: 500, y: 275 };
  for (let i = 0; i < 360; i++) {
    const next = steerAroundCover(map, point, goal, 10),
      d = Math.hypot(next.x - point.x, next.y - point.y);
    if (d < 1) break;
    point = moveInMap(
      map,
      point,
      ((next.x - point.x) / d) * 1.8,
      ((next.y - point.y) / d) * 1.8,
      10,
    );
    assert.equal(isBlocked(map, point, 10), false);
  }
  assert.ok(point.x > 480, `navigator stalled at ${JSON.stringify(point)}`);
});
test("solid exhibits block hostile shots, marbles and broom consistently", () => {
  const s = run(),
    p = s.players[0];
  Object.assign(p, { x: 450, y: 275, invulnerable: 0 });
  const e = enemy(800, 200, 275);
  s.enemies = [e];
  s.shots = [shot(801, 230, 275, 500, true), shot(802, 420, 275, -500, false)];
  for (let i = 0; i < 10; i++) step(s, {});
  assert.equal(p.hp, p.maxHp);
  assert.equal(e.hp, 500);
  assert.equal(s.shots.length, 0);
  assert.ok(s.effects.some((e) => e.type === "chip"));
  Object.assign(p, { x: 235, y: 275 });
  Object.assign(e, { x: 415, y: 275 });
  p.upgrades = ["thread", "thread", "thread", "thread"];
  step(s, { a: { cast: true } });
  assert.equal(e.hp, 500, "wide sweep cannot go through a solid case");
});
test("a marble hits a body before cover but cannot hit a body behind cover", () => {
  const s = run(),
    front = enemy(800, 220, 275),
    behind = enemy(801, 430, 275);
  s.enemies = [front, behind];
  s.shots = [shot(802, 180, 275, 1000, false)];
  step(s, {}, 0.1);
  assert.equal(front.hp, 480);
  assert.equal(behind.hp, 500);
});
test("gallery changes relocate party safely and clear threats while same-gallery shifts retain positions", () => {
  const s = run();
  addPlayer(s, "b");
  const p = s.players[0];
  p.x = 1110;
  p.y = 710;
  const advance = () => {
    s.phase = "draft";
    for (const q of s.players) s.choices[q.id] = ["quick"];
    for (const q of s.players) chooseUpgrade(s, q.id, "quick");
  };
  advance();
  assert.equal(s.mapId, "antiquities");
  assert.equal(p.x, 1110);
  s.shots = [shot(900, 500, 400, 0, true)];
  advance();
  assert.equal(s.mapId, "natural_history");
  assert.equal(s.shots.length, 0);
  assert.ok(p.x >= 550 && p.x <= 650);
  for (const q of s.players)
    assert.equal(isBlocked(mapById(s.mapId), q, 10), false);
  for (const f of s.flowers)
    assert.equal(isBlocked(mapById(s.mapId), f, 14), false);
});
