// 🎲 Mix it up: checks for src/shared/topics/mix.js. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOPICS } from "../src/shared/topics/index.js";
import { MIX, cleanMix, playable, mixOf, topicFor, gameCard, splitKey, askedBefore, rememberAsked } from "../src/shared/topics/mix.js";
import { buildGame, buildQuestion, publicQuestion } from "../src/shared/game.js";
import { STICKER_BY_ID } from "../src/shared/stickers.js";

const ALL = TOPICS.map((t) => t.id);
const KEY_RE = /^[a-z0-9_-]{1,32}$/i; // what the server keeps in "seen recently" lists (cleanKeys in names.js)

test("mix: 2 to 5 different topics you can play today, nothing else", () => {
  assert.deepEqual(cleanMix(["math", "flags"]), ["flags", "math"], "tidied into home-screen order");
  assert.deepEqual(cleanMix(ALL), ALL);
  assert.equal(ALL.length, 5);
  for (const bad of [null, "flags", [], ["flags"], ["flags", "flags"], ["flags", "world"], ["flags", "space"],
    ["flags", "nope"], ["flags", 3], ["flags", "mix"], [...ALL, "flags"], { 0: "flags", 1: "math", length: 2 }]) {
    assert.equal(cleanMix(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(playable("mix", ["science", "culture"]), { topic: "mix", mix: ["culture", "science"] });
  assert.equal(playable("mix", ["science"]), null);
  assert.equal(playable("mix"), null);
  assert.deepEqual(playable("flags", ["junk"]), { topic: "flags", mix: null }, "a normal topic ignores mix");
  assert.equal(playable("world"), null, "retired topics can't start");
});

test("mix: topic ids have no '-' (mix keys are \"topic-key\")", () => {
  for (const t of TOPICS) assert.ok(!t.id.includes("-"), t.id);
  assert.deepEqual(splitKey("math-add3-4"), ["math", "add3-4"]);
});

test("mix: same seed = same game; questions never repeat; keys valid, unique and from the mix", () => {
  const mixes = [ALL, ["flags", "math"], ["culture", "science"], ["animals", "culture", "math"]];
  for (const ids of mixes) {
    const t = topicFor("mix", ids);
    assert.equal(t, mixOf(ids), "made once and remembered");
    for (let seed = 0; seed < 60; seed++) {
      const game = buildGame(t, { seed: "m" + seed, count: 20, levelSetting: "mixed" });
      assert.deepEqual(game, buildGame(t, { seed: "m" + seed, count: 20, levelSetting: "mixed" }), "deterministic");
      assert.equal(new Set(game.map((q) => q.key)).size, 20, "no repeats in one game");
      for (const q of game) {
        assert.match(q.key, KEY_RE);
        const [from, inner] = splitKey(q.key);
        assert.ok(ids.includes(from) && inner, q.key);
        assert.equal(q.choices.length, 4);
        assert.ok(q.media, "every mix question shows something");
        assert.equal(publicQuestion(q).answer, undefined);
      }
    }
  }
});

test("mix: a 60-question solo run never repeats either", () => {
  const t = topicFor("mix", ["flags", "culture"]);
  for (let seed = 0; seed < 10; seed++) {
    const used = new Set();
    for (let index = 0; index < 60; index++) {
      const q = buildQuestion(t, { seed: "solo" + seed, index, levelSetting: "ramp", total: 60, used });
      assert.ok(!used.has(q.key), "repeat " + q.key);
      used.add(q.key);
    }
  }
});

test("mix: a 20-question game of all 5 topics has several of them (and a 2-mix has both)", () => {
  for (let seed = 0; seed < 100; seed++) {
    const all = buildGame(topicFor("mix", ALL), { seed: "v" + seed, count: 20, levelSetting: "mixed" });
    assert.ok(new Set(all.map((q) => splitKey(q.key)[0])).size >= 3, "seed " + seed);
    const two = buildGame(topicFor("mix", ["flags", "math"]), { seed: "v" + seed, count: 20, levelSetting: "mixed" });
    assert.equal(new Set(two.map((q) => splitKey(q.key)[0])).size, 2, "seed " + seed);
  }
});

test("mix: seen recently / missed lists work per topic inside the mix", () => {
  const t = topicFor("mix", ["flags", "culture"]);
  const first = buildGame(t, { seed: "a", count: 15, levelSetting: "mixed" });
  const avoid = new Set(first.map((q) => q.key));
  for (let i = 0; i < 10; i++) {
    const next = buildGame(t, { seed: "b" + i, count: 15, levelSetting: "mixed", avoid });
    assert.equal(next.filter((q) => avoid.has(q.key)).length, 0, "nothing from last game");
  }
});

test("mix: rooms file asked questions under the real topic, so rematches stay fresh", () => {
  let asked = rememberAsked({}, "flags", ["fr", "jp"]);
  asked = rememberAsked(asked, "mix", ["flags-de", "math-add3-4"]);
  assert.deepEqual(asked, { flags: ["fr", "jp", "de"], math: ["add3-4"] });
  assert.deepEqual(askedBefore(asked, "mix", ["flags", "math"]), ["flags-fr", "flags-jp", "flags-de", "math-add3-4"]);
  assert.deepEqual(askedBefore(asked, "flags"), ["fr", "jp", "de"]);
});

test("mix: the card says what's in it; there's a Mix Master sticker", () => {
  const card = gameCard("mix", ["flags", "math"]);
  assert.equal(card.id, MIX.id);
  assert.equal(card.music, "adventure");
  assert.deepEqual(card.mix, ["flags", "math"]);
  assert.equal(gameCard("flags").mix, undefined);
  assert.ok(STICKER_BY_ID.mix_master);
});
