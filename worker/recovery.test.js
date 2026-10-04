import test from "node:test";
import assert from "node:assert/strict";
import worker, { Room } from "./index.js";
import { addPlayer, startGame, step } from "../src/sim.js";
function context(store = new Map()) {
  const ctx = {
    pending: [],
    ready: null,
    storage: {
      get: async (key) => store.get(key),
      put: async (key, value) => store.set(key, structuredClone(value)),
      setAlarm: async () => {},
      delete: async (key) => store.delete(key),
    },
    blockConcurrencyWhile: (fn) => {
      ctx.ready = fn();
    },
    waitUntil: (promise) => ctx.pending.push(promise),
  };
  return ctx;
}

test("purchased traits wait for authorized restart and survive private recovery and reconnect", async (t) => {
  const originals = new Map();
  for (const [key, value] of Object.entries({
    WebSocketPair: class {
      constructor() {
        const socket = () => ({
          accept() {},
          addEventListener() {},
          send() {},
          close() {},
        });
        this[0] = socket();
        this[1] = socket();
      }
    },
    Response: class {
      constructor(body, init) {
        Object.assign(this, init);
      }
    },
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  t.after(() => {
    for (const [key, descriptor] of originals)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  });
  const store = new Map(),
    ctx = context(store),
    room = new Room(ctx);
  await ctx.ready;
  t.after(() => clearInterval(room.timer));
  const join = (target, token, traits = {}) => {
    const url = new URL("https://example.test/room/test-room?protocol=3");
    url.searchParams.set("traits", JSON.stringify(traits));
    if (token) url.searchParams.set("token", token);
    target.fetch(new Request(url));
  };
  const message = (target, peer, value) =>
    target.message(peer, peer.socket, { data: JSON.stringify(value) });
  join(room, null, { vitality: 1, haste: 99 });
  const host = room.sessions.get(room.hostId);
  assert.deepEqual(host.pendingTraits, { vitality: 1, haste: 3, echo: 0 });
  join(room);
  const guest = [...room.sessions.values()].find((p) => p.id !== host.id);
  message(room, host, { type: "start" });
  const active = structuredClone(room.game.players);
  message(room, host, {
    type: "traits",
    traits: { vitality: 99, haste: -1, echo: 2.9 },
  });
  message(room, guest, {
    type: "traits",
    traits: { vitality: 2, haste: 1, echo: 1 },
  });
  assert.deepEqual(
    room.game.players,
    active,
    "purchase does not alter current HP, stats, or active traits",
  );
  message(room, host, { type: "start" });
  assert.deepEqual(
    room.game.players,
    active,
    "even host cannot apply purchases during active play",
  );
  room.disconnect(host, host.socket);
  await Promise.all(ctx.pending);
  const nextCtx = context(store),
    recovered = new Room(nextCtx);
  await nextCtx.ready;
  t.after(() => clearInterval(recovered.timer));
  const restored = recovered.sessions.get(host.id);
  assert.deepEqual(restored.pendingTraits, { vitality: 3, haste: 0, echo: 2 });
  assert.deepEqual(
    recovered.game.players,
    active,
    "recovery retains current-run stats unchanged",
  );
  join(recovered, host.token, { vitality: 0 });
  assert.equal(
    recovered.sessions.size,
    2,
    "token reconnect reuses original seat",
  );
  assert.deepEqual(
    restored.pendingTraits,
    { vitality: 3, haste: 0, echo: 2 },
    "stale reconnect URL does not erase pending purchases",
  );
  recovered.game.phase = "lost";
  const restoredGuest = recovered.sessions.get(guest.id);
  message(recovered, restoredGuest, { type: "start" });
  assert.equal(
    recovered.game.phase,
    "lost",
    "non-host cannot consume staged traits",
  );
  message(recovered, restored, { type: "start" });
  assert.equal(recovered.game.phase, "playing");
  const nextHost = recovered.game.players.find((p) => p.id === host.id);
  const nextGuest = recovered.game.players.find((p) => p.id === guest.id);
  assert.deepEqual(nextHost.traits, { vitality: 3, haste: 0, echo: 2 });
  assert.deepEqual(nextGuest.traits, { vitality: 2, haste: 1, echo: 1 });
  assert.equal(nextHost.maxHp, active.find((p) => p.id === host.id).maxHp + 20);
  assert.equal(nextHost.hp, nextHost.maxHp);
  await Promise.all(nextCtx.pending);
});
test("private checkpoint restores simulation internals and reconnect identity", async () => {
  const store = new Map();
  const firstContext = context(store);
  const first = new Room(firstContext);
  await firstContext.ready;
  addPlayer(first.game, "host", "Ada");
  startGame(first.game);
  for (let i = 0; i < 40; i++)
    step(first.game, { host: { x: 1, y: 0, cast: i === 39 } });
  first.hostId = "host";
  first.sessions.set("host", {
    id: "host",
    token: "opaque-secret",
    socket: null,
  });
  first.checkpoint();
  await Promise.all(firstContext.pending);
  assert.equal(store.get("checkpoint").protocol, 3);
  assert.equal(store.get("checkpoint").game.version, 3);
  // Missing pending-purchase metadata falls back to active purchased traits.
  delete store.get("checkpoint").peers[0].pendingTraits;
  const nextContext = context(store);
  const next = new Room(nextContext);
  await nextContext.ready;
  assert.deepEqual(next.game, first.game);
  assert.equal(next.sessions.get("host").token, "opaque-secret");
  assert.equal(next.sessions.get("host").socket, null);
  assert.deepEqual(
    next.sessions.get("host").pendingTraits,
    first.game.players[0].traits,
  );
  assert.equal(next.hostId, "host");
  step(first.game, { host: { x: 0, y: 1, cast: false } });
  step(next.game, { host: { x: 0, y: 1, cast: false } });
  assert.deepEqual(
    next.game,
    first.game,
    "recovered simulation evolves identically",
  );
});

test("recovery fails closed for incompatible checkpoint protocol or simulation", async () => {
  for (const mismatch of [
    { protocol: 2, version: 3 },
    { protocol: 3, version: 2 },
  ]) {
    const saved = {
      protocol: mismatch.protocol,
      savedAt: Date.now(),
      game: { version: mismatch.version, players: [] },
      peers: [],
    };
    const store = new Map([["checkpoint", saved]]),
      ctx = context(store),
      room = new Room(ctx);
    await ctx.ready;
    assert.match(room.recoveryError, /older game/);
    assert.equal(room.sessions.size, 0);
    assert.equal(
      store.get("checkpoint"),
      saved,
      "incompatible recovery is preserved, not overwritten",
    );
  }
});

test("worker advertises protocol 3 and echoes only bounded ping IDs", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/health"),
    {},
  );
  assert.equal((await response.json()).protocol, 3);
  const ctx = context(),
    room = new Room(ctx);
  await ctx.ready;
  const sent = [],
    socket = { send: (value) => sent.push(JSON.parse(value)), close() {} };
  const peer = { socket, count: 0, countAt: Date.now() };
  room.message(peer, socket, {
    data: JSON.stringify({ type: "ping", id: 42 }),
  });
  room.message(peer, socket, {
    data: JSON.stringify({ type: "ping", id: "unbounded" }),
  });
  assert.deepEqual(sent, [{ type: "pong", id: 42 }]);
});
test("rename is scoped to the sender and disconnected host hands control to a connected peer", async () => {
  const ctx = context();
  const room = new Room(ctx);
  await ctx.ready;
  const socket = () => ({ send() {}, close() {} });
  const host = {
    id: "host",
    token: "h",
    socket: socket(),
    disconnected: null,
    input: {},
    count: 0,
    countAt: Date.now(),
    lastSeen: Date.now(),
  };
  const guest = {
    id: "guest",
    token: "g",
    socket: socket(),
    disconnected: null,
    input: {},
    count: 0,
    countAt: Date.now(),
    lastSeen: Date.now(),
  };
  room.sessions.set(host.id, host);
  room.sessions.set(guest.id, guest);
  addPlayer(room.game, host.id, "Host");
  addPlayer(room.game, guest.id, "Guest");
  room.hostId = host.id;
  room.message(guest, guest.socket, {
    data: JSON.stringify({
      type: "rename",
      id: "host",
      name: "\u0000New guest name goes here",
    }),
  });
  assert.equal(room.game.players[0].name, "Host");
  assert.equal(room.game.players[1].name, "New guest name goe");
  room.disconnect(host, host.socket);
  assert.equal(room.hostId, guest.id);
  assert.equal(room.sessions.has("host"), true, "old host can still reconnect");
  room.game.phase = "draft";
  room.game.wave = 1;
  room.game.choices = { host: ["quick"] };
  host.disconnected = Date.now() - 11000;
  room.expire();
  assert.equal(room.game.phase, "playing", "offline seat cannot stall draft");
  assert.equal(room.game.players[0].upgrades.includes("quick"), true);
  host.disconnected = Date.now() - 61000;
  room.expire();
  assert.equal(room.sessions.has("host"), false);
  assert.equal(room.game.players.length, 1);
  await Promise.all(ctx.pending);
});
test("idle ghost sockets become reconnectable reserved seats", async () => {
  const ctx = context();
  const room = new Room(ctx);
  await ctx.ready;
  let closed = false;
  const peer = {
    id: "ghost",
    token: "g",
    socket: {
      send() {},
      close() {
        closed = true;
      },
    },
    input: {},
    lastSeen: Date.now() - 31000,
  };
  room.sessions.set(peer.id, peer);
  addPlayer(room.game, peer.id);
  room.hostId = peer.id;
  room.expire();
  assert.equal(closed, true);
  assert.equal(peer.socket, null);
  assert.equal(room.sessions.has(peer.id), true);
  room.game.phase = "playing";
  peer.disconnected = Date.now() - 61000;
  room.expire();
  assert.equal(
    room.game.phase,
    "lobby",
    "fully abandoned rooms reset for the next group",
  );
  assert.equal(room.game.players.length, 0);
  await Promise.all(ctx.pending);
});
