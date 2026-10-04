import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  startGame,
  step,
  chooseUpgrade,
} from "../src/sim.js";

export const LOADOUTS = {
  needle: ["quick", "fork", "pierce", "heavy", "orbit", "mirror", "vitality"],
  garden: [
    "bloom",
    "magnet",
    "heal",
    "recall",
    "thread",
    "echo",
    "frost",
    "vitality",
  ],
  memory: [
    "mirror",
    "echo",
    "recall",
    "thread",
    "frost",
    "orbit",
    "speed",
    "vitality",
  ],
  novice: ["vitality", "quick", "bloom", "echo", "speed", "heal", "fork"],
};

// Real HP, actual offered upgrades, no injected combat state. These are reproducible
// reference policies, not a claim about human enjoyment or difficulty.
export function playRun({
  seed = 42,
  size = 1,
  build = "needle",
  casts = true,
  seekFlowers = true,
} = {}) {
  const s = createGame(seed);
  for (let i = 0; i < size; i++) addPlayer(s, String(i));
  startGame(s);
  const ranking = LOADOUTS[build];
  const rank = (id) => (ranking.includes(id) ? ranking.indexOf(id) : 99);
  let blooms = 0,
    minHp = 110,
    bossAt = 0;
  const seen = new Set();
  for (
    let tick = 0;
    tick < 36000 && !["won", "lost"].includes(s.phase);
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
    if (s.wave === 8 && !bossAt) bossAt = s.time;
    const inputs = {};
    for (const [i, p] of s.players.entries()) {
      const down = s.players.find((q) => q.dead);
      const angle = s.time * (build === "novice" ? 0.3 : 0.42) + i * 0.7;
      let x = down ? down.x : 600 + Math.cos(angle) * 330;
      let y = down ? down.y : 400 + Math.sin(angle) * 220;
      // Garden policy sweeps a broad route through the closest charged flower.
      const f =
        seekFlowers &&
        build === "garden" &&
        s.flowers
          .filter((f) => f.charge >= 0.6)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
      if (f && !down && Math.hypot(f.x - p.x, f.y - p.y) < 230) {
        x = f.x + Math.cos(angle) * 70;
        y = f.y + Math.sin(angle) * 70;
      }
      inputs[p.id] = {
        x: (x - p.x) / 35,
        y: (y - p.y) / 35,
        cast: casts && tick % (build === "novice" ? 255 : 170) === 0,
      };
      minHp = Math.min(minHp, p.hp);
    }
    step(s, inputs);
    for (const e of s.effects)
      if (e.type === "bloom" && !seen.has(e.id)) {
        seen.add(e.id);
        blooms++;
      }
  }
  return {
    label: `${build}/${size}p/seed${seed}${casts ? "" : "/no-cast"}${build === "garden" && !seekFlowers ? "/orbit-policy" : ""}`,
    result: s.phase,
    wave: s.wave,
    seconds: Math.round(s.time),
    kills: s.kills,
    caught: s.caught,
    blooms,
    minHp: Math.round(minHp),
    bossSeconds: bossAt ? Math.round(s.time - bossAt) : null,
    stats: s.stats,
    upgrades: s.players.map((p) => p.upgrades),
  };
}

test("distinct real-health reference loadouts complete bounded runs", () => {
  for (const build of ["needle", "garden", "memory", "novice"]) {
    for (const size of [1, 2, 4]) {
      const result = playRun({ build, size });
      assert.ok(
        ["won", "lost"].includes(result.result),
        `${result.label} must terminate`,
      );
      assert.ok(
        result.wave >= 4,
        `${result.label} should reach the middle game`,
      );
      assert.ok(result.caught > 10, `${result.label} must exercise catches`);
      assert.ok(result.blooms > 3, `${result.label} must exercise the garden`);
    }
  }
});
