// Checks the Science & Space question MAKERS (science-makers.js): every made-up question must have
// exactly ONE right answer, worked out again here straight from the tables in data/planets.js and data/materials.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../src/shared/rng.js";
import science from "../src/shared/topics/science.js";
import { planets, materials, RULES } from "../src/shared/topics/science-makers.js";
import { lab, body } from "../src/shared/topics/science-banks.js";
import { earth, space } from "../src/shared/topics/earth-space-banks.js";
import { PLANETS, MOONS, DWARFS, KINDS } from "../src/shared/data/planets.js";
import { THINGS, MATERIALS, SUBSTANCES } from "../src/shared/data/materials.js";

const PLANET = Object.fromEntries(PLANETS.map((p) => [p.name, p]));
const MOON = Object.fromEntries(MOONS.map((m) => [m.name, m]));
const THING = Object.fromEntries(THINGS.map((t) => [t.name, t]));
const MATERIAL = Object.fromEntries(MATERIALS.map((m) => [m.name, m]));
const SUBSTANCE = Object.fromEntries(SUBSTANCES.map((s) => [s.name, s]));
const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function many(maker, n = 1500) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(maker.next({ rng: makeRng(`sci-${maker.id}-${i}`), level: (i % 3) + 1, used: new Set(), avoid: new Set(), missed: new Set() }));
  }
  return out;
}

// `isRight(label)` must be true for the answer and false for the other three.
function exactlyOne(q, isRight) {
  q.choices.forEach((c, i) => assert.equal(Boolean(isRight(c.label)), i === q.answer, `${q.prompt} -> ${c.label}`));
}
// The answer has the biggest (or smallest) value, and beats every other choice by `gap`.
function clearWinner(q, valueOf, gap, biggest) {
  const values = q.choices.map((c) => valueOf(c.label));
  const best = values[q.answer];
  values.forEach((v, i) => {
    if (i === q.answer) return;
    assert.ok(biggest ? v * gap <= best : v >= best * gap, `${q.prompt}: ${q.choices[q.answer].label} isn't a clear winner over ${q.choices[i].label}`);
  });
}

