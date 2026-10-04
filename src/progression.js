// Browser-local casual progression. Earned wave rewards survive an interrupted run.
export const MILESTONES = Object.freeze([
  {
    id: "first-catch",
    name: "First thread",
    description: "Catch a shot.",
    test: (p) => p.stats?.catches >= 1,
  },
  {
    id: "gardener",
    name: "Wild garden",
    description: "Bloom five flowers in a run.",
    test: (p) => p.stats?.blooms >= 5,
  },
  {
    id: "mender",
    name: "Mender",
    description: "Revive a friend.",
    test: (p) => p.stats?.revives >= 1,
  },
  {
    id: "woven",
    name: "Woven together",
    description: "Resonate three times in a run.",
    test: (p) => p.stats?.resonances >= 3,
  },
  {
    id: "dawn",
    name: "Daybreak",
    description: "Defeat the Unraveler.",
    test: (p, s) => s.phase === "won" && p.wavesSurvived >= 1,
  },
]);
const bounded = (n, max = 999999) =>
  Math.min(max, Math.max(0, Math.floor(Number(n) || 0)));
export function normalizeMemory(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  return {
    version: 2,
    balance: bounded(raw.balance),
    traits: Object.fromEntries(
      ["vitality", "haste", "echo"].map((k) => [
        k,
        bounded(raw.traits?.[k], 3),
      ]),
    ),
    runs: bounded(raw.runs),
    best: bounded(raw.best, 8),
    milestones: (Array.isArray(raw.milestones) ? raw.milestones : []).filter(
      (id) => MILESTONES.some((m) => m.id === id),
    ),
    records: (Array.isArray(raw.records) ? raw.records : [])
      .filter((r) => r && typeof r.key === "string" && r.key.length < 180)
      .slice(-32)
      .map((r) => ({
        key: r.key,
        waves: bounded(r.waves, 8),
        won: !!r.won,
        done: !!r.done,
        earned: bounded(r.earned, 30),
      })),
    awards: (Array.isArray(raw.awards) ? raw.awards : [])
      .filter((x) => typeof x === "string")
      .slice(-32),
  };
}
export function bankProgress(memory, state, player) {
  if (!player || state.phase === "lobby")
    return { earned: 0, newMilestones: [], runEarned: 0, changed: false };
  const key = `${state.seed}:${state.runNumber || 0}:${player.id}`;
  let record = memory.records.find((r) => r.key === key);
  if (!record) {
    record = { key, waves: 0, won: false, done: false, earned: 0 };
    memory.records.push(record);
    memory.records = memory.records.slice(-32);
  }
  let earned = 0,
    changed = false;
  const newMilestones = [];
  const waves = bounded(player.wavesSurvived, 8);
  if (waves > record.waves) {
    earned += waves - record.waves;
    record.waves = waves;
    changed = true;
  }
  if (state.phase === "won" && waves > 0 && !record.won) {
    earned += 3;
    record.won = true;
    changed = true;
  }
  for (const m of MILESTONES)
    if (!memory.milestones.includes(m.id) && m.test(player, state)) {
      memory.milestones.push(m.id);
      newMilestones.push(m.name);
      earned++;
      changed = true;
    }
  if (["won", "lost"].includes(state.phase) && !record.done) {
    record.done = true;
    memory.runs++;
    changed = true;
  }
  memory.best = Math.max(memory.best, waves);
  record.earned += earned;
  memory.balance += earned;
  return { earned, newMilestones, runEarned: record.earned, changed };
}
