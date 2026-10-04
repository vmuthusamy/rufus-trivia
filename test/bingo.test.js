// 🎯 Quiz Bingo checks: run with `npm test`.
// The big one: for every call, exactly ONE square in the game's pool may be right.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { TOPIC_BY_ID } from "../src/shared/topics/index.js";
import { ANIMALS } from "../src/shared/data/animals.js";
import { LOOKALIKES } from "../src/shared/data/flag-notes.js";
import { bankTopic } from "../src/shared/kit.js";
import { makeRng } from "../src/shared/rng.js";
import { publicQuestion } from "../src/shared/game.js";
import { ROOM_LIMITS, roomSettings, bingoPoints, scoreAnswer } from "../src/shared/scoring.js";
import { stickersForBingo, STICKER_BY_ID } from "../src/shared/stickers.js";
import {
  BINGO, LINES, buildPool, cardFor, callOrder, secondChance, awayFrom, hasWon, linesDone,
  squareOf, plain, clash, publicCall, publicSquare,
} from "../src/shared/bingo.js";

const TOPICS = ROOM_LIMITS.bingoTopics.map((id) => TOPIC_BY_ID[id]);
const LEVELS = ROOM_LIMITS.levels;
const SEEDS = 60;

// Every pool for every bingo topic, level and seed (made once, checked by several tests).
const POOLS = [];
for (const topic of TOPICS) for (const levelSetting of LEVELS) for (let i = 0; i < SEEDS; i++) {
  POOLS.push({ topic, levelSetting, pool: buildPool(topic, { seed: `t${i}`, levelSetting }) });
}
const poolsOf = (id) => POOLS.filter((p) => p.topic.id === id);
const labelOf = (q) => squareOf(q).label || "";

test("bingo topics: flags, math and animals, and every one has stickers + limits", () => {
  assert.deepEqual(ROOM_LIMITS.bingoTopics, ["flags", "math", "animals"]);
  for (const t of TOPICS) assert.ok(t, "topic exists");
  assert.ok(STICKER_BY_ID.bingo_line && STICKER_BY_ID.bingo_blackout);
  assert.equal(STICKER_BY_ID.bingo_line.rarity, 2);
  assert.equal(STICKER_BY_ID.bingo_blackout.rarity, 4);
  assert.deepEqual(stickersForBingo({ win: "line" }), ["bingo_line"]);
  assert.deepEqual(stickersForBingo({ win: "blackout" }), ["bingo_blackout"]);
});

test(`every pool (${TOPICS.length} topics x ${LEVELS.length} levels x ${SEEDS} seeds): 24 good, different squares`, () => {
  for (const { topic, levelSetting, pool } of POOLS) {
    const where = `${topic.id}/${levelSetting}`;
    assert.equal(pool.length, BINGO.poolSize, `${where}: a full pool`);
    assert.equal(new Set(pool.map((q) => q.key)).size, pool.length, `${where}: no question twice`);
    const seen = new Set();
    for (const q of pool) {
      const sq = squareOf(q);
      assert.ok(!q.noBingo, `${where}: "${q.prompt}" is flagged noBingo`);
      assert.ok(sq.label || sq.img, `${where}: the square shows something`);
      if (sq.label) assert.ok(sq.label.length <= BINGO.maxLabel, `${where}: "${sq.label}" is too long for a square`);
      if (sq.img) assert.ok(existsSync(new URL("../public" + sq.img, import.meta.url)), `${where}: picture ${sq.img}`);
      const id = sq.img || plain(sq.label);
      assert.ok(!seen.has(id), `${where}: "${sq.label || sq.img}" twice`);
      seen.add(id);
      assert.ok(q.prompt && q.eyebrow && [1, 2, 3].includes(q.level), `${where}: a proper call`);
    }
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      assert.ok(!clash(pool[i], pool[j]), `${where}: "${labelOf(pool[i])}" and "${labelOf(pool[j])}" muddle each other`);
    }
  }
});

test("no square is ALSO right for another call (alsoRight is checked both ways)", () => {
  for (const { topic, pool } of POOLS) for (const call of pool) {
    const right = new Set([plain(labelOf(call)), ...(call.alsoRight || []).map(plain)].filter(Boolean));
    const hits = pool.filter((sq) => sq === call || right.has(plain(labelOf(sq))));
    assert.equal(hits.length, 1, `${topic.id}: "${call.prompt}" has ${hits.length} right squares: ${hits.map(labelOf)}`);
  }
});

