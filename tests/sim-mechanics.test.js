import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  startGame,
  step,
  chooseUpgrade,
  snapshot,
  upgradePreview,
  UPGRADES,
} from "../src/sim.js";
import { BALANCE as B, WAVE_DURATION } from "../src/config.js";

function quiet(size = 1) {
  const s = createGame(91);
  for (let i = 0; i < size; i++) addPlayer(s, String(i));
  startGame(s);
  s.enemies = [];
  s.flowers = [];
  s._spawn = s._flower = 100;
  for (const p of s.players) p._fire = 100;
  return s;
}
function enemy(id, x, y, hp = 1000, type = "mite") {
  return {
    id,
    x,
    y,
    hp,
    maxHp: hp,
    type,
    r: type === "warden" ? 29 : 10,
    hit: 0,
    phase: 0,
    _fire: 100,
    slow: 0,
    brittle: 0,
    exposed: 0,
    _locked: false,
    aimX: 1,
    aimY: 0,
  };
}
function bullet(
  id,
  x,
  y,
  vx = 0,
  vy = 0,
  hostile = true,
  damage = 20,
  pierce = 0,
) {
  return {
    id,
    owner: "0",
    x,
    y,
    vx,
    vy,
    hostile,
    damage,
    pierce,
    r: hostile ? 4 : 3,
    color: 0,
    life: 5,
    _hits: [],
  };
}
function thread(s, p, x, y) {
  p._history = Array.from({ length: 90 }, () => ({ x, y }));
  step(s, { [p.id]: { cast: true } });
  return s.echoes.at(-1);
}

test("stationary casts project an honest anchor, including against arena edges", () => {
  for (const x of [18, 600, 1182]) {
    const s = quiet(),
      p = s.players[0];
    p.x = x;
    p.aimX = x === 1182 ? -1 : 1;
    step(s, { 0: { cast: true } });
    const e = s.echoes[0];
    assert.ok(Math.hypot(e.x - p.x, e.y - p.y) >= B.echoMinSeparation);
    assert.equal(e.projected, true);
    assert.ok(
      e._path.every((q) => q.x === p.x && q.y === p.y),
      "projection must not invent footsteps",
    );
    assert.ok(e.maxLife > p.cooldownDuration, "memory outlives the next cast");
  }
});

test("history uses seconds, replay preserves real footsteps, and tight loops find distant memory", () => {
  const s = quiet(),
    p = s.players[0];
  for (let i = 0; i < 35; i++) step(s, { 0: { x: 1 } }, 0.1);
  assert.ok(p._history.length >= 29 && p._history.length <= 31);
  assert.ok(p._history[0].t >= s.time - B.historySeconds - 1e-6);
  step(s, { 0: { cast: true } });
  assert.ok(p.x - s.echoes[0].x > 400);
  const q = quiet(),
    a = q.players[0];
  a._history = [
    { x: a.x, y: a.y },
    { x: a.x - 180, y: a.y },
    { x: a.x, y: a.y },
  ];
  step(q, { 0: { cast: true } });
  assert.equal(q.echoes[0].projected, false);
  assert.equal(q.echoes[0].x, a.x - 180);
});

test("recasts keep the previous living memory and bound each owner's echoes", () => {
  const s = quiet(2),
    p = s.players[0];
  step(s, { 0: { cast: true } });
  const first = s.echoes[0].id;
  for (let i = 0; i < 2; i++) {
    step(s, {});
    p.castCooldown = 0;
    step(s, { 0: { cast: true }, 1: { cast: i === 0 } });
    if (i === 0) assert.ok(s.echoes.some((e) => e.id === first));
  }
  assert.equal(
    s.echoes.filter((e) => e.owner === "0").length,
    B.maxEchoesPerPlayer,
  );
  assert.ok(!s.echoes.some((e) => e.id === first));
  assert.equal(s.echoes.filter((e) => e.owner === "1").length, 1);
});

test("a press just before cooldown finishes is buffered once", () => {
  const s = quiet(),
    p = s.players[0];
  p.castCooldown = 0.15;
  step(s, { 0: { cast: true } });
  assert.equal(s.echoes.length, 0);
  for (let i = 0; i < 6; i++) step(s, {});
  assert.equal(s.echoes.length, 1);
  const id = s.echoes[0].id;
  for (let i = 0; i < 180; i++) step(s, {});
  assert.deepEqual(
    s.echoes.map((e) => e.id),
    [id],
    "a buffered tap must not repeat itself",
  );
});

test("thread catches swept shots from its side, but is not an all-direction body shield", () => {
  const s = quiet(),
    p = s.players[0];
  p.invulnerable = 0;
  thread(s, p, p.x - 180, p.y);
  s.shots = [bullet(901, p.x - 90, p.y - 40, 0, 1000)];
  step(s, {}, 0.1);
  assert.equal(s.caught, 1);
  assert.equal(p.hp, B.playerHp);
  s.shots = [bullet(902, p.x + 40, p.y, -1000, 0)];
  step(s, {}, 0.1);
  assert.equal(
    s.caught,
    1,
    "a shot reaches the body before the thread behind it",
  );
  assert.equal(p.hp, B.playerHp - 20);
});

