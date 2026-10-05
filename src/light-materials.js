import { WATER_POOL } from "./ambience.js";
import { lightStrength } from "./lighting.js";

// Sparse specular responses on real receiving surfaces. Every mark is clipped
// numerically on the half-world-pixel raster; no paths, blur, or global glitter.
const LIMIT = 4;
const half = (v) => Math.round(v * 2) / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const energy = (light, x, y, map) =>
  (light.power || 0) * lightStrength(light, x, y, map.obstacles || []);

function strongest(lights, rect, map) {
  return lights
    .filter((light) => !light.ambient && light.power > 0.015)
    .map((light) => ({
      light,
      value: energy(
        light,
        clamp(light.x, rect.x, rect.x + rect.w),
        clamp(light.y, rect.y, rect.y + rect.h),
        map,
      ),
    }))
    .filter((entry) => entry.value > 0.012)
    .sort((a, b) => b.value - a.value)
    .slice(0, LIMIT)
    .map((entry) => entry.light);
}

function actorCovers(actors, x, y, w, h) {
  for (const actor of actors) {
    if (
      x < actor.right &&
      x + w > actor.left &&
      y < actor.bottom &&
      y + h > actor.top
    )
      return true;
  }
  return false;
}

function mark(ctx, state, rect, x, y, w, h, color, alpha) {
  const left = Math.max(rect.x, half(x)),
    top = Math.max(rect.y, half(y)),
    right = Math.min(rect.x + rect.w, half(x + w)),
    bottom = Math.min(rect.y + rect.h, half(y + h));
  if (
    right <= left ||
    bottom <= top ||
    actorCovers(state, left, top, right - left, bottom - top)
  )
    return;
  const opacity = Math.min(0.44, Math.round(alpha * 16) / 16);
  if (opacity <= 0) return;
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillRect(left, top, right - left, bottom - top);
}

function exhibit(ctx, state, time, map, o, lights, calm) {
  const plinth = o.kind === "plinth";
  // Matches cabinetSprite: recessed glass x+7.5..w-15, y+7..h-19;
  // the stone upper slab ends at h-18, before its vertical front face.
  const rect = { x: o.x + 8, y: o.y + 7, w: o.w - 23, h: o.h - 27 };
  const nearby = strongest(lights, o, map);
  for (const light of nearby) {
    const lx = clamp(light.x, rect.x, rect.x + rect.w),
      ly = clamp(light.y, rect.y, rect.y + rect.h),
      power = energy(light, lx, ly, map);
    const cold = light.color?.[2] > light.color?.[0];
    if (plinth) {
      // Satin stone catches a broad, restrained patch along exposed top corners.
      // Avoid the sculpture's central silhouette and the vertical stone faces.
      const x = light.x < o.x + o.w / 2 ? o.x + 7 : o.x + o.w - 28;
      const y = light.y < o.y + o.h / 2 ? o.y + 8 : o.y + o.h - 23;
      mark(
        ctx,
        state,
        rect,
        x,
        y,
        15,
        1,
        cold ? "#c2dbdb" : "#e6d9b2",
        power * 0.65,
      );
      mark(ctx, state, rect, x + 2, y + 1, 9, 0.5, "#e5e6cf", power * 0.8);
    } else {
      // A lamp's reflected streak travels with that lamp, with only slight water-
      // free shimmer. Short paired facets leave the specimen underneath readable.
      const drift = calm ? 0 : Math.sin(time * 0.8 + o.x * 0.017) * 1.5;
      const cx = clamp(
        o.x + o.w / 2 + (light.x - o.x - o.w / 2) * 0.43,
        rect.x + 4,
        rect.x + rect.w - 4,
      );
      const cy = clamp(
        o.y + o.h / 2 + (light.y - o.y - o.h / 2) * 0.24 + drift,
        rect.y + 3,
        rect.y + rect.h - 3,
      );
      for (let row = -7; row <= 7; row += 0.5) {
        const taper = 1 - Math.abs(row) / 9,
          x = cx + row * 0.9;
        mark(
          ctx,
          state,
          rect,
          x,
          cy + row,
          2.5,
          0.5,
          cold ? "#a9d8e2" : "#d4d8c2",
          power * taper * 0.65,
        );
        mark(
          ctx,
          state,
          rect,
          x + 4,
          cy + row,
          0.5,
          0.5,
          cold ? "#d4eff0" : "#faf0c9",
          power * taper,
        );
      }
    }
  }
  // Existing plaque and screw locations: glints never spill onto wooden faces.
  const hardware = [
    { x: o.x + Math.round(o.w / 2) - 7.5, y: o.y + o.h - 10.5, w: 15, h: 4 },
  ];
  if (!plinth)
    for (const dx of [7, o.w - 18])
      hardware.push({ x: o.x + dx, y: o.y + o.h - 12, w: 1, h: 1 });
  for (const spot of hardware) {
    let power = 0;
    for (const light of nearby)
      power = Math.max(power, energy(light, spot.x + spot.w / 2, spot.y, map));
    if (power < 0.025) continue;
    const pos = calm ? 0.5 : 0.5 + Math.sin(time * 0.7 + o.x * 0.03) * 0.3;
    mark(
      ctx,
      state,
      spot,
      spot.x + pos * (spot.w - 1),
      spot.y,
      Math.min(3, spot.w),
      0.5,
      "#ffe4a3",
      power * 1.2,
    );
    mark(
      ctx,
      state,
      spot,
      spot.x + pos * (spot.w - 1),
      spot.y,
      0.5,
      Math.min(1.5, spot.h),
      "#fff1c6",
      power,
    );
  }
}

