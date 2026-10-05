import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  step,
  chooseUpgrade,
  snapshot,
  UPGRADES,
} from "../src/sim.js";
import { BALANCE, WAVE_DURATION } from "../src/config.js";
import { mapById, steerAroundCover } from "../src/maps.js";
const run = () => {
  const s = createGame(87);
  addPlayer(s, "a");
  startGame(s);
  return s;
};
test("seeded simulations replay exactly and snapshots omit internals", () => {
  const a = run(),
    b = run();
  for (let i = 0; i < 1500; i++) {
    const input = {
      a: {
        x: Math.sin(i * 0.016),
        y: Math.cos(i * 0.016),
        cast: i % 180 === 0,
      },
    };
    step(a, input);
    step(b, input);
  }
  assert.deepEqual(snapshot(a), snapshot(b));
  assert.ok(!JSON.stringify(snapshot(a)).includes('"_'));
  assert.ok(a.enemies.length <= BALANCE.maxEnemies);
  assert.ok(a.shots.length <= BALANCE.maxShots);
});
test("broom sweep immediately clears nearby shots without needing movement", () => {
  const s = run();
  const p = s.players[0];
  s.shots.push({
    id: 9999,
    x: p.x + 50,
    y: p.y,
    vx: 0,
    vy: 0,
    hostile: true,
    r: 4,
    damage: 1,
    life: 1,
    _hits: [],
  });
  step(s, { a: { cast: true } });
  assert.equal(s.caught, 1);
  assert.equal(
    s.shots.some((b) => b.id === 9999),
    false,
  );
  assert.deepEqual(s.echoes, []);
  assert.ok(
    s.effects.some((e) => e.type === "sweep" && e.radius === p.sweepRadius),
  );
  const before = p.castCooldown;
  step(s, { a: { cast: true } });
  assert.ok(p.castCooldown < before);
});
test("nearby supplies activate and heal staff without sweeping", () => {
  const s = run(),
    p = s.players[0];
  p.hp = 50;
  s.flowers = [
    { id: 222, kind: "supply", x: p.x - 50, y: p.y, charge: 0.99, life: 10 },
  ];
  s.enemies = [
    {
      id: 333,
      type: "mite",
      x: p.x - 50,
      y: p.y + 40,
      hp: 25,
      maxHp: 25,
      r: 10,
      hit: 0,
      phase: 0,
      face: 1,
      _fire: 10,
      slow: 0,
    },
  ];
  step(s, {}, 0.1);
  assert.ok(s.effects.some((e) => e.type === "supply"));
  assert.equal(s.kills, 1);
  assert.ok(p.hp > 50);
});
test("draft waits for team, rejects invalid picks and progresses after disconnect", () => {
  const s = run();
  addPlayer(s, "b");
  s.pickups = [
    {
      id: 2222,
      x: s.players[0].x,
      y: s.players[0].y,
      kind: "xp",
      value: s.xpToNext,
      weapon: null,
      life: 10,
    },
  ];
  step(s, {});
  assert.equal(s.phase, "draft");
  assert.equal(s.choices.a.length, 3);
  assert.equal(chooseUpgrade(s, "a", "fake"), false);
  const upgrade = s.choices.a[0];
  assert.equal(chooseUpgrade(s, "a", upgrade), true);
  assert.ok(s.players[0].upgrades.includes(upgrade));
  assert.equal(s.phase, "draft");
  removePlayer(s, "b");
  assert.equal(s.phase, "playing");
  assert.equal(s.wave, 1);
  addPlayer(s, "late");
  assert.equal(s.players.at(-1).upgrades.length, 1);
});
test("each upgrade can be chosen, health upgrade applies and late draft join must pick", () => {
  for (const u of UPGRADES) {
    const s = run();
    s.phase = "draft";
    s.choices.a = [u.id];
    const hp = s.players[0].maxHp;
    assert.equal(chooseUpgrade(s, "a", u.id), true);
    assert.ok(s.players[0].upgrades.includes(u.id));
    if (u.id === "vitality") assert.equal(s.players[0].maxHp, hp + 30);
  }
  const s = run();
  s.phase = "draft";
  s.choices.a = ["quick"];
  addPlayer(s, "late");
  chooseUpgrade(s, "a", "quick");
  assert.equal(s.phase, "draft");
  chooseUpgrade(s, "late", s.choices.late[0]);
  assert.equal(s.phase, "playing");
});
test("ally revives nearby downed player; all down is loss", () => {
  const s = run();
  addPlayer(s, "b");
  s.players[0].dead = true;
  s.players[0].hp = 0;
  s._spawn = 100;
  for (let i = 0; i < 95; i++) step(s, {});
  assert.equal(s.players[0].dead, false);
  assert.ok(s.players[0].hp > 0);
  for (const p of s.players) p.dead = true;
  step(s, {});
  assert.equal(s.phase, "lost");
  assert.equal(startGame(s), true);
  assert.equal(s.wave, 1);
});
test("final Curator defeat wins and malformed movement/traits stay bounded", () => {
  const s = run();
  s.wave = 7;
  s.phase = "draft";
  s.choices.a = ["quick"];
  chooseUpgrade(s, "a", "quick");
  assert.equal(s.wave, 8);
  assert.ok(s.enemies.some((e) => e.type === "warden"));
  for (const e of s.enemies) e.hp = 0;
  step(s, {});
  assert.equal(s.phase, "won");
  const t = createGame();
  const p = addPlayer(t, "x", "x", {
    vitality: Infinity,
    haste: 999,
    echo: -10,
  });
  assert.deepEqual(p.traits, { vitality: 0, haste: 3, echo: 0 });
  startGame(t);
  step(t, { x: { x: NaN, y: Infinity } }, NaN);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});
