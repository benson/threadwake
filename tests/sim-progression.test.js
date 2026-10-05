import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  startGame,
  setCharacter,
  step,
  chooseUpgrade,
  upgradePreview,
} from "../src/sim.js";
import { BALANCE as B } from "../src/config.js";
import { mapById, isBlocked } from "../src/maps.js";

const run = (characters = ["custodian"]) => {
  const s = createGame(54);
  characters.forEach((c, i) => addPlayer(s, String(i), c, {}, c));
  startGame(s);
  s._spawn = s._flower = 1000;
  s._opening = 2;
  s.flowers = [];
  for (const p of s.players) p._fire = 100;
  return s;
};
const enemy = (id, x, y, hp = 100) => ({
  id,
  type: "mite",
  x,
  y,
  hp,
  maxHp: hp,
  r: 10,
  phase: 0,
  hit: 0,
  slow: 0,
  stagger: 100,
  _fire: 100,
  _shatter: 0,
});
const pickup = (p, kind, value = 1, weapon = null) => ({
  id: 900,
  x: p.x,
  y: p.y,
  kind,
  value,
  weapon,
  life: 20,
});
const finish = (s) => {
  for (const p of s.players)
    if (s.choices[p.id]) chooseUpgrade(s, p.id, s.choices[p.id][0]);
};

