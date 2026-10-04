import test from "node:test";
import assert from "node:assert/strict";
import { Room } from "./index.js";
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
  const nextContext = context(store);
  const next = new Room(nextContext);
  await nextContext.ready;
  assert.deepEqual(next.game, first.game);
  assert.equal(next.sessions.get("host").token, "opaque-secret");
  assert.equal(next.sessions.get("host").socket, null);
  assert.equal(next.hostId, "host");
  step(first.game, { host: { x: 0, y: 1, cast: false } });
  step(next.game, { host: { x: 0, y: 1, cast: false } });
  assert.deepEqual(
    next.game,
    first.game,
    "recovered simulation evolves identically",
  );
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
