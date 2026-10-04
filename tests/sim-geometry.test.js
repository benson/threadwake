import test from "node:test";
import assert from "node:assert/strict";
import {
  bodyCircle,
  weaponMuzzle,
  aimFromWeapon,
  COMBAT_GEOMETRY,
} from "../src/combat-geometry.js";
import { createGame, addPlayer, startGame, step } from "../src/sim.js";

const close = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} should equal ${b}`);
const run = () => {
  const s = createGame(41);
  addPlayer(s, "a");
  startGame(s);
  s._spawn = s._flower = 100;
  s._opening = 2;
  s.flowers = [];
  s.players[0]._fire = 100;
  s.players[0].invulnerable = 0;
  return s;
};

test("enemy locomotion reports actual displacement and freezes its gait when staggered", () => {
  const s = run();
  const e = enemy("thorn", 600, 700, { stagger: 0 });
  s.enemies = [e];
  const before = { x: e.x, y: e.y };
  step(s, {}, 1 / 30);
  assert.ok(Math.hypot(e.vx, e.vy) > 0);
  close(e.vx, (e.x - before.x) * 30);
  close(e.vy, (e.y - before.y) * 30);
  e.stagger = 1;
  step(s, {}, 1 / 30);
  assert.equal(e.vx, 0);
  assert.equal(e.vy, 0);
});
const enemy = (type, x, y, extra = {}) => ({
  id: 800,
  type,
  x,
  y,
  r: type === "warden" ? 29 : type === "thorn" ? 15 : 10,
  hp: 500,
  maxHp: 500,
  hit: 0,
  phase: 0,
  face: 1,
  slow: 0,
  stagger: 100,
  _fire: 100,
  aimX: 1,
  aimY: 0,
  ...extra,
});
const shot = (x, y, extra = {}) => ({
  id: 900,
  owner: "a",
  source: null,
  x,
  y,
  vx: 0,
  vy: 0,
  hostile: true,
  damage: 20,
  pierce: 0,
  r: 4,
  life: 10,
  color: 0,
  _hits: [],
  ...extra,
});

test("body and muzzle helpers share rigid sockets independent of pose, idle time and recoil", () => {
  for (const [type, g] of Object.entries(COMBAT_GEOMETRY)) {
    const actor = { type, x: 600, y: 400, aimX: 2, aimY: 0 };
    assert.deepEqual(bodyCircle(actor), {
      x: 600,
      y: 400 + g.bodyY,
      r: g.radius,
    });
    assert.deepEqual(weaponMuzzle(actor), {
      x: 600 + g.reach,
      y: 400 + g.bodyY,
    });
    assert.deepEqual(
      weaponMuzzle({ ...actor, shotAge: 0.1, hit: 0.3, castAge: 0.01 }),
      weaponMuzzle(actor),
    );
    assert.deepEqual(weaponMuzzle({ ...actor, aimX: 0, aimY: 0, face: -1 }), {
      x: 600 - g.reach,
      y: 400 + g.bodyY,
    });
  }
});
test("custodian marbles originate from the slingshot and aim through torso centers in all four directions", () => {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const s = run(),
      p = s.players[0];
    p._fire = 0;
    const e = enemy("moth", p.x + dx * 180, p.y - 5 + dy * 180);
    s.enemies = [e];
    const expected = aimFromWeapon(p, e);
    step(s, {});
    assert.equal(s.shots.length, 1);
    const b = s.shots[0];
    close(b.originX, expected.x);
    close(b.originY, expected.y);
    close(b.vx / 360, dx);
    close(b.vy / 360, dy);
    close(p.aimX, dx);
    close(p.aimY, dy);
    assert.equal(p.shotAge, 0);
    step(s, {});
    assert.equal(p.shotAge, 1 / 30);
  }
});
test("prism volleys share one weapon tip and tin soldiers fire from their own aimed cannon", () => {
  const s = run(),
    p = s.players[0];
  p._fire = 0;
  p.upgrades = ["fork", "mirror"];
  s.enemies = [enemy("moth", 1000, 395)];
  step(s, {});
  const first = s.shots.filter((b) => !b.hostile);
  assert.equal(first.length, 2);
  close(first[0].originX, first[1].originX);
  close(first[0].originY, first[1].originY);
  s.shots = [];
  for (let i = 0; i < 6; i++) step(s, {});
  const c = s.companions[0],
    muzzle = weaponMuzzle(c);
  assert.equal(s.shots.length, 2);
  close(s.shots[0].originX, muzzle.x);
  close(s.shots[0].originY, muzzle.y);
  assert.equal(c.shotAge, 0);
  assert.ok(c.aimX > 0.99);
  assert.equal(c.face, 1);
});
test("moth and armor volleys leave their aimed emitter instead of their feet", () => {
  for (const type of ["moth", "thorn"]) {
    const s = run(),
      p = s.players[0],
      e = enemy(type, 900, 400, { stagger: 0, _fire: 0 });
    s.enemies = [e];
    step(s, {});
    const muzzle = weaponMuzzle(e),
      shots = s.shots.filter((b) => b.hostile);
    assert.equal(shots.length, type === "thorn" ? 3 : 1);
    for (const b of shots) {
      close(b.originX, muzzle.x);
      close(b.originY, muzzle.y);
    }
    const center = shots[Math.floor(shots.length / 2)],
      aim = aimFromWeapon(e, p);
    close(center.vx / 100, aim.dx);
    close(center.vy / 100, aim.dy);
    assert.equal(e.shotAge, 0);
  }
});
test("Curator ring leaves individual clock-rim emitters and its fan shares one aimed muzzle", () => {
  const s = run(),
    e = enemy("warden", 1000, 700, { stagger: 0, _fire: 0 });
  s.wave = 8;
  s.enemies = [e];
  step(s, {});
  const body = bodyCircle(e),
    shots = s.shots.filter((b) => b.hostile);
  assert.equal(shots.length, 13);
  for (const b of shots.slice(0, 12)) {
    close(Math.hypot(b.originX - body.x, b.originY - body.y), 27);
    close((b.originX - body.x) / 27, b.vx / 110);
    close((b.originY - body.y) / 27, b.vy / 110);
  }
  const muzzle = weaponMuzzle(e);
  close(shots[12].originX, muzzle.x);
  close(shots[12].originY, muzzle.y);
});
test("hostile projectile body edges hit or miss predictably and shots at feet miss the torso", () => {
  for (const [offset, hits] of [
    [15.9, true],
    [16.1, false],
    [18, false],
  ]) {
    const s = run(),
      p = s.players[0],
      body = bodyCircle(p);
    s.shots = [shot(body.x, body.y + offset)];
    step(s, {});
    assert.equal(p.hp, hits ? 90 : 110, `vertical body offset ${offset}`);
  }
});
test("fast swept hostile shots cannot tunnel through a torso or graze outside its actual circle", () => {
  for (const [offset, hits] of [
    [15.9, true],
    [16.1, false],
  ]) {
    const s = run(),
      p = s.players[0],
      body = bodyCircle(p);
    s.shots = [shot(body.x - 120, body.y + offset, { vx: 2400 })];
    step(s, {}, 0.1);
    assert.equal(p.hp, hits ? 90 : 110);
  }
});
test("marbles hit each visible enemy body edge and miss outside it, including the elevated boss", () => {
  for (const type of ["mite", "moth", "thorn", "warden"])
    for (const inside of [true, false]) {
      const s = run(),
        e = enemy(type, 1000, 700);
      s.enemies = [e];
      const body = bodyCircle(e);
      s.shots = [
        shot(body.x, body.y + body.r + (inside ? 2.9 : 3.1), {
          hostile: false,
          r: 3,
        }),
      ];
      step(s, {});
      assert.equal(
        e.hp,
        inside ? 480 : 500,
        `${type} ${inside ? "inside" : "outside"}`,
      );
    }
});
test("contact damage follows visible bodies and does not jump across solid cases", () => {
  for (const [distance, hits] of [
    [21.9, true],
    [22.1, false],
  ]) {
    const s = run(),
      p = s.players[0];
    s.enemies = [enemy("moth", p.x + distance, p.y - 5)];
    step(s, {});
    assert.equal(p.hp, hits ? 97 : 110);
  }
});
test("a cannon against adjacent cover cannot spawn a shot on the other side", () => {
  const s = run(),
    p = s.players[0];
  Object.assign(p, { x: 200, y: 290 });
  const e = enemy("thorn", 418, 290, { stagger: 0, _fire: 0 });
  s.enemies = [e];
  step(s, {});
  assert.ok(
    weaponMuzzle(e).x < 400,
    "socket reaches behind the case's surface",
  );
  assert.equal(s.shots.length, 0);
  assert.equal(e.shotAge, 999);
  assert.equal(p.hp, 110);
  assert.ok(s.effects.some((f) => f.type === "chip" && f.x >= 400));
});
