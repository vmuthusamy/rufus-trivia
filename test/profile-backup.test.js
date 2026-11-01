import test from "node:test";
import assert from "node:assert/strict";
import { makeProfileBackup, readProfileBackup } from "../public/js/profile-backup.js";
const player = { id: "pprivate-example-123", adj: "Turbo", animal: "Fox", color: "#ff8a1f", nick: null };
test("a secret agent can round-trip their private identity without exporting reward claims", () => {
  const file = makeProfileBackup({ ...player, coins: 9999, cards: { family: 99 }, pins: ["unearned"] });
  assert.deepEqual(readProfileBackup(file), player);
  assert.ok(!file.includes("coins") && !file.includes("cards") && !file.includes("pins"));
});
test("backup parsing rejects malformed, oversized and unsupported files", () => {
  for (const raw of ["oops", "null", "x".repeat(17000), JSON.stringify({ app: "rufus-trivia", version: 2, player }), JSON.stringify({ app: "rufus-trivia", version: 1, player: { ...player, id: "bad" } })]) {
    assert.throws(() => readProfileBackup(raw));
  }
});