test("piercing needles hit in travel order and cannot tunnel through small creatures", () => {
  const s = quiet(),
    p = s.players[0];
  const near = enemy(910, 250, 200),
    far = enemy(911, 300, 200);
  s.enemies = [far, near];
  s.shots = [bullet(912, 200, 200, 1200, 0, false, 20, 1)];
  step(s, {}, 0.1);
  assert.equal(near.hp, 980);
  assert.equal(
    far.hp,
    982,
    "second target receives 90% damage regardless of enemy array order",
  );
  assert.equal(p.hp, B.playerHp);
});

test("catches power the next whole volley and flow to a nearby off-thread flower", () => {
  const s = quiet(),
    p = s.players[0];
  p.upgrades = ["fork"];
  thread(s, p, p.x - 180, p.y);
  s.flowers = [{ id: 920, x: p.x - 90, y: p.y + 150, charge: 0, life: 10 }];
  s.shots = [bullet(921, p.x - 90, p.y), bullet(922, p.x - 100, p.y)];
  step(s, {});
  assert.equal(p.stats.catches, 2);
  assert.equal(s.flowers[0].charge, 1);
  s.enemies = [enemy(923, p.x + 200, p.y)];
  p._fire = 0;
  step(s, {});
  const needles = s.shots.filter((b) => !b.hostile);
  assert.equal(needles.length, 2);
  assert.ok(
    needles.every(
      (b) => Math.abs(b.damage - 20 * 1.36) < 1e-8 && b.pierce === 1,
    ),
  );
  assert.equal(p.stitchCharge, 0);
});

test("garden bursts heal actual missing HP, spread charge and help fallen friends", () => {
  const s = quiet(2),
    p = s.players[0],
    ally = s.players[1];
  p.upgrades = ["bloom", "heal", "magnet"];
  p.hp = p.maxHp - 3;
  ally.dead = true;
  ally.hp = 0;
  ally.revive = 0;
  s.flowers = [
    { id: 930, x: p.x - 50, y: p.y, charge: 1, life: 10 },
    { id: 931, x: p.x - 50, y: p.y + 100, charge: 0.1, life: 10 },
  ];
  const foe = enemy(932, p.x - 50, p.y + 60, 80);
  s.enemies = [foe];
  thread(s, p, p.x - 180, p.y);
  assert.equal(s.stats.blooms, 1);
  assert.equal(p.stats.healed, 3, "overheal is not credited");
  assert.equal(p.hp, p.maxHp);
  assert.ok(
    ally.revive > 0.25 && ally.dead,
    "a burst helps a rescue but does not instantly revive",
  );
  assert.ok(s.flowers.find((f) => f.id === 931).charge > 0.3);
  assert.ok(s.enemies.every((e) => e.id !== foe.id));
  assert.ok(s.effects.some((e) => e.type === "heal"));
});

test("frost stacks improve shatter and a freeze is consumed by one needle", () => {
  function damage(stacks) {
    const s = quiet(),
      p = s.players[0];
    p.upgrades = Array(stacks).fill("frost");
    const e = enemy(940, p.x - 90, p.y);
    s.enemies = [e];
    thread(s, p, p.x - 180, p.y);
    const before = e.hp;
    s.shots = [
      bullet(941, e.x, e.y, 0, 0, false),
      bullet(942, e.x, e.y, 0, 0, false),
    ];
    step(s, {});
    return before - e.hp;
  }
  const one = damage(1),
    four = damage(4);
  assert.ok(
    one >= 49 && one < 51,
    "only the first 20 damage needle gets a 45% bonus",
  );
  assert.ok(
    four - one > 5.9 && four - one < 6.1,
    "later frost stacks add a real shatter benefit",
  );
});

test("spindles catch shots without requiring an echo", () => {
  const s = quiet(),
    p = s.players[0];
  p.upgrades = ["orbit"];
  const angle = 2.7 / 30;
  s.shots = [
    bullet(950, p.x + Math.cos(angle) * 49, p.y + Math.sin(angle) * 49),
  ];
  s.flowers = [{ id: 951, x: p.x + 90, y: p.y, charge: 0, life: 10 }];
  step(s, {});
  assert.equal(s.caught, 1);
  assert.equal(p.stitchCharge, 1);
  assert.equal(s.flowers[0].charge, 0.5);
  assert.equal(s.echoes.length, 0);
});

