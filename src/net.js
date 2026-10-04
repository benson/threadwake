import {
  PROTOCOL_VERSION,
  SIMULATION_VERSION,
  UPDATE_REQUIRED,
} from "../worker/protocol.js";

const SERVER =
  import.meta.env?.VITE_ROOM_SERVER ||
  "wss://threadwake-server.bensonperry.workers.dev";

export async function connectRoom({
  room,
  name,
  traits = {},
  onState = () => {},
  onStatus = () => {},
  onIdentity = () => {},
  onHealth = () => {},
}) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(room)) throw new Error("Invalid room code");
  const storageKey = `threadwake:room:${room}`;
  let token = "";
  try {
    token = sessionStorage.getItem(storageKey) || "";
  } catch {}
  let socket,
    closed = false,
    retryTimer,
    attempt = 0,
    input = { x: 0, y: 0, cast: false },
    dirty = false,
    identified = false,
    openedAt = 0,
    lastSnapshotAt = 0,
    lastPingAt = 0,
    latencyMs = null,
    pingId = 0;
  const pendingPings = new Map();
  const send = (value) => {
    if (identified && socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(value));
  };
  const status = (value, detail) => onStatus(value, detail);
  function stop() {
    closed = true;
    clearTimeout(retryTimer);
    clearInterval(inputTimer);
    clearInterval(healthTimer);
    pendingPings.clear();
  }
  function incompatible(message = UPDATE_REQUIRED) {
    stop();
    socket?.close(4006, "Version mismatch");
    status("error", message);
  }
  function reconnect(detail) {
    identified = false;
    socket = null;
    status("reconnecting", detail);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(
      open,
      Math.min(5000, 500 * 2 ** Math.min(attempt++, 4)),
    );
  }
  function open() {
    if (closed) return;
    status(attempt ? "reconnecting" : "connecting");
    const queryOverride = new URLSearchParams(location.search).get("server");
    // Development override is intentionally limited to localhost pages.
    const server =
      ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
      queryOverride
        ? queryOverride
        : SERVER;
    const url = new URL(`/room/${room}`, server);
    url.searchParams.set("name", String(name || "Weaver").slice(0, 18));
    url.searchParams.set("traits", JSON.stringify(traits));
    url.searchParams.set("protocol", String(PROTOCOL_VERSION));
    if (token) url.searchParams.set("token", token);
    const current = new WebSocket(url);
    socket = current;
    identified = false;
    openedAt = Date.now();
    lastSnapshotAt = 0;
    lastPingAt = 0;
    latencyMs = null;
    pendingPings.clear();
    current.addEventListener("message", (event) => {
      if (closed || socket !== current) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "identity") {
        if (msg.protocol !== PROTOCOL_VERSION) return incompatible();
        identified = true;
        attempt = 0;
        status("connected");
        dirty = true;
        token = msg.token;
        try {
          sessionStorage.setItem(storageKey, token);
        } catch {}
        onIdentity({ id: msg.id, room });
        send({ type: "rename", name: String(name || "Weaver").slice(0, 18) });
      } else if (msg.type === "state") {
        if (!identified || msg.state?.version !== SIMULATION_VERSION)
          return incompatible();
        lastSnapshotAt = Date.now();
        onState(msg.state);
      } else if (msg.type === "pong" && pendingPings.has(msg.id)) {
        latencyMs = Math.max(0, Date.now() - pendingPings.get(msg.id));
        pendingPings.delete(msg.id);
      } else if (msg.type === "error") {
        if (msg.code === "version") return incompatible(msg.message);
        status("error", msg.message);
      }
    });
    current.addEventListener("close", (event) => {
      if (closed || socket !== current) return;
      identified = false;
      if ([4001, 4004, 4006, 1008].includes(event.code)) {
        stop();
        status(
          [4004, 4006].includes(event.code) ? "error" : "closed",
          event.reason,
        );
        return;
      }
      reconnect();
    });
    current.addEventListener("error", () => {
      if (!closed && socket === current) status("reconnecting");
    });
  }
  let lastSent = 0;
  const inputTimer = setInterval(() => {
    if (!identified) return;
    if (dirty || Date.now() - lastSent >= 150) {
      send({ type: "input", input });
      dirty = false;
      lastSent = Date.now();
    }
  }, 1000 / 30);
  const healthTimer = setInterval(() => {
    if (closed) return;
    const now = Date.now();
    const snapshotAgeMs = now - (lastSnapshotAt || openedAt);
    onHealth({ latencyMs, snapshotAgeMs, stale: snapshotAgeMs >= 3000 });
    if (
      socket?.readyState === WebSocket.OPEN &&
      identified &&
      now - lastPingAt >= 2000
    ) {
      lastPingAt = now;
      for (const [id, at] of pendingPings)
        if (now - at > 8000) pendingPings.delete(id);
      pendingPings.set(++pingId, now);
      send({ type: "ping", id: pingId });
    }
    if (
      snapshotAgeMs >= 8000 &&
      socket &&
      socket.readyState < WebSocket.CLOSING
    ) {
      const staleSocket = socket;
      reconnect("Connection stalled");
      staleSocket.close(4000, "Snapshot timeout");
    }
  }, 500);
  open();
  return {
    sendInput(value) {
      const next = {
        x: Number.isFinite(value.x) ? value.x : 0,
        y: Number.isFinite(value.y) ? value.y : 0,
        cast: value.cast === true,
      };
      // Transmit cast edges immediately so quick key taps are never swallowed.
      if (identified && next.cast !== input.cast)
        send({ type: "input", input: next });
      dirty ||=
        next.x !== input.x || next.y !== input.y || next.cast !== input.cast;
      input = next;
    },
    start() {
      send({ type: "start" });
    },
    rename(value) {
      name = String(value || "Weaver").slice(0, 18);
      send({ type: "rename", name });
    },
    choose(id) {
      send({ type: "choose", id });
    },
    close() {
      stop();
      socket?.close(1000, "Left room");
      status("closed");
    },
  };
}
