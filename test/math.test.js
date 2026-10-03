import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../src/shared/rng.js";
import math from "../src/shared/topics/math.js";

// Work out a choice like "44 + 4", "6 × 8", "(3 + 5) × 6" or "4 tens and 8 ones".
function value(text) {
  const pv = text.match(/^(\d+) tens and (\d+) ones$/);
  if (pv) return Number(pv[1]) * 10 + Number(pv[2]);
  const js = text.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  assert.match(js, /^[\d+\-*/() ]+$/, `unexpected choice "${text}"`);
  return Function(`return (${js})`)();
}

// Solve "3 × n + 4 = 19" style equations by trying every whole number.
function solve(left, right, letter) {
  const js = left.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const target = Number(right);
  const hits = [];
  for (let v = 0; v <= 500; v++) {
    const got = Function(letter, `return (${js})`)(v);
    if (got === target) hits.push(v);
  }
  return hits;
}

function many(level, kind, n = 400) {
  const out = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const q = math.next({ rng: makeRng(`m${level}-${i}`), level, used: new Set(), avoid: new Set(), missed: new Set() });
    if (q.media?.kind === kind) out.push(q);
  }
  return out;
}

for (const level of [1, 2, 3]) {
  test(`make the number (level ${level}): exactly one right choice, and it's the answer`, () => {
    const qs = many(level, "make");
    assert.ok(qs.length > 50, "make-the-number puzzles should come up often");
    for (const q of qs) {
      const n = q.media.n;
      const labels = q.choices.map((c) => c.label);
      assert.equal(new Set(labels).size, 4, `4 different choices: ${labels}`);
      const makesN = labels.map((l) => value(l) === n);
      const odd = q.eyebrow === "Odd one out";
      if (odd) {
        assert.equal(makesN.filter(Boolean).length, 3, `odd one out for ${n}: ${labels}`);
        assert.equal(makesN[q.answer], false);
      } else {
        assert.equal(makesN.filter(Boolean).length, 1, `only one makes ${n}: ${labels}`);
        assert.equal(makesN[q.answer], true);
      }
      for (const l of labels) assert.ok(Number.isInteger(value(l)) && value(l) > 0, `"${l}" is a whole number`);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
      assert.ok(q.media.who && q.media.item, "every puzzle has a character and a thing to count");
    }
  });

  test(`mystery-number equations (level ${level}): the answer really balances the scale`, () => {
    const qs = many(level, "balance");
    assert.ok(qs.length > 50, "equations should come up often");
    for (const q of qs) {
      const { left, right, letter } = q.media;
      const ans = Number(q.choices[q.answer].label);
      assert.deepEqual(solve(left, right, letter), [ans], `${left} = ${right}`);
      const labels = q.choices.map((c) => c.label);
      assert.equal(new Set(labels).size, 4, `4 different choices: ${labels}`);
      for (const l of labels) assert.ok(Number.isInteger(Number(l)) && Number(l) >= 0, `"${l}" is a whole number`);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
    }
  });
}

test("story problems show the character they're about", () => {
  const qs = [1, 2, 3].flatMap((l) => many(l, "story", 100));
  assert.ok(qs.some((q) => q.media.who === "fiery"));
  assert.ok(qs.some((q) => q.media.who === "bookworm"));
});

test("every character the server asks for has a sprite", async () => {
  // sprites.js is browser code but has no browser-only bits, so Node can load it.
  const { SPRITES } = await import("../public/js/sprites.js");
  const who = new Set();
  for (const level of [1, 2, 3]) for (const kind of ["make", "story"]) for (const q of many(level, kind, 200)) if (q.media.who) who.add(q.media.who);
  for (const w of who) assert.ok(SPRITES[w], `no sprite called "${w}"`);
});
