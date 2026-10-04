export const ROOM_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
export function allowedOrigin(origin) {
  try {
    const u = new URL(origin);
    return (
      (u.protocol === "https:" &&
        [
          "threadwake.bensonperry.com",
          "bensonperry.com",
          "benson.github.io",
        ].includes(u.hostname)) ||
      (["http:", "https:"].includes(u.protocol) &&
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))
    );
  } catch {
    return false;
  }
}
export function cleanName(value) {
  return (
    String(value || "Custodian")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 18) || "Custodian"
  );
}
export function cleanTraits(value = {}) {
  return Object.fromEntries(
    ["vitality", "haste", "echo"].map((key) => [
      key,
      Number.isFinite(value?.[key])
        ? Math.max(0, Math.min(3, Math.floor(value[key])))
        : 0,
    ]),
  );
}
export function cleanInput(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y))
    return null;
  const scale = Math.max(1, Math.hypot(value.x, value.y));
  return { x: value.x / scale, y: value.y / scale, cast: value.cast === true };
}
