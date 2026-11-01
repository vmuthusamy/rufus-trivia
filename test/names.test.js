// Secret agent names: "Funky Fox z12346". The tag on the end keeps lots of Funky Foxes apart.
import test from "node:test";
import assert from "node:assert/strict";
import { agentTag, agentName, cleanPlayer } from "../src/shared/names.js";
import { store } from "../public/js/store.js";

// Fixed inputs make a regression reproducible. Tags are display hints, not unique account IDs.
const ids = Array.from({ length: 2000 }, (_, i) => `player-fixture-${i.toString(36).padStart(8, "0")}`);

test("a tag is one letter and five numbers, and the same player always gets the same one", () => {
  for (const id of ids.slice(0, 200)) {
    assert.match(agentTag(id), /^[a-z]\d{5}$/);
    assert.equal(agentTag(id), agentTag(id));
  }
});

test("the browser makes exactly the same tag as the server", () => {
  for (const id of ids) assert.equal(store.agentTag(id), agentTag(id));
});

test("the fixed player sample has well-distributed display tags", () => {
  const tags = new Set(ids.map(agentTag));
  assert.ok(tags.size >= ids.length - 2, `${ids.length - tags.size} repeats in ${ids.length} players`);
});

test("the server puts the tag on secret agent names, but not on typed-in names", () => {
  const p = { id: "pabcdefgh1234", adj: "Funky", animal: "Fox", color: "#ff8a1f" };
  assert.equal(cleanPlayer(p).name, `Funky Fox ${agentTag(p.id)}`);
  assert.equal(cleanPlayer(p).name, agentName(p));
  assert.equal(cleanPlayer({ ...p, nick: "arvind" }).name, "Arvind");
});