// ---- independent checks, worked out from the data (not from bingo.js) ----

// Maths: work out what every square is worth. No two squares can be worth the same.
function valueOf(label) {
  const t = label.replace(/(\d+) tens and (\d+) ones/, (_, a, b) => String(a * 10 + Number(b)))
    .replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  assert.match(t, /^[\d\s+\-*/()]+$/, `a maths square: ${label}`);
  return Function(`return (${t})`)();
}
test("math: every square in a pool is worth a different number (so '48' and '44 + 4' never meet)", () => {
  for (const { levelSetting, pool } of poolsOf("math")) {
    const values = pool.map((q) => valueOf(labelOf(q)));
    for (const v of values) assert.ok(Number.isInteger(v) && v >= 0, `whole numbers only (${v})`);
    assert.equal(new Set(values).size, values.length, `math/${levelSetting}: two squares are worth the same: ${pool.map(labelOf)}`);
    for (const q of pool) assert.ok(!/NOT/.test(q.prompt), "no 'which one is NOT' puzzles");
  }
});

// Flags: no lookalike flags in one game, one square per continent, no "Africa" next to "South Africa".
test("flags: no lookalike flags in one game, and continents never muddled with countries", () => {
  const groupOf = new Map();
  LOOKALIKES.forEach((g, i) => g.forEach((code) => groupOf.set(code, [...(groupOf.get(code) || []), i])));
  for (const { levelSetting, pool } of poolsOf("flags")) {
    const continents = pool.filter((q) => q.eyebrow === "Where in the world?").map(labelOf);
    const countries = pool.filter((q) => q.eyebrow !== "Where in the world?");
    assert.equal(new Set(continents).size, continents.length, "each continent once");
    for (const c of continents) {
      for (const q of countries) assert.ok(!labelOf(q).includes(c), `${c} and ${labelOf(q)} in one game`);
      if (c === "Oceania") assert.ok(!pool.some((q) => labelOf(q) === "Australia"));
    }
    const groups = countries.flatMap((q) => groupOf.get(q.key) || []);
    assert.equal(new Set(groups).size, groups.length, `flags/${levelSetting}: two lookalike flags in one game`);
    for (const q of pool) assert.notEqual(q.eyebrow, "Odd one out", "odd one out needs its choices");
  }
});

// Animals: baby names, group names and animal names from the facts table.
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SNAKES = ["Rattlesnake", "Cobra", "Milk snake", "Hognose snake", "Green anaconda", "Reticulated python", "Inland taipan",
  "Sidewinder", "Paradise tree snake", "Barbados threadsnake"];
const FOXES = ["Fennec fox", "Arctic fox", "Red fox", "Gray fox", "Felix", "Renard", "Marthina", "A vixen"];
test("animals: one right square per call, even with babies, groups and kinds of animals", () => {
  for (const { levelSetting, pool } of poolsOf("animals")) {
    const labels = pool.map(labelOf);
    const has = (name) => labels.some((l) => plain(l) === plain(name));
    const where = `animals/${levelSetting}: ${labels.join(", ")}`;
    for (const q of pool) {
      assert.ok(!/^Which one is an? /.test(q.prompt), "'which one is a mammal?' needs its choices");
      assert.notEqual(labelOf(q), "Birds", "'which animals are dinosaurs?' would make every bird right");
      // "What is a baby wolf called?": none of the wolf's other baby names may be squares
      let m = q.prompt.match(/^What is a (baby|group of) (.+) called\?$/);
      if (m) {
        const field = m[1] === "baby" ? "baby" : "group";
        const a = ANIMALS.find((x) => (field === "baby" ? x.name.toLowerCase() : x.plural) === m[2]);
        const others = a[field].filter((w) => plain(w) !== plain(labelOf(q)));
        for (const w of others) assert.ok(!has(w), `${where}: "${q.prompt}" -> ${labelOf(q)}, but ${cap(w)} is right too`);
      }
      // "A joey is a baby…": every animal with joeys is right (kangaroo AND koala)
      m = q.prompt.match(/^An? (.+) is a (baby|group of)…$/);
      if (m) {
        const field = m[2] === "baby" ? "baby" : "group";
        const owners = ANIMALS.filter((x) => x[field] && x[field].includes(m[1].toLowerCase()));
        const named = owners.filter((x) => has(x.name) || has(x.plural));
        assert.equal(named.length, 1, `${where}: "${q.prompt}" has ${named.length} right squares`);
      }
    }
    // A generic animal and a kind of it ("Snake" and "Milk snake") never share a game.
    if (has("Snake") || has("Snakes")) for (const s of SNAKES) assert.ok(!has(s), `${where}: Snake and ${s}`);
    if (has("Fox") || has("Foxes")) for (const f of FOXES) assert.ok(!has(f), `${where}: Fox and ${f}`);
    if (has("Whale") || has("Whales")) assert.ok(!has("Blue whale"), where);
    if (has("Butterfly")) assert.ok(!has("A butterfly or moth"), where);
    if (has("Bear") || has("Bears")) assert.ok(!has("Panda") && !has("Pandas"), where);
  }
});

