// Checks for every hand-written question bank (the lists of questions inside Animal Kingdom,
// Books & Pop Culture and Science & Space).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../src/shared/rng.js";
import culture from "../src/shared/topics/culture.js";
import science from "../src/shared/topics/science.js";
import { snakes, foxes, dinos, wild } from "../src/shared/topics/animal-banks.js";
import { books } from "../src/shared/topics/book-banks.js";
import { movies, games } from "../src/shared/topics/screen-banks.js";
import { lab, body } from "../src/shared/topics/science-banks.js";
import { earth, space } from "../src/shared/topics/earth-space-banks.js";

const TOPICS = { animals: [snakes, foxes, dinos, wild], culture: [books, movies, games], science: [lab, body, earth, space] };
const ALL = Object.values(TOPICS).flat();
const plain = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Every question in a bank, each one once.
function everyQuestion(bank) {
  const used = new Set(), out = [];
  for (let i = 0; i < bank.size; i++) {
    const q = bank.next({ rng: makeRng(`all-${bank.id}-${i}`), level: (i % 3) + 1, used, avoid: new Set(), missed: new Set() });
    used.add(q.key);
    out.push(q);
  }
  assert.equal(used.size, bank.size, `${bank.id}: every question came up once`);
  return out;
}

test("the character showing a question never gives the answer away", () => {
  for (const bank of ALL) for (const q of everyQuestion(bank)) {
    if (!q.media?.who) continue;
    const who = plain(q.media.who), right = plain(q.choices[q.answer].label);
    assert.ok(!right.includes(who) && !who.includes(right), `${q.prompt} is shown by "${q.media.who}", but the answer is ${q.choices[q.answer].label}`);
  }
});

test("no question is asked twice inside one topic (even from two different banks)", () => {
  for (const [id, banks] of Object.entries(TOPICS)) {
    const seen = new Map();
    for (const bank of banks) for (const q of everyQuestion(bank)) {
      const k = plain(q.prompt);
      assert.ok(!seen.has(k), `${id}: "${q.prompt}" is in both ${seen.get(k)} and ${bank.id}`);
      seen.set(k, bank.id);
    }
  }
});

test("every bank has easy, medium and hard questions", () => {
  for (const bank of ALL) {
    const n = { 1: 0, 2: 0, 3: 0 };
    for (const q of everyQuestion(bank)) n[q.level]++;
    for (const level of [1, 2, 3]) assert.ok(n[level] >= 3, `${bank.id}: only ${n[level]} questions at level ${level}`);
  }
});

test("a 20-question game of Books & Pop Culture or Science & Space never repeats a question", () => {
  for (const topic of [culture, science]) for (const level of [1, 2, 3]) for (let g = 0; g < 100; g++) {
    const used = new Set();
    for (let i = 0; i < 20; i++) {
      const q = topic.next({ rng: makeRng(`game-${topic.id}-${level}-${g}-${i}`), level, used, avoid: new Set(), missed: new Set() });
      assert.ok(!used.has(q.key), `${topic.id} level ${level} game ${g}: ${q.key} came up twice`);
      used.add(q.key);
    }
  }
});
