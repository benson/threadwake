import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  startGame,
  step,
  chooseUpgrade,
} from "../src/sim.js";
import { mapById, steerAroundCover } from "../src/maps.js";

export const LOADOUTS = {
  marbles: ["quick", "fork", "pierce", "heavy", "mirror", "orbit", "vitality"],
  supplies: [
    "bloom",
    "magnet",
    "heal",
    "recall",
    "orbit",
    "thread",
    "vitality",
  ],
  broom: ["echo", "thread", "recall", "frost", "heal", "vitality", "speed"],
  novice: ["vitality", "quick", "orbit", "speed", "heal", "fork", "bloom"],
};
// Real HP, actual offered curios and bounded input only. Gallery navigation and
// situational sweeping replace the obsolete thread/flower-chasing policy.
// Reference policies are regression evidence, not human enjoyment estimates.
export function playRun({
  seed = 42,
  size = 1,
  build = "marbles",
  casts = true,
  traits = {},
} = {}) {
  const s = createGame(seed);
  for (let i = 0; i < size; i++) addPlayer(s, String(i), "Custodian", traits);
  startGame(s);
  const preference = LOADOUTS[build],
    rank = (id) => (preference.includes(id) ? preference.indexOf(id) : 99);
  let minHp = s.players[0].maxHp,
    bossAt = 0,
    sweeps = 0;
  const seen = new Set(),
    maps = new Set();
  for (
    let tick = 0;
    tick < 36000 && !["won", "lost"].includes(s.phase);
    tick++
  ) {
    if (s.phase === "draft") {
      for (const p of s.players)
        if (s.choices[p.id])
          chooseUpgrade(
            s,
            p.id,
            [...s.choices[p.id]].sort((a, b) => rank(a) - rank(b))[0],
          );
      continue;
    }
    if (s.wave === 8 && !bossAt) bossAt = s.time;
    maps.add(s.mapId);
    const inputs = {},
      map = mapById(s.mapId);
    for (const [i, p] of s.players.entries()) {
      const down = s.players.find((q) => q.dead),
        angle = s.time * (build === "novice" ? 0.3 : 0.42) + i * 0.7;
      let goal = down || {
        x: 600 + Math.cos(angle) * 330,
        y: 400 + Math.sin(angle) * 220,
      };
      const supply = s.flowers
        .filter((f) => Math.hypot(f.x - p.x, f.y - p.y) < 150)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
        )[0];
      if (
        supply &&
        p.hp < p.maxHp * 0.6 &&
        !down &&
        !s.enemies.some((e) => Math.hypot(e.x - supply.x, e.y - supply.y) < 110)
      )
        goal = supply;
      const waypoint = steerAroundCover(map, p, goal, 10);
      const threats =
        s.enemies.some(
          (e) => Math.hypot(e.x - p.x, e.y - p.y) <= p.sweepRadius + e.r,
        ) ||
        s.shots.some(
          (b) => b.hostile && Math.hypot(b.x - p.x, b.y - p.y) <= p.sweepRadius,
        );
      inputs[p.id] = {
        x: (waypoint.x - p.x) / 35,
        y: (waypoint.y - p.y) / 35,
        cast: casts && (threats || (supply && p.hp < p.maxHp * 0.6)),
      };
      minHp = Math.min(minHp, p.hp);
    }
    step(s, inputs);
    for (const e of s.effects)
      if (e.type === "sweep" && !seen.has(e.id)) {
        seen.add(e.id);
        sweeps++;
      }
  }
  return {
    label: `${build}/${size}p/seed${seed}${casts ? "" : "/no-sweep"}`,
    result: s.phase,
    wave: s.wave,
    mapId: s.mapId,
    galleries: [...maps],
    seconds: Math.round(s.time),
    kills: s.kills,
    cleared: s.caught,
    supplies: s.stats.blooms,
    sweeps,
    minHp: Math.round(minHp),
    bossSeconds: bossAt ? Math.round(s.time - bossAt) : null,
    stats: s.stats,
    upgrades: s.players.map((p) => p.upgrades),
  };
}

test("real-health museum curio builds progress through bounded gallery runs", () => {
  for (const build of Object.keys(LOADOUTS))
    for (const size of [1, 2, 4]) {
      const result = playRun({ build, size });
      assert.ok(
        ["won", "lost"].includes(result.result),
        `${result.label} must terminate`,
      );
      assert.ok(
        result.wave >= 4,
        `${result.label} should reach the middle galleries`,
      );
      assert.ok(
        result.sweeps > 5,
        `${result.label} should use actual broom sweeps`,
      );
      assert.ok(
        result.supplies > 3,
        `${result.label} should encounter automatic supplies`,
      );
    }
});