test("a pool is the same for the same seed, and avoids questions the room already saw", () => {
  for (const topic of TOPICS) {
    const a = buildPool(topic, { seed: "same", levelSetting: "mixed" });
    assert.deepEqual(a, buildPool(topic, { seed: "same", levelSetting: "mixed" }));
    assert.notDeepEqual(a.map((q) => q.key), buildPool(topic, { seed: "other", levelSetting: "mixed" }).map((q) => q.key));
  }
  const first = buildPool(TOPIC_BY_ID.flags, { seed: "r1", levelSetting: "mixed" });
  const next = buildPool(TOPIC_BY_ID.flags, { seed: "r2", levelSetting: "mixed", avoid: new Set(first.map((q) => q.key)) });
  assert.equal(next.filter((q) => first.some((f) => f.key === q.key)).length, 0, "a rematch gets fresh flags");
});

test("cards: 16 different squares from the pool, the same every time for a player, different for each player", () => {
  const cards = new Set();
  for (let i = 0; i < 50; i++) {
    const card = cardFor("seed1", "player" + i, BINGO.poolSize);
    assert.equal(card.length, 16);
    assert.equal(new Set(card).size, 16, "no square twice on a card");
    for (const x of card) assert.ok(Number.isInteger(x) && x >= 0 && x < BINGO.poolSize);
    assert.deepEqual(card, cardFor("seed1", "player" + i, BINGO.poolSize), "same card after a reconnect");
    cards.add(card.join(","));
  }
  assert.equal(cards.size, 50, "every player's card is different");
  assert.notDeepEqual(cardFor("seed1", "p", 24), cardFor("seed2", "p", 24), "a new game, a new card");
  const order = callOrder("seed1", 24);
  assert.deepEqual([...order].sort((a, b) => a - b), [...Array(24).keys()], "the first time round calls every square once");
});

test("lines: 10 ways to win a 4x4 card; blackout needs all 16", () => {
  assert.equal(LINES.length, 10);
  const card = (cells) => Array.from({ length: 16 }, (_, k) => (cells.includes(k) ? 1 : 0));
  assert.equal(awayFrom(card([]), "line"), 4);
  assert.equal(awayFrom(card([0, 1, 2]), "line"), 1);
  assert.ok(hasWon(card([4, 5, 6, 7]), "line"), "a row");
  assert.ok(hasWon(card([2, 6, 10, 14]), "line"), "a column");
  assert.ok(hasWon(card([0, 5, 10, 15]), "line"), "a diagonal");
  assert.ok(hasWon(card([3, 6, 9, 12]), "line"), "the other diagonal");
  assert.ok(!hasWon(card([0, 1, 2, 4, 5, 6, 8, 9, 10]), "line"), "nine squares but no line");
  assert.deepEqual(linesDone(card([0, 1, 2, 3, 4, 8, 12])), [[0, 1, 2, 3], [0, 4, 8, 12]]);
  assert.ok(!hasWon(card([0, 1, 2, 3, 4, 5, 6, 7]), "blackout"));
  assert.equal(awayFrom(card([0, 1, 2, 3, 4, 5, 6, 7]), "blackout"), 8);
  assert.ok(hasWon(card([...Array(16).keys()]), "blackout"));
});

