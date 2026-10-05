import {
  createGame,
  addPlayer,
  removePlayer,
  step,
  chooseUpgrade,
  startGame,
  snapshot,
  setCharacter,
} from "../src/sim.js";
import {
  ROOM_PATTERN,
  allowedOrigin,
  cleanInput,
  cleanName,
  cleanTraits,
  cleanCharacter,
  isCharacter,
} from "./validation.js";
import {
  PROTOCOL_VERSION,
  SIMULATION_VERSION,
  UPDATE_REQUIRED,
} from "./protocol.js";

function rejectConnection(message = UPDATE_REQUIRED) {
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  server.addEventListener("error", () => {});
  server.send(JSON.stringify({ type: "error", code: "version", message }));
  server.close(4006, message);
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health")
      return Response.json({
        game: "threadwake",
        protocol: PROTOCOL_VERSION,
        ok: true,
      });
    const match = /^\/room\/([^/]+)$/.exec(url.pathname);
    if (!match || !ROOM_PATTERN.test(match[1]))
      return new Response("Invalid room", { status: 400 });
    if (!allowedOrigin(request.headers.get("Origin")))
      return new Response("Origin denied", { status: 403 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket required", { status: 426 });
    if (url.searchParams.get("protocol") !== String(PROTOCOL_VERSION))
      return rejectConnection();
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  },
};

export class Room {
  constructor(ctx) {
    this.ctx = ctx;
    this.game = createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
    this.sessions = new Map();
    this.timer = null;
    this.frame = 0;
    this.hostId = null;
    this.recoveryError = null;
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get("checkpoint");
      if (
        saved &&
        (!Number.isFinite(saved.savedAt) ||
          Date.now() - saved.savedAt < 15 * 60 * 1000)
      ) {
        if (
          saved.protocol !== PROTOCOL_VERSION ||
          saved.game?.version !== SIMULATION_VERSION ||
          !Number.isFinite(saved.savedAt) ||
          saved.savedAt > Date.now() + 60000 ||
          !Array.isArray(saved.peers) ||
          !Array.isArray(saved.game?.players)
        ) {
          this.recoveryError =
            "This room uses an older game. Create a new room.";
          return;
        }
        this.game = Object.assign(createGame(saved.game.seed), saved.game);
        this.hostId = saved.hostId;
        for (const peer of saved.peers)
          this.sessions.set(peer.id, {
            ...peer,
            pendingTraits: cleanTraits(
              peer.pendingTraits ??
                this.game.players.find((p) => p.id === peer.id)?.traits,
            ),
            socket: null,
            input: { x: 0, y: 0, cast: false },
            lastInput: 0,
            disconnected: Date.now(),
            count: 0,
            countAt: Date.now(),
            pendingCast: false,
            lastSeen: Date.now(),
          });
      }
    });
  }
  fetch(request) {
    const url = new URL(request.url);
    if (url.searchParams.get("protocol") !== String(PROTOCOL_VERSION))
      return rejectConnection();
    if (this.recoveryError) return rejectConnection(this.recoveryError);
    this.expire();
    const token = url.searchParams.get("token");
    let peer = token
      ? [...this.sessions.values()].find((p) => p.token === token)
      : null;
    if (!peer && this.sessions.size >= 4) {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      server.addEventListener("error", () => {});
      server.send(
        JSON.stringify({ type: "error", code: "full", message: "Room full" }),
      );
      server.close(4004, "Room full");
      return new Response(null, { status: 101, webSocket: client });
    }
    if (!peer) {
      peer = {
        id: crypto.randomUUID(),
        token: crypto.randomUUID(),
        socket: null,
        input: { x: 0, y: 0, cast: false },
        lastInput: 0,
        disconnected: null,
        count: 0,
        countAt: Date.now(),
      };
      this.sessions.set(peer.id, peer);
      let traits = {};
      try {
        traits = JSON.parse(url.searchParams.get("traits") || "{}");
      } catch {}
      peer.pendingTraits = cleanTraits(traits);
      addPlayer(
        this.game,
        peer.id,
        cleanName(url.searchParams.get("name")),
        peer.pendingTraits,
        cleanCharacter(url.searchParams.get("character")),
      );
      if (!this.hostId) this.hostId = peer.id;
    }
    if (peer.socket) {
      try {
        peer.socket.close(4001, "Reconnected elsewhere");
      } catch {}
    }
    const [client, server] = Object.values(new WebSocketPair());
    peer.socket = server;
    peer.disconnected = null;
    peer.lastSeen = Date.now();
    this.electHost();
    server.accept();
    server.addEventListener("message", (event) =>
      this.message(peer, server, event),
    );
    server.addEventListener("close", () => this.disconnect(peer, server));
    server.addEventListener("error", () => this.disconnect(peer, server));
    this.send(peer, {
      type: "identity",
      id: peer.id,
      token: peer.token,
      protocol: PROTOCOL_VERSION,
    });
    this.broadcast();
    this.checkpoint();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000 / 30);
    return new Response(null, { status: 101, webSocket: client });
  }
  message(peer, socket, event) {
    if (peer.socket !== socket) return;
    const now = Date.now();
    if (now - peer.countAt > 1000) {
      peer.countAt = now;
      peer.count = 0;
    }
    if (
      ++peer.count > 90 ||
      typeof event.data !== "string" ||
      event.data.length > 1024
    ) {
      socket.close(1008, "Invalid traffic");
      return;
    }
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;
    peer.lastSeen = now;
    if (msg.type === "input") {
      const input = cleanInput(msg.input);
      if (input) {
        if (input.cast && !peer.input.cast) peer.pendingCast = true;
        peer.input = input;
        peer.lastInput = now;
      }
    } else if (
      msg.type === "start" &&
      peer.id === this.hostId &&
      ["lobby", "won", "lost"].includes(this.game.phase)
    ) {
      // Purchases are staged per seat; only an authorized new run consumes them.
      for (const player of this.game.players)
        player.traits = cleanTraits(
          this.sessions.get(player.id)?.pendingTraits ?? player.traits,
        );
      startGame(this.game);
      this.broadcast();
      this.checkpoint();
    } else if (
      msg.type === "character" &&
      isCharacter(msg.character) &&
      ["lobby", "won", "lost"].includes(this.game.phase)
    ) {
      const player = this.game.players.find((p) => p.id === peer.id);
      if (
        player &&
        player.character !== msg.character &&
        setCharacter(this.game, peer.id, msg.character)
      ) {
        this.broadcast();
        this.checkpoint();
      }
    } else if (msg.type === "traits") {
      const traits = cleanTraits(msg.traits);
      if (
        ["vitality", "haste", "echo"].some(
          (key) => traits[key] !== peer.pendingTraits?.[key],
        )
      ) {
        peer.pendingTraits = traits;
        this.checkpoint();
      }
    } else if (
      msg.type === "choose" &&
      typeof msg.id === "string" &&
      msg.id.length < 64
    ) {
      if (chooseUpgrade(this.game, peer.id, msg.id)) {
        this.broadcast();
        this.checkpoint();
      }
    } else if (
      msg.type === "rename" &&
      typeof msg.name === "string" &&
      msg.name.length <= 128
    ) {
      const player = this.game.players.find((p) => p.id === peer.id);
      const name = cleanName(msg.name);
      if (
        player &&
        player.name !== name &&
        (!peer.renamedAt || now - peer.renamedAt >= 500)
      ) {
        player.name = name;
        peer.renamedAt = now;
        this.broadcast();
        this.checkpoint();
      }
    } else if (
      msg.type === "ping" &&
      Number.isSafeInteger(msg.id) &&
      msg.id >= 0
    )
      this.send(peer, { type: "pong", id: msg.id });
  }
  tick() {
    this.expire();
    const now = Date.now();
    const inputs = {};
    for (const peer of this.sessions.values()) {
      inputs[peer.id] =
        peer.socket && now - peer.lastInput < 400
          ? { ...peer.input, cast: peer.input.cast || !!peer.pendingCast }
          : { x: 0, y: 0, cast: false };
      peer.pendingCast = false;
    }
    const before = `${this.game.phase}:${this.game.wave}`;
    step(this.game, inputs, 1 / 30);
    if (before !== `${this.game.phase}:${this.game.wave}`) this.checkpoint();
    if (++this.frame % 2 === 0) this.broadcast();
  }
  send(peer, value) {
    try {
      peer.socket?.send(JSON.stringify(value));
    } catch {
      this.disconnect(peer, peer.socket);
    }
  }
  broadcast() {
    const state = snapshot(this.game);
    state.players = state.players.map((p) => ({
      ...p,
      connected: !!this.sessions.get(p.id)?.socket,
    }));
    const data = JSON.stringify({
      type: "state",
      state: { ...state, hostId: this.hostId },
    });
    for (const peer of this.sessions.values())
      if (peer.socket) {
        try {
          peer.socket.send(data);
        } catch {
          this.disconnect(peer, peer.socket);
        }
      }
  }
  disconnect(peer, socket) {
    if (peer.socket !== socket) return;
    peer.socket = null;
    peer.disconnected = Date.now();
    peer.input = { x: 0, y: 0, cast: false };
    peer.pendingCast = false;
    this.electHost();
    this.checkpoint();
    this.broadcast();
    if (![...this.sessions.values()].some((p) => p.socket)) {
      clearInterval(this.timer);
      this.timer = null;
      this.ctx.storage.setAlarm(Date.now() + 65000);
    }
  }
  electHost() {
    if (!this.sessions.get(this.hostId)?.socket)
      this.hostId =
        [...this.sessions.values()].find((p) => p.socket)?.id ||
        this.sessions.keys().next().value ||
        null;
  }
  checkpoint() {
    // Public snapshots omit simulation internals; private recovery retains them.
    const saved = JSON.parse(
      JSON.stringify({
        protocol: PROTOCOL_VERSION,
        savedAt: Date.now(),
        game: this.game,
        hostId: this.hostId,
        peers: [...this.sessions.values()].map((p) => ({
          id: p.id,
          token: p.token,
          pendingTraits: cleanTraits(
            p.pendingTraits ??
              this.game.players.find((player) => player.id === p.id)?.traits,
          ),
        })),
      }),
    );
    this.ctx.waitUntil(this.ctx.storage.put("checkpoint", saved));
  }
  expire() {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.sessions) {
      if (peer.socket && now - peer.lastSeen > 30000) {
        const socket = peer.socket;
        try {
          socket.close(1001, "Connection idle");
        } catch {}
        this.disconnect(peer, socket);
      }
      if (!peer.socket && peer.disconnected !== null) {
        if (now - peer.disconnected > 60000) {
          this.sessions.delete(id);
          removePlayer(this.game, id);
          changed = true;
        } else if (
          now - peer.disconnected > 10000 &&
          this.game.phase === "draft" &&
          this.game.choices[id]?.length
        ) {
          // Keep the seat through a reconnect without holding everyone at the draft.
          chooseUpgrade(this.game, id, this.game.choices[id][0]);
          changed = true;
        }
      }
    }
    if (changed) {
      if (!this.sessions.size)
        this.game = createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
      this.electHost();
      this.checkpoint();
    }
  }
  async alarm() {
    this.expire();
    if (!this.sessions.size) await this.ctx.storage.delete("checkpoint");
  }
}