test("allied crossing threads resonate, while repeated overlap cannot farm each tick", () => {
  const s = quiet(2),
    p = s.players[0],
    q = s.players[1];
  p.x = 600;
  p.y = 400;
  q.x = 500;
  q.y = 300;
  thread(s, p, 400, 400);
  thread(s, q, 500, 500);
  s.flowers = [{ id: 960, x: 500, y: 400, charge: 0, life: 10 }];
  step(s, {});
  assert.ok(s.echoes.every((e) => e.resonance === 1));
  assert.equal(p.stats.resonances, 1);
  assert.equal(q.stats.resonances, 1);
  assert.equal(s.stats.resonances, 1);
  assert.ok(
    s.flowers[0].charge > 0.035,
    "crossing threads charge gardens faster",
  );
  for (let i = 0; i < 40; i++) step(s, {});
  assert.equal(s.stats.resonances, 1);
  assert.equal(
    s.stats.blooms,
    1,
    "sustained crossing threads burst the flower",
  );
});

test("later boss stages change attacks and catching its volley opens the needle ward", () => {
  const patterns = [];
  for (const ratio of [1, 0.6, 0.3]) {
    const s = quiet(),
      p = s.players[0],
      boss = enemy(970, 300, 200, 1000, "warden");
    boss.hp *= ratio;
    boss._fire = 0;
    s.enemies = [boss];
    step(s, {});
    patterns.push([
      boss.stage,
      boss.attack,
      s.shots.filter((b) => b.hostile).length,
    ]);
  }
  assert.deepEqual(patterns, [
    [1, "ring", 13],
    [2, "fan", 13],
    [3, "spiral", 19],
  ]);
  const s = quiet(),
    p = s.players[0],
    boss = enemy(971, 300, 200, 1000, "warden");
  boss.hp = 500;
  s.enemies = [boss];
  step(s, {});
  const before = boss.hp;
  s.shots = [bullet(972, boss.x, boss.y, 0, 0, false)];
  step(s, {});
  assert.equal(boss.hp, before - 12, "ward reduces needle damage");
  thread(s, p, p.x - 180, p.y);
  s.shots = [{ ...bullet(973, p.x - 90, p.y), source: boss.id }];
  step(s, {});
  assert.equal(boss.ward, false);
  assert.ok(boss.exposed > 1.5);
  const exposedHp = boss.hp;
  s.shots = [bullet(974, boss.x, boss.y, 0, 0, false)];
  step(s, {});
  assert.equal(boss.hp, exposedHp - 20);
});

test("thorn fans commit their direction before firing so a late sidestep works", () => {
  const s = quiet(),
    p = s.players[0],
    thorn = enemy(980, p.x - 200, p.y, 1000, "thorn");
  thorn._fire = 0.6;
  s.enemies = [thorn];
  step(s, {});
  p.y += 180;
  for (let i = 0; i < 18; i++) step(s, {});
  const center = s.shots.find((b) => b.hostile && Math.abs(b.vy) < 0.01);
  assert.ok(
    center && center.vx > 0,
    "fan follows its telegraph, not the player's new location",
  );
});

test("drafts offer real linked upgrades, every stack changes its preview, and caps are respected", () => {
  const s = quiet(),
    p = s.players[0];
  p.upgrades = ["bloom"];
  s.waveTime = WAVE_DURATION;
  step(s, {});
  assert.ok(
    s.choices["0"].some((id) => ["magnet", "heal", "recall"].includes(id)),
  );
  for (const u of UPGRADES) {
    p.upgrades = Array(u.maxStacks - 1).fill(u.id);
    const preview = upgradePreview(p, u.id);
    assert.notEqual(
      preview.before,
      preview.after,
      `${u.id}'s last stack must offer real value`,
    );
    assert.ok(preview.synergy);
  }
  p.upgrades = [...Array(3).fill("orbit"), ...Array(4).fill("magnet")];
  s.phase = "playing";
  s.waveTime = WAVE_DURATION;
  step(s, {});
  assert.ok(
    !s.choices["0"].includes("orbit") && !s.choices["0"].includes("magnet"),
  );
});

test("wave participation earns milestones, last-second joins do not receive the completed wave", () => {
  const s = quiet(),
    p = s.players[0];
  for (let i = 0; i < 300; i++) step(s, {});
  const late = addPlayer(s, "late");
  s.waveTime = WAVE_DURATION;
  step(s, {});
  assert.equal(p.wavesSurvived, 1);
  assert.equal(late.wavesSurvived, 0);
  assert.equal(p.runTicks, 301);
  assert.equal(late.runTicks, 1);
  chooseUpgrade(s, "0", s.choices["0"][0]);
  chooseUpgrade(s, "late", s.choices.late[0]);
  assert.equal(p.wavesSurvived, 1, "milestones survive the next wave reset");
});

test("checkpoint replay preserves projection, resonance timers and combat credits", () => {
  const s = quiet(2),
    p = s.players[0];
  p.upgrades = ["frost", "mirror", "recall"];
  thread(s, p, p.x - 180, p.y);
  s.shots = [bullet(990, p.x - 70, p.y)];
  step(s, {});
  const recovered = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 400; i++) {
    const input = {
      0: { x: Math.sin(i * 0.01), y: Math.cos(i * 0.01), cast: i % 85 === 0 },
    };
    step(s, input);
    step(recovered, input);
  }
  assert.deepEqual(s, recovered);
  assert.ok(!JSON.stringify(snapshot(s)).includes('"_'));
});