test("contact defeat mid-enemy update finishes without empty-target crash", () => {
  const s = run(),
    p = s.players[0];
  p.hp = 1;
  p.invulnerable = 0;
  s.enemies = Array.from({ length: 3 }, (_, i) => ({
    id: 100 + i,
    type: "mite",
    x: p.x,
    y: p.y,
    hp: 99,
    maxHp: 99,
    r: 10,
    hit: 0,
    phase: 0,
    _fire: 10,
    slow: 0,
  }));
  step(s, {});
  assert.equal(s.phase, "lost");
});
test("complete real-health runs remain winnable for one, two and four players", () => {
  const seeds = [1, 42, 918],
    preference = [
      "quick",
      "fork",
      "pierce",
      "heavy",
      "orbit",
      "mirror",
      "bloom",
      "recall",
      "thread",
      "vitality",
      "speed",
    ];
  const rank = (id) => (preference.includes(id) ? preference.indexOf(id) : 99);
  for (const size of [1, 2, 4]) {
    let wins = 0;
    for (const seed of seeds) {
      const s = createGame(seed);
      for (let i = 0; i < size; i++) addPlayer(s, String(i));
      startGame(s);
      for (
        let tick = 0;
        tick < 36000 && !["lost", "won"].includes(s.phase);
        tick++
      ) {
        if (s.phase === "draft") {
          for (const p of s.players) {
            const choices = s.choices[p.id];
            if (choices)
              chooseUpgrade(
                s,
                p.id,
                [...choices].sort((a, b) => rank(a) - rank(b))[0],
              );
          }
          continue;
        }
        const inputs = {};
        for (const [i, p] of s.players.entries()) {
          const angle = s.time * 0.42 + i * 0.7,
            down = s.players.find((q) => q.dead);
          const x = down ? down.x : 600 + Math.cos(angle) * 330,
            y = down ? down.y : 400 + Math.sin(angle) * 220;
          const goal = steerAroundCover(mapById(s.mapId), p, { x, y }, 10);
          inputs[p.id] = {
            x: (goal.x - p.x) / 35,
            y: (goal.y - p.y) / 35,
            cast:
              s.enemies.some(
                (e) => Math.hypot(e.x - p.x, e.y - p.y) <= p.sweepRadius + e.r,
              ) ||
              s.shots.some(
                (b) =>
                  b.hostile &&
                  Math.hypot(b.x - p.x, b.y - p.y) <= p.sweepRadius,
              ),
          };
        }
        step(s, inputs);
      }
      assert.ok(["won", "lost"].includes(s.phase), "a run must terminate");
      assert.ok(s.wave >= 7, "basic movement must survive introductory waves");
      assert.ok(s.caught > 20, "broom and supplies must clear hostile shots");
      if (s.phase === "won") wins++;
    }
    assert.ok(
      wins >= 2,
      `${size}-player party should clear at least two of three reference seeds`,
    );
  }
});
