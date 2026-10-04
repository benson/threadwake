import {
  WORLD,
  WAVE_COUNT,
  waveDuration,
  WAVES,
  BALANCE as B,
} from "./config.js";

export const UPGRADES = [
  {
    id: "fork",
    name: "Split needle",
    description: "Fire an extra needle in a spread.",
    icon: "fork",
  },
  {
    id: "pierce",
    name: "Silver point",
    description: "Needles pierce two more creatures.",
    icon: "needle",
  },
  {
    id: "quick",
    name: "Quick hands",
    description: "Needles and echo needles fire 20% sooner.",
    icon: "spark",
  },
  {
    id: "heavy",
    name: "Iron stitch",
    description: "Needles deal 35% more damage.",
    icon: "needle",
  },
  {
    id: "orbit",
    name: "Spindle",
    description: "A circling blade cuts creatures and catches shots.",
    icon: "orbit",
  },
  {
    id: "echo",
    name: "Long memory",
    description: "Echoes last 1.5 seconds longer.",
    icon: "echo",
  },
  {
    id: "recall",
    name: "Recollection",
    description: "Reduce cast cooldown by 20%.",
    icon: "echo",
  },
  {
    id: "thread",
    name: "Wide weave",
    description: "Wider threads catch shots and cut creatures.",
    icon: "thread",
  },
  {
    id: "bloom",
    name: "Wild garden",
    description: "Wider, stronger flower bursts charge nearby flowers.",
    icon: "flower",
  },
  {
    id: "heal",
    name: "Kind roots",
    description: "Flower bursts restore more health nearby.",
    icon: "heart",
  },
  {
    id: "speed",
    name: "Light feet",
    description: "Move 15% faster.",
    icon: "wing",
  },
  {
    id: "vitality",
    name: "Heartwood",
    description: "Gain 30 maximum health and heal 40.",
    icon: "heart",
  },
  {
    id: "frost",
    name: "Winter thread",
    description:
      "Threads slow creatures; needles shatter them for extra damage.",
    icon: "snow",
  },
  {
    id: "mirror",
    name: "Echo needle",
    description: "Your echoes also fire at nearby creatures.",
    icon: "echo",
  },
  {
    id: "thorns",
    name: "Last briar",
    description: "Taking a hit erupts in a ring of needles.",
    icon: "star",
  },
  {
    id: "magnet",
    name: "Bloomcall",
    description:
      "Catches charge every flower along your thread. Bursts spread charge farther.",
    icon: "flower",
  },
];
for (const u of UPGRADES) u.maxStacks = u.id === "orbit" ? 3 : 4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, f = 0) => (Number.isFinite(v) ? v : f);
const count = (p, id) => p.upgrades.filter((x) => x === id).length;
export function upgradePreview(p, id) {
  const value = (n) => {
    switch (id) {
      case "fork":
        return `${1 + n} ${n === 0 ? "needle" : "needles"}`;
      case "pierce":
        return `${1 + 2 * n} ${n === 0 ? "target" : "targets"} per needle`;
      case "quick":
        return `${(B.fireInterval * Math.pow(0.8, n)).toFixed(2)}s between volleys`;
      case "heavy":
        return `${Math.round(B.shotDamage * (1 + 0.35 * n))} needle damage`;
      case "orbit":
        return `${n} circling ${n === 1 ? "blade" : "blades"}`;
      case "echo":
        return `${(B.echoLife + 1.5 * n).toFixed(1)}s echo duration`;
      case "recall":
        return `${(B.castCooldown * Math.pow(0.8, n) * (1 - 0.02 * (p.traits?.echo || 0))).toFixed(1)}s cast cooldown`;
      case "thread":
        return `${B.threadRadius + 8 * n}px thread · ${9 + 8 * n}–${25 + 8 * n} damage/s`;
      case "bloom":
        return `${Math.round(B.flowerRadius * (1 + 0.25 * n))}px burst · +${25 * n}% damage`;
      case "heal":
        return `${7 + 7 * n} health per nearby burst`;
      case "speed":
        return `${Math.round(B.speed * (1 + 0.15 * n + 0.02 * (p.traits?.haste || 0)))}px/s`;
      case "vitality": {
        const added = n - count(p, id),
          maxHp = p.maxHp + 30 * added;
        const hp = Math.min(maxHp, p.hp + 40 * added);
        const rested = Math.min(
          maxHp,
          Math.max(hp + maxHp * 0.32, maxHp * 0.55),
        );
        return `${maxHp} maximum health · ${Math.round(rested)} after this rest`;
      }
      case "frost":
        return n
          ? `${Math.round((0.35 + 0.1 * n) * 100)}% shatter bonus · ${(0.7 + 0.2 * n).toFixed(1)}s slow`
          : "No shatter or slow";
      case "mirror":
        return n
          ? `${Math.round((0.65 + 0.2 * (n - 1)) * 100)}% echo needle damage`
          : "Echoes do not fire";
      case "thorns":
        return n ? `${24 * n} damage · 12 needles on hit` : "No retaliation";
      case "magnet":
        return `${Math.round((0.5 + 0.05 * n) * 100)}% charge per catch · ${n ? "all thread flowers" : "one flower"}`;
      default:
        return "";
    }
  };
  const synergy = {
    fork: "Catches power the whole volley.",
    pierce: "Pierced needles lose 10% damage per target.",
    quick: "Echo needles also fire faster.",
    heavy: "Echo needles inherit your damage.",
    orbit: "Blade catches charge flowers and your next volley.",
    echo: "Keep two memories alive at once.",
    recall: "Recast while your older thread still holds.",
    thread: "Stretch your thread for more damage.",
    bloom: "Bursts spread charge to nearby flowers.",
    heal: "Bursts also help revive fallen friends.",
    frost: "Your next needle shatters a threaded creature.",
    mirror: "Inherits split, pierce and quick hands.",
    thorns: "Retaliation needles can shatter frozen creatures.",
    magnet: "Each stack spreads burst charge farther.",
    vitality: "Heal 40 now, then recover more between waves.",
    speed: "Longer footsteps stretch stronger threads.",
  };
  return {
    before: value(count(p, id)),
    after: value(count(p, id) + 1),
    synergy: synergy[id] || "",
  };
}
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
function random(s) {
  let t = (s._rng += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const uid = (s) => ++s._id;
const alive = (s) => s.players.filter((p) => !p.dead);
const freshStats = () => ({
  catches: 0,
  blooms: 0,
  healed: 0,
  revives: 0,
  resonances: 0,
  threadKills: 0,
});
function credit(s, p, key, amount = 1) {
  s.stats[key] += amount;
  if (p) p.stats[key] += amount;
}
function statsFor(p) {
  p.speed = B.speed * (1 + 0.15 * count(p, "speed") + 0.02 * p.traits.haste);
  p.echoMaxLife = B.echoLife + 1.5 * count(p, "echo");
  p.cooldownDuration =
    B.castCooldown *
    Math.pow(0.8, count(p, "recall")) *
    (1 - 0.02 * p.traits.echo);
}
function effect(s, type, x, y, color = 0) {
  s.effects.push({
    id: uid(s),
    type,
    x,
    y,
    color,
    life: type === "bloom" ? 0.6 : 0.35,
    maxLife: type === "bloom" ? 0.6 : 0.35,
  });
}
function segmentDistance(x, y, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = clamp(
    ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1),
    0,
    1,
  );
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
// First impact along a tick's travel. This avoids tunneling and prevents a
// thread behind a body from retroactively catching a shot that hit it first.
function sweepCircle(a, b, center, radius) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const x = a.x - center.x,
    y = a.y - center.y;
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const length = dx * dx + dy * dy,
    dot = x * dx + y * dy;
  const discriminant = dot * dot - length * c;
  if (!length || discriminant < 0) return Infinity;
  const t = (-dot - Math.sqrt(discriminant)) / length;
  return t >= 0 && t <= 1 ? t : Infinity;
}
function sweepThread(a, b, start, end, radius) {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    length = Math.hypot(dx, dy);
  if (length < 1) return Infinity;
  const ux = dx / length,
    uy = dy / length;
  const along = (a.x - start.x) * ux + (a.y - start.y) * uy;
  const normal = (a.y - start.y) * ux - (a.x - start.x) * uy;
  const da = (b.x - a.x) * ux + (b.y - a.y) * uy;
  const dn = (b.y - a.y) * ux - (b.x - a.x) * uy;
  let enter = 0,
    exit = 1;
  for (const [at, velocity, low, high] of [
    [along, da, 0, length],
    [normal, dn, -radius, radius],
  ]) {
    if (Math.abs(velocity) < 1e-8) {
      if (at < low || at > high)
        return Math.min(
          sweepCircle(a, b, start, radius),
          sweepCircle(a, b, end, radius),
        );
    } else {
      const t1 = (low - at) / velocity,
        t2 = (high - at) / velocity;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
    }
  }
  const strip = enter <= exit && enter <= 1 && exit >= 0 ? enter : Infinity;
  return Math.min(
    strip,
    sweepCircle(a, b, start, radius),
    sweepCircle(a, b, end, radius),
  );
}
export function createGame(seed = 1) {
  return {
    version: 2,
    seed: finite(seed, 1) >>> 0,
    runNumber: 0,
    tick: 0,
    time: 0,
    phase: "lobby",
    wave: 0,
    waveTime: 0,
    waveDuration: waveDuration(0),
    players: [],
    enemies: [],
    shots: [],
    echoes: [],
    flowers: [],
    effects: [],
    choices: {},
    kills: 0,
    caught: 0,
    stats: freshStats(),
    _rng: finite(seed, 1) >>> 0,
    _id: 0,
    _spawn: 0,
    _flower: 0,
    _resonance: {},
    _opening: 0,
  };
}
export function addPlayer(s, id, name = "Weaver", traits = {}) {
  if (typeof id !== "string" || !id || id.length > 80 || s.players.length >= 4)
    return null;
  const old = s.players.find((p) => p.id === id);
  if (old) return old;
  const color = [0, 1, 2, 3].find((c) => !s.players.some((p) => p.color === c));
  const t = {};
  for (const k of ["vitality", "haste", "echo"])
    t[k] = clamp(Math.floor(finite(traits?.[k])), 0, 3);
  const p = {
    id,
    name: String(name).trim().slice(0, 18) || "Weaver",
    x: 600 + color * 24,
    y: 400,
    vx: 0,
    vy: 0,
    hp: B.playerHp + 4 * t.vitality,
    maxHp: B.playerHp + 4 * t.vitality,
    dead: false,
    color,
    face: 1,
    castCooldown: 0,
    castAge: 999,
    hit: 0,
    upgrades: [],
    kills: 0,
    stats: freshStats(),
    wavesSurvived: 0,
    runTicks: 0,
    joinedWave: s.wave,
    stitchCharge: 0,
    footsteps: [],
    echoPreview: null,
    revive: 0,
    invulnerable: 2,
    aimX: 1,
    aimY: 0,
    traits: t,
    _history: [],
    _held: false,
    _fire: 0.2,
    _orbit: 0,
    _waveTime: 0,
    _castBuffer: 0,
    _historyClock: 0,
  };
  // New friends arrive with one useful upgrade per completed wave.
  for (let i = 1; i < s.wave; i++)
    p.upgrades.push(
      ["quick", "heavy", "fork", "bloom", "orbit", "pierce"][(i - 1) % 6],
    );
  s.players.push(p);
  statsFor(p);
  showMemory(s, p);
  if (s.phase === "draft") s.choices[id] = rollChoices(s, p);
  return p;
}
export function removePlayer(s, id) {
  s.players = s.players.filter((p) => p.id !== id);
  s.echoes = s.echoes.filter((e) => e.owner !== id);
  delete s.choices[id];
  if (s.phase === "draft" && s.players.length && !Object.keys(s.choices).length)
    nextWave(s);
}
export function startGame(s) {
  if (!["lobby", "won", "lost"].includes(s.phase) || !s.players.length)
    return false;
  const ps = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    traits: p.traits,
  }));
  const runNumber = (s.runNumber || 0) + 1;
  Object.assign(s, createGame(s.seed));
  s.runNumber = runNumber;
  for (const p of ps) addPlayer(s, p.id, p.name, p.traits);
  s.phase = "playing";
  nextWave(s);
  return true;
}
function rollChoices(s, p) {
  const pool = UPGRADES.filter((u) => count(p, u.id) < u.maxStacks);
  // Preserve variety while guaranteeing one offer that connects to the run's
  // choices. This changes the offer, never grants an upgrade outside the draft.
  const pairs = {
    bloom: ["magnet", "heal", "recall"],
    magnet: ["bloom", "thread"],
    frost: ["pierce", "fork", "thread"],
    mirror: ["echo", "recall", "quick"],
    echo: ["mirror", "thread"],
    thread: ["frost", "bloom"],
    orbit: ["thread", "magnet"],
    fork: ["pierce", "heavy"],
    pierce: ["fork", "frost"],
    heal: ["bloom", "magnet"],
  };
  const synergy = [...new Set(p.upgrades.flatMap((id) => pairs[id] || []))];
  const linked = pool.filter((u) => synergy.includes(u.id));
  const result = [];
  if (linked.length) {
    const pick = linked[Math.floor(random(s) * linked.length)];
    result.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  while (result.length < 3 && pool.length) {
    const i = Math.floor(random(s) * pool.length);
    result.push(pool.splice(i, 1)[0].id);
  }
  return result;
}
export function chooseUpgrade(s, id, upgradeId) {
  const p = s.players.find((p) => p.id === id);
  if (s.phase !== "draft" || !p || !s.choices[id]?.includes(upgradeId))
    return false;
  p.upgrades.push(upgradeId);
  statsFor(p);
  if (upgradeId === "vitality") {
    p.maxHp += 30;
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  delete s.choices[id];
  if (!Object.keys(s.choices).length) nextWave(s);
  return true;
}
function nextWave(s) {
  s.wave++;
  s.phase = "playing";
  s.waveTime = 0;
  s.waveDuration = waveDuration(s.wave);
  s._spawn = s.wave === 1 ? 0.7 : 1.5;
  s._opening = 0;
  s.shots = [];
  s.enemies = [];
  s.echoes = [];
  s.flowers = [];
  s._flower = 0;
  for (const p of s.players) {
    p.dead = false;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.32);
    p.hp = Math.max(p.hp, p.maxHp * 0.55);
    p.revive = 0;
    p.invulnerable = 2;
    p.castCooldown = 0;
    p.castAge = 999;
    p._waveTime = 0;
    p._history = [];
    p._historyClock = 0;
    p._held = false;
    p._castBuffer = 0;
    p.stitchCharge = 0;
    statsFor(p);
    showMemory(s, p);
  }
  for (let i = 0; i < 7; i++) spawnFlower(s);
  if (s.wave === WAVE_COUNT) spawnEnemy(s, "warden");
}
function spawnFlower(s) {
  if (s.flowers.length >= B.maxFlowers) return;
  const p = s.players[Math.floor(random(s) * s.players.length)];
  const a = random(s) * Math.PI * 2,
    r = 85 + random(s) * 240;
  s.flowers.push({
    id: uid(s),
    x: clamp(p.x + Math.cos(a) * r, 45, WORLD.width - 45),
    y: clamp(p.y + Math.sin(a) * r, 45, WORLD.height - 45),
    charge: 0.28,
    life: 42,
  });
}
function spawnEnemy(s, type, formation = null) {
  const ps = alive(s);
  if (!ps.length || s.enemies.length >= B.maxEnemies) return;
  const p = formation?.player || ps[Math.floor(random(s) * ps.length)],
    a = random(s) * Math.PI * 2;
  const reachX = s.wave === 1 ? 270 : 430, reachY = s.wave === 1 ? 210 : 320;
  let x = clamp(formation?.x ?? p.x + Math.cos(a) * reachX, 25, WORLD.width - 25),
    y = clamp(formation?.y ?? p.y + Math.sin(a) * reachY, 25, WORLD.height - 25);
  if (Math.hypot(x - p.x, y - p.y) < 150) {
    x = p.x < 600 ? 1150 : 50;
    y = 50 + random(s) * 700;
  }
  const hp =
    type === "warden"
      ? 1400 * (1 + 0.6 * (s.players.length - 1))
      : { mite: 27, moth: 38, thorn: 70 }[type] *
        (1 + (s.wave - 1) * 0.13) *
        (1 + 0.1 * (s.players.length - 1));
  s.enemies.push({
    id: uid(s),
    type,
    x,
    y,
    hp,
    maxHp: hp,
    r: type === "warden" ? 29 : type === "thorn" ? 15 : 10,
    hit: 0,
    phase: random(s) * 6.28,
    face: 1,
    _fire: type === "warden" ? 2 : 1 + random(s) * 2,
    _touch: 0,
    slow: 0,
    brittle: 0,
    stage: type === "warden" ? 1 : 0,
    attack: type === "warden" ? "ring" : type === "thorn" ? "fan" : "needle",
    aimX: 1,
    aimY: 0,
    _locked: false,
    ward: false,
    exposed: 0,
  });
}
function openingPair(s) {
  const ps = alive(s);
  if (!ps.length) return;
  const p = ps[Math.floor(random(s) * ps.length)];
  const angle = (Math.hypot(p.vx, p.vy) > 1 ? Math.atan2(p.vy, p.vx) : Math.atan2(p.aimY, p.aimX)) + Math.PI;
  for (const side of [-1, 1]) {
    const before = s.enemies.length;
    spawnEnemy(s, "moth", { player: p,
      x: p.x + Math.cos(angle) * 260 - Math.sin(angle) * 70 * side,
      y: p.y + Math.sin(angle) * 260 + Math.cos(angle) * 70 * side });
    if (s.enemies.length > before) s.enemies.at(-1)._fire = side === -1 ? 0.8 : 1;
  }
}
function target(s, p) {
  let best = null,
    d = Infinity;
  for (const e of s.enemies) {
    const dd = dist2(p, e);
    if (e.hp > 0 && dd < d) {
      d = dd;
      best = e;
    }
  }
  return best;
}
function shot(
  s,
  p,
  x,
  y,
  angle,
  hostile = false,
  damage = B.shotDamage,
  pierce = 0,
  speed = 360,
) {
  if (s.shots.length >= B.maxShots) return;
  s.shots.push({
    id: uid(s),
    owner: p?.id,
    source: hostile ? (p?.id ?? null) : null,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    hostile,
    damage,
    pierce,
    r: hostile ? 4 : 3,
    color: p?.color ?? 0,
    life: hostile ? 7 : 2.2,
    _hits: [],
  });
}
function fire(s, p, origin = p, scale = 1) {
  const e = target(s, origin);
  if (!e) return;
  const angle = Math.atan2(e.y - origin.y, e.x - origin.x),
    n = 1 + count(p, "fork");
  p.aimX = Math.cos(angle);
  p.aimY = Math.sin(angle);
  const charge = origin === p ? p.stitchCharge : 0;
  if (origin === p) p.stitchCharge = 0;
  for (let i = 0; i < n; i++)
    shot(
      s,
      p,
      origin.x,
      origin.y,
      angle + (i - (n - 1) / 2) * 0.14,
      false,
      B.shotDamage *
        (1 + 0.35 * count(p, "heavy")) *
        scale *
        (1 + 0.18 * charge),
      2 * count(p, "pierce") + (charge >= 2 ? 1 : 0),
    );
}
function damageEnemy(s, e, amount, p, source = "needle") {
  if (e.hp <= 0) return;
  if (e.type === "warden" && source === "bloom") {
    e.exposed = 2.4;
    e.ward = false;
  }
  if (e.type === "warden" && e.ward && source === "needle") amount *= 0.6;
  e.hp -= amount;
  e.hit = 0.09;
  if (e.hp <= 0) {
    s.kills++;
    if (p) p.kills++;
    if (source === "thread") credit(s, p, "threadKills");
    effect(s, "death", e.x, e.y, p?.color ?? 0);
  }
}
function hurt(s, p, damage) {
  if (p.dead || p.invulnerable > 0) return;
  p.hp -= damage;
  p.hit = 0.3;
  p.invulnerable = 0.85;
  effect(s, "hit", p.x, p.y, p.color);
  const th = count(p, "thorns");
  if (th)
    for (let i = 0; i < 12; i++)
      shot(s, p, p.x, p.y, (i * Math.PI) / 6, false, 24 * th, 1);
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    p.revive = 0;
    s.echoes = s.echoes.filter((e) => e.owner !== p.id);
  }
}
function memoryPlan(s, p, path = p._history) {
  if (!path.length) path = [{ x: p.x, y: p.y, t: s.time }];
  // A tight loop may finish where it started: choose its furthest genuine
  // footstep. A motionless cast gets a projected anchor, not invented history.
  let at = 0;
  if (dist2(path[0], p) < B.echoMinSeparation ** 2)
    at = path.reduce(
      (best, q, i) => (dist2(q, p) > dist2(path[best], p) ? i : best),
      0,
    );
  const projected = dist2(path[at], p) < B.echoMinSeparation ** 2;
  const direction =
    Math.hypot(p.vx, p.vy) > 1
      ? Math.atan2(p.vy, p.vx)
      : Math.atan2(p.aimY, p.aimX);
  let anchor = {
    x: clamp(
      p.x - Math.cos(direction) * B.echoProjection,
      18,
      WORLD.width - 18,
    ),
    y: clamp(
      p.y - Math.sin(direction) * B.echoProjection,
      18,
      WORLD.height - 18,
    ),
  };
  // At an arena edge project inward if the usual backward anchor is clipped.
  if (dist2(anchor, p) < B.echoMinSeparation ** 2) {
    const inward = Math.atan2(WORLD.height / 2 - p.y, WORLD.width / 2 - p.x);
    anchor = {
      x: p.x + Math.cos(inward) * B.echoProjection,
      y: p.y + Math.sin(inward) * B.echoProjection,
    };
  }
  return { path, at, projected, anchor: projected ? anchor : { x: path[at].x, y: path[at].y } };
}
function showMemory(s, p) {
  const history = p._history.filter((q) => finite(q.t, s.time) >= s.time - B.historySeconds - 1e-6);
  const plan = memoryPlan(s, p, history);
  // Public trails are real history samples, never the projected anchor. Keep
  // the chosen real anchor in the decimation so the preview explains the cast.
  const points = [];
  for (const [i, q] of history.entries()) {
    if (!points.length || dist2(points.at(-1).q, q) >= 8 ** 2 || i === plan.at) points.push({ i, q });
  }
  if (history.length && dist2(points.at(-1).q, history.at(-1)) > 0.01)
    points.push({ i: history.length - 1, q: history.at(-1) });
  const indices = new Set([0, points.length - 1]);
  const anchorIndex = points.findIndex(({ i }) => i === plan.at);
  if (anchorIndex >= 0) indices.add(anchorIndex);
  for (let i = 0; i < 15; i++) indices.add(Math.round(i * (points.length - 1) / 14));
  p.footsteps = [...indices].filter((i) => i >= 0 && i < points.length).sort((a, b) => a - b)
    .map((i) => ({ x: points[i].q.x, y: points[i].q.y, age: clamp(s.time - finite(points[i].q.t, s.time), 0, B.historySeconds) }));
  p.echoPreview = { ...plan.anchor, projected: plan.projected, ready: !p.dead && p.castCooldown <= 0,
    length: Math.hypot(plan.anchor.x - p.x, plan.anchor.y - p.y) };
}
function cast(s, p) {
  p.castAge = 0;
  statsFor(p);
  p.castCooldown = p.cooldownDuration;
  const { path, at, projected, anchor } = memoryPlan(s, p, p._history.map((q) => ({ ...q })));
  const life = p.echoMaxLife;
  const owned = s.echoes.filter((e) => e.owner === p.id);
  if (owned.length >= B.maxEchoesPerPlayer)
    s.echoes = s.echoes.filter((e) => e.id !== owned[0].id);
  s.echoes.push({
    id: uid(s),
    owner: p.id,
    x: anchor.x,
    y: anchor.y,
    life,
    maxLife: life,
    projected,
    tension: 0,
    resonance: 0,
    _path: path,
    _pathStart: at,
    _anchor: anchor,
    _elapsed: 0,
    _fire: 0.3,
  });
  effect(s, "cast", p.x, p.y, p.color);
}
function catchShot(s, b, p, a = p, end = p, resonance = 0) {
  if (!b.hostile || b.life <= 0) return;
  b.life = 0;
  s.caught++;
  credit(s, p, "catches");
  p.stitchCharge = Math.min(3, p.stitchCharge + 1);
  const boss = s.enemies.find((e) => e.id === b.source && e.type === "warden");
  if (boss) {
    boss.exposed = Math.max(boss.exposed, 1.6);
    boss.ward = false;
  }
  // Skilled catches reduce downtime without creating an unlimited cast loop.
  p.castCooldown = Math.max(0, p.castCooldown - 0.06);
  effect(s, "catch", b.x, b.y, p.color);
  let candidates = s.flowers
    .filter((f) => f.life > 0 && segmentDistance(f.x, f.y, a, end) < 100)
    .sort((x, y) => dist2(x, b) - dist2(y, b));
  if (!candidates.length)
    candidates = s.flowers
      .filter((f) => f.life > 0 && dist2(f, b) < 260 ** 2)
      .sort((x, y) => dist2(x, b) - dist2(y, b))
      .slice(0, 1);
  const amount = 0.5 + 0.05 * count(p, "magnet") + 0.12 * resonance;
  for (const f of count(p, "magnet") ? candidates : candidates.slice(0, 1))
    f.charge = Math.min(1, f.charge + amount);
}

