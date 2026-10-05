import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTER_IDS, cleanCharacter, isCharacter } from "./validation.js";
import { CHARACTERS } from "../src/characters.js";

test("wire character identifiers exactly match playable characters and reject tampering", () => {
  assert.deepEqual(
    CHARACTER_IDS,
    CHARACTERS.map((c) => c.id),
  );
  for (const id of CHARACTER_IDS) {
    assert.equal(cleanCharacter(id), id);
    assert.equal(isCharacter(id), true);
  }
  for (const bad of [undefined, null, "Guard", "__proto__", {}, ["guard"], 3]) {
    assert.equal(cleanCharacter(bad), "custodian");
    assert.equal(isCharacter(bad), false);
  }
});
import {
  allowedOrigin,
  cleanInput,
  cleanName,
  ROOM_PATTERN,
} from "./validation.js";
test("only explicit game origins and localhost are admitted", () => {
  assert.equal(allowedOrigin("https://threadwake.bensonperry.com"), true);
  assert.equal(allowedOrigin("http://localhost:4319"), true);
  for (const value of [
    null,
    "https://evil.example",
    "https://threadwake.bensonperry.com.evil.example",
    "http://threadwake.bensonperry.com",
  ])
    assert.equal(allowedOrigin(value), false);
});
test("untrusted input cannot outrun normalized speed or inject cast values", () => {
  assert.deepEqual(cleanInput({ x: 300, y: 400, cast: "yes" }), {
    x: 0.6,
    y: 0.8,
    cast: false,
  });
  assert.equal(cleanInput({ x: Infinity, y: 0 }), null);
  assert.equal(cleanInput({ x: "1", y: 0 }), null);
  assert.equal(ROOM_PATTERN.test("../other"), false);
  assert.equal(ROOM_PATTERN.test("abcdefgh-1234"), true);
  assert.equal(cleanName("\u0000Ada\n"), "Ada");
});
