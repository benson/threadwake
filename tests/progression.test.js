import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMemory, bankProgress } from "../src/progression.js";
test("wave rewards bank once across refreshes and completion", () => {
  let m = normalizeMemory(),
    s = { seed: 42, runNumber: 1, phase: "draft" },
    p = { id: "a", wavesSurvived: 1, stats: { catches: 1 } };
  assert.equal(bankProgress(m, s, p).earned, 2);
  assert.equal(m.balance, 2);
  m = normalizeMemory(JSON.parse(JSON.stringify(m)));
  assert.equal(bankProgress(m, s, p).earned, 0);
  p.wavesSurvived = 8;
  s.phase = "won";
  assert.equal(bankProgress(m, s, p).earned, 11);
  assert.equal(bankProgress(m, s, p).earned, 0);
  assert.equal(m.runs, 1);
  s.runNumber++;
  s.phase = "draft";
  p.wavesSurvived = 1;
  assert.equal(bankProgress(m, s, p).earned, 1);
});
test("late join cannot claim a whole run or victory with zero participation", () => {
  const m = normalizeMemory(),
    s = { seed: 42, runNumber: 1, phase: "won" },
    p = { id: "late", wavesSurvived: 0, stats: {} };
  assert.equal(bankProgress(m, s, p).earned, 0);
  assert.equal(m.balance, 0);
  assert.deepEqual(m.milestones, []);
});
test("legacy and malformed local saves keep valid purchased traits", () => {
  assert.deepEqual(
    normalizeMemory({
      balance: 4,
      traits: { vitality: 2, haste: 99, echo: -3 },
    }).traits,
    { vitality: 2, haste: 3, echo: 0 },
  );
  for (const value of [
    null,
    4,
    "bad",
    { traits: null, records: [null], milestones: ["fake"], balance: -10 },
  ])
    assert.equal(normalizeMemory(value).balance, 0);
});

test("museum redesign preserves earned credits, equipment and completed milestones", () => {
  const previous = {
    version: 2,
    balance: 12,
    runs: 4,
    best: 6,
    traits: { vitality: 2, haste: 1, echo: 3 },
    milestones: ["first-catch", "gardener"],
    records: [],
  };
  const migrated = normalizeMemory(previous);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.balance, 12);
  assert.deepEqual(migrated.traits, previous.traits);
  assert.deepEqual(migrated.milestones, previous.milestones);
  assert.equal(migrated.runs, 4);
  const award = bankProgress(
    migrated,
    { seed: 7, runNumber: 1, phase: "playing" },
    { id: "staff", wavesSurvived: 0, stats: { catches: 3, blooms: 5 } },
  );
  assert.equal(award.earned, 0, "renaming a milestone must not award it again");
});
