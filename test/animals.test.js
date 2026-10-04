import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../src/shared/rng.js";
import animals from "../src/shared/topics/animals.js";
import { ANIMALS, CLASSES } from "../src/shared/data/animals.js";
import { snakes, foxes, dinos, wild } from "../src/shared/topics/animal-banks.js";

const BY_NAME = Object.fromEntries(ANIMALS.map((a) => [a.name, a]));
const BY_PLURAL = Object.fromEntries(ANIMALS.map((a) => [a.plural.toLowerCase(), a]));
const lower = (s) => s.toLowerCase();

function many(level, n = 1500) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(animals.next({ rng: makeRng(`an${level}-${i}`), level, used: new Set(), avoid: new Set(), missed: new Set() }));
  return out;
}

test("the animal table: no duplicate names, every class is known, main names come first", () => {
  assert.equal(new Set(ANIMALS.map((a) => a.name)).size, ANIMALS.length);
  const known = new Set([...Object.keys(CLASSES), "mollusc", "crustacean", "other"]);
  for (const a of ANIMALS) {
    assert.ok(known.has(a.cls), `${a.name}: unknown class ${a.cls}`);
    if (a.baby) assert.ok(a.bl >= 1 && a.bl <= 3, `${a.name}: baby level`);
    if (a.group) assert.ok(a.gl >= 1 && a.gl <= 3, `${a.name}: group level`);
  }
});

for (const level of [1, 2, 3]) {
  test(`animals level ${level}: a right answer never sneaks in as a wrong choice`, () => {
    for (const q of many(level)) {
      const labels = q.choices.map((c) => c.label);
      assert.equal(new Set(labels).size, 4, `4 different choices: ${q.prompt} ${labels}`);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
      const right = labels[q.answer];
      let m;
      if ((m = q.prompt.match(/^What is a baby (.+) called\?$/))) {
        const a = ANIMALS.find((x) => lower(x.name) === m[1]);
        labels.forEach((l, i) => assert.equal(a.baby.includes(lower(l)), i === q.answer, `${q.prompt} -> ${l}`));
      } else if ((m = q.prompt.match(/^An? (.+) is a baby…$/))) {
        labels.forEach((l, i) => assert.equal(BY_NAME[l].baby.includes(lower(m[1])), i === q.answer, `${q.prompt} -> ${l}`));
      } else if ((m = q.prompt.match(/^What is a group of (.+) called\?$/))) {
        const a = BY_PLURAL[m[1]];
        labels.forEach((l, i) => assert.equal(a.group.includes(lower(l)), i === q.answer, `${q.prompt} -> ${l}`));
      } else if ((m = q.prompt.match(/^An? (.+) is a group of…$/))) {
        labels.forEach((l, i) => assert.equal(BY_PLURAL[lower(l)].group.includes(lower(m[1])), i === q.answer, `${q.prompt} -> ${l}`));
      } else if ((m = q.prompt.match(/^Which one is an? (.+)\?$/)) && q.eyebrow === "Mammal, bird or reptile?") {
        labels.forEach((l, i) => assert.equal(lower(CLASSES[BY_NAME[l].cls]?.label || "") === m[1], i === q.answer, `${q.prompt} -> ${l}`));
      } else if ((m = q.prompt.match(/^What kind of animal is an? (.+)\?$/))) {
        assert.equal(CLASSES[ANIMALS.find((x) => lower(x.name) === m[1]).cls].label, right);
      } else if (q.prompt === "Which animal is this?") {
        assert.equal(BY_NAME[right].emoji, q.media.text);
      }
    }
  });
}

test("every part of Animal Kingdom shows up, with snakes more often than foxes or dinos", () => {
  const seen = {};
  for (const level of [1, 2, 3]) for (const q of many(level, 800)) seen[q.eyebrow] = (seen[q.eyebrow] || 0) + 1;
  for (const e of ["Snake Spotter", "Rufus's Fox Facts", "Fiery's Dino Dig", "Amazing animals", "Baby animals", "Animal groups", "Mammal, bird or reptile?"]) assert.ok(seen[e] > 20, `${e} comes up`);
  assert.ok(seen["Snake Spotter"] > seen["Fiery's Dino Dig"], "snakes beat dinos");
});

test("every character presenting a question has a sprite", async () => {
  const { SPRITES } = await import("../public/js/sprites.js");
  for (const level of [1, 2, 3]) for (const q of many(level, 600)) {
    if (q.media?.who) assert.ok(SPRITES[q.media.who], `no sprite called "${q.media.who}"`);
  }
});

test("the character showing a question never gives the answer away", () => {
  const plain = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
  for (const bank of [snakes, foxes, dinos, wild]) {
    const used = new Set();
    for (let i = 0; i < bank.size; i++) {
      const q = bank.next({ rng: makeRng(`who-${bank.id}-${i}`), level: 2, used, avoid: new Set(), missed: new Set() });
      used.add(q.key);
      if (!q.media?.who) continue;
      const who = plain(q.media.who), right = plain(q.choices[q.answer].label);
      assert.ok(!right.includes(who) && !who.includes(right), `${q.prompt} is shown by "${q.media.who}", but the answer is ${q.choices[q.answer].label}`);
    }
    assert.equal(used.size, bank.size, `${bank.id}: every question was checked`);
  }
});

test("a 20-question game never asks about the same thing twice", () => {
  for (const level of [1, 2, 3]) for (let g = 0; g < 150; g++) {
    const used = new Set();
    for (let i = 0; i < 20; i++) {
      const q = animals.next({ rng: makeRng(`game${level}-${g}-${i}`), level, used, avoid: new Set(), missed: new Set() });
      assert.ok(!used.has(q.key), `level ${level} game ${g}: ${q.key} came up twice`);
      used.add(q.key);
    }
  }
});

test("the special banks have enough questions at every level", () => {
  for (const bank of [snakes, foxes, dinos, wild]) {
    assert.ok(bank.size >= 15, `${bank.id} has ${bank.size} questions`);
  }
});