test("characters have distinct validated starters, health, speed and manual specials", () => {
  const s = run(["custodian", "conservator", "guard"]);
  assert.deepEqual(
    s.players.map((p) => p.weapons),
    [["slingshot"], ["lantern"], ["disc"]],
  );
  assert.deepEqual(
    s.players.map((p) => p.maxHp),
    [110, 95, 135],
  );
  assert.equal(s.players[1].speed, 155 * 1.08);
  assert.equal(s.players[2].speed, 155 * 0.92);
  for (const [i, p] of s.players.entries()) {
    p.x = 450 + i * 180;
    p.y = 400;
    p.hp = 50;
  }
  s.enemies = s.players.map((p, i) => enemy(800 + i, p.x + 40, p.y));
  step(s, Object.fromEntries(s.players.map((p) => [p.id, { cast: true }])));
  assert.deepEqual(
    s.effects.filter((q) => q.type === "sweep").map((q) => q.ability),
    ["sweep", "restore", "repel"],
  );
  assert.equal(s.players[1].hp, 62);
  assert.ok(s.enemies[1].slow > 1.9);
  assert.ok(s.enemies[1].stagger > 1.9);
  assert.ok(s.enemies[2].x >= s.players[2].x + 189);
  assert.equal(s.players[2].sweepRadius, 132);
  assert.equal(setCharacter(s, "0", "guard"), false);
  s.phase = "lobby";
  assert.equal(setCharacter(s, "0", "bogus"), false);
  assert.equal(setCharacter(s, "0", "guard"), true);
  startGame(s);
  assert.equal(s.players[0].character, "guard");
  assert.equal(s.players[0].maxHp, 135);
  const unknown = createGame();
  assert.equal(addPlayer(unknown, "x", "x", {}, "bad").character, "custodian");
});
test("XP level draft freezes and resumes the same encounter and gallery", () => {
  const s = run(),
    p = s.players[0];
  s.waveTime = 17;
  s.enemies = [enemy(800, 900, 400)];
  s.pickups = [pickup(p, "xp", 16)];
  step(s, {});
  assert.equal(s.phase, "draft");
  assert.equal(s.draftKind, "level");
  assert.equal(s.level, 2);
  assert.equal(s.xp, 0);
  assert.equal(s.xpToNext, 22);
  const state = JSON.stringify(s);
  step(s, { 0: { x: 1, cast: true } }, 0.1);
  assert.equal(JSON.stringify(s), state);
  const waveTime = s.waveTime,
    time = s.time;
  finish(s);
  assert.equal(s.phase, "playing");
  assert.equal(s.wave, 1);
  assert.equal(s.waveTime, waveTime);
  assert.equal(s.time, time);
  assert.equal(s.enemies[0].id, 800);
  step(s, {});
  assert.ok(s.waveTime > waveTime);
});
test("late joins during queued level drafts receive no extra upgrade", () => {
  const s = run();
  s.pickups = [pickup(s.players[0], "xp", 38)];
  step(s, {});
  assert.equal(s.level, 3);
  assert.equal(s._levelPending, 1);
  const late = addPlayer(s, "late");
  assert.equal(late.upgrades.length, 0);
  finish(s);
  assert.equal(s.phase, "draft");
  assert.equal(s.choices.late.length, 3);
  finish(s);
  assert.equal(s.phase, "playing");
  assert.deepEqual(
    s.players.map((p) => p.upgrades.length),
    [2, 2],
  );
});
test("weapon pickups unlock all staff and late joiners without sharing starter loadouts", () => {
  const s = run(["custodian", "guard"]),
    p = s.players[0];
  s.pickups = [pickup(p, "weapon", 1, "lantern")];
  step(s, {});
  assert.deepEqual(
    s.players.map((q) => q.weapons),
    [
      ["slingshot", "lantern"],
      ["disc", "lantern"],
    ],
  );
  const late = addPlayer(s, "late", "late", {}, "conservator");
  assert.deepEqual(late.weapons, ["lantern"]);
  assert.equal(s.effects.filter((q) => q.type === "weapon").length, 2);
});
test("mixed-character teams can acquire all four weapons through unique milestone drops", () => {
  const s = run(["custodian", "conservator", "guard"]),
    p = s.players[0];
  const awarded = [];
  for (const milestone of [12, 45, 110, 200]) {
    s.kills = milestone - 1;
    s.enemies = [enemy(800, p.x + 96, p.y, 1)];
    p.castCooldown = 0;
    step(s, { 0: { cast: true } });
    const drop = s.pickups.find((q) => q.kind === "weapon");
    assert.ok(drop);
    awarded.push(drop.weapon);
    drop.x = p.x;
    drop.y = p.y;
    step(s, {});
    if (s.phase === "draft") finish(s);
  }
  assert.equal(new Set(awarded).size, 4);
  for (const q of s.players) assert.equal(q.weapons.length, 4);
});
test("uncollected XP and weapons survive wave and gallery transitions safely", () => {
  const s = run(),
    p = s.players[0];
  s.pickups = [
    { ...pickup(p, "weapon", 1, "lantern"), x: 100, y: 100 },
    { ...pickup(p, "xp", 3), id: 901, x: 110, y: 100 },
  ];
  s.waveTime = 38;
  step(s, {});
  assert.equal(s.phase, "playing");
  assert.equal(s.wave, 2);
  assert.equal(s.pickups.length, 2);
  assert.equal(s.pickups[0].x, 100);
  const life = s.pickups[0].life;
  s.waveTime = 65;
  step(s, {});
  assert.equal(s.mapId, "natural_history");
  assert.equal(s.pickups.length, 2);
  assert.ok(s.pickups[0].life < life);
  for (const q of s.pickups) {
    assert.equal(isBlocked(mapById(s.mapId), q, 5), false);
    assert.ok(Math.hypot(q.x - 600, q.y - 400) < 100);
  }
});
test("lantern auto-fire is radial and gains real prism and fossil effects", () => {
  const sample = (upgrades) => {
    const s = run(["conservator"]),
      p = s.players[0];
    p.upgrades = upgrades;
    p._weaponTimers.lantern = 0;
    s.enemies = [enemy(800, p.x + 70, p.y), enemy(801, p.x + 145, p.y)];
    step(s, {});
    return s;
  };
  const base = sample([]),
    upgraded = sample(["fork", "pierce", "heavy"]);
  assert.ok(base.effects.some((q) => q.type === "lantern"));
  assert.equal(base.enemies[0].hp, 82);
  assert.equal(base.enemies[1].hp, 100);
  assert.ok(upgraded.enemies[0].hp < 82);
  assert.ok(upgraded.enemies[1].hp < 100);
  assert.equal(upgraded.players[0].lastWeapon, "lantern");
});
test("discs pierce outward, turn toward their owner and can strike again on return", () => {
  const s = run(["guard"]),
    p = s.players[0];
  p._weaponTimers.disc = 0;
  s.enemies = [enemy(800, 800, 390, 500)];
  step(s, {});
  const disc = s.shots.find((q) => q.weapon === "disc");
  assert.ok(disc);
  for (let i = 0; i < 45; i++) step(s, {});
  assert.ok(disc.returning);
  assert.ok(disc.vx < 0);
  assert.equal(s.enemies[0].hp, 452.5);
});
test("storm chains once per exhibit and cannot strike through solid cover", () => {
  const s = run(),
    p = s.players[0];
  p.weapons = ["storm"];
  p._weaponTimers.storm = 0;
  s.enemies = [
    enemy(800, 700, 400),
    enemy(801, 790, 400),
    enemy(802, 880, 400),
  ];
  step(s, {});
  assert.deepEqual(
    s.enemies.map((e) => e.hp),
    [74, 74, 74],
  );
  assert.equal(s.effects.filter((q) => q.type === "storm").length, 3);
  const blocked = run(),
    staff = blocked.players[0];
  staff.x = 230;
  staff.y = 290;
  staff.weapons = ["storm"];
  staff._weaponTimers.storm = 0;
  blocked.enemies = [enemy(800, 420, 290)];
  step(blocked, {});
  assert.equal(blocked.enemies[0].hp, 100);
});
test("medicine restores actual health and haste expires back to character speed", () => {
  const s = run(),
    p = s.players[0];
  p.hp = 100;
  s.pickups = [pickup(p, "heal", 16), { ...pickup(p, "haste", 0.15), id: 901 }];
  step(s, {});
  assert.equal(p.hp, 110);
  assert.equal(p.stats.healed, 10);
  step(s, {});
  assert.equal(p.speed, 155 * 1.3);
  for (let i = 0; i < 5; i++) step(s, {});
  assert.equal(p.speed, 155);
});
test("native restoration upgrades improve real shatter and health previews match immediate effects", () => {
  const s = run(["conservator"]),
    p = s.players[0];
  const preview = upgradePreview(p, "frost");
  assert.deepEqual(
    preview.stats.map((q) => [q.before, q.after]),
    [
      ["45%", "55%"],
      ["2.0s", "2.3s"],
    ],
  );
  p.upgrades = ["frost"];
  s.enemies = [enemy(800, 640, 400)];
  step(s, { 0: { cast: true } });
  assert.equal(s.enemies[0]._shatter, 0.55);
  s.phase = "draft";
  s.draftKind = "level";
  s.choices = { 0: ["vitality"] };
  p.hp = 40;
  const hpPreview = upgradePreview(p, "vitality");
  chooseUpgrade(s, "0", "vitality");
  assert.equal(
    p.hp,
    Number(hpPreview.stats.find((q) => q.label === "Health now").after),
  );
});
test("multiweapon pickups and midwave drafts retain exact JSON recovery and bounded pools", () => {
  const s = run(["guard"]),
    p = s.players[0];
  s.pickups = [
    pickup(p, "weapon", 1, "storm"),
    { ...pickup(p, "xp", 16), id: 901 },
  ];
  step(s, {});
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(restored, s);
  finish(s);
  finish(restored);
  for (let i = 0; i < 100; i++) {
    const inputs = { 0: { x: 1, cast: i === 10 } };
    step(s, inputs);
    step(restored, inputs);
  }
  assert.deepEqual(restored, s);
  assert.ok(s.pickups.length <= B.maxPickups);
  assert.equal(s.version, 4);
});
test("a full pickup pool merges XP and keeps rare weapon drops when medicine appears", () => {
  const s = run(),
    p = s.players[0];
  s.kills = 17;
  s.pickups = Array.from({ length: B.maxPickups }, (_, i) => ({
    id: 1000 + i,
    x: 100,
    y: 100,
    kind: i ? "xp" : "weapon",
    value: 1,
    weapon: i ? null : "storm",
    life: 50,
  }));
  s.enemies = [enemy(800, p.x + 40, p.y, 1)];
  step(s, { 0: { cast: true } });
  assert.equal(s.pickups.length, B.maxPickups);
  assert.ok(s.pickups.some((q) => q.kind === "weapon" && q.weapon === "storm"));
  assert.ok(s.pickups.some((q) => q.kind === "heal"));
  assert.equal(
    s.pickups
      .filter((q) => q.kind === "xp")
      .reduce((sum, q) => sum + q.value, 0),
    150,
  );
});
