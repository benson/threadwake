import test from "node:test";
import assert from "node:assert/strict";
import { createGame, addPlayer } from "../src/sim.js";
import { upgradeDetails } from "../src/upgrade-copy.js";
import { acquiredItems } from "../src/inventory.js";

test("starter upgrade cards describe only owned weapons and introduce a soldier before referring to one", () => {
  const player = addPlayer(createGame(1), "a", "Staff", {}, "conservator");
  const before = JSON.stringify(player);
  for (const id of ["heavy", "quick", "fork", "pierce"]) {
    const details = upgradeDetails(player, id);
    assert.match(details.description, /lantern/i);
    assert.doesNotMatch(
      JSON.stringify(details),
      /soldier|marble|disc|lightning|coil/i,
    );
  }
  assert.deepEqual(upgradeDetails(player, "fork").stats, [
    { label: "Lantern reach", before: "100%", after: "110%" },
  ]);
  assert.match(
    upgradeDetails(player, "mirror").description,
    /follows you.*shoots marbles/,
  );
  assert.match(
    upgradeDetails(player, "thread", { control: "Space" }).description,
    /healing burst \(Space\)/,
  );
  assert.doesNotMatch(upgradeDetails(player, "thread").description, /Space/);
  assert.equal(JSON.stringify(player), before);
  player.upgrades = ["mirror", "heavy"];
  assert.match(upgradeDetails(player, "heavy").description, /toy soldier/);
  assert.match(upgradeDetails(player, "mirror").description, /hit harder/);
  assert.match(
    acquiredItems(player).find((i) => i.key === "curio:mirror").description,
    /follows you/,
  );
  assert.deepEqual(
    upgradeDetails(player, "pierce").stats.map((s) => s.label),
    ["Extra enemies passed through", "Lantern damage"],
  );
});

test("equipped weapons reveal their relevant upgrade stats without changing underlying values", () => {
  const player = addPlayer(createGame(2), "a", "Staff", {}, "guard");
  player.upgrades = ["fork"];
  assert.deepEqual(upgradeDetails(player, "fork").stats, [
    { label: "Discs per throw", before: "2", after: "3" },
  ]);
  player.weapons.push("storm");
  assert.deepEqual(upgradeDetails(player, "fork").stats, [
    { label: "Discs per throw", before: "2", after: "3" },
    { label: "Lightning targets", before: "4", after: "5" },
  ]);
  assert.match(
    upgradeDetails(player, "thread", { control: "A" }).description,
    /shockwave \(A\)/,
  );
  assert.equal(upgradeDetails(player, "frost").synergy, "");
  assert.match(
    upgradeDetails(player, "frost", { teammates: true }).synergy,
    /teammate/,
  );
});