function water(ctx, state, time, map, lights, calm) {
  if (map.id !== "sculpture_court") return;
  const p = WATER_POOL,
    rect = { x: p.x - p.rx, y: p.y - p.ry, w: p.rx * 2, h: p.ry * 2 },
    nearby = strongest(lights, rect, map);
  if (!nearby.length) return;
  const phase = calm ? 0 : time * 0.72;
  // A warped lattice models focused light between shallow ripples. Four small
  // raster segments per cell; sample actual lamp energy once per cell.
  for (let row = -4; row <= 4; row++)
    for (let col = -6; col <= 6; col++) {
      const x = p.x + col * 12 + Math.sin(row * 1.7 + phase) * 3,
        y = p.y + row * 10 + Math.sin(col * 1.1 - phase) * 2;
      let strength = 0,
        chosen = null;
      for (const light of nearby) {
        const e = energy(light, x, y, map);
        if (e > strength) {
          strength = e;
          chosen = light;
        }
      }
      if (strength < 0.025) continue;
      const cold = chosen.color?.[2] > chosen.color?.[0],
        color = cold ? "#8bd1d7" : "#c0d7bd";
      for (let i = 0; i < 5; i++) {
        const px = half(x + i),
          py = half(y + Math.sin(col + row + phase + i * 0.3) * 1.5);
        const dy = (py + 0.5 - p.y) / p.ry;
        if (Math.abs(dy) >= 1) continue;
        const span = p.rx * Math.sqrt(1 - dy * dy) - 1;
        const left = Math.ceil((p.x - span) * 2) / 2;
        const clip = {
          x: left,
          y: py,
          w: Math.floor((p.x + span) * 2) / 2 - left,
          h: 0.5,
        };
        mark(ctx, state, clip, px, py, 1, 0.5, color, strength * 0.7);
        // Narrow displaced companion is the refracted edge, not a second glow.
        const qx = half(x + 5 + i * 0.5),
          qy = half(y + 1 + i * 0.5),
          ndy = (qy + 0.5 - p.y) / p.ry;
        if (Math.abs(ndy) >= 1) continue;
        const nspan = p.rx * Math.sqrt(1 - ndy * ndy) - 1;
        const nleft = Math.ceil((p.x - nspan) * 2) / 2;
        const nclip = {
          x: nleft,
          y: qy,
          w: Math.floor((p.x + nspan) * 2) / 2 - nleft,
          h: 0.5,
        };
        mark(
          ctx,
          state,
          nclip,
          qx,
          qy,
          1,
          0.5,
          cold ? "#71a9c0" : "#8eaf9f",
          strength * 0.45,
        );
      }
    }
}

export function drawMaterialLight(ctx, state, time, map, lights, options = {}) {
  if (!map?.obstacles || !lights?.length) return;
  const calm = !!options.reducedMotion;
  const actors = [
    ...(state?.players || []),
    ...(state?.enemies || []),
    ...(state?.companions || []),
  ].map((actor) => {
    const radius =
      actor.type === "warden" ? 35 : actor.type === "moth" ? 23 : 13;
    const height =
      actor.type === "warden" ? 77 : actor.type === "mite" ? 25 : 40;
    return {
      left: actor.x - radius,
      right: actor.x + radius,
      top: actor.y - height,
      bottom: actor.y + 2,
    };
  });
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (const o of map.obstacles)
    exhibit(ctx, actors, time, map, o, lights, calm);
  water(ctx, actors, time, map, lights, calm);
  ctx.restore();
}
