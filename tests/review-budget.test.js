import test from "node:test";
import assert from "node:assert/strict";
import {
  reserveReview,
  chargeAgainstBudget,
} from "../scripts/review-budget.mjs";

test("review reservation covers full model context and capped output", () => {
  const { reserve } = reserveReview(
    {
      context_length: 1000000,
      pricing: { prompt: "0.00000075", completion: "0.00000375" },
    },
    3500,
    2,
  );
  assert.ok(reserve >= 0.773125 && reserve <= 0.773127);
  assert.throws(() =>
    reserveReview(
      { context_length: 1000, pricing: { prompt: "unknown" } },
      3500,
      0,
    ),
  );
});
test("unconfirmed requests continue reserving budget and cannot trigger overspend", () => {
  const ledger = {
    limitUsd: 2,
    approvedAt: "2026-10-04",
    calls: [{ reservedUsd: 0.8 }, { reservedUsd: 0.8, costUsd: 0.02 }],
  };
  assert.ok(Math.abs(chargeAgainstBudget(ledger, 0.8) - 0.82) < 1e-12);
  assert.throws(() => chargeAgainstBudget(ledger, 1.2));
  assert.throws(() =>
    chargeAgainstBudget({ ...ledger, approvedAt: null }, 0.1),
  );
  assert.throws(() =>
    chargeAgainstBudget({ ...ledger, calls: [{ reservedUsd: -5 }] }, 0.1),
  );
});
