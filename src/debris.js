import { PALETTE as P, pixel, oval, line } from "./art.js";

// Pure analytic trajectories keep workshop scrubbing and network snapshots exact.
// These pieces are cosmetic and never participate in combat collision.
function noise(seed, index) {
  let n = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function debrisFrame(effect, age) {
  const death = effect.type === "death",
    chip = effect.type === "chip",
    seed = Number(effect.id) || 0,
    count = chip ? 4 : 8,
    duration = effect.maxLife || (death ? 1 : chip ? 0.8 : 0.2),
    t = Math.max(0, Math.min(duration, age)),
    gravity = 360;
  const fragments = [];
  for (let i = 0; i < count; i++) {
    const a = (i * Math.PI * 2) / count + noise(seed, i) * 0.85,
      velocity =
        (death ? 36 : chip ? 23 : 42) + noise(seed, i + 17) * (death ? 42 : 22),
      lift = (death ? 40 : chip ? 25 : 20) + noise(seed, i + 31) * 32,
      h = death ? 9 + noise(seed, i + 9) * 6 : 9,
      impact = (lift + Math.sqrt(lift * lift + 2 * gravity * h)) / gravity;
    let z,
      airborneTime = t,
      bounce = 0,
      settled = false;
    if (t <= impact) z = h + lift * t - (gravity * t * t) / 2;
    else {
      let remaining = t - impact,
        rebound = (gravity * impact - lift) * 0.3;
      airborneTime = impact;
      z = 0;
      for (let n = 0; n < 3; n++) {
        const flight = (2 * rebound) / gravity;
        if (remaining < flight) {
          z = rebound * remaining - (gravity * remaining * remaining) / 2;
          airborneTime += remaining;
          bounce = n + 1;
          break;
        }
        remaining -= flight;
        airborneTime += flight;
        rebound *= 0.3;
        bounce = n + 1;
        if (n === 2) settled = true;
      }
    }
    // Drag sharply increases on first floor contact. Horizontal velocity is
    // continuous in flight, then slides to rest instead of orbiting forever.
    const travelTime =
        Math.min(t, impact) +
        (t > impact ? ((1 - Math.exp(-(t - impact) * 8)) / 8) * 0.38 : 0),
      spinTime = Math.min(airborneTime, impact + 0.2),
      spin =
        noise(seed, i + 61) * Math.PI * 2 +
        spinTime *
          (noise(seed, i + 47) > 0.5 ? 1 : -1) *
          (8 + noise(seed, i + 23) * 9),
      size =
        (death ? 1.7 : chip ? 1 : 0.7) +
        noise(seed, i + 79) * (death ? 1.2 : 0.8);
    fragments.push({
      x: effect.x + Math.cos(a) * velocity * travelTime,
      y: effect.y + Math.sin(a) * velocity * travelTime * 0.52,
      z: Math.max(0, z),
      spin,
      size,
      bounce,
      settled,
      alpha: Math.min(
        1,
        Math.max(0, (duration - t) / Math.min(0.2, duration * 0.35)),
      ),
      gold: chip,
      warm: !death && !chip && i % 2 === 0,
    });
  }
  return fragments;
}
function facet(ctx, points, color) {
  const low = Math.floor(Math.min(...points.map((p) => p[1])) * 2) / 2,
    high = Math.max(...points.map((p) => p[1]));
  for (let y = low; y < high; y += 0.5) {
    const cuts = [],
      scan = y + 0.25;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan))
        cuts.push(a[0] + ((scan - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i += 2)
      pixel(ctx, cuts[i], y, Math.max(0.5, cuts[i + 1] - cuts[i]), 0.5, color);
  }
}
export function drawDebris(ctx, effect) {
  const duration = effect.maxLife || 0.35,
    fragments = debrisFrame(effect, Math.max(0, duration - effect.life)),
    alpha = ctx.globalAlpha;
  for (const f of fragments) {
    ctx.globalAlpha = alpha * f.alpha * 0.3 * (1 - f.z / 70);
    oval(
      ctx,
      f.x + f.z * 0.12,
      f.y + 1,
      Math.max(0.5, f.size * (1 - f.z / 55)),
      0.5,
      P.ink,
    );
  }
  for (const f of fragments) {
    ctx.globalAlpha = alpha * f.alpha;
    const c = Math.cos(f.spin),
      s = Math.sin(f.spin),
      squash = 0.45 + Math.abs(Math.cos(f.spin * 0.7)) * 0.55,
      point = (u, v) => [
        f.x + (u * c - v * s) * f.size,
        f.y - f.z + (u * s + v * c) * f.size * squash,
      ],
      points = [point(-1, -0.6), point(0.7, -1), point(1, 0.6), point(-0.3, 1)],
      light = f.gold ? "#e3bd71" : f.warm ? "#f2ac92" : "#eee0bf",
      mid = f.gold ? "#ae824b" : f.warm ? "#b45c60" : "#b5a58b",
      dark = f.gold ? "#74543c" : f.warm ? "#713e48" : "#786f64";
    facet(ctx, points, dark);
    facet(
      ctx,
      [points[0], points[1], point(0.1, 0.15), points[3]],
      Math.sin(f.spin) > 0 ? light : mid,
    );
    facet(
      ctx,
      [points[1], points[2], points[3], point(0.1, 0.15)],
      Math.sin(f.spin) > 0 ? mid : light,
    );
    if (f.size > 1.5)
      line(ctx, ...points[0], ...points[1], f.gold ? "#f5dc9c" : P.cream, 0.5);
  }
  ctx.globalAlpha = alpha;
}
