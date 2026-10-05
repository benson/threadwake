import test from "node:test";
import assert from "node:assert/strict";
import { createGame, addPlayer, startGame } from "../src/sim.js";
import { acquiredItems } from "../src/inventory.js";

test("inspection shows owned stack values without offering the next upgrade or mutating the player", () => {
  const s = createGame(1);
  addPlayer(s, "a");
  startGame(s);
  const p = s.players[0];
  p.upgrades = ["heavy", "heavy", "quick", "vitality"];
  p.maxHp = 140;
  p.hp = 73;
  p.weapons = ["slingshot", "lantern"];
  const before = JSON.stringify(p),
    items = acquiredItems(p);
  const heavy = items.find((item) => item.key === "curio:heavy");
  assert.equal(heavy.count, 2);
  assert.equal(heavy.stats[0].value, "170%");
  assert.equal(
    items.find((item) => item.key === "weapon:slingshot").stats[0].value,
    "34",
  );
  assert.equal(
    items.find((item) => item.key === "weapon:slingshot").stats[1].value,
    "1.9",
  );
  assert.deepEqual(items.find((item) => item.key === "curio:vitality").stats, [
    { label: "Maximum health", value: "140" },
  ]);
  assert.equal(JSON.stringify(p), before);
  assert.deepEqual(acquiredItems(null), []);
});
