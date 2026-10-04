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
