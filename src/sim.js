import { WORLD, WAVE_COUNT, WAVE_DURATION, BALANCE as B } from "./config.js";

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
    description: "Fire 20% faster.",
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
    description: "A circling blade cuts creatures around you.",
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
    description: "Cast echoes 20% more often.",
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
    description: "Flower bursts grow 25% wider and stronger.",
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
    description: "Threaded enemies are slowed by 45%.",
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
    description: "Catches charge every flower along your thread.",
    icon: "flower",
  },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, f = 0) => (Number.isFinite(v) ? v : f);
const count = (p, id) => p.upgrades.filter((x) => x === id).length;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
function random(s) {
  let t = (s._rng += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const uid = (s) => ++s._id;
const alive = (s) => s.players.filter((p) => !p.dead);
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
export function createGame(seed = 1) {
  return {
    version: 1,
    seed: finite(seed, 1) >>> 0,
    runNumber: 0,
    tick: 0,
    time: 0,
    phase: "lobby",
    wave: 0,
    waveTime: 0,
    players: [],
    enemies: [],
    shots: [],
    echoes: [],
    flowers: [],
    effects: [],
    choices: {},
    kills: 0,
    caught: 0,
    _rng: finite(seed, 1) >>> 0,
    _id: 0,
    _spawn: 0,
    _flower: 0,
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
    revive: 0,
    invulnerable: 2,
    aimX: 1,
    aimY: 0,
    traits: t,
    _history: [],
    _held: false,
    _fire: 0.2,
    _orbit: 0,
  };
  // New friends arrive with one useful upgrade per completed wave.
  for (let i = 1; i < s.wave; i++)
    p.upgrades.push(
      ["quick", "heavy", "fork", "bloom", "orbit", "pierce"][(i - 1) % 6],
    );
  s.players.push(p);
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
  const pool = UPGRADES.filter(
    (u) => count(p, u.id) < (u.id === "orbit" ? 3 : 4),
  );
  const result = [];
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
  s._spawn = 1.5;
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
    charge: 0.16,
    life: 35,
  });
}
function spawnEnemy(s, type) {
  const ps = alive(s);
  if (!ps.length || s.enemies.length >= B.maxEnemies) return;
  const p = ps[Math.floor(random(s) * ps.length)],
    a = random(s) * Math.PI * 2;
  let x = clamp(p.x + Math.cos(a) * 430, 25, WORLD.width - 25),
    y = clamp(p.y + Math.sin(a) * 320, 25, WORLD.height - 25);
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
  });
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
  for (let i = 0; i < n; i++)
    shot(
      s,
      p,
      origin.x,
      origin.y,
      angle + (i - (n - 1) / 2) * 0.14,
      false,
      B.shotDamage * (1 + 0.35 * count(p, "heavy")) * scale,
      2 * count(p, "pierce"),
    );
}
function damageEnemy(s, e, amount, p) {
  if (e.hp <= 0) return;
  e.hp -= amount;
  e.hit = 0.09;
  if (e.hp <= 0) {
    s.kills++;
    if (p) p.kills++;
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
function cast(s, p) {
  p.castAge = 0;
  p.castCooldown =
    B.castCooldown *
    Math.pow(0.8, count(p, "recall")) *
    (1 - 0.02 * p.traits.echo);
  const path = p._history.map((q) => ({ ...q }));
  if (!path.length) path.push({ x: p.x, y: p.y });
  const life = B.echoLife + 1.5 * count(p, "echo");
  s.echoes = s.echoes.filter((e) => e.owner !== p.id);
  s.echoes.push({
    id: uid(s),
    owner: p.id,
    x: path[0].x,
    y: path[0].y,
    life,
    maxLife: life,
    _path: path,
    _elapsed: 0,
    _fire: 0.3,
  });
  effect(s, "cast", p.x, p.y, p.color);
}
function bloom(s, f, p) {
  f.life = 0;
  const power = 1 + 0.25 * count(p, "bloom"),
    r = B.flowerRadius * power;
  effect(s, "bloom", f.x, f.y, p.color);
  s.effects.at(-1).radius = r;
  for (const e of s.enemies)
    if (dist2(f, e) < (r + e.r) ** 2)
      damageEnemy(s, e, (68 + 8 * s.wave) * power, p);
  for (const ally of s.players)
    if (!ally.dead && dist2(f, ally) < (r + 30) ** 2)
      ally.hp = Math.min(ally.maxHp, ally.hp + 3 + 5 * count(p, "heal"));
  s.shots = s.shots.filter((b) => !b.hostile || dist2(f, b) > r * r);
}
export function step(s, inputs = {}, dt = 1 / 30) {
  if (s.phase !== "playing" || !s.players.length) return;
  s.tick++;
  dt = clamp(finite(dt, 1 / 30), 0.001, 0.1);
  s.time += dt;
  s.waveTime += dt;
  for (const p of s.players) {
    p.hit = Math.max(0, p.hit - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.castCooldown = Math.max(0, p.castCooldown - dt);
    p.castAge = Math.min(999, (p.castAge ?? 999) + dt);
    const input = inputs?.[p.id] || {};
    if (p.dead) {
      p.vx = p.vy = 0;
      const friend = s.players.some(
        (q) => !q.dead && q.id !== p.id && dist2(p, q) < 65 ** 2,
      );
      p.revive = clamp(
        p.revive + (friend ? dt / B.reviveSeconds : -dt * 0.12),
        0,
        1,
      );
      if (p.revive >= 1) {
        p.dead = false;
        p.hp = p.maxHp * 0.5;
        p.invulnerable = 3;
        p.revive = 0;
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
    p.vx = x * speed;
    p.vy = y * speed;
    p.x = clamp(p.x + p.vx * dt, 18, WORLD.width - 18);
    p.y = clamp(p.y + p.vy * dt, 18, WORLD.height - 18);
    if (x) p.face = x > 0 ? 1 : -1;
    p._history.push({ x: p.x, y: p.y });
    if (p._history.length > 90) p._history.shift();
    const held = input.cast === true;
    if (held && !p._held && p.castCooldown <= 0) cast(s, p);
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
          if (dist2(o, e) < (e.r + 12) ** 2) damageEnemy(s, e, 58 * dt, p);
      }
  }
  if (!alive(s).length) {
    s.phase = "lost";
    return;
  }
  s._spawn -= dt;
  if (s._spawn <= 0) {
    const r = random(s);
    spawnEnemy(
      s,
      s.wave >= 3 && r < 0.19
        ? "thorn"
        : (s.wave >= 2 || s.waveTime > 15) && r < 0.49
          ? "moth"
          : "mite",
    );
    s._spawn =
      Math.max(0.28, 1.2 - s.wave * 0.09) / Math.pow(s.players.length, 0.28);
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
    const ps = alive(s);
    if (!ps.length) break;
    const p = ps.reduce((a, b) => (dist2(e, a) < dist2(e, b) ? a : b));
    const dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.hypot(dx, dy) || 1;
    e.face = dx > 0 ? 1 : -1;
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
    e.x = clamp(e.x + (dx / d) * base * move * dt, 10, 1190);
    e.y = clamp(e.y + (dy / d) * base * move * dt, 10, 790);
    for (const q of ps)
      if (dist2(e, q) < (e.r + 10) ** 2)
        hurt(s, q, e.type === "warden" ? 26 : 12 + s.wave);
    e._fire -= dt;
    if (e._fire <= 0 && e.type !== "mite") {
      const a = Math.atan2(dy, dx);
      if (e.type === "warden") {
        const n = 14;
        for (let j = 0; j < n; j++)
          shot(
            s,
            null,
            e.x,
            e.y,
            e.phase * 0.3 + (j * 6.283) / n,
            true,
            15,
            0,
            100 + s.wave * 3,
          );
        for (let j = -1; j <= 1; j++)
          shot(s, null, e.x, e.y, a + j * 0.16, true, 18, 0, 165);
        e._fire = e.hp < e.maxHp * 0.45 ? 1.35 : 2.1;
      } else {
        const n = e.type === "thorn" ? 3 : 1;
        for (let j = 0; j < n; j++)
          shot(
            s,
            null,
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
    }
    e.fireIn = Math.max(0, e._fire);
  }
  // A thread is the moving segment between a weaver and their remembered route.
  for (const e of s.echoes) {
    const p = s.players.find((p) => p.id === e.owner);
    if (!p || p.dead) {
      e.life = 0;
      continue;
    }
    e.life -= dt;
    e._elapsed += dt;
    const at = Math.min(e._path.length - 1, Math.floor(e._elapsed * 30 * 0.55));
    e.x = e._path[at].x;
    e.y = e._path[at].y;
    e._fire -= dt;
    if (count(p, "mirror") && e._fire <= 0) {
      fire(s, p, e, 0.65 * count(p, "mirror"));
      e._fire = 0.8;
    }
    const radius = B.threadRadius + 8 * count(p, "thread");
    for (const b of s.shots)
      if (
        b.hostile &&
        b.life > 0 &&
        segmentDistance(b.x, b.y, p, e) < radius + b.r
      ) {
        b.life = 0;
        s.caught++;
        effect(s, "catch", b.x, b.y, p.color);
        const candidates = s.flowers
          .filter((f) => f.life > 0 && segmentDistance(f.x, f.y, p, e) < 100)
          .sort((a, c) => dist2(a, b) - dist2(c, b));
        for (const f of count(p, "magnet")
          ? candidates
          : candidates.slice(0, 1))
          f.charge = Math.min(1, f.charge + 0.48);
      }
    for (const foe of s.enemies)
      if (foe.hp > 0 && segmentDistance(foe.x, foe.y, p, e) < foe.r + radius) {
        damageEnemy(s, foe, (12 + 10 * count(p, "thread")) * dt, p);
        if (count(p, "frost")) foe.slow = 0.7;
      }
    for (const f of s.flowers)
      if (f.life > 0 && segmentDistance(f.x, f.y, p, e) < radius + 13) {
        f.charge = Math.min(1, f.charge + dt * 0.48);
        if (f.charge >= 1) bloom(s, f, p);
      }
  }
  for (const b of s.shots) {
    if (b.life <= 0) continue;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.hostile) {
      for (const p of s.players)
        if (!p.dead && dist2(b, p) < (b.r + 8) ** 2) {
          hurt(s, p, b.damage);
          b.life = 0;
          break;
        }
    } else {
      for (const e of s.enemies)
        if (
          e.hp > 0 &&
          !b._hits.includes(e.id) &&
          dist2(b, e) < (b.r + e.r) ** 2
        ) {
          damageEnemy(
            s,
            e,
            b.damage,
            s.players.find((p) => p.id === b.owner),
          );
          b._hits.push(e.id);
          if (b.pierce-- <= 0) {
            b.life = 0;
            break;
          }
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
  if (!alive(s).length) {
    s.phase = "lost";
    return;
  }
  if (s.wave === WAVE_COUNT) {
    if (!s.enemies.some((e) => e.type === "warden")) {
      s.phase = "won";
      s.shots = [];
      s.enemies = [];
    }
  } else if (s.waveTime >= WAVE_DURATION) {
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
