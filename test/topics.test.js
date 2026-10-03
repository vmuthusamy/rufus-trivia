// Checks every topic makes good questions: run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { TOPICS, TOPIC_BY_ID } from "../src/shared/topics/index.js";
import { buildGame, buildQuestion, publicQuestion } from "../src/shared/game.js";
import { COUNTRIES } from "../src/shared/data/countries.js";
import { LOOKALIKES, FACTS, FAMOUS, KNOWN } from "../src/shared/data/flag-notes.js";

const CODES = new Set(COUNTRIES.map((c) => c.code));

function checkQuestion(t, q) {
  assert.ok(q.key, `${t.id}: question has a key`);
  assert.ok([1, 2, 3].includes(q.level), `${t.id}: level 1-3`);
  assert.ok(q.prompt && q.eyebrow, `${t.id}: prompt + eyebrow`);
  assert.equal(q.choices.length, 4, `${t.id}: 4 choices (${q.prompt})`);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${t.id}: answer index`);
  const ids = q.choices.map((c) => (c.img || "") + "|" + (c.label || ""));
  assert.equal(new Set(ids).size, 4, `${t.id}: no duplicate choices in "${q.prompt}": ${ids}`);
  assert.ok(q.fact && q.fact.length > 10, `${t.id}: has a fun fact`);
  for (const c of q.choices) {
    assert.ok(c.label || c.img, `${t.id}: choice shows something`);
    if (c.img) assert.ok(existsSync(new URL("../public" + c.img, import.meta.url)), `flag file exists: ${c.img}`);
  }
  if (q.media && q.media.img) assert.ok(existsSync(new URL("../public" + q.media.img, import.meta.url)));
}

test("data: 195 countries, every flag file present, notes only use real codes", () => {
  assert.equal(COUNTRIES.length, 195);
  for (const c of COUNTRIES) assert.ok(existsSync(new URL("../public" + c.img, import.meta.url)), c.code);
  for (const g of LOOKALIKES) for (const code of g) assert.ok(CODES.has(code), `lookalike code ${code}`);
  for (const code of Object.keys(FACTS)) assert.ok(CODES.has(code), `fact code ${code}`);
  for (const code of [...FAMOUS, ...KNOWN]) assert.ok(CODES.has(code), `tier code ${code}`);
  // flag file names must not give away the country
  for (const c of COUNTRIES) assert.ok(!c.img.includes("/" + c.code + "."), `${c.code} file name is a giveaway`);
});

for (const t of TOPICS) {
  test(`${t.id}: 3000 questions across levels are all valid`, () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const levelSetting of ["easy", "medium", "hard", "mixed"]) {
        const game = buildGame(t, { seed: "s" + seed, count: 8, levelSetting, avoid: new Set(), missed: new Set() });
        for (const q of game) checkQuestion(t, q);
        if (t.size >= 8) assert.equal(new Set(game.map((q) => q.key)).size, 8, "no repeats inside one game");
      }
    }
  });

  test(`${t.id}: same seed = same game, different seed = different game`, () => {
    const a = buildGame(t, { seed: "abc", count: 10, levelSetting: "mixed" });
    const b = buildGame(t, { seed: "abc", count: 10, levelSetting: "mixed" });
    const c = buildGame(t, { seed: "xyz", count: 10, levelSetting: "mixed" });
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.map((q) => q.key), c.map((q) => q.key));
  });

  test(`${t.id}: public question never leaks the answer`, () => {
    const q = buildQuestion(t, { seed: "leak", index: 3, levelSetting: "mixed", total: 10, used: new Set() });
    const pub = publicQuestion(q);
    assert.equal(pub.answer, undefined);
    assert.equal(pub.fact, undefined);
    assert.equal(pub.key, undefined);
    assert.ok(!JSON.stringify(pub).includes('"' + q.key + '"'));
  });
}

test("flags: avoid list keeps games fresh (no repeats from last game)", () => {
  const t = TOPIC_BY_ID.flags;
  const first = buildGame(t, { seed: "g1", count: 15, levelSetting: "mixed" });
  const avoid = new Set(first.map((q) => q.key));
  for (let i = 0; i < 20; i++) {
    const next = buildGame(t, { seed: "g2-" + i, count: 15, levelSetting: "mixed", avoid });
    const repeats = next.filter((q) => avoid.has(q.key)).length;
    assert.equal(repeats, 0, "a new game shouldn't reuse last game's countries");
  }
});

test("rematches recycle fairly: a small topic never repeats until it runs out, then reuses the OLDEST first", () => {
  const t = TOPIC_BY_ID.space; // only 30 questions
  const asked = [];
  const g1 = buildGame(t, { seed: "r1", count: 15, levelSetting: "mixed", avoid: new Set(asked) });
  asked.push(...g1.map((q) => q.key));
  const g2 = buildGame(t, { seed: "r2", count: 15, levelSetting: "mixed", avoid: new Set(asked) });
  assert.equal(g2.filter((q) => asked.includes(q.key)).length, 0, "game 2 is all new");
  asked.push(...g2.map((q) => q.key));
  // All 30 used: game 3 must reuse, and should pick from game 1 (oldest), not game 2 (just played)
  const g3 = buildGame(t, { seed: "r3", count: 5, levelSetting: "mixed", avoid: new Set(asked) });
  const fromLatest = g3.filter((q) => g2.some((x) => x.key === q.key)).length;
  assert.ok(fromLatest <= 1, `game 3 reused ${fromLatest} questions from the round just played`);
});

test("flags: lots of variety - 50 games of 10 touch most of the 195 countries", () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) buildGame(TOPIC_BY_ID.flags, { seed: "v" + i, count: 10, levelSetting: "mixed" }).forEach((q) => seen.add(q.key));
  assert.ok(seen.size > 120, `only saw ${seen.size} countries`);
});
