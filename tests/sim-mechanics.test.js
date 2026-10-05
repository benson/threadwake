import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  step,
  snapshot,
  UPGRADES,
  upgradePreview,
} from "../src/sim.js";
import { BALANCE as B, PERMANENT } from "../src/config.js";

const quiet = (upgrades = []) => {
  const s = createGame(41);
  addPlayer(s, "a");
  startGame(s);
  const p = s.players[0];
  s._spawn = s._flower = 100;
  s._opening = 2;
  s.flowers = [];
  p._fire = 100;
  p.upgrades = upgrades;
  p.invulnerable = 0;
  return { s, p };
};
const enemy = (id, x, y, extra = {}) => ({
  id,
  type: "moth",
  x,
  y,
  r: 10,
  hp: 500,
  maxHp: 500,
  hit: 0,
  phase: 0,
  slow: 0,
  brittle: 0,
  stagger: 100,
  _fire: 100,
  _locked: false,
  _shatter: 0,
  ...extra,
});
const bullet = (id, x, y, extra = {}) => ({
  id,
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

test("sweep uses visible body bounds immediately and its fading effect cannot damage again", () => {
  const { s, p } = quiet();
  const inside = enemy(800, p.x + B.sweepRadius + 9.9, p.y + 13),
    outside = enemy(801, p.x - B.sweepRadius - 10.1, p.y + 13);
  s.enemies = [inside, outside];
  step(s, { a: { cast: true } });
  assert.equal(inside.hp, 500 - B.sweepDamage);
  assert.equal(outside.hp, 500);
  const e = s.effects.find((e) => e.type === "sweep");
  assert.equal(e.radius, B.sweepRadius);
  assert.equal(e.owner, "a");
  assert.equal(e.maxLife, 0.35);
  Object.assign(inside, { x: p.x + 30, y: p.y });
  step(s, { a: { cast: true } });
  assert.equal(inside.hp, 500 - B.sweepDamage);
  assert.ok(p.castCooldown > 4.9);
  assert.equal(p.castAge, 1 / 30);
  assert.deepEqual(s.echoes, []);
  assert.equal("echoPreview" in p, false);
  assert.equal("_history" in p, false);
});
test("sweep impact remains visible across a multiplayer snapshot interval without dealing extra damage", () => {
  const { s, p } = quiet();
  const target = enemy(800, p.x + 40, p.y);
  s.enemies = [target];
  step(s, { a: { cast: true } });
  step(s, {});
  step(s, {});
  assert.ok(target.hit > 0, "impact still visible after 100ms");
  assert.equal(target.hp, 500 - B.sweepDamage);
  for (let i = 0; i < 3; i++) step(s, {});
  assert.equal(target.hit, 0, "impact fades after 200ms");
});
test("a simultaneous weapon hit cannot shorten a still-visible sweep impact", () => {
  const { s, p } = quiet();
  const target = enemy(800, p.x + 40, p.y);
  s.enemies = [target];
  // The sweep moves the moth before this existing marble reaches its torso.
  s.shots = [
    bullet(801, target.x + B.sweepKnockback, target.y - 13, {
      hostile: false,
      r: 3,
    }),
  ];
  step(s, { a: { cast: true } });
  assert.equal(target.hp, 500 - B.sweepDamage - 20);
  assert.ok(
    target.hit >= 0.16 - 1 / 30 - 1e-9,
    "another weapon must not erase the longer sweep response",
  );
});
test("radial sweep clears hostile shots behind the custodian but preserves outside and friendly marbles", () => {
  const { s, p } = quiet();
  s.shots = [
    bullet(800, p.x - 99, p.y),
    bullet(801, p.x + 101, p.y),
    bullet(802, p.x + 20, p.y, { hostile: false }),
  ];
  step(s, { a: { cast: true } });
  assert.equal(s.caught, 1);
  assert.deepEqual(
    s.shots.map((b) => b.id),
    [801, 802],
  );
  assert.equal(p.stats.catches, 1);
});
test("stiff bristles, velvet rope and winding key change actual sweep damage, force, reach and cadence", () => {
  const { s, p } = quiet(["echo", "thread", "recall"]),
    e = enemy(800, p.x + 110, p.y, { stagger: 0, _fire: 0 });
  s.enemies = [e];
  step(s, { a: { cast: true } });
  assert.equal(e.hp, 430);
  assert.ok(Math.abs(e.x - p.x - 220) < 1e-8);
  assert.ok(e.stagger > 0.7);
  assert.equal(p.sweepRadius, 114);
  assert.equal(p.castCooldown, 4);
  assert.equal(s.shots.length, 0);
  for (let i = 0; i < 118; i++) step(s, {});
  step(s, { a: { cast: true } });
  for (let i = 0; i < 3; i++) step(s, {});
  assert.ok(p.castAge < 0.1, "a press just before ready is buffered");
});
test("supply care heals automatically, sweep boosts charge, and credit reflects actual restored health", () => {
  const { s, p } = quiet(["bloom", "heal"]);
  p.hp = p.maxHp - 5;
  s.flowers = [
    { id: 800, kind: "supply", x: p.x + 30, y: p.y, charge: 0.6, life: 10 },
  ];
  step(s, { a: { cast: true } });
  assert.equal(p.hp, p.maxHp);
  assert.equal(s.stats.healed, 5);
  assert.equal(p.stats.blooms, 1);
  assert.equal(
    s.effects.find((e) => e.type === "supply").radius,
    B.supplyRadius * 1.25,
  );
  const second = quiet();
  second.p.hp = 50;
  second.s.flowers = [
    { id: 800, kind: "supply", x: 630, y: 400, charge: 0.99, life: 10 },
  ];
  step(second.s, {}, 0.1);
  assert.equal(second.p.hp, 62);
  assert.equal(second.p.stats.blooms, 1);
});
test("visitor bell charges multiple carts and each extra bell improves actual charge and pull", () => {
  const sample = (n) => {
    const { s, p } = quiet(Array(n).fill("magnet"));
    s.flowers = [80, 150].map((d, i) => ({
      id: 800 + i,
      kind: "supply",
      x: p.x + d,
      y: p.y,
      charge: 0,
      life: 10,
    }));
    const carts = [...s.flowers];
    s.shots = [bullet(850, p.x + 50, p.y)];
    step(s, { a: { cast: true } });
    return carts;
  };
  const none = sample(0),
    one = sample(1),
    two = sample(2);
  assert.equal(none[1].charge, 0);
  assert.ok(one[1].charge > 0.5);
  assert.ok(two[1].charge > one[1].charge);
  assert.ok(two[1].x < one[1].x);
});
test("glacier sweep enables one marble shatter and duplicate fragments strengthen it", () => {
  for (const n of [1, 2]) {
    const { s, p } = quiet(Array(n).fill("frost")),
      e = enemy(800, p.x + 40, p.y);
    s.enemies = [e];
    step(s, { a: { cast: true } });
    assert.ok(e.slow > 1.3);
    s.shots.push(bullet(810, e.x, e.y, { hostile: false, damage: 20, r: 3 }));
    step(s, {});
    assert.equal(e.hp, 448 - 20 * (1.35 + 0.1 * n));
    assert.equal(e.brittle, 0);
    s.shots.push(bullet(811, e.x, e.y, { hostile: false, damage: 20, r: 3 }));
    step(s, {});
    assert.equal(e.hp, 428 - 20 * (1.35 + 0.1 * n));
  }
});
test("tin soldier is a real single follower and inherits marble modifiers", () => {
  const { s, p } = quiet([
    "mirror",
    "mirror",
    "fork",
    "pierce",
    "heavy",
    "quick",
  ]);
  s.enemies = [enemy(800, 900, 400)];
  for (let i = 0; i < 7; i++) step(s, { a: { x: 1 } });
  assert.equal(s.companions.length, 1);
  assert.ok(s.companions[0].x > 575);
  assert.equal(s.shots.length, 2);
  assert.ok(
    s.shots.every((b) => Math.abs(b.damage - 21.6) < 1e-8 && b.pierce === 2),
  );
  assert.ok(s.companions[0].fireIn <= 0.72000001);
  removePlayer(s, "a");
  assert.equal(s.companions.length, 0);
});
test("orrery clears real crossing shots and jack-in-the-box retaliates only on a real hit", () => {
  const { s, p } = quiet(["orbit", "thorns"]);
  s.shots = [bullet(800, p.x + 48.8, p.y + 4.4)];
  step(s, {});
  assert.equal(s.caught, 1);
  s.shots = [bullet(801, p.x, p.y - 18)];
  step(s, {});
  assert.equal(p.hp, 90);
  assert.equal(s.shots.filter((b) => !b.hostile).length, 12);
  s.shots.push(bullet(802, p.x, p.y - 18));
  step(s, {});
  assert.equal(p.hp, 90);
});
test("nearby co-workers receive sweep protection and shared first aid with correct credits", () => {
  const { s, p } = quiet(["heal"]),
    friend = addPlayer(s, "b");
  friend._fire = 100;
  friend.hp = 80;
  friend.invulnerable = 0;
  step(s, { a: { cast: true } });
  assert.equal(friend.hp, 84);
  assert.ok(friend.invulnerable >= 0.31);
  assert.equal(p.stats.resonances, 1);
  assert.equal(friend.stats.resonances, 1);
  assert.equal(s.stats.resonances, 1);
  assert.equal(p.stats.healed, 4);
});
test("permanent equipment has shared exact formulas and survives restarting", () => {
  const s = createGame();
  addPlayer(s, "a", "Staff", { vitality: 3, haste: 3, echo: 3 });
  startGame(s);
  const p = s.players[0];
  assert.equal(p.maxHp, B.playerHp + PERMANENT.healthPerRank * 3);
  assert.equal(p.speed, B.speed * (1 + PERMANENT.speedPerRank * 3));
  assert.equal(
    p.cooldownDuration,
    B.castCooldown * (1 - PERMANENT.cooldownPerRank * 3),
  );
  s.phase = "lost";
  startGame(s);
  assert.deepEqual(s.players[0].traits, p.traits);
});
test("held broom input repeats only when ready, independent of the fading impact effect", () => {
  const { s, p } = quiet();
  let sweeps = 0;
  const seen = new Set();
  for (let i = 0; i < 306; i++) {
    step(s, { a: { cast: true } });
    for (const e of s.effects)
      if (e.type === "sweep" && !seen.has(e.id)) {
        seen.add(e.id);
        sweeps++;
      }
  }
  assert.equal(sweeps, 3);
  assert.ok(p.castCooldown > 4.8);
});
test("Curator has three distinct volleys and remains vulnerable to marbles in every phase", () => {
  for (const [fraction, stage, attack, bullets] of [
    [1, 1, "ring", 13],
    [0.5, 2, "fan", 13],
    [0.2, 3, "spiral", 19],
  ]) {
    const { s, p } = quiet();
    s.wave = 8;
    const boss = enemy(800, 1000, 700, {
      type: "warden",
      r: 29,
      hp: 1000 * fraction,
      maxHp: 1000,
      stagger: 0,
      _fire: 0,
    });
    s.enemies = [boss];
    step(s, {});
    assert.equal(boss.stage, stage);
    assert.equal(boss.attack, attack);
    assert.equal(s.shots.filter((b) => b.hostile).length, bullets);
    const hp = boss.hp;
    s.shots = [bullet(810, boss.x, boss.y - 32, { hostile: false, r: 3 })];
    step(s, {});
    assert.equal(boss.hp, hp - 20);
    assert.equal("warded" in boss, false);
  }
});
test("curio previews explain different next stacks without developer distance units", () => {
  const { p } = quiet();
  for (const u of UPGRADES) {
    const a = upgradePreview(p, u.id);
    assert.ok(
      a.stats.some((s) => s.before !== s.after),
      u.id,
    );
    assert.ok(a.synergy);
    assert.ok(!/px|echo|thread|flower|needle/i.test(u.description), u.id);
    assert.ok(
      a.stats.every((s) => s.label && !/px/.test(s.after)),
      u.id,
    );
    p.upgrades = [u.id];
    const b = upgradePreview(p, u.id);
    assert.ok(
      b.stats.some((s) => s.before !== s.after),
      u.id,
    );
    p.upgrades = [];
  }
  assert.deepEqual(upgradePreview(p, "frost").stats, [
    { label: "Shatter bonus", before: "0%", after: "45%" },
    { label: "Slow duration", before: "0s", after: "1.4s" },
  ]);
  assert.deepEqual(upgradePreview(p, "mirror").stats, [
    { label: "Companion damage", before: "0", after: "12" },
  ]);
});
test("JSON recovery retains live companions and projectile ownership for exact continuation", () => {
  const { s, p } = quiet(["mirror"]);
  p._fire = 0;
  s.enemies = [enemy(800, 900, 400)];
  for (let i = 0; i < 7; i++) step(s, {});
  assert.ok(s.shots.length && s.companions.length);
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(restored, s);
  for (let i = 0; i < 120; i++) {
    const input = { a: { y: 1, cast: i === 20 } };
    step(s, input);
    step(restored, input);
  }
  assert.deepEqual(restored, s);
  assert.equal(snapshot(s).version, 4);
  assert.ok(!JSON.stringify(snapshot(s)).includes('"_'));
});
