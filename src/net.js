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
    dirty = false;
  const send = (value) => {
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(value));
  };
  const status = (value, detail) => onStatus(value, detail);
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
    if (token) url.searchParams.set("token", token);
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      attempt = 0;
      status("connected");
      dirty = true;
    });
    socket.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "identity") {
        token = msg.token;
        try {
          sessionStorage.setItem(storageKey, token);
        } catch {}
        onIdentity({ id: msg.id, room });
        send({ type: "rename", name: String(name || "Weaver").slice(0, 18) });
      } else if (msg.type === "state") onState(msg.state);
      else if (msg.type === "error") status("error", msg.message);
    });
    socket.addEventListener("close", (event) => {
      if (closed) return;
      if ([4001, 4004, 1008].includes(event.code)) {
        closed = true;
        clearInterval(inputTimer);
        status(event.code === 4004 ? "error" : "closed", event.reason);
        return;
      }
      status("reconnecting");
      retryTimer = setTimeout(
        open,
        Math.min(5000, 500 * 2 ** Math.min(attempt++, 4)),
      );
    });
    socket.addEventListener("error", () => status("error"));
  }
  let lastSent = 0;
  const inputTimer = setInterval(() => {
    if (dirty || Date.now() - lastSent >= 150) {
      send({ type: "input", input });
      dirty = false;
      lastSent = Date.now();
    }
  }, 1000 / 30);
  open();
  return {
    sendInput(value) {
      const next = {
        x: Number.isFinite(value.x) ? value.x : 0,
        y: Number.isFinite(value.y) ? value.y : 0,
        cast: value.cast === true,
      };
      // Transmit cast edges immediately so quick key taps are never swallowed.
      if (next.cast !== input.cast) send({ type: "input", input: next });
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
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(inputTimer);
      socket?.close(1000, "Left room");
      status("closed");
    },
  };
}
