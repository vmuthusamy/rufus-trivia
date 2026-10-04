// 🏆 Checks for the Animal Records part of Animal Kingdom ("Which of these is the fastest?"),
// worked out straight from the numbers table, so a mistake in animals.js can't hide.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../src/shared/rng.js";
import { CONTINENTS } from "../src/shared/kit.js";
import { RECORDS, HOME_NOTES } from "../src/shared/data/animal-records.js";
import animals, { records, STATS } from "../src/shared/topics/animals.js";

const BY_NAME = Object.fromEntries(RECORDS.map((a) => [a.name, a]));
const PROMPTS = Object.fromEntries(Object.values(STATS).map((s) => [s.prompt, s]));
const ctx = (seed, level, used = new Set()) => ({ rng: makeRng(seed), level, used, avoid: new Set(), missed: new Set() });

function many(level, n = 2000) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(records.next(ctx(`rec${level}-${i}`, level)));
  return out;
}

test("the records table: names unique, every number is a sensible [low, high] range", () => {
  assert.equal(new Set(RECORDS.map((a) => a.name)).size, RECORDS.length);
  for (const a of RECORDS) {
    assert.ok([1, 2, 3].includes(a.lv), `${a.name}: lv`);
    assert.ok(a.plural, `${a.name}: plural`);
    for (const f of ["speed", "weight", "life"]) {
      if (!a[f]) continue;
      const [lo, hi] = a[f];
      assert.ok(lo > 0 && hi >= lo, `${a.name}: ${f} ${a[f]}`);
    }
    if (a.where) {
      assert.ok([...CONTINENTS, "Antarctica"].includes(a.where), `${a.name}: where ${a.where}`);
      assert.ok(HOME_NOTES[a.name], `${a.name}: needs a HOME_NOTES line`);
    }
    if (a.diet) assert.ok(["plants", "meat", "both"].includes(a.diet), `${a.name}: diet`);
  }
  for (const name of Object.keys(HOME_NOTES)) assert.ok(BY_NAME[name]?.where, `HOME_NOTES has ${name}, but it has no 'where'`);
});

for (const level of [1, 2, 3]) {
  test(`records level ${level}: exactly one right choice, by a clear gap (checked from the table)`, () => {
    let seen = 0;
    for (const q of many(level)) {
      const labels = q.choices.map((c) => c.label);
      assert.equal(new Set(labels).size, 4, `4 different choices: ${q.prompt} ${labels}`);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
      assert.ok(q.fact && q.fact.length <= 240, `fact length: ${q.fact}`);
      const right = BY_NAME[labels[q.answer]];
      const stat = PROMPTS[q.prompt];
      if (stat) {
        seen++;
        assert.ok(q.noBingo, "records need their 4 choices");
        // The winner's LOW number beats every other animal's HIGH number by at least 25%.
        for (const label of labels) {
          if (label === right.name) continue;
          const [aLo, aHi] = right[stat.field], [bLo, bHi] = BY_NAME[label][stat.field];
          if (stat.most) assert.ok(aLo >= 1.25 * bHi, `${q.prompt} ${right.name} ${right[stat.field]} vs ${label} ${BY_NAME[label][stat.field]}`);
          else assert.ok(bLo >= 1.25 * aHi, `${q.prompt} ${right.name} ${right[stat.field]} vs ${label} ${BY_NAME[label][stat.field]}`);
        }
        // Easy questions only use animals everyone knows.
        for (const label of labels) assert.ok(BY_NAME[label].lv <= level, `${label} is too unusual for level ${level}`);
      } else if (/^Which of these is a (plant|meat)-eater\?$/.test(q.prompt)) {
        assert.ok(q.noBingo);
        const want = q.prompt.includes("plant") ? "plants" : "meat";
        labels.forEach((l, i) => assert.equal(BY_NAME[l].diet === want, i === q.answer, `${q.prompt} -> ${l}`));
        labels.forEach((l) => assert.ok(["plants", "meat"].includes(BY_NAME[l].diet), `${l} eats a mix: unfair`));
      } else {
        const m = q.prompt.match(/^Which continent is home to wild (.+)\?$/);
        assert.ok(m, `unknown records question: ${q.prompt}`);
        const a = RECORDS.find((x) => x.plural === m[1]);
        assert.equal(labels[q.answer], a.where);
        assert.equal(new Set(labels).size, 4);
      }
    }
    assert.ok(seen > 500, "record questions come up");
  });
}

test("record keys are unique: one key means one question", () => {
  const byKey = new Map();
  for (const level of [1, 2, 3]) for (const q of many(level, 1500)) {
    const what = q.prompt + " -> " + q.choices[q.answer].label;
    if (byKey.has(q.key)) assert.equal(byKey.get(q.key), what, `key ${q.key}`);
    byKey.set(q.key, what);
  }
  assert.ok(byKey.size > 120, `only ${byKey.size} different record questions`);
});

test("records: a game never asks the same record twice, even after asking lots of them", () => {
  for (const level of [1, 2, 3]) {
    const used = new Set();
    for (let i = 0; i < 60; i++) {
      const q = records.next(ctx(`run${level}-${i}`, level, used));
      assert.ok(!used.has(q.key), `level ${level}: ${q.key} twice`);
      used.add(q.key);
    }
  }
});

test("a kid playing game after game gets no repeats for at least 12 games", () => {
  const seen = [];
  for (let g = 0; g < 12; g++) {
    const used = new Set(), avoid = new Set(seen.slice(-300));
    for (let i = 0; i < 20; i++) {
      const level = i < 6 ? 1 : i < 14 ? 2 : 3;
      const q = animals.next({ rng: makeRng(`kid-${g}-${i}`), level, used, avoid, missed: new Set() });
      assert.ok(!seen.includes(q.key), `game ${g + 1}: ${q.key} again`);
      used.add(q.key);
      seen.push(q.key);
    }
  }
});
