import {
  WORLD,
  WAVE_COUNT,
  waveDuration,
  WAVES,
  PERMANENT,
  BALANCE as B,
} from "./config.js";
import {
  mapForWave,
  mapById,
  safePosition,
  moveInMap,
  lineBlocked,
  coverHit,
  steerAroundCover,
} from "./maps.js";
import { bodyCircle, weaponMuzzle, aimFromWeapon } from "./combat-geometry.js";

// IDs remain stable for existing saves and room input. Every object now has a
// museum rule; no movement history, old selves, or thread geometry is simulated.
export const UPGRADES = [
  {
    id: "fork",
    name: "Porcelain prism",
    description: "Launch one extra marble in a spread.",
    icon: "fork",
  },
  {
    id: "pierce",
    name: "Fossil arrowhead",
    description: "Marbles pass through two more exhibits.",
    icon: "needle",
  },
  {
    id: "quick",
    name: "Brass metronome",
    description: "Marbles and tin soldiers fire 20% sooner.",
    icon: "spark",
  },
  {
    id: "heavy",
    name: "Bronze paperweight",
    description: "Marbles deal 35% more damage.",
    icon: "needle",
  },
  {
    id: "orbit",
    name: "Miniature orrery",
    description: "An orbiting planet bumps exhibits and clears shots.",
    icon: "orbit",
  },
  {
    id: "echo",
    name: "Stiff bristles",
    description: "Sweeps deal 18 more damage and push exhibits farther.",
    icon: "echo",
  },
  {
    id: "recall",
    name: "Winding key",
    description: "Reduce broom cooldown by 20%.",
    icon: "echo",
  },
  {
    id: "thread",
    name: "Velvet rope",
    description: "Extend your sweep's reach.",
    icon: "thread",
  },
  {
    id: "bloom",
    name: "Conservator's cart",
    description: "Supply pulses grow 25% wider and stronger.",
    icon: "flower",
  },
  {
    id: "heal",
    name: "First-aid kit",
    description: "Sweeps heal nearby staff; supplies restore more health.",
    icon: "heart",
  },
  {
    id: "speed",
    name: "Roller skates",
    description: "Move 15% faster.",
    icon: "wing",
  },
  {
    id: "vitality",
    name: "Padded waistcoat",
    description: "Gain 30 maximum health and heal 40.",
    icon: "heart",
  },
  {
    id: "frost",
    name: "Glacier fragment",
    description: "Sweeps slow exhibits; marbles shatter them for extra damage.",
    icon: "snow",
  },
  {
    id: "mirror",
    name: "Tin soldier",
    description: "A toy companion fires marbles beside you.",
    icon: "echo",
  },
  {
    id: "thorns",
    name: "Jack-in-the-box",
    description: "Taking a hit launches a ring of marbles.",
    icon: "star",
  },
  {
    id: "magnet",
    name: "Visitor bell",
    description: "Cleared shots charge nearby carts and draw them closer.",
    icon: "flower",
  },
];
for (const u of UPGRADES) u.maxStacks = u.id === "orbit" ? 3 : 4;
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const finite = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const count = (p, id) => p.upgrades.filter((x) => x === id).length;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const alive = (s) => s.players.filter((p) => !p.dead);
const uid = (s) => ++s._id;
const freshStats = () => ({
  catches: 0,
  blooms: 0,
  healed: 0,
  revives: 0,
  resonances: 0,
  threadKills: 0,
});
function random(s) {
  let t = (s._rng += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function credit(s, p, key, amount = 1) {
  s.stats[key] += amount;
  if (p) p.stats[key] += amount;
}
function statsFor(p) {
  p.speed =
    B.speed *
    (1 + 0.15 * count(p, "speed") + PERMANENT.speedPerRank * p.traits.haste);
  p.sweepRadius = B.sweepRadius + 18 * count(p, "thread");
  p.sweepDamage = B.sweepDamage + 18 * count(p, "echo");
  p.cooldownDuration =
    B.castCooldown *
    Math.pow(0.8, count(p, "recall")) *
    (1 - PERMANENT.cooldownPerRank * p.traits.echo);
}
export function upgradePreview(p, id) {
  const value = (n) => {
    switch (id) {
      case "fork":
        return `${1 + n} marbles`;
      case "pierce":
        return `${1 + 2 * n} exhibits per marble`;
      case "quick":
        return `${(B.fireInterval * Math.pow(0.8, n)).toFixed(2)}s between volleys`;
      case "heavy":
        return `${Math.round(B.shotDamage * (1 + 0.35 * n))} marble damage`;
      case "orbit":
        return `${n} orbiting planets`;
      case "echo":
        return `${B.sweepDamage + 18 * n} sweep damage · ${Math.round(((B.sweepKnockback + 20 * n) / B.sweepKnockback) * 100)}% push`;
      case "recall":
        return `${(B.castCooldown * Math.pow(0.8, n) * (1 - PERMANENT.cooldownPerRank * (p.traits?.echo || 0))).toFixed(1)}s broom cooldown`;
      case "thread":
        return `${Math.round(((B.sweepRadius + 18 * n) / B.sweepRadius) * 100)}% sweep reach`;
      case "bloom":
        return `${100 + 25 * n}% supply reach · +${25 * n}% strength`;
      case "heal":
        return `${4 * n} sweep healing · ${12 + 6 * n} base supply healing`;
      case "speed":
        return `${Math.round((1 + 0.15 * n + PERMANENT.speedPerRank * (p.traits?.haste || 0)) * 100)}% movement speed`;
      case "vitality": {
        const added = n - count(p, id),
          maxHp = p.maxHp + 30 * added,
          hp = Math.min(maxHp, p.hp + 40 * added);
        return `${maxHp} maximum health · ${Math.round(Math.min(maxHp, Math.max(hp + maxHp * 0.32, maxHp * 0.55)))} after this break`;
      }
      case "frost":
        return n
          ? `${35 + 10 * n}% shatter bonus · ${(1.1 + 0.3 * n).toFixed(1)}s slow`
          : "No slow or shatter";
      case "mirror":
        return n
          ? `Companion fires beside you at ${Math.round((0.6 + 0.2 * (n - 1)) * 100)}% of your marble damage`
          : "No toy companion";
      case "thorns":
        return n ? `${24 * n} damage · 12 marbles on hit` : "No retaliation";
      case "magnet":
        return `${Math.round((0.45 + 0.07 * n) * 100)}% supply charge per cleared shot · ${Math.round(((220 + 40 * n) / 220) * 100)}% range`;
      default:
        return "";
    }
  };
  const synergy = {
    fork: "The tin soldier borrows your prism.",
    pierce: "Marbles lose 10% damage after each exhibit.",
    quick: "The tin soldier keeps your tempo.",
    heavy: "The tin soldier borrows your weight.",
    orbit: "Planet clears also charge supplies.",
    echo: "More force makes room for your marbles.",
    recall: "More sweeps make first-aid kits more useful.",
    thread: "Reach more exhibits, shots and supply carts.",
    bloom: "First-aid kits also strengthen the supply pulse.",
    heal: "Nearby colleagues share the healing.",
    speed: "Skate out after a sweep clears your path.",
    vitality: "Heal 40 now, then recover more between shifts.",
    frost: "Any staff member's next marble can shatter the slowed exhibit.",
    mirror: "Inherits prism, fossil, metronome and paperweight.",
    thorns: "Retaliation marbles can shatter slowed exhibits.",
    magnet: "Each stack draws carts from farther away.",
  };
  return {
    before: value(count(p, id)),
    after: value(count(p, id) + 1),
    synergy: synergy[id] || "",
  };
}
function effect(s, type, x, y, color = 0, extra = {}) {
  const life = type === "supply" ? 0.6 : 0.35;
  s.effects.push({
    id: uid(s),
    type,
    x,
    y,
    color,
    life,
    maxLife: life,
    ...extra,
  });
}
export function createGame(seed = 1) {
  return {
    version: 3,
    seed: finite(seed, 1) >>> 0,
    runNumber: 0,
    tick: 0,
    time: 0,
    phase: "lobby",
    wave: 0,
    mapId: mapForWave(1).id,
    waveTime: 0,
    waveDuration: waveDuration(0),
    players: [],
    enemies: [],
    shots: [],
    echoes: [],
    companions: [],
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
    _opening: 0,
  };
}
export function addPlayer(s, id, name = "Custodian", traits = {}) {
  if (typeof id !== "string" || !id || id.length > 80 || s.players.length >= 4)
    return null;
  const existing = s.players.find((p) => p.id === id);
  if (existing) return existing;
  const color = [0, 1, 2, 3].find((n) => !s.players.some((p) => p.color === n)),
    t = {};
  for (const key of ["vitality", "haste", "echo"])
    t[key] = clamp(Math.floor(finite(traits?.[key])), 0, 3);
  const p = {
    id,
    name: String(name).trim().slice(0, 18) || "Custodian",
    x: 600 + color * 24,
    y: 400,
    vx: 0,
    vy: 0,
    hp: B.playerHp + PERMANENT.healthPerRank * t.vitality,
    maxHp: B.playerHp + PERMANENT.healthPerRank * t.vitality,
    dead: false,
    color,
    face: 1,
    castCooldown: 0,
    castAge: 999,
    shotAge: 999,
    hit: 0,
    upgrades: [],
    kills: 0,
    stats: freshStats(),
    wavesSurvived: 0,
    runTicks: 0,
    joinedWave: s.wave,
    revive: 0,
    invulnerable: 2,
    aimX: 1,
    aimY: 0,
    traits: t,
    _fire: 0.2,
    _orbit: 0,
    _waveTime: 0,
    _castBuffer: 0,
  };
  for (let i = 1; i < s.wave; i++)
    p.upgrades.push(
      ["quick", "heavy", "fork", "bloom", "orbit", "pierce"][(i - 1) % 6],
    );
  Object.assign(p, safePosition(mapById(s.mapId), p, 10, 18));
  statsFor(p);
  s.players.push(p);
  if (s.phase === "draft") s.choices[id] = rollChoices(s, p);
  return p;
}
export function removePlayer(s, id) {
  s.players = s.players.filter((p) => p.id !== id);
  s.companions = s.companions.filter((p) => p.owner !== id);
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
    })),
    runNumber = (s.runNumber || 0) + 1;
  Object.assign(s, createGame(s.seed));
  s.runNumber = runNumber;
  for (const p of ps) addPlayer(s, p.id, p.name, p.traits);
  nextWave(s);
  return true;
}
function rollChoices(s, p) {
  const pool = UPGRADES.filter((u) => count(p, u.id) < u.maxStacks);
  const pairs = {
    fork: ["pierce", "heavy", "mirror"],
    pierce: ["fork", "frost"],
    quick: ["mirror", "heavy"],
    heavy: ["fork", "mirror"],
    orbit: ["magnet", "speed"],
    echo: ["thread", "recall"],
    recall: ["echo", "heal"],
    thread: ["echo", "frost"],
    bloom: ["heal", "magnet"],
    heal: ["bloom", "recall"],
    frost: ["thread", "pierce"],
    mirror: ["quick", "fork", "heavy"],
    magnet: ["bloom", "orbit"],
  };
  const related = [...new Set(p.upgrades.flatMap((id) => pairs[id] || []))],
    linked = pool.filter((u) => related.includes(u.id)),
    result = [];
  if (linked.length) {
    const u = linked[Math.floor(random(s) * linked.length)];
    result.push(u.id);
    pool.splice(pool.indexOf(u), 1);
  }
  while (result.length < 3 && pool.length)
    result.push(pool.splice(Math.floor(random(s) * pool.length), 1)[0].id);
  return result;
}
export function chooseUpgrade(s, id, upgradeId) {
  const p = s.players.find((p) => p.id === id);
  if (s.phase !== "draft" || !p || !s.choices[id]?.includes(upgradeId))
    return false;
  p.upgrades.push(upgradeId);
  if (upgradeId === "vitality") {
    p.maxHp += 30;
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  statsFor(p);
  delete s.choices[id];
  if (!Object.keys(s.choices).length) nextWave(s);
  return true;
}
function nextWave(s) {
  s.wave++;
  s.phase = "playing";
  s.waveTime = 0;
  s.waveDuration = waveDuration(s.wave);
  const gallery = mapForWave(s.wave),
    relocate = s.mapId !== gallery.id;
  s.mapId = gallery.id;
  s._spawn = s.wave === 1 ? 0.7 : 1.5;
  s._opening = 0;
  s.shots = [];
  s.enemies = [];
  s.echoes = [];
  s.companions = [];
  s.flowers = [];
  s._flower = 0;
  for (const p of s.players) {
    if (relocate)
      Object.assign(
        p,
        safePosition(
          gallery,
          { x: gallery.spawn.x + (p.color - 1.5) * 30, y: gallery.spawn.y },
          10,
          18,
        ),
      );
    p.dead = false;
    p.hp = Math.min(p.maxHp, Math.max(p.hp + p.maxHp * 0.32, p.maxHp * 0.55));
    p.revive = 0;
    p.invulnerable = 2;
    p.castCooldown = 0;
    p.castAge = 999;
    p.shotAge = 999;
    p._waveTime = 0;
    p._castBuffer = 0;
    statsFor(p);
  }
  for (let i = 0; i < 5; i++) spawnSupply(s);
  if (s.wave === WAVE_COUNT) spawnEnemy(s, "warden");
}
function spawnSupply(s) {
  if (s.flowers.length >= B.maxFlowers || !s.players.length) return;
  const p = s.players[Math.floor(random(s) * s.players.length)],
    a = random(s) * Math.PI * 2,
    r = 65 + random(s) * 230;
  const position = safePosition(
    mapById(s.mapId),
    {
      x: clamp(p.x + Math.cos(a) * r, 45, WORLD.width - 45),
      y: clamp(p.y + Math.sin(a) * r, 45, WORLD.height - 45),
    },
    14,
    45,
  );
  s.flowers.push({
    id: uid(s),
    kind: "supply",
    ...position,
    charge: 0.7,
    life: 45,
  });
}
function spawnEnemy(s, type, formation = null) {
  const ps = alive(s);
  if (!ps.length || s.enemies.length >= B.maxEnemies) return;
  const p = formation?.player || ps[Math.floor(random(s) * ps.length)],
    a = random(s) * Math.PI * 2;
  let x = clamp(
    formation?.x ?? p.x + Math.cos(a) * (s.wave === 1 ? 270 : 430),
    25,
    WORLD.width - 25,
  );
  let y = clamp(
    formation?.y ?? p.y + Math.sin(a) * (s.wave === 1 ? 210 : 320),
    25,
    WORLD.height - 25,
  );
  if (Math.hypot(x - p.x, y - p.y) < 150) {
    x = p.x < 600 ? 1150 : 50;
    y = 50 + random(s) * 700;
  }
  const hp =
    type === "warden"
      ? 1350 * (1 + 0.6 * (s.players.length - 1))
      : { mite: 27, moth: 38, thorn: 70 }[type] *
        (1 + (s.wave - 1) * 0.12) *
        (1 + 0.1 * (s.players.length - 1));
  const radius = type === "warden" ? 29 : type === "thorn" ? 15 : 10,
    position = safePosition(mapById(s.mapId), { x, y }, radius, radius);
  s.enemies.push({
    id: uid(s),
    type,
    ...position,
    hp,
    maxHp: hp,
    r: radius,
    hit: 0,
    phase: random(s) * 6.28,
    face: 1,
    slow: 0,
    brittle: 0,
    stagger: 0,
    stage: type === "warden" ? 1 : 0,
    attack: type === "warden" ? "ring" : type === "thorn" ? "fan" : "needle",
    shotAge: 999,
    aimX: 1,
    aimY: 0,
    _fire: type === "warden" ? 2 : 1 + random(s) * 2,
    _locked: false,
    _shatter: 0,
  });
}
function openingPair(s) {
  const ps = alive(s);
  if (!ps.length) return;
  const p = ps[Math.floor(random(s) * ps.length)],
    a =
      (Math.hypot(p.vx, p.vy) > 1
        ? Math.atan2(p.vy, p.vx)
        : Math.atan2(p.aimY, p.aimX)) + Math.PI;
  for (const side of [-1, 1]) {
    const before = s.enemies.length;
    spawnEnemy(s, "moth", {
      player: p,
      x: p.x + Math.cos(a) * 260 - Math.sin(a) * 70 * side,
      y: p.y + Math.sin(a) * 260 + Math.cos(a) * 70 * side,
    });
    if (s.enemies.length > before)
      s.enemies.at(-1)._fire = side === -1 ? 0.8 : 1;
  }
}
function target(s, origin) {
  let best = null,
    distance = Infinity;
  const map = mapById(s.mapId);
  for (const e of s.enemies)
    if (
      e.hp > 0 &&
      dist2(bodyCircle(origin), bodyCircle(e)) < distance &&
      !lineBlocked(map, bodyCircle(origin), bodyCircle(e), 3)
    ) {
      distance = dist2(bodyCircle(origin), bodyCircle(e));
      best = e;
    }
  return best;
}
function shot(
  s,
  owner,
  origin,
  angle,
  hostile = false,
  damage = B.shotDamage,
  pierce = 0,
  speed = 360,
  mode = "weapon",
) {
  if (s.shots.length >= B.maxShots) return false;
  const center = bodyCircle(origin),
    muzzle =
      mode === "burst"
        ? center
        : weaponMuzzle(
            origin,
            mode === "radial"
              ? { x: Math.cos(angle), y: Math.sin(angle) }
              : null,
          );
  const radius = hostile ? 4 : 3,
    map = mapById(s.mapId),
    wall = coverHit(map, center, muzzle, radius);
  if (Number.isFinite(wall)) {
    effect(
      s,
      "chip",
      center.x + (muzzle.x - center.x) * wall,
      center.y + (muzzle.y - center.y) * wall,
      owner?.color ?? 0,
    );
    return false;
  }
  s.shots.push({
    id: uid(s),
    owner: owner?.id ?? null,
    source: hostile ? (owner?.id ?? null) : null,
    x: muzzle.x,
    y: muzzle.y,
    originX: muzzle.x,
    originY: muzzle.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    hostile,
    damage,
    pierce,
    r: radius,
    color: owner?.color ?? 0,
    life: hostile ? 7 : 2.2,
    _hits: [],
  });
  return true;
}
function fire(s, p, origin = p, scale = 1) {
  const e = target(s, origin);
  if (!e) return;
  const aim = aimFromWeapon(origin, e),
    a = aim.angle,
    n = 1 + count(p, "fork");
  origin.aimX = aim.dx;
  origin.aimY = aim.dy;
  if (origin.type === "soldier") origin.face = aim.dx < 0 ? -1 : 1;
  let fired = false;
  for (let i = 0; i < n; i++)
    fired =
      shot(
        s,
        p,
        origin,
        a + (i - (n - 1) / 2) * 0.14,
        false,
        B.shotDamage * (1 + 0.35 * count(p, "heavy")) * scale,
        2 * count(p, "pierce"),
      ) || fired;
  if (fired) origin.shotAge = 0;
}
function damageEnemy(s, e, amount, p, source = "marble") {
  if (e.hp <= 0) return;
  e.hp -= amount;
  e.hit = 0.09;
  if (e.hp <= 0) {
    s.kills++;
    if (p) p.kills++;
    if (source === "sweep") credit(s, p, "threadKills");
    effect(s, "death", e.x, e.y, p?.color ?? 0);
  }
}
function hurt(s, p, amount) {
  if (p.dead || p.invulnerable > 0) return;
  p.hp -= amount;
  p.hit = 0.3;
  p.invulnerable = 0.85;
  effect(s, "hit", p.x, p.y, p.color);
  const n = count(p, "thorns");
  if (n)
    for (let i = 0; i < 12; i++)
      shot(s, p, p, (i * Math.PI) / 6, false, 24 * n, 1, 360, "burst");
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    p.revive = 0;
    s.companions = s.companions.filter((c) => c.owner !== p.id);
  }
}
function healPlayer(s, healer, ally, amount) {
  const healed = Math.min(Math.max(0, ally.maxHp - ally.hp), amount);
  if (!healed || ally.dead) return;
  ally.hp += healed;
  credit(s, healer, "healed", healed);
  effect(s, "heal", ally.x, ally.y, ally.color);
}
function clearShot(s, b, p) {
  if (!b.hostile || b.life <= 0) return;
  b.life = 0;
  s.caught++;
  credit(s, p, "catches");
  effect(s, "catch", b.x, b.y, p.color);
  const bell = count(p, "magnet"),
    radius = 220 + 40 * bell;
  const carts = s.flowers
    .filter((f) => f.life > 0 && dist2(f, b) < radius ** 2)
    .sort((a, c) => dist2(a, b) - dist2(c, b));
  for (const f of bell ? carts : carts.slice(0, 1))
    f.charge = Math.min(1, f.charge + 0.45 + 0.07 * bell);
}
function sweep(s, p) {
  statsFor(p);
  p.castCooldown = p.cooldownDuration;
  p.castAge = 0;
  p.invulnerable = Math.max(p.invulnerable, 0.22);
  const radius = p.sweepRadius,
    map = mapById(s.mapId);
  effect(s, "sweep", p.x, p.y, p.color, { radius, owner: p.id });
  for (const b of s.shots)
    if (
      b.hostile &&
      b.life > 0 &&
      dist2(p, b) <= (radius + b.r) ** 2 &&
      !lineBlocked(map, p, b)
    )
      clearShot(s, b, p);
  for (const e of s.enemies)
    if (
      e.hp > 0 &&
      dist2(p, bodyCircle(e)) <= (radius + bodyCircle(e).r) ** 2 &&
      !lineBlocked(map, p, bodyCircle(e))
    ) {
      damageEnemy(s, e, p.sweepDamage, p, "sweep");
      const dx = e.x - p.x,
        dy = e.y - p.y,
        length = Math.hypot(dx, dy),
        a = length > 0 ? Math.atan2(dy, dx) : Math.atan2(p.aimY, p.aimX);
      const force =
        (B.sweepKnockback + 20 * count(p, "echo")) *
        (e.type === "warden" ? 0.35 : 1);
      Object.assign(
        e,
        moveInMap(map, e, Math.cos(a) * force, Math.sin(a) * force, e.r),
      );
      e.stagger = Math.max(
        e.stagger || 0,
        B.sweepStagger * (e.type === "warden" ? 0.5 : 1),
      );
      const frost = count(p, "frost");
      if (frost) {
        e.slow = 1.1 + 0.3 * frost;
        e.brittle = e.slow;
        e._shatter = Math.max(e._shatter || 0, 0.35 + 0.1 * frost);
      }
    }
  for (const f of s.flowers)
    if (
      f.life > 0 &&
      dist2(p, f) <= (radius + 16) ** 2 &&
      !lineBlocked(map, p, f)
    )
      f.charge = Math.min(1, f.charge + 0.4);
  let protectedFriend = false;
  const kit = count(p, "heal");
  for (const ally of s.players)
    if (dist2(p, ally) <= radius ** 2 && !lineBlocked(map, p, ally)) {
      if (ally.dead) {
        if (kit) ally.revive = Math.min(0.95, ally.revive + 0.08 * kit);
        continue;
      }
      if (kit) healPlayer(s, p, ally, 4 * kit);
      if (ally.id !== p.id) {
        ally.invulnerable = Math.max(ally.invulnerable, 0.35);
        ally.stats.resonances++;
        protectedFriend = true;
        effect(s, "resonance", ally.x, ally.y, ally.color);
      }
    }
  if (protectedFriend) credit(s, p, "resonances");
}
function supplyPulse(s, f, p) {
  f.life = 0;
  credit(s, p, "blooms");
  const power = 1 + 0.25 * count(p, "bloom"),
    radius = B.supplyRadius * power;
  effect(s, "supply", f.x, f.y, p.color, { radius });
  const map = mapById(s.mapId);
  for (const ally of s.players)
    if (dist2(f, ally) <= (radius + 20) ** 2 && !lineBlocked(map, f, ally)) {
      if (ally.dead)
        ally.revive = Math.min(
          0.95,
          ally.revive + 0.12 + 0.06 * count(p, "heal"),
        );
      else healPlayer(s, p, ally, (12 + 6 * count(p, "heal")) * power);
    }
  for (const b of s.shots)
    if (
      b.hostile &&
      b.life > 0 &&
      dist2(f, b) <= radius ** 2 &&
      !lineBlocked(map, f, b)
    )
      clearShot(s, b, p);
  for (const e of s.enemies)
    if (
      e.hp > 0 &&
      dist2(f, bodyCircle(e)) <= (radius + bodyCircle(e).r) ** 2 &&
      !lineBlocked(map, f, bodyCircle(e))
    )
      damageEnemy(s, e, (24 + 6 * s.wave) * power, p, "supply");
}
function sweepCircle(a, b, center, radius) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    x = a.x - center.x,
    y = a.y - center.y,
    c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const length = dx * dx + dy * dy,
    dot = x * dx + y * dy,
    discriminant = dot * dot - length * c;
  if (!length || discriminant < 0) return Infinity;
  const t = (-dot - Math.sqrt(discriminant)) / length;
  return t >= 0 && t <= 1 ? t : Infinity;
}
function updateCompanions(s, dt) {
  const map = mapById(s.mapId);
  s.companions = s.companions.filter((c) =>
    s.players.some((p) => p.id === c.owner && !p.dead && count(p, "mirror")),
  );
  for (const p of alive(s)) {
    const n = count(p, "mirror");
    if (!n) continue;
    let c = s.companions.find((c) => c.owner === p.id);
    if (!c) {
      c = {
        id: uid(s),
        owner: p.id,
        type: "soldier",
        ...safePosition(map, { x: p.x - p.face * 25, y: p.y + 10 }, 6),
        fireIn: 0.2,
        shotAge: 999,
        aimX: p.aimX,
        aimY: p.aimY,
        face: p.face,
        _fire: 0.2,
      };
      s.companions.push(c);
    }
    const follow = 1 - Math.exp(-dt * 9),
      goal = safePosition(map, { x: p.x - p.face * 25, y: p.y + 10 }, 6);
    Object.assign(
      c,
      moveInMap(map, c, (goal.x - c.x) * follow, (goal.y - c.y) * follow, 6),
    );
    c._fire -= dt;
    c.shotAge = Math.min(999, (c.shotAge ?? 999) + dt);
    if (c._fire <= 0) {
      fire(s, p, c, 0.6 + 0.2 * (n - 1));
      c._fire = 0.9 * Math.pow(0.8, count(p, "quick"));
    }
    c.fireIn = Math.max(0, c._fire);
  }
}
export function step(s, inputs = {}, dt = 1 / 30) {
  if (s.phase !== "playing" || !s.players.length) return;
  dt = clamp(finite(dt, 1 / 30), 0.001, 0.1);
  s.tick++;
  s.time += dt;
  s.waveTime += dt;
  const map = mapById(s.mapId);
  for (const p of s.players) {
    p.runTicks++;
    p._waveTime += dt;
    p.hit = Math.max(0, p.hit - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.castCooldown = Math.max(0, p.castCooldown - dt);
    p.castAge = Math.min(999, p.castAge + dt);
    p.shotAge = Math.min(999, (p.shotAge ?? 999) + dt);
    const input = inputs?.[p.id] || {};
    if (p.dead) {
      p.vx = p.vy = 0;
      const friends = s.players.filter(
        (q) =>
          !q.dead &&
          q.id !== p.id &&
          dist2(p, q) < 65 ** 2 &&
          !lineBlocked(map, p, q),
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
        effect(s, "heal", p.x, p.y, p.color);
      }
      continue;
    }
    let x = clamp(finite(input.x), -1, 1),
      y = clamp(finite(input.y), -1, 1),
      length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    statsFor(p);
    p.vx = x * p.speed;
    p.vy = y * p.speed;
    Object.assign(p, moveInMap(map, p, p.vx * dt, p.vy * dt, 10, 18));
    if (x) p.face = x > 0 ? 1 : -1;
    if (input.cast === true) p._castBuffer = 0.22;
    if (p._castBuffer > 0 && p.castCooldown <= 0) {
      sweep(s, p);
      p._castBuffer = 0;
    }
    p._castBuffer = Math.max(0, p._castBuffer - dt);
    p._fire -= dt;
    if (p._fire <= 0) {
      fire(s, p);
      p._fire = B.fireInterval * Math.pow(0.8, count(p, "quick"));
    }
    p._orbit += dt * 2.7;
    p.orbitPhase = p._orbit;
    const planets = count(p, "orbit");
    for (let i = 0; i < planets; i++) {
      const a = p._orbit + (i * Math.PI * 2) / planets,
        o = { x: p.x + Math.cos(a) * 49, y: p.y + Math.sin(a) * 49 };
      for (const e of s.enemies)
        if (
          dist2(o, bodyCircle(e)) < (bodyCircle(e).r + 12) ** 2 &&
          !lineBlocked(map, p, bodyCircle(e))
        )
          damageEnemy(s, e, 58 * dt, p, "planet");
      for (const b of s.shots)
        if (
          b.hostile &&
          b.life > 0 &&
          !lineBlocked(map, p, b) &&
          Number.isFinite(
            sweepCircle(
              b,
              { x: b.x + b.vx * dt, y: b.y + b.vy * dt },
              o,
              b.r + 12,
            ),
          )
        )
          clearShot(s, b, p);
    }
  }
  if (!alive(s).length) {
    s.phase = "lost";
    return;
  }
  updateCompanions(s, dt);
  s._spawn -= dt;
  if (s.wave === 1 && s._opening < 2 && s.waveTime >= [4, 13][s._opening]) {
    openingPair(s);
    s._opening++;
  }
  if (s._spawn <= 0) {
    const wave = WAVES[Math.min(WAVES.length - 1, s.wave - 1)],
      pulse = s.waveTime % 18 < 5 ? 0.88 : 1.1;
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
    spawnSupply(s);
    s._flower = 4;
  }
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.shotAge = Math.min(999, (e.shotAge ?? 999) + dt);
    e.phase += dt;
    e.slow = Math.max(0, e.slow - dt);
    e.brittle = Math.max(0, (e.brittle || 0) - dt);
    e.stagger = Math.max(0, (e.stagger || 0) - dt);
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
    }
    const base =
      { mite: 48, moth: 39, thorn: 25, warden: 22 }[e.type] *
      (1 + s.wave * 0.055) *
      (e.slow > 0 ? 0.55 : 1) *
      (e.stagger > 0 ? 0 : 1);
    const obstructed = lineBlocked(map, e, p, e.r + 2),
      goal = obstructed ? steerAroundCover(map, e, p, e.r) : p;
    const nx = goal.x - e.x,
      ny = goal.y - e.y,
      nd = Math.hypot(nx, ny) || 1;
    const move = obstructed
      ? 1
      : e.type === "moth" && d < 200
        ? -0.25
        : e.type === "thorn" && d < 230
          ? 0
          : 1;
    const strafe =
        e.type === "moth" && d < 260 ? Math.sin(e.phase * 0.8) * 0.8 : 0,
      stride = e.type === "warden" ? 1 + 0.2 * (e.stage - 1) : 1;
    Object.assign(
      e,
      moveInMap(
        map,
        e,
        ((nx / nd) * move * stride - (ny / nd) * strafe) * base * dt,
        ((ny / nd) * move * stride + (nx / nd) * strafe) * base * dt,
        e.r,
      ),
    );
    for (const q of ps)
      if (
        dist2(bodyCircle(e), bodyCircle(q)) <
          (bodyCircle(e).r + bodyCircle(q).r) ** 2 &&
        !lineBlocked(map, bodyCircle(e), bodyCircle(q))
      )
        hurt(s, q, e.type === "warden" ? 26 : 12 + s.wave);
    e._fire -= e.stagger > 0 ? 0 : dt;
    if (!e._locked && e._fire <= 0.65 && e.type !== "mite") {
      const aim = aimFromWeapon(e, p);
      e.aimX = aim.dx;
      e.aimY = aim.dy;
      e._locked = true;
    }
    if (e._fire <= 0 && e.type !== "mite" && e.stagger <= 0) {
      const beforeShots = s.shots.length;
      const a = Math.atan2(e.aimY, e.aimX);
      if (e.type === "warden") {
        const n = e.stage === 1 ? 12 : e.stage === 2 ? 8 : 16;
        for (let j = 0; j < n; j++)
          shot(
            s,
            e,
            e,
            e.phase * (e.stage === 3 ? 0.65 : 0.3) + (j * Math.PI * 2) / n,
            true,
            15,
            0,
            e.stage === 3 ? 140 : 110,
            "radial",
          );
        const fan = e.stage === 1 ? 0 : e.stage === 2 ? 2 : 1;
        for (let j = -fan; j <= fan; j++)
          shot(s, e, e, a + j * 0.2, true, 18, 0, 155 + 10 * e.stage);
        e._fire = [2.4, 2.05, 1.75][e.stage - 1];
      } else {
        const n = e.type === "thorn" ? 3 : 1;
        for (let j = 0; j < n; j++)
          shot(
            s,
            e,
            e,
            a + (j - (n - 1) / 2) * 0.22,
            true,
            11 + s.wave,
            0,
            95 + s.wave * 5,
          );
        e._fire = e.type === "thorn" ? 2.9 : 3.4;
      }
      if (s.shots.length > beforeShots) e.shotAge = 0;
      e._locked = false;
    }
    e.fireIn = Math.max(0, e._fire);
  }
  for (const f of s.flowers) {
    if (f.life <= 0) continue;
    const ps = alive(s);
    if (!ps.length) break;
    const p = ps.reduce((a, b) => (dist2(f, a) < dist2(f, b) ? a : b)),
      bell = count(p, "magnet");
    if (bell && dist2(p, f) < (150 + 50 * bell) ** 2) {
      const d = Math.hypot(p.x - f.x, p.y - f.y) || 1,
        pull = (8 + 2 * bell) * dt;
      if (d > 30)
        Object.assign(
          f,
          moveInMap(
            map,
            f,
            ((p.x - f.x) / d) * pull,
            ((p.y - f.y) / d) * pull,
            14,
            45,
          ),
        );
    }
    if (dist2(p, f) <= 110 ** 2 && !lineBlocked(map, p, f))
      f.charge = Math.min(1, f.charge + dt * 0.3);
    if (f.charge >= 1) supplyPulse(s, f, p);
    f.life -= dt;
  }
  for (const b of s.shots) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const old = { x: b.x, y: b.y };
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const wall = coverHit(map, old, b, b.r);
    if (b.hostile) {
      const hits = alive(s)
        .map((p) => ({
          p,
          at: sweepCircle(old, b, bodyCircle(p), b.r + bodyCircle(p).r),
        }))
        .filter((hit) => Number.isFinite(hit.at) && hit.at < wall)
        .sort((a, c) => a.at - c.at);
      if (hits.length) {
        hurt(s, hits[0].p, b.damage);
        b.life = 0;
      }
    } else {
      const hits = s.enemies
        .filter((e) => e.hp > 0 && !b._hits.includes(e.id))
        .map((e) => ({
          e,
          at: sweepCircle(old, b, bodyCircle(e), b.r + bodyCircle(e).r),
        }))
        .filter((hit) => Number.isFinite(hit.at) && hit.at < wall)
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
    if (Number.isFinite(wall) && b.life > 0) {
      b.life = 0;
      effect(
        s,
        "chip",
        old.x + (b.x - old.x) * wall,
        old.y + (b.y - old.y) * wall,
        b.color,
      );
    }
  }
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  s.shots = s.shots
    .filter(
      (b) =>
        b.life > 0 &&
        b.x > -30 &&
        b.y > -30 &&
        b.x < WORLD.width + 30 &&
        b.y < WORLD.height + 30,
    )
    .slice(-B.maxShots);
  s.flowers = s.flowers.filter((f) => f.life > 0);
  for (const e of s.effects) e.life -= dt;
  s.effects = s.effects.filter((e) => e.life > 0).slice(-B.maxEffects);
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
    s.companions = [];
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
