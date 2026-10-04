// Run against `wrangler dev`, or pass wss://threadwake-server.bensonperry.workers.dev.
import assert from "node:assert/strict";
import WebSocket from "ws";
const base = process.argv[2] || "ws://127.0.0.1:8787";
const origin = base.includes("127.0.0.1")
  ? "http://localhost:4319"
  : "https://threadwake.bensonperry.com";
const room = `smoke-${crypto.randomUUID()}`;
const peers = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (fn()) return;
    await sleep(25);
  }
  const error = new Error(`Timeout: ${label}`);
  console.error('Peer diagnostics:', peers.map(p => ({ connected: p.socket.readyState, identified: !!p.identity, error: p.error,
    tick: p.state?.tick, phase: p.state?.phase, players: p.state?.players.length,
    position: p.state?.players.find(player => player.id === p.identity?.id)?.x })));
  error.transientStartup = ['join', 'two player snapshot'].includes(label);
  throw error;
}
async function join(token) {
  const url = new URL(`/room/${room}`, base);
  url.searchParams.set("name", `Player ${peers.length + 1}`);
  if (token) url.searchParams.set("token", token);
  const peer = {
    socket: new WebSocket(url, { origin }),
    state: null,
    identity: null,
    error: null,
    input: { x: 0, y: 0, cast: false },
  };
  peers.push(peer);
  peer.socket.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.type === "state") peer.state = msg.state;
    if (msg.type === "identity") peer.identity = msg;
    if (msg.type === "error") peer.error = msg;
  });
  peer.socket.on("error", (error) => {
    peer.error = { message: error.message };
  });
  await until(() => peer.identity || peer.error, "join");
  if (peer.error && peer.error.code !== "full") throw new Error(`Room connection failed: ${peer.error.message}`);
  return peer;
}
const heartbeat = setInterval(() => {
  for (const peer of peers) if (peer.socket.readyState === WebSocket.OPEN && peer.identity) {
    peer.socket.send(JSON.stringify({ type: 'input', input: peer.input }));
  }
}, 100);
try {
  const host = await join();
  const guest = await join();
  await until(() => host.state?.players.length === 2, "two player snapshot");
  assert.equal(host.state.hostId, host.identity.id);
  guest.socket.send(JSON.stringify({ type: "rename", name: "Juniper" }));
  await until(
    () =>
      host.state.players.find((p) => p.id === guest.identity.id)?.name ===
      "Juniper",
    "shared lobby rename",
  );
  guest.socket.send(JSON.stringify({ type: "start" }));
  await sleep(120);
  assert.equal(guest.state.phase, "lobby", "guest cannot start");
  host.socket.send(JSON.stringify({ type: "start" }));
  await until(
    () => guest.state?.phase === "playing",
    "host starts both clients",
  );
  const before = guest.state.players.find((p) => p.id === guest.identity.id).x;
  guest.input = { x: 1, y: 0, cast: true };
  guest.socket.send(
    JSON.stringify({ type: "input", input: { x: 1, y: 0, cast: true } }),
  );
  await until(
    () =>
      guest.state.players.find((p) => p.id === guest.identity.id).x >
      before + 8,
    "server movement",
  );
  await until(
    () => host.state.echoes.some((e) => e.owner === guest.identity.id),
    "shared cast",
  );
  const oldId = guest.identity.id;
  const oldToken = guest.identity.token;
  const reconnected = await join(oldToken);
  assert.equal(reconnected.identity.id, oldId, "token restores same seat");
  await until(
    () => reconnected.state?.players.length === 2,
    "old socket close preserves replacement",
  );
  await join();
  await join();
  const overflow = await join();
  assert.equal(overflow.error?.code, "full");
  assert.equal(reconnected.state.players.length <= 4, true);
  console.log(
    "PASS: authoritative start, movement, echo, four seats, room-full rejection, and token reconnect.",
  );
} catch (error) {
  console.error(error);
  process.exitCode = error.transientStartup ? 2 : 1;
} finally {
  clearInterval(heartbeat);
  for (const peer of peers) peer.socket.close();
}
