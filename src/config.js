export const WORLD = { width: 1200, height: 800 };
export const TICK_RATE = 30;
export const WAVE_COUNT = 8;
export const WAVE_DURATION = 65;
export const waveDuration = (wave) => (wave === 1 ? 38 : WAVE_DURATION);
export const PERMANENT = Object.freeze({
  healthPerRank: 10,
  speedPerRank: 0.04,
  cooldownPerRank: 0.05,
});
export const BALANCE = Object.freeze({
  speed: 155,
  playerHp: 110,
  castCooldown: 5,
  sweepRadius: 96,
  sweepDamage: 52,
  sweepKnockback: 90,
  sweepStagger: 0.8,
  supplyRadius: 118,
  shotDamage: 20,
  fireInterval: 0.65,
  reviveSeconds: 3,
  maxEnemies: 100,
  maxShots: 380,
  maxEffects: 110,
  maxFlowers: 18,
});
// Each wave has a different pressure pattern, rather than the same lottery
// with inflated health. Rates are per spawn; packs remain bounded by maxEnemies.
export const WAVES = Object.freeze([
  { moth: 0.24, thorn: 0, interval: 1.0, pack: 1 },
  { moth: 0.48, thorn: 0, interval: 1.04, pack: 1 },
  { moth: 0.24, thorn: 0.3, interval: 1.0, pack: 1 },
  { moth: 0.18, thorn: 0.12, interval: 1.22, pack: 2 },
  { moth: 0.46, thorn: 0.25, interval: 0.92, pack: 1 },
  { moth: 0.23, thorn: 0.4, interval: 1.18, pack: 2 },
  { moth: 0.3, thorn: 0.22, interval: 1.02, pack: 2 },
  { moth: 0.34, thorn: 0.2, interval: 1.48, pack: 1 },
]);
