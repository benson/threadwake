export function reserveReview(model, outputTokens, imageCount) {
  const prices = Object.fromEntries(
    ["prompt", "completion", "request", "image"].map((k) => [
      k,
      Number(model.pricing[k] || 0),
    ]),
  );
  if (
    Object.values(prices).some((v) => !Number.isFinite(v) || v < 0) ||
    !Number.isFinite(model.context_length) ||
    model.context_length <= 0
  )
    throw Error("Unusable model price metadata.");
  const reserve =
    Math.ceil(
      (model.context_length * prices.prompt +
        outputTokens * prices.completion +
        prices.request +
        imageCount * prices.image +
        0.01) *
        1e6,
    ) / 1e6;
  return { prices, reserve };
}

export function chargeAgainstBudget(ledger, reserve) {
  if (
    !Number.isFinite(ledger.limitUsd) ||
    ledger.limitUsd <= 0 ||
    !ledger.approvedAt ||
    !Array.isArray(ledger.calls)
  )
    throw Error("Budget ledger lacks explicit approval.");
  let charged = 0;
  for (const call of ledger.calls) {
    const value = call.costUsd ?? call.reservedUsd;
    if (!Number.isFinite(value) || value < 0)
      throw Error("Invalid ledger cost; reconcile before another request.");
    charged += value;
  }
  if (
    !Number.isFinite(reserve) ||
    reserve <= 0 ||
    charged + reserve > ledger.limitUsd
  )
    throw Error(
      "Remaining approved budget is smaller than the conservative request reservation.",
    );
  return charged;
}