test("planet table: 8 planets in order, sizes and kinds look right", () => {
  assert.deepEqual(PLANETS.map((p) => p.order), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(PLANETS.filter((p) => !p.moons).map((p) => p.name).join(), "Mercury,Venus");
  for (const p of PLANETS) assert.ok(KINDS[p.kind], `${p.name}: kind`);
  for (const m of MOONS) assert.ok(PLANET[m.planet] || m.planet === "Pluto", `${m.name}: planet`);
  assert.ok(!DWARFS.some((d) => PLANET[d.name] || MOON[d.name]), "a dwarf planet isn't a planet or a moon");
});

test("materials table: every thing that can be the answer has a fun fact, and names are one-of-a-kind", () => {
  assert.equal(new Set(THINGS.map((t) => t.name)).size, THINGS.length);
  assert.equal(new Set(THINGS.map((t) => t.id)).size, THINGS.length);
  assert.equal(new Set(MATERIALS.map((t) => t.id)).size, MATERIALS.length);
  assert.equal(new Set(SUBSTANCES.map((t) => t.id)).size, SUBSTANCES.length);
  for (const t of THINGS) {
    for (const test of ["mag", "float", "elec"]) {
      if (t.notes[test]) assert.equal(typeof t[test], "boolean", `${t.name} has a ${test} fact but no ${test} answer`);
    }
  }
});

{
  test(`planets (all levels): exactly one right answer, checked against the table`, () => {
    for (const q of many(planets, 3000)) {
      const labels = q.choices.map((c) => c.label);
      assert.equal(new Set(labels).size, 4, `4 different choices: ${q.prompt}`);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
      let m;
      if ((m = q.prompt.match(/^Which planet is (\d\w\w) from the Sun\?$/))) exactlyOne(q, (l) => ORDINAL[PLANET[l].order - 1] === m[1]);
      else if ((m = q.prompt.match(/^Counting out from the Sun, which number planet is (\w+)\?$/))) exactlyOne(q, (l) => l === ORDINAL[PLANET[m[1]].order - 1]);
      else if ((m = q.prompt.match(/^Which of these planets is (closest to|farthest from) the Sun\?$/))) {
        const orders = labels.map((l) => PLANET[l].order);
        const best = m[1] === "closest to" ? Math.min(...orders) : Math.max(...orders);
        exactlyOne(q, (l) => PLANET[l].order === best);
      } else if ((m = q.prompt.match(/^Which of these planets is the (biggest|smallest)\?$/))) clearWinner(q, (l) => PLANET[l].km, RULES.GAP, m[1] === "biggest");
      else if ((m = q.prompt.match(/^Which of these is an? (rocky planet|gas giant|ice giant)\?$/))) {
        const kind = Object.keys(KINDS).find((k) => KINDS[k].label === m[1]);
        exactlyOne(q, (l) => PLANET[l].kind === kind);
        if (kind === "gas") assert.ok(!labels.some((l) => PLANET[l].kind === "ice"), "ice giants are sometimes called gas giants too");
      } else if (q.prompt === "Which of these planets has no moons at all?") exactlyOne(q, (l) => !PLANET[l].moons);
      else if ((m = q.prompt.match(/^Which of these planets spins round the (fastest|slowest)\?$/))) clearWinner(q, (l) => 1 / PLANET[l].spin, RULES.SPIN_GAP, m[1] === "fastest");
      else if ((m = q.prompt.match(/^Which planet does (.+) go around\?$/))) {
        const moon = MOON[m[1] === "the Moon" ? "The Moon" : m[1]];
        exactlyOne(q, (l) => l === moon.planet);
      } else if (q.prompt === "Which of these is a dwarf planet?") exactlyOne(q, (l) => DWARFS.some((d) => d.name === l));
      else if ((m = q.prompt.match(/^Which of these moons is the (biggest|smallest)\?$/))) clearWinner(q, (l) => MOON[l].km, RULES.GAP, m[1] === "biggest");
      else assert.fail(`no check for: ${q.prompt}`);
    }
  });

  test(`everyday science (all levels): exactly one right answer, checked against the table`, () => {
    const TEST_OF = Object.fromEntries(Object.entries(RULES.TESTS).map(([type, T]) => [T.prompt, { type, T }]));
    for (const q of many(materials, 3000)) {
      assert.equal(new Set(q.choices.map((c) => c.label)).size, 4, `4 different choices: ${q.prompt}`);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
      let m;
      if (TEST_OF[q.prompt]) {
        const { T } = TEST_OF[q.prompt];
        q.choices.forEach((c) => assert.ok(THING[c.label], `unknown thing ${c.label}`));
        exactlyOne(q, (l) => T.right(THING[l]));
        // ...and every wrong one really is wrong (not an "it depends" thing)
        q.choices.forEach((c, i) => i !== q.answer && assert.ok(T.wrong(THING[c.label]), `${c.label} isn't clearly wrong`));
      } else if (q.prompt === "Which of these materials comes from nature?") exactlyOne(q, (l) => MATERIAL[l].natural);
      else if (q.prompt === "Which of these materials is made by people?") exactlyOne(q, (l) => !MATERIAL[l].natural);
      else if ((m = q.prompt.match(/^At room temperature, which of these is an? (solid|liquid|gas)\?$/))) exactlyOne(q, (l) => SUBSTANCE[l].state === m[1]);
      else assert.fail(`no check for: ${q.prompt}`);
    }
  });
}

test("every maker question has a fact, an after-answer note per choice (when it has one) and no giveaway", () => {
  for (const maker of [planets, materials]) {
    const used = new Set();
    for (let i = 0; i < maker.size; i++) {
      const q = maker.next({ rng: makeRng(`all-${maker.id}-${i}`), level: (i % 3) + 1, used, avoid: new Set(), missed: new Set() });
      assert.ok(!used.has(q.key), `${q.key} came up twice`);
      used.add(q.key);
      assert.ok(q.fact.length > 30 && q.fact.length <= 260, `${q.key}: fact length ${q.fact.length}`);
      if (q.reveal) assert.equal(q.reveal.length, 4);
      const right = q.choices[q.answer].label;
      assert.ok(right.length < 4 || !q.prompt.toLowerCase().includes(right.toLowerCase()), `${q.key}: answer in the question`);
    }
    assert.equal(used.size, maker.size, `${maker.id}: every question can come up`);
  }
});

test("keys are unique across the whole Science & Space topic", () => {
  const keys = new Map();
  for (const part of [lab, body, earth, space]) {
    const used = new Set();
    for (let i = 0; i < part.size; i++) {
      const q = part.next({ rng: makeRng(`k-${part.id}-${i}`), level: 2, used, avoid: new Set(), missed: new Set() });
      used.add(q.key);
    }
    for (const k of used) { assert.ok(!keys.has(k), `${k} is in ${keys.get(k)} and ${part.id}`); keys.set(k, part.id); }
  }
  for (const maker of [planets, materials]) for (const s of maker.specs) {
    assert.ok(!keys.has(s.key), `${s.key} is in ${keys.get(s.key)} and ${maker.id}`);
    keys.set(s.key, maker.id);
  }
  assert.equal(keys.size, science.size);
});

test("same seed = same question (so everyone in a room gets the same game)", () => {
  for (const maker of [planets, materials, science]) for (let i = 0; i < 50; i++) {
    const ctx = () => ({ rng: makeRng(`same-${i}`), level: (i % 3) + 1, used: new Set(), avoid: new Set(), missed: new Set() });
    assert.deepEqual(maker.next(ctx()), maker.next(ctx()));
  }
});

test("Science & Space is still about 7 in 10 science, 3 in 10 space", () => {
  const SPACE = new Set(["Space", "Planet Patrol", "Moon Spotter"]);
  let spaceCount = 0, n = 6000;
  for (let i = 0; i < n; i++) {
    const q = science.next({ rng: makeRng(`mix-${i}`), level: (i % 3) + 1, used: new Set(), avoid: new Set(), missed: new Set() });
    if (SPACE.has(q.eyebrow)) spaceCount++;
  }
  const share = spaceCount / n;
  assert.ok(share > 0.24 && share < 0.34, `space share is ${share.toFixed(2)}`);
});