test("second chances: call what the closest player still needs (never the same square twice in a row)", () => {
  const marks = (cells) => Array.from({ length: 16 }, (_, k) => (cells.includes(k) ? 1 : 0));
  const card = [...Array(16).keys()].map((k) => k + 100); // cell k holds pool square k + 100
  // one away from the top row: only cell 3 (square 103) helps
  for (let call = 24; call < 34; call++) {
    assert.equal(secondChance({ seed: "x", call, cards: [{ card, marks: marks([0, 1, 2]) }], win: "line", last: -1 }), 103);
  }
  // two players: the one closer to winning gets help first
  const far = { card: card.map((x) => x + 100), marks: marks([]) };
  assert.equal(secondChance({ seed: "x", call: 30, cards: [far, { card, marks: marks([0, 1, 2]) }], win: "line", last: -1 }), 103);
  // blackout: any empty square of the fullest card
  const pick = secondChance({ seed: "x", call: 30, cards: [{ card, marks: marks([...Array(14).keys()]) }], win: "blackout", last: 114 });
  assert.equal(pick, 115, "not the square just called");
  assert.equal(secondChance({ seed: "x", call: 30, cards: [], win: "line", last: -1 }), -1, "nobody needs anything");
});

test("points: a new stamp scores like a quiz answer, other right taps half, wrong taps nothing", () => {
  const base = { msUsed: 2000, timeLimitMs: 15000, level: 2, streak: 3 };
  assert.equal(bingoPoints({ ...base, stamp: true, right: true }), scoreAnswer({ ...base, correct: true }));
  const half = bingoPoints({ ...base, stamp: false, right: true });
  assert.equal(half, Math.round(scoreAnswer({ ...base, correct: true, streak: 1 }) / 20) * 10);
  assert.ok(half > 0 && half < bingoPoints({ ...base, stamp: true, right: true }));
  assert.equal(bingoPoints({ ...base, stamp: false, right: false }), 0);
});

test("room settings: quiz by default, bingo only for its topics, nothing made up", () => {
  const base = { count: 10, timer: 15, level: "mixed" };
  assert.deepEqual(roomSettings(base, "science").settings, { ...base, mode: "quiz", win: "line" }, "old rooms are quizzes");
  assert.deepEqual(roomSettings({ ...base, mode: "bingo", win: "blackout" }, "math").settings, { ...base, mode: "bingo", win: "blackout" });
  assert.match(roomSettings({ ...base, mode: "bingo" }, "science").error, /Bingo works with/);
  assert.ok(roomSettings({ ...base, mode: "bingo", win: "corners" }, "flags").error);
  assert.ok(roomSettings({ ...base, mode: "lotto" }, "flags").error);
  assert.ok(roomSettings({ ...base, count: 7 }, "flags").error);
});

test("noBingo and alsoRight never reach a browser", () => {
  const flagged = [];
  for (const { pool } of POOLS.slice(0, 40)) flagged.push(...pool.filter((q) => q.alsoRight));
  for (const topic of TOPICS) for (let i = 0; i < 300; i++) {
    const q = topic.next({ rng: makeRng(`leak${i}`), level: (i % 3) + 1, used: new Set(), avoid: new Set(), missed: new Set() });
    if (q.noBingo || q.alsoRight) flagged.push(q);
  }
  assert.ok(flagged.some((q) => q.noBingo) && flagged.some((q) => q.alsoRight), "found flagged questions to check");
  for (const q of flagged) {
    for (const pub of [publicQuestion(q), publicCall(q), publicSquare(q)]) {
      const txt = JSON.stringify(pub);
      assert.ok(!/noBingo|alsoRight/.test(txt), "bingo flags leaked: " + txt);
      assert.equal(pub.answer, undefined);
      assert.equal(pub.key, undefined);
    }
    assert.equal(publicCall(q).choices, undefined, "a call never shows choices");
  }
});
test("bank questions: 'Which one…' and 'Which of these…' are never bingo calls; flags pass through", () => {
  const t = bankTopic({ id: "demo", title: "Demo", emoji: "🎯", questions: [
    { q: "Which one of these is red?", a: "Apple", wrong: ["Sky", "Grass", "Snow"] },
    { q: "What colour is the sky?", a: "Blue", wrong: ["Red", "Green", "Pink"] },
    { q: "What is a baby dog called?", a: "Puppy", wrong: ["Calf", "Kid", "Joey"], alsoRight: ["Pup"] },
  ] });
  const all = [0, 1, 2].map((i) => t.next({ rng: makeRng(`bank${i}`), level: 2, used: new Set(["demo0", "demo1", "demo2"].filter((_, k) => k !== i)), avoid: new Set(), missed: new Set() }));
  const by = Object.fromEntries(all.map((q) => [q.key, q]));
  assert.equal(by.demo0.noBingo, true);
  assert.equal(by.demo1.noBingo, undefined);
  assert.deepEqual(by.demo2.alsoRight, ["Pup"]);
});
