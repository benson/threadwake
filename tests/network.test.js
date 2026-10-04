import test from "node:test";
import assert from "node:assert/strict";
import { connectRoom } from "../src/net.js";

function browser(t) {
  t.mock.timers.enable({
    apis: ["Date", "setInterval", "setTimeout"],
    now: 100000,
  });
  const sockets = [];
  class Socket {
    static OPEN = 1;
    static CLOSING = 2;
    constructor(url) {
      this.url = new URL(url);
      this.readyState = 1;
      this.listeners = {};
      this.sent = [];
      sockets.push(this);
    }
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    }
    send(value) {
      this.sent.push(JSON.parse(value));
    }
    close(code, reason) {
      this.readyState = 3;
      this.closed = { code, reason };
      // Deliberately do not deliver close: real broken transports can hang here.
    }
    receive(value) {
      this.listeners.message({ data: JSON.stringify(value) });
    }
  }
  const previous = new Map();
  for (const [key, value] of Object.entries({
    WebSocket: Socket,
    location: { hostname: "localhost", search: "?server=ws://127.0.0.1:8787" },
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  t.after(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return sockets;
}
const identity = {
  type: "identity",
  protocol: 2,
  id: "player",
  token: "opaque",
};
const state = { type: "state", state: { version: 2, phase: "lobby" } };

test("trait purchases are bounded and retained across reconnect and handshake", async t => {
  const sockets = browser(t);
  const connection = await connectRoom({ room: "test-room", traits: { vitality: 1 } });
  t.after(() => connection.close());
  assert.deepEqual(JSON.parse(sockets[0].url.searchParams.get("traits")), { vitality: 1, haste: 0, echo: 0 });
  connection.setTraits({ vitality: 99, haste: -4, echo: 2.9, foreign: 100 });
  assert.equal(sockets[0].sent.length, 0, "pre-handshake purchases wait for identity");
  sockets[0].receive(identity);
  assert.deepEqual(sockets[0].sent.find(x => x.type === "traits"), {
    type: "traits", traits: { vitality: 3, haste: 0, echo: 2 },
  });
  connection.setTraits({ vitality: 2, haste: 1, echo: 3 });
  assert.deepEqual(sockets[0].sent.at(-1), { type: "traits", traits: { vitality: 2, haste: 1, echo: 3 } });
  sockets[0].listeners.close({ code: 1006 });
  connection.setTraits({ vitality: 3, haste: 2, echo: 3 });
  t.mock.timers.tick(500);
  assert.deepEqual(JSON.parse(sockets[1].url.searchParams.get("traits")), { vitality: 3, haste: 2, echo: 3 });
  sockets[1].receive(identity);
  assert.deepEqual(sockets[1].sent.find(x => x.type === "traits").traits, { vitality: 3, haste: 2, echo: 3 });
});

test("client requires matching identity and simulation before accepting state", async (t) => {
  const sockets = browser(t),
    statuses = [],
    states = [];
  const connection = await connectRoom({
    room: "test-room",
    onStatus: (...x) => statuses.push(x),
    onState: (x) => states.push(x),
  });
  t.after(() => connection.close());
  assert.equal(sockets[0].url.searchParams.get("protocol"), "2");
  assert.equal(statuses.at(-1)[0], "connecting");
  sockets[0].receive({ ...identity, protocol: 1 });
  assert.equal(statuses.at(-1)[0], "error");
  assert.equal(sockets[0].closed.code, 4006);
  sockets[0].receive(state);
  t.mock.timers.tick(15000);
  assert.equal(states.length, 0);
  assert.equal(sockets.length, 1, "incompatible connections never retry");
});

test("client rejects a mismatched state schema even after compatible identity", async (t) => {
  const sockets = browser(t),
    states = [];
  const connection = await connectRoom({
    room: "test-room",
    onState: (x) => states.push(x),
  });
  t.after(() => connection.close());
  sockets[0].receive(identity);
  sockets[0].receive({ type: "state", state: { version: 1 } });
  assert.equal(sockets[0].closed.code, 4006);
  assert.equal(states.length, 0);
});

test("health reports RTT and reconnects stale snapshots without waiting for socket close", async (t) => {
  const sockets = browser(t),
    health = [],
    states = [];
  const connection = await connectRoom({
    room: "test-room",
    onHealth: (x) => health.push(x),
    onState: (x) => states.push(x),
  });
  t.after(() => connection.close());
  sockets[0].receive(identity);
  sockets[0].receive(state);
  t.mock.timers.tick(500);
  const ping = sockets[0].sent.find((x) => x.type === "ping");
  assert.ok(ping);
  t.mock.timers.tick(80);
  sockets[0].receive({ type: "pong", id: ping.id });
  t.mock.timers.tick(420);
  assert.equal(health.at(-1).latencyMs, 80);
  assert.equal(health.at(-1).stale, false);
  t.mock.timers.tick(2000);
  assert.equal(health.at(-1).stale, true);
  t.mock.timers.tick(5000);
  assert.equal(sockets[0].closed.code, 4000);
  t.mock.timers.tick(500);
  assert.equal(sockets.length, 2);
  sockets[0].receive(state);
  assert.equal(states.length, 1, "late messages from old socket are ignored");
  sockets[1].receive(identity);
  sockets[1].receive(state);
  t.mock.timers.tick(500);
  assert.equal(health.at(-1).stale, false);
  connection.close();
  const count = health.length;
  t.mock.timers.tick(15000);
  assert.equal(health.length, count, "closing clears watchdog");
  assert.equal(sockets.length, 2);
});
