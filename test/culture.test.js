// Checks for the made-fresh parts of Books & Pop Culture: 🧩 emoji puzzles and 🎭 "Who's from where?"
// (the tables are in src/shared/data/stories.js, the question makers in src/shared/topics/culture-makers.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../src/shared/rng.js";
import culture from "../src/shared/topics/culture.js";
import { emojiPuzzles, characters } from "../src/shared/topics/culture-makers.js";
import { STORIES, CHARACTERS } from "../src/shared/data/stories.js";

const plain = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const STORY = Object.fromEntries(STORIES.map((s) => [s.id, s]));
const BY_TITLE = Object.fromEntries(STORIES.map((s) => [s.title, s]));
const BY_NAME = Object.fromEntries(CHARACTERS.map((c) => [c.name, c]));
const KINDS = new Set(["film", "book", "game", "tv"]);

function many(part, level, n = 1500) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(part.next({ rng: makeRng(`cu-${part.id}-${level}-${i}`), level, used: new Set(), avoid: new Set(), missed: new Set() }));
  return out;
}

function checkShape(q) {
  const labels = q.choices.map((c) => c.label);
  assert.equal(labels.length, 4, `4 choices: ${q.prompt}`);
  assert.equal(new Set(labels).size, 4, `4 different choices: ${q.prompt} ${labels}`);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
  assert.ok([1, 2, 3].includes(q.level));
  assert.ok(q.fact && q.fact.length >= 25, `fact for ${q.key}`);
  assert.ok(q.media && q.media.text, `media for ${q.key}`);
  for (const l of labels) assert.ok(l.length <= 34, `short choice: ${l}`);
  return labels;
}

test("the tables: ids and names are unique, every row is complete", () => {
  assert.equal(new Set(STORIES.map((s) => s.id)).size, STORIES.length, "story ids are unique");
  assert.equal(new Set(STORIES.map((s) => plain(s.title))).size, STORIES.length, "story titles are unique");
  assert.equal(new Set(CHARACTERS.map((c) => plain(c.name))).size, CHARACTERS.length, "character names are unique");
  for (const s of STORIES) {
    assert.ok(KINDS.has(s.kind), `${s.title}: kind`);
    if (s.clue) {
      assert.ok([1, 2, 3].includes(s.lv), `${s.title}: lv`);
      assert.ok(s.note && s.note.length >= 25, `${s.title}: note`);
      assert.ok(s.clue.split(" ").length >= 3, `${s.title}: a clue has at least 3 emojis`);
      assert.ok(!/[a-z]/i.test(s.clue), `${s.title}: a clue is only emojis`);
    }
  }
  for (const c of CHARACTERS) {
    assert.ok(c.in.length >= 1 && c.in.every((id) => STORY[id]), `${c.name}: every story in "in" exists`);
    assert.ok([1, 2, 3].includes(c.lv), `${c.name}: lv`);
    assert.ok(c.note && c.note.length >= 25, `${c.name}: note`);
    // No giveaways: "Which story is Paddington from?" -> Paddington
    for (const id of c.in) for (const w of c.name.split(/[\s-]+/).filter((w) => w.length > 3)) {
      assert.ok(!plain(STORY[id].title).includes(plain(w)), `${c.name}'s name gives away ${STORY[id].title}`);
    }
  }
});

test("every emoji clue is different, and every kind has enough rows for 3 wrong choices", () => {
  const clues = STORIES.filter((s) => s.clue).map((s) => s.clue);
  assert.equal(new Set(clues).size, clues.length);
  for (const kind of ["film", "book"]) assert.ok(STORIES.filter((s) => s.clue && s.kind === kind).length >= 15, kind);
  for (const kind of ["game", "tv"]) assert.ok(STORIES.filter((s) => s.kind === kind && !s.crossover).length >= 4, kind);
});

