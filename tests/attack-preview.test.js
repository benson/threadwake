import test from "node:test";
import assert from "node:assert/strict";
import { createGame, addPlayer, startGame, step } from "../src/sim.js";
import { drawAttackTelegraph } from "../src/render.js";
import { PALETTE } from "../src/art.js";

test("committed moth and armor warnings follow the actual muzzle and volley paths in every direction", () => {
  for (const type of ["moth", "thorn"]) {
    for (let direction = 0; direction < 8; direction++) {
      const s = createGame(41);
      const p = addPlayer(s, "a");
      startGame(s);
      Object.assign(s, {
        mapId: "clock_gallery",
        _spawn: 100,
        _flower: 100,
        _opening: 2,
        flowers: [],
      });
      Object.assign(p, { x: 450, y: 650, _fire: 100 });
      const a = (direction * Math.PI) / 4;
      const enemy = {
        id: 800,
        type,
        x: 600,
        y: 650,
        r: 12,
        hp: 500,
        maxHp: 500,
        hit: 0,
        phase: 0,
        slow: 0,
        brittle: 0,
        stagger: 0,
        _fire: 0,
        _locked: true,
        fireIn: 0.4,
        aimX: Math.cos(a),
        aimY: Math.sin(a),
        attack: type === "thorn" ? "fan" : "needle",
        shotAge: 1,
      };
      s.enemies = [enemy];
      const marks = [];
      const ctx = {
        _pixelRatio: 2,
        fillStyle: "",
        fillRect(x, y, w, h) {
          if (this.fillStyle === PALETTE.redLight && w === 2 && h === 2)
            marks.push({ x, y });
        },
      };
      drawAttackTelegraph(ctx, enemy, 0);
      step(s, {}, 0.001);
      const shots = s.shots.filter((q) => q.hostile && q.source === enemy.id);
      assert.equal(shots.length, type === "thorn" ? 3 : 1);
      for (const shot of shots) {
        const speed = Math.hypot(shot.vx, shot.vy),
          dx = shot.vx / speed,
          dy = shot.vy / speed;
        const matching = marks.filter((m) => {
          const x = m.x - shot.originX,
            y = m.y - shot.originY,
            along = x * dx + y * dy;
          return along > 6 && along < 40 && Math.abs(x * dy - y * dx) < 0.8;
        });
        assert.ok(
          matching.length >= 3,
          `${type} direction ${direction}: only ${matching.length} marks preview this actual projectile path`,
        );
      }
    }
  }
});
