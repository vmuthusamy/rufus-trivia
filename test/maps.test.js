// Checks the map questions ("Which map shows Italy?" / "Which country is glowing orange?").
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { MAPS } from "../src/shared/data/maps.js";
import { COUNTRIES } from "../src/shared/data/countries.js";
import { mapQuestion, mapFact, MAP_COUNT } from "../src/shared/topics/maps.js";
import { makeRng } from "../src/shared/rng.js";

const file = (img) => new URL("../public" + img, import.meta.url);
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

test("every country has a map, every map file is on disk, and there are no leftovers", () => {
  for (const c of COUNTRIES) assert.ok(MAPS[c.code], `${c.code} has no map`);
  for (const [code, m] of Object.entries(MAPS)) {
    assert.ok(BY_CODE.has(code), `map for unknown country ${code}`);
    assert.ok(existsSync(file(m.img)), `${code}: ${m.img} missing`);
    for (const n of m.near) assert.ok(BY_CODE.has(n) && n !== code, `${code}: bad neighbour ${n}`);
  }
  const used = new Set(Object.values(MAPS).map((m) => m.img.slice(3)));
  for (const f of readdirSync(new URL("../public/m/", import.meta.url))) assert.ok(used.has(f), `leftover map ${f}`);
});

test("map file names and pictures don't give away the answer", () => {
  for (const [code, m] of Object.entries(MAPS)) {
    assert.match(m.img, /^\/m\/[0-9a-f]{10}\.svg$/, `${code}: scrambled name`);
    const svg = readFileSync(file(m.img), "utf8");
    assert.ok(!/<title|<text|id=|class=/i.test(svg), `${code}: the picture has no labels`);
    assert.ok(svg.length < 40_000, `${code}: map is ${svg.length} bytes, keep them small`);
  }
});

test("neighbours make sense", () => {
  assert.deepEqual(MAPS.us.near.slice().sort(), ["ca", "mx"]);
  assert.ok(MAPS.fr.near.slice(0, 6).includes("es") && MAPS.fr.near.includes("be"));
  assert.deepEqual(MAPS.ls.near, ["za"]);
  assert.deepEqual(MAPS.jp.near, []);
  assert.ok(MAPS.va.tiny && MAPS.va.near[0] === "it");
  assert.ok(!MAPS.br.tiny && !MAPS.ru.tiny);
});

test("map facts read nicely", () => {
  assert.equal(mapFact(BY_CODE.get("us")), "The United States is in North America and shares borders with Canada and Mexico. Its capital is Washington, D.C.");
  assert.equal(mapFact(BY_CODE.get("jp")), "Japan is an island country in Asia. Its capital is Tokyo.");
  assert.match(mapFact(BY_CODE.get("ls")), /only neighbour by land is South Africa/);
});

test("3000 map questions across levels are all fair", () => {
  let find = 0, name = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const rng = makeRng("maps" + seed);
    const level = 1 + (seed % 3);
    const used = new Set(["m_fr", "m_de"]), avoid = new Set(["m_it"]), missed = new Set(["m_es"]);
    for (let i = 0; i < 3; i++) {
      const q = mapQuestion({ rng, level, used, avoid, missed });
      used.add(q.key);
      assert.match(q.key, /^m_[a-z]{2}$/);
      assert.match(q.key, /^[a-z0-9_-]{1,32}$/i);
      assert.equal(q.level, level);
      assert.equal(q.choices.length, 4);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
      const ids = q.choices.map((c) => (c.img || "") + "|" + (c.label || ""));
      assert.equal(new Set(ids).size, 4, `duplicate choices: ${ids}`);
      const code = q.key.slice(2);
      const c = BY_CODE.get(code);
      assert.ok(!["il", "ps"].includes(code), "disputed borders stay out of map questions");
      assert.equal(q.reveal[q.answer].label, c.name, "reveal names the right country");
      assert.ok(q.fact.startsWith(c.name) || q.fact.startsWith("The " + c.name), q.fact);
      if (q.mode === "findOnMap") {
        find++;
        assert.ok(q.choices.every((x) => x.img && x.img.startsWith("/m/") && !x.label), "four map pictures, no names");
        assert.equal(q.choices[q.answer].img, MAPS[code].img, "the right country's map is a choice");
        assert.ok(q.prompt.includes(c.name));
        for (const x of q.choices) assert.ok(existsSync(file(x.img)));
        // every map in "find it" must be big enough to see without a circle
        for (const x of q.choices) assert.ok(!Object.values(MAPS).find((m) => m.img === x.img).tiny, "no tiny maps in find-it");
      } else {
        name++;
        assert.equal(q.mode, "nameOnMap");
        assert.equal(q.media.kind, "map");
        assert.equal(q.media.img, MAPS[code].img);
        assert.equal(q.choices[q.answer].label, c.name);
        assert.ok(!q.prompt.includes(c.name), "the question doesn't say the answer");
      }
      if (level === 1) assert.ok(!MAPS[code].tiny, "easy level only asks about countries you can spot");
    }
  }
  assert.ok(find > 1000 && name > 700, `both kinds show up (find ${find}, name ${name})`);
});

test("all map countries can come up", () => {
  const seen = new Set();
  for (let seed = 0; seed < 4000; seed++) {
    const q = mapQuestion({ rng: makeRng("all" + seed), level: 1 + (seed % 3), used: new Set(), avoid: new Set(), missed: new Set() });
    seen.add(q.key);
  }
  assert.ok(seen.size >= MAP_COUNT * 0.9, `only ${seen.size} of ${MAP_COUNT} countries came up`);
});