for (const level of [1, 2, 3]) {
  test(`emoji puzzles level ${level}: one right title, and no wrong title shares an emoji with the clue`, () => {
    for (const q of many(emojiPuzzles, level)) {
      const labels = checkShape(q);
      const right = BY_TITLE[labels[q.answer]];
      assert.equal(right.clue, q.media.text, "the clue belongs to the right answer");
      assert.equal(q.prompt, `Which ${right.kind} is this emoji puzzle?`);
      const clue = q.media.text.split(" ");
      labels.forEach((l, i) => {
        if (i === q.answer) return;
        const s = BY_TITLE[l];
        assert.equal(s.kind, right.kind, `${l} is a ${right.kind} too`);
        assert.ok(!s.clue.split(" ").some((e) => clue.includes(e)), `${l} shares an emoji with ${right.title}'s clue`);
      });
      for (const l of labels) assert.ok(!plain(q.prompt).includes(plain(l)), "the prompt never names a choice");
    }
  });

  test(`characters level ${level}: a wrong choice is never also right`, () => {
    for (const q of many(characters, level)) {
      const labels = checkShape(q);
      let m;
      if ((m = q.prompt.match(/^Which (story|game|TV show) is (.+) from\?$/))) {
        const c = BY_NAME[m[2]];
        assert.ok(c, `known character ${m[2]}`);
        assert.equal(labels[q.answer], STORY[c.in[0]].title);
        labels.forEach((l, i) => {
          const s = BY_TITLE[l];
          if (i !== q.answer) {
            assert.ok(!c.in.includes(s.id), `${c.name} is in ${l} too`);
            assert.ok(!s.crossover, `${l} is a crossover, never a wrong choice`);
          }
          if (m[1] === "game") assert.equal(s.kind, "game");
          if (m[1] === "TV show") assert.equal(s.kind, "tv");
          if (m[1] === "story") assert.ok(["film", "book"].includes(s.kind));
        });
        assert.deepEqual(q.alsoRight, c.in.slice(1).map((id) => STORY[id].title));
      } else if ((m = q.prompt.match(/^Which of these characters is from (.+)\?$/))) {
        const s = BY_TITLE[m[1]];
        assert.ok(s && !s.crossover, `never asked about a crossover: ${m[1]}`);
        labels.forEach((l, i) => assert.equal(BY_NAME[l].in.includes(s.id), i === q.answer, `${q.prompt} -> ${l}`));
        assert.equal(BY_NAME[labels[q.answer]].in[0], s.id, "asked about the character's home story");
        assert.ok(q.noBingo, "needs its 4 choices");
        assert.equal(q.reveal.length, 4);
      } else assert.fail(`unexpected prompt: ${q.prompt}`);
    }
  });
}

test("every story with a puzzle and every character comes up", () => {
  const keys = new Set();
  for (const level of [1, 2, 3]) for (const part of [emojiPuzzles, characters]) for (const q of many(part, level, 3000)) keys.add(q.key);
  for (const s of STORIES.filter((s) => s.clue && ["film", "book"].includes(s.kind))) assert.ok(keys.has("ez_" + s.id), `puzzle ${s.title}`);
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");
  for (const c of CHARACTERS) assert.ok(keys.has("cf_" + slug(c.name)), `character ${c.name}`);
});

test("keys are unique across the whole topic, and stable", () => {
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");
  const keys = [...STORIES.filter((s) => s.clue).map((s) => "ez_" + s.id), ...CHARACTERS.flatMap((c) => ["cf_" + slug(c.name), "cr_" + slug(c.name)])];
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.match(k, /^[a-z0-9_-]{1,32}$/i);
});

test("same seed = same questions (only the seeded rng is used)", () => {
  for (const part of [emojiPuzzles, characters, culture]) {
    const run = (seed) => {
      const used = new Set(), out = [];
      for (let i = 0; i < 20; i++) {
        const q = part.next({ rng: makeRng(`${seed}-${i}`), level: (i % 3) + 1, used, avoid: new Set(), missed: new Set() });
        used.add(q.key);
        out.push(q);
      }
      return out;
    };
    assert.deepEqual(run("abc"), run("abc"));
    assert.notDeepEqual(run("abc").map((q) => q.key), run("xyz").map((q) => q.key));
  }
});

test("a character is never asked about both ways round in one game", () => {
  for (let g = 0; g < 200; g++) {
    const used = new Set();
    for (let i = 0; i < 40; i++) {
      const q = characters.next({ rng: makeRng(`both-${g}-${i}`), level: (i % 3) + 1, used, avoid: new Set(), missed: new Set() });
      assert.ok(!used.has(q.key), `${q.key} twice`);
      const other = q.key.startsWith("cf_") ? "cr_" + q.key.slice(3) : "cf_" + q.key.slice(3);
      assert.ok(!used.has(other), `${q.key} asked both ways round`);
      used.add(q.key);
    }
  }
});

test("Books & Pop Culture: roughly 2 in 5 questions are emoji puzzles or characters", () => {
  const n = {};
  for (const level of [1, 2, 3]) for (let i = 0; i < 2000; i++) {
    const q = culture.next({ rng: makeRng(`mix-${level}-${i}`), level, used: new Set(), avoid: new Set(), missed: new Set() });
    n[q.eyebrow] = (n[q.eyebrow] || 0) + 1;
  }
  const made = (n["Emoji puzzle"] || 0) + (n["Who's from where?"] || 0);
  assert.ok(made > 6000 * 0.33 && made < 6000 * 0.48, `made-fresh share: ${made} of 6000`);
  for (const e of ["Book Club", "Movie Magic", "Games, Toys & TV", "Emoji puzzle", "Who's from where?"]) assert.ok(n[e] > 300, `${e} comes up`);
});