function crossing(a, b, c, d) {
  const ax = b.x - a.x,
    ay = b.y - a.y,
    bx = d.x - c.x,
    by = d.y - c.y;
  const det = ax * by - ay * bx;
  if (Math.abs(det) < 0.01) return null;
  const cx = c.x - a.x,
    cy = c.y - a.y;
  const t = (cx * by - cy * bx) / det,
    u = (cx * ay - cy * ax) / det;
  return t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95
    ? { x: a.x + ax * t, y: a.y + ay * t }
    : null;
}
function resonate(s, dt) {
  for (const key of Object.keys(s._resonance))
    s._resonance[key] = Math.max(0, s._resonance[key] - dt);
  for (const e of s.echoes) e.resonance = 0;
  for (let i = 0; i < s.echoes.length; i++) {
    const a = s.echoes[i],
      p = s.players.find((p) => p.id === a.owner);
    if (!p || p.dead || a.life <= 0 || dist2(p, a) < B.echoMinSeparation ** 2)
      continue;
    for (const b of s.echoes.slice(i + 1)) {
      const q = s.players.find((p) => p.id === b.owner);
      if (
        !q ||
        q.dead ||
        q.id === p.id ||
        b.life <= 0 ||
        dist2(q, b) < B.echoMinSeparation ** 2
      )
        continue;
      const at = crossing(p, a, q, b);
      if (!at) continue;
      a.resonance = b.resonance = 1;
      const key = [p.id, q.id].sort().join(":");
      if ((s._resonance[key] || 0) > 0) continue;
      s._resonance[key] = 3;
      credit(s, p, "resonances");
      q.stats.resonances++;
      effect(s, "resonance", at.x, at.y, p.color);
      for (const f of s.flowers)
        if (f.life > 0 && dist2(f, at) < 120 ** 2)
          f.charge = Math.min(1, f.charge + 0.24);
    }
  }
}
function bloom(s, f, p) {
  f.life = 0;
  credit(s, p, "blooms");
  const power = 1 + 0.25 * count(p, "bloom"),
    r = B.flowerRadius * power;
  effect(s, "bloom", f.x, f.y, p.color);
  s.effects.at(-1).radius = r;
  for (const e of s.enemies)
    if (dist2(f, e) < (r + e.r) ** 2) {
      damageEnemy(s, e, (76 + 10 * s.wave) * power, p, "bloom");
      if (count(p, "frost")) e.slow = Math.max(e.slow, 1.2);
    }
  for (const ally of s.players)
    if (dist2(f, ally) < (r + 30) ** 2) {
      if (ally.dead)
        ally.revive = Math.min(
          0.95,
          ally.revive + 0.18 + 0.1 * count(p, "heal"),
        );
      else {
        const healed = Math.min(ally.maxHp - ally.hp, 7 + 7 * count(p, "heal"));
        ally.hp += healed;
        if (healed > 0) {
          credit(s, p, "healed", healed);
          effect(s, "heal", ally.x, ally.y, ally.color);
        }
      }
    }
  const chain = count(p, "bloom"),
    roots = count(p, "magnet");
  if (chain || roots)
    for (const next of s.flowers)
      if (next.life > 0 && dist2(f, next) < (r * 0.8 + 35 * roots) ** 2)
        next.charge = Math.min(
          1,
          next.charge + 0.12 + 0.1 * chain + 0.06 * roots,
        );
  s.shots = s.shots.filter((b) => !b.hostile || dist2(f, b) > r * r);
}
export function step(s, inputs = {}, dt = 1 / 30) {
  if (s.phase !== "playing" || !s.players.length) return;
  s.waveDuration = waveDuration(s.wave);
  s.tick++;
  dt = clamp(finite(dt, 1 / 30), 0.001, 0.1);
  s.time += dt;
  s.waveTime += dt;
  for (const p of s.players) {
    p.runTicks++;
    p._waveTime += dt;
    p.hit = Math.max(0, p.hit - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.castCooldown = Math.max(0, p.castCooldown - dt);
    p.castAge = Math.min(999, (p.castAge ?? 999) + dt);
    const input = inputs?.[p.id] || {};
    if (p.dead) {
      p.vx = p.vy = 0;
      const friends = s.players.filter(
        (q) => !q.dead && q.id !== p.id && dist2(p, q) < 65 ** 2,
      );
      p.revive = clamp(
        p.revive +
          (friends.length
            ? (dt / B.reviveSeconds) *
              Math.min(1.5, 1 + 0.25 * (friends.length - 1))
            : -dt * 0.12),
        0,
        1,
      );
      if (p.revive >= 1) {
        p.dead = false;
        p.hp = p.maxHp * 0.5;
        p.invulnerable = 3;
        p.revive = 0;
        credit(
          s,
          friends.sort((a, b) => dist2(a, p) - dist2(b, p))[0],
          "revives",
        );
        effect(s, "cast", p.x, p.y, p.color);
      }
      continue;
    }
    let x = clamp(finite(input.x), -1, 1),
      y = clamp(finite(input.y), -1, 1);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const speed =
      B.speed * (1 + 0.15 * count(p, "speed") + 0.02 * p.traits.haste);
    p.speed = speed;
    p.vx = x * speed;
    p.vy = y * speed;
    p.x = clamp(p.x + p.vx * dt, 18, WORLD.width - 18);
    p.y = clamp(p.y + p.vy * dt, 18, WORLD.height - 18);
    if (x) p.face = x > 0 ? 1 : -1;
    p._historyClock += dt;
    if (p._historyClock >= 1 / 30 - 1e-6 || !p._history.length) {
      p._history.push({ x: p.x, y: p.y, t: s.time });
      p._historyClock %= 1 / 30;
    }
    while (
      p._history.length > 1 &&
      (p._history[0].t < s.time - B.historySeconds || p._history.length > 120)
    )
      p._history.shift();
    const held = input.cast === true;
    if (held && !p._held) p._castBuffer = 0.24;
    if (p._castBuffer > 0 && p.castCooldown <= 0) {
      cast(s, p);
      p._castBuffer = 0;
    }
    p._castBuffer = Math.max(0, p._castBuffer - dt);
    p._held = held;
    p._fire -= dt;
    if (p._fire <= 0) {
      fire(s, p);
      p._fire = B.fireInterval * Math.pow(0.8, count(p, "quick"));
    }
    p._orbit += dt * 2.7;
    p.orbitPhase = p._orbit;
    const n = count(p, "orbit");
    if (n)
      for (let i = 0; i < n; i++) {
        const a = p._orbit + (i * 6.283) / n,
          o = { x: p.x + Math.cos(a) * 49, y: p.y + Math.sin(a) * 49 };
        for (const e of s.enemies)
          if (dist2(o, e) < (e.r + 12) ** 2)
            damageEnemy(s, e, 58 * dt, p, "orbit");
        for (const b of s.shots)
          if (
            b.hostile &&
            b.life > 0 &&
            segmentDistance(o.x, o.y, b, {
              x: b.x + b.vx * dt,
              y: b.y + b.vy * dt,
            }) <
              12 + b.r
          )
            catchShot(s, b, p, p, o);
      }
  }
  if (!alive(s).length) {
    s.phase = "lost";
    return;
  }
  s._spawn -= dt;
  if (s.wave === 1 && s._opening < 2 && s.waveTime >= [4, 13][s._opening]) {
    openingPair(s);
    s._opening++;
  }
  if (s._spawn <= 0) {
    const wave = WAVES[Math.min(WAVES.length - 1, s.wave - 1)];
    // Small packs alternate with breathing room. Dawn's adds remain bounded
    // so the boss pattern, rather than an infinite mob, is the final test.
    const pulse = s.waveTime % 18 < 5 ? 0.88 : 1.1;
    if (s.wave !== WAVE_COUNT || s.enemies.length < 18)
      for (let i = 0; i < wave.pack; i++) {
        const r = random(s);
        spawnEnemy(
          s,
          r < wave.thorn
            ? "thorn"
            : r < wave.thorn + wave.moth
              ? "moth"
              : "mite",
        );
      }
    s._spawn = (wave.interval * pulse) / Math.pow(s.players.length, 0.28);
  }
  s._flower -= dt;
  if (s._flower <= 0) {
    spawnFlower(s);
    s._flower = 2.8;
  }
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.phase += dt;
    e.slow = Math.max(0, e.slow - dt);
    e.brittle = Math.max(0, (e.brittle || 0) - dt);
    const ps = alive(s);
    if (!ps.length) break;
    const p = ps.reduce((a, b) => (dist2(e, a) < dist2(e, b) ? a : b));
    const dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.hypot(dx, dy) || 1;
    e.face = dx > 0 ? 1 : -1;
    if (e.type === "warden") {
      e.stage = e.hp > e.maxHp * 0.67 ? 1 : e.hp > e.maxHp * 0.34 ? 2 : 3;
      e.attack = ["ring", "fan", "spiral"][e.stage - 1];
      e.exposed = Math.max(0, e.exposed - dt);
      e.ward = e.stage > 1 && e.exposed <= 0;
    }
    const base =
      { mite: 48, moth: 39, thorn: 25, warden: 22 }[e.type] *
      (1 + s.wave * 0.055) *
      (e.slow > 0 ? 0.55 : 1);
    const move =
      e.type === "moth" && d < 200
        ? -0.25
        : e.type === "thorn" && d < 230
          ? 0
          : 1;
    // Moths circle at firing distance; thorns plant their feet to commit a fan.
    const strafe =
      e.type === "moth" && d < 260 ? Math.sin(e.phase * 0.8) * 0.8 : 0;
    const stride = e.type === "warden" ? 1 + 0.2 * (e.stage - 1) : 1;
    e.x = clamp(
      e.x + ((dx / d) * move * stride - (dy / d) * strafe) * base * dt,
      10,
      WORLD.width - 10,
    );
    e.y = clamp(
      e.y + ((dy / d) * move * stride + (dx / d) * strafe) * base * dt,
      10,
      WORLD.height - 10,
    );
    for (const q of ps)
      if (dist2(e, q) < (e.r + 10) ** 2)
        hurt(s, q, e.type === "warden" ? 26 : 12 + s.wave);
    e._fire -= dt;
    if (!e._locked && e._fire <= 0.65 && e.type !== "mite") {
      e.aimX = dx / d;
      e.aimY = dy / d;
      e._locked = true;
    }
    if (e._fire <= 0 && e.type !== "mite") {
      const a = Math.atan2(e.aimY, e.aimX);
      if (e.type === "warden") {
        const n = e.stage === 1 ? 12 : e.stage === 2 ? 8 : 16;
        for (let j = 0; j < n; j++)
          shot(
            s,
            e,
            e.x,
            e.y,
            e.phase * (e.stage === 3 ? 0.65 : 0.3) + (j * 6.283) / n,
            true,
            15,
            0,
            e.stage === 3 ? 145 : 115,
          );
        const fan = e.stage === 1 ? 0 : e.stage === 2 ? 2 : 1;
        for (let j = -fan; j <= fan; j++)
          shot(s, e, e.x, e.y, a + j * 0.2, true, 18, 0, 165 + 10 * e.stage);
        e._fire = [2.25, 1.95, 1.65][e.stage - 1];
      } else {
        const n = e.type === "thorn" ? 3 : 1;
        for (let j = 0; j < n; j++)
          shot(
            s,
            e,
            e.x,
            e.y,
            a + (j - (n - 1) / 2) * 0.22,
            true,
            12 + s.wave,
            0,
            100 + s.wave * 5,
          );
        e._fire = e.type === "thorn" ? 2.7 : 3.2;
      }
      e._locked = false;
    }
    e.fireIn = Math.max(0, e._fire);
  }
  // Replay history over the lifetime, retaining a little distance from its end.
  for (const e of s.echoes) {
    const p = s.players.find((p) => p.id === e.owner);
    if (!p || p.dead) {
      e.life = 0;
      continue;
    }
    e.life -= dt;
    e._elapsed += dt;
    const start = e._pathStart || 0;
    let at = Math.min(
      e._path.length - 1,
      start +
        Math.floor((e._elapsed / e.maxLife) * (e._path.length - start) * 0.82),
    );
    if (
      Number.isFinite(e._path[start].t) &&
      Number.isFinite(e._path.at(-1).t)
    ) {
      const time =
        e._path[start].t +
        Math.min(0.82, (e._elapsed / e.maxLife) * 0.82) *
          (e._path.at(-1).t - e._path[start].t);
      at = start;
      while (at < e._path.length - 1 && e._path[at + 1].t <= time) at++;
    }
    e.x = e.projected ? e._anchor.x : e._path[at].x;
    e.y = e.projected ? e._anchor.y : e._path[at].y;
    e.tension = clamp(
      Math.hypot(p.x - e.x, p.y - e.y) / (B.speed * B.historySeconds),
      0,
      1,
    );
    e._fire -= dt;
    if (count(p, "mirror") && e._fire <= 0) {
      fire(s, p, e, 0.65 + 0.2 * (count(p, "mirror") - 1));
      e._fire = 0.8 * Math.pow(0.8, count(p, "quick"));
    }
  }
  resonate(s, dt);
  // A thread is the moving segment between a weaver and their remembered route.
  for (const e of s.echoes) {
    const p = s.players.find((p) => p.id === e.owner);
    if (!p || p.dead || e.life <= 0) continue;
    const radius = B.threadRadius + 8 * count(p, "thread");
    const length = Math.hypot(e.x - p.x, e.y - p.y) || 1;
    const inset = Math.min(length * 0.45, radius + 20);
    const start = {
      x: p.x + ((e.x - p.x) / length) * inset,
      y: p.y + ((e.y - p.y) / length) * inset,
    };
    for (const b of s.shots)
      if (b.hostile && b.life > 0) {
        const next = { x: b.x + b.vx * dt, y: b.y + b.vy * dt };
        const intercept = sweepThread(b, next, start, e, radius + b.r);
        const body = s.players.reduce(
          (at, q) =>
            q.dead ? at : Math.min(at, sweepCircle(b, next, q, 8 + b.r)),
          Infinity,
        );
        if (intercept < body) catchShot(s, b, p, p, e, e.resonance);
      }
    for (const foe of s.enemies)
      if (foe.hp > 0 && segmentDistance(foe.x, foe.y, p, e) < foe.r + radius) {
        damageEnemy(
          s,
          foe,
          (9 + 16 * e.tension + 8 * count(p, "thread")) *
            dt *
            (1 + e.resonance * 0.25),
          p,
          "thread",
        );
        const frost = count(p, "frost");
        if (frost) {
          foe.slow = 0.7 + 0.2 * frost;
          foe.brittle = Math.max(foe.brittle, foe.slow);
          foe._shatter = Math.max(foe._shatter || 0, 0.35 + 0.1 * frost);
        }
      }
    for (const f of s.flowers)
      if (f.life > 0 && segmentDistance(f.x, f.y, p, e) < radius + 13) {
        f.charge = Math.min(1, f.charge + dt * (0.4 + e.resonance * 0.2));
        if (f.charge >= 1) bloom(s, f, p);
      }
  }
  for (const b of s.shots) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const old = { x: b.x, y: b.y };
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.hostile) {
      const impacts = s.players
        .filter((p) => !p.dead)
        .map((p) => ({ p, at: sweepCircle(old, b, p, b.r + 8) }))
        .filter((hit) => Number.isFinite(hit.at))
        .sort((a, c) => a.at - c.at);
      for (const { p } of impacts) {
        hurt(s, p, b.damage);
        b.life = 0;
        break;
      }
    } else {
      const hits = s.enemies
        .filter((e) => e.hp > 0 && !b._hits.includes(e.id))
        .map((e) => ({ e, at: sweepCircle(old, b, e, b.r + e.r) }))
        .filter((hit) => Number.isFinite(hit.at))
        .sort((a, c) => a.at - c.at);
      for (const { e } of hits) {
        const shatter = e.brittle > 0 ? e._shatter || 0.45 : 0;
        damageEnemy(
          s,
          e,
          b.damage * (1 + shatter),
          s.players.find((p) => p.id === b.owner),
        );
        if (shatter) {
          e.brittle = 0;
          e._shatter = 0;
          effect(s, "shatter", e.x, e.y, b.color);
        }
        b._hits.push(e.id);
        if (b.pierce-- <= 0) {
          b.life = 0;
          break;
        }
        b.damage *= 0.9;
      }
    }
  }
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  s.shots = s.shots
    .filter(
      (b) => b.life > 0 && b.x > -30 && b.y > -30 && b.x < 1230 && b.y < 830,
    )
    .slice(-B.maxShots);
  s.echoes = s.echoes.filter((e) => e.life > 0);
  for (const f of s.flowers) f.life -= dt;
  s.flowers = s.flowers.filter((f) => f.life > 0);
  for (const e of s.effects) e.life -= dt;
  s.effects = s.effects.filter((e) => e.life > 0).slice(-B.maxEffects);
  for (const p of s.players) showMemory(s, p);
  if (!alive(s).length) {
    s.phase = "lost";
    return;
  }
  if (s.wave === WAVE_COUNT) {
    if (!s.enemies.some((e) => e.type === "warden")) {
      for (const p of s.players)
        if (p._waveTime + 1e-6 >= 10) p.wavesSurvived++;
      s.phase = "won";
      s.shots = [];
      s.enemies = [];
    }
  } else if (s.waveTime >= waveDuration(s.wave)) {
    for (const p of s.players) if (p._waveTime + 1e-6 >= 10) p.wavesSurvived++;
    s.phase = "draft";
    s.shots = [];
    s.enemies = [];
    s.echoes = [];
    s.choices = {};
    for (const p of s.players) s.choices[p.id] = rollChoices(s, p);
  }
}
export function snapshot(s) {
  return JSON.parse(
    JSON.stringify(s, (key, value) =>
      key.startsWith("_") ? undefined : value,
    ),
  );
}
