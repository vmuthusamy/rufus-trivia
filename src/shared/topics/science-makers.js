// 🔬 QUESTION MAKERS for Science & Space: instead of writing every question by hand, these build
// questions from the tables in data/planets.js and data/materials.js (like Animal Kingdom does with animals).
//
//   🪐 planets     "Which planet is 4th from the Sun?", "Which of these is a gas giant?", "Which planet does Titan go around?"
//   🧲 materials   "Which of these would a magnet pick up?", "Which one floats?", "Which one makes the bulb light up?"
//
// How it works: we first write down EVERY question a maker could ask (a "spec": a key, a level and what to ask).
// Then each turn we pick one the player hasn't seen, and choose its 4 choices so exactly ONE is right.
// Always use ctx.rng (never Math.random), so everyone in a room gets the same game.

import { PLANETS, KINDS, MOONS, DWARFS } from "../data/planets.js";
import { THINGS, MATERIALS, SUBSTANCES, STATES } from "../data/materials.js";
import { pickFresh, pickDistractors, mixIn } from "../kit.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const km = (n) => (n < 100 ? String(n) : Math.round(n).toLocaleString("en-GB")) + " km";
const ORDINAL = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

// 🤏 In "Which is biggest?" questions the winner must be clearly bigger than every other choice
// (at least 15% wider), so nobody gets a question like "Earth or Venus?" where they're nearly twins.
const GAP = 1.15;
// ...and in "Which spins fastest?" the winner must spin at least 30% faster (Jupiter and Saturn are close!).
const SPIN_GAP = 1.3;

// Build a maker from its list of specs. `build(spec, rng)` makes the question; we add the key and level.
// Choosing which spec to ask works just like bankTopic(): fresh ones at the right level first.
// Some facts are already asked by a hand-written question in science-banks.js / earth-space-banks.js
// (closest, biggest and farthest planet, Pluto, the iron nail, copper wire, mercury). The makers skip
// them, so one Science & Space game never asks the same thing twice in two different ways.
const ALREADY_IN_BANKS = new Set([
  "pl_ord_mercury", "pl_near_mercury", "pl_big_jupiter", "pl_far_neptune", "dw_pluto", "mg_nail", "el_copper", "st_mercury",
]);

function specMaker(id, allSpecs, build) {
  const specs = allSpecs.filter((s) => !ALREADY_IN_BANKS.has(s.key));
  const keys = new Set();
  for (const s of specs) {
    if (!/^[a-z0-9_-]{1,32}$/i.test(s.key) || keys.has(s.key)) throw new Error(`${id}: bad or repeated key ${s.key}`);
    keys.add(s.key);
  }
  return {
    id, size: specs.length, specs,
    next({ rng, level, used, avoid, missed }) {
      const unused = specs.filter((s) => !used.has(s.key));
      const fresh = (list) => list.filter((s) => !(avoid && avoid.has(s.key)));
      const near = (d) => unused.filter((s) => Math.abs(s.level - level) <= d);
      let pool = fresh(near(0));
      if (!pool.length) pool = fresh(near(1));
      if (!pool.length) pool = fresh(unused);
      if (!pool.length) pool = near(0).length ? near(0) : unused.length ? unused : specs;
      const spec = pickFresh(rng, pool, { used, avoid, missed });
      return { key: spec.key, level: spec.level, ...build(spec, rng), noBingo: true }; // only works with its 4 choices
    },
  };
}

// Put the right answer among the wrong ones, with an after-answer note on every choice ("Mars · 4th").
function ask(rng, right, wrong, { label = (x) => x.name, note }) {
  const { items, answer } = mixIn(rng, right, wrong);
  return {
    choices: items.map((x) => ({ label: label(x) })),
    answer,
    ...(note ? { reveal: items.map((x) => ({ add: " · " + note(x) })) } : {}),
  };
}

// =====================================================================================
// 🪐 PLANET PATROL
// =====================================================================================
const BY_NAME = Object.fromEntries(PLANETS.map((p) => [p.name, p]));
const planetEmoji = (p) => (p.name === "Earth" ? "🌍" : p.name === "Saturn" ? "🪐" : "🔭");
const noteOf = (rng, p) => rng.pick(p.notes);
const ordinalOf = (p) => ORDINAL[p.order - 1];

const PLANET_SPECS = [];
const add = (list, type, key, level, extra) => list.push({ type, key, level, ...extra });

// "Which planet is 4th from the Sun?"  (easy for the first and third, harder in the middle of the giants)
const ORDER_LEVEL = { Mercury: 1, Venus: 2, Earth: 1, Mars: 2, Jupiter: 2, Saturn: 3, Uranus: 3, Neptune: 2 };
for (const p of PLANETS) add(PLANET_SPECS, "order", "pl_ord_" + slug(p.name), ORDER_LEVEL[p.name], { p });

// "Which of these is closest to / farthest from the Sun?" - needs 3 planets farther out (or closer in).
const NEAR_LEVEL = { Mercury: 1, Venus: 1, Earth: 2, Mars: 2, Jupiter: 3 };
const FAR_LEVEL = { Neptune: 1, Uranus: 2, Saturn: 2, Jupiter: 3, Mars: 3 };
for (const p of PLANETS) {
  if (NEAR_LEVEL[p.name]) add(PLANET_SPECS, "near", "pl_near_" + slug(p.name), NEAR_LEVEL[p.name], { p });
  if (FAR_LEVEL[p.name]) add(PLANET_SPECS, "far", "pl_far_" + slug(p.name), FAR_LEVEL[p.name], { p });
}

// "Which of these planets is the biggest / smallest?" - only planets with at least 3 clearly-different rivals.
const bigRivals = (p) => PLANETS.filter((q) => q.km * GAP <= p.km);
const smallRivals = (p) => PLANETS.filter((q) => q.km >= p.km * GAP);
const SIZE_LEVEL = { Jupiter: 1, Saturn: 1, Uranus: 3, Neptune: 3, Mercury: 1, Mars: 2, Venus: 3, Earth: 2 };
for (const p of PLANETS) {
  if (bigRivals(p).length >= 3) add(PLANET_SPECS, "big", "pl_big_" + slug(p.name), SIZE_LEVEL[p.name], { p });
  if (smallRivals(p).length >= 3) add(PLANET_SPECS, "small", "pl_small_" + slug(p.name), SIZE_LEVEL[p.name], { p });
}

// "Which of these is a gas giant / an ice giant / a rocky planet?"
const KIND_LEVEL = { rocky: 2, gas: 1, ice: 3 };
for (const p of PLANETS) add(PLANET_SPECS, "kind", "pl_kind_" + slug(p.name), KIND_LEVEL[p.kind], { p });

// "Which of these planets has no moons at all?" (Mercury and Venus)
for (const p of PLANETS.filter((x) => !x.moons)) add(PLANET_SPECS, "nomoon", "pl_nomoon_" + slug(p.name), 3, { p });

// "Which of these planets spins round the fastest / slowest?"
const fastRivals = (p) => PLANETS.filter((q) => q.spin >= p.spin * SPIN_GAP);
const slowRivals = (p) => PLANETS.filter((q) => q.spin * SPIN_GAP <= p.spin);
for (const p of PLANETS) {
  if (fastRivals(p).length >= 3) add(PLANET_SPECS, "fast", "pl_fast_" + slug(p.name), p.name === "Jupiter" ? 2 : 3, { p });
  if (slowRivals(p).length >= 3) add(PLANET_SPECS, "slow", "pl_slow_" + slug(p.name), p.name === "Venus" ? 2 : 3, { p });
}

// "Which planet does Titan go around?" (not Charon: it goes round Pluto, which isn't a planet)
for (const m of MOONS.filter((x) => BY_NAME[x.planet])) add(PLANET_SPECS, "moon", "mo_" + slug(m.name), m.lv, { m });

// "Which of these is a dwarf planet?"
for (const d of DWARFS) add(PLANET_SPECS, "dwarf", "dw_" + slug(d.name), d.lv, { d });

// "Which of these moons is the biggest / smallest?" (same 15% rule)
const moonBigRivals = (m) => MOONS.filter((x) => x.km * GAP <= m.km);
const moonSmallRivals = (m) => MOONS.filter((x) => x.km >= m.km * GAP);
for (const m of MOONS) {
  if (m.km >= 2000 && moonBigRivals(m).length >= 3) add(PLANET_SPECS, "moonbig", "mb_" + slug(m.name), 3, { m });
  if (m.km < 600 && moonSmallRivals(m).length >= 3) add(PLANET_SPECS, "moonsmall", "ms_" + slug(m.name), 3, { m });
}

// What every planet choice says after answering, for each kind of question.
const PLANET_NOTE = {
  order: (x) => ordinalOf(x) + " from the Sun", near: (x) => ordinalOf(x) + " from the Sun", far: (x) => ordinalOf(x) + " from the Sun",
  big: (x) => km(x.km) + " wide", small: (x) => km(x.km) + " wide",
  kind: (x) => KINDS[x.kind].label, nomoon: (x) => (x.moons ? "has moons" : "no moons"),
  fast: (x) => x.spinSay, slow: (x) => x.spinSay,
};
const DWARF_NAMES = new Set(DWARFS.map((d) => d.name));

function buildPlanet(spec, rng) {
  const { type, p, m, d } = spec;
  const eyebrow = "Planet Patrol";
  const pick3 = (preferred, fallback = []) => pickDistractors(rng, p, preferred, fallback, 3, (x) => x.name);
  const others = PLANETS.filter((x) => x !== p);

  if (type === "order") {
    const fact = `${p.name} is the ${ordinalOf(p)} planet from the Sun. ${noteOf(rng, p)}`;
    const learn = { label: `${p.name}: ${ordinalOf(p)} from the Sun`, emoji: planetEmoji(p) };
    if (rng.chance(0.5)) {
      // "Which planet is 4th from the Sun?" - the wrong ones are its neighbours, so you have to know the order
      const wrong = pick3(others.filter((x) => Math.abs(x.order - p.order) <= 2), others);
      return { eyebrow, prompt: `Which planet is ${ordinalOf(p)} from the Sun?`,
        media: { kind: "word", text: ordinalOf(p), sub: "☀️ from the Sun" }, ...ask(rng, p, wrong, { note: PLANET_NOTE.order }), fact, learn };
    }
    // "Counting from the Sun, which number planet is Saturn?" -> 6th
    const nums = rng.shuffle(ORDINAL.filter((o, i) => i !== p.order - 1 && Math.abs(i + 1 - p.order) <= 3)).slice(0, 3);
    const { items, answer } = mixIn(rng, ordinalOf(p), nums);
    return { eyebrow, prompt: `Counting out from the Sun, which number planet is ${p.name}?`,
      media: { kind: "word", text: p.name, sub: "☀️ 1st, 2nd, 3rd…?" }, choices: items.map((label) => ({ label })), answer, fact, learn };
  }
  if (type === "near" || type === "far") {
    const near = type === "near";
    const wrong = pick3(others.filter((x) => (near ? x.order > p.order : x.order < p.order)));
    return { eyebrow, prompt: `Which of these planets is ${near ? "closest to" : "farthest from"} the Sun?`,
      media: { kind: "emoji", text: near ? "☀️" : "🥶" }, ...ask(rng, p, wrong, { note: PLANET_NOTE[type] }),
      fact: `${p.name} is the ${ordinalOf(p)} planet from the Sun, so it's the ${near ? "closest" : "farthest"} of these. ${noteOf(rng, p)}`,
      learn: { label: `${p.name}: ${ordinalOf(p)} from the Sun`, emoji: planetEmoji(p) } };
  }
  if (type === "big" || type === "small") {
    const big = type === "big";
    const wrong = pick3(big ? bigRivals(p) : smallRivals(p));
    return { eyebrow, prompt: `Which of these planets is the ${big ? "biggest" : "smallest"}?`,
      media: { kind: "emoji", text: big ? "🐘" : "🐭" }, ...ask(rng, p, wrong, { note: PLANET_NOTE[type] }),
      fact: `${p.name} is ${km(p.km)} wide, the ${big ? "biggest" : "smallest"} of these. ${noteOf(rng, p)}`,
      learn: { label: `${p.name}: ${km(p.km)} wide`, emoji: planetEmoji(p) } };
  }
  if (type === "kind") {
    // Some books call Uranus and Neptune gas giants too, so a gas-giant question never offers them.
    const notThis = others.filter((x) => x.kind !== p.kind && !(p.kind === "gas" && x.kind === "ice"));
    const wrong = pick3(notThis);
    const k = KINDS[p.kind];
    return { eyebrow, prompt: `Which of these is ${k.say}?`,
      media: { kind: "word", text: { rocky: "🪨", gas: "💨", ice: "🧊" }[p.kind] + " " + cap(k.label), sub: "Which one is it?" },
      ...ask(rng, p, wrong, { note: PLANET_NOTE.kind }),
      fact: `${p.name} is ${k.say}. ${k.what}`, learn: { label: `${p.name} = ${k.label}`, emoji: planetEmoji(p) } };
  }
  if (type === "nomoon") {
    const wrong = pick3(others.filter((x) => x.moons));
    return { eyebrow, prompt: "Which of these planets has no moons at all?", media: { kind: "emoji", text: "🌑" },
      ...ask(rng, p, wrong, { note: PLANET_NOTE.nomoon }),
      fact: `${p.name} has no moons. Mercury and Venus are the only planets without any! ${noteOf(rng, p)}`,
      learn: { label: `${p.name}: no moons`, emoji: "🌑" } };
  }
  if (type === "fast" || type === "slow") {
    const fast = type === "fast";
    const wrong = pick3(fast ? fastRivals(p) : slowRivals(p));
    return { eyebrow, prompt: `Which of these planets spins round the ${fast ? "fastest" : "slowest"}?`,
      media: { kind: "emoji", text: fast ? "🌀" : "🐌" }, ...ask(rng, p, wrong, { note: PLANET_NOTE[type] }),
      fact: `One spin of ${p.name} takes ${p.spinSay}. ${noteOf(rng, p)}`,
      learn: { label: `${p.name}: one spin takes ${p.spinSay}`, emoji: "🌀" } };
  }
  if (type === "moon") {
    const home = BY_NAME[m.planet];
    const wrong = pickDistractors(rng, home, PLANETS.filter((x) => x.moons), PLANETS, 3, (x) => x.name);
    const who = m.name === "The Moon" ? "the Moon" : m.name;
    return { eyebrow: "Moon Spotter", prompt: `Which planet does ${who} go around?`,
      media: { kind: "word", text: m.name, sub: "🌙 a moon of which planet?" }, ...ask(rng, home, wrong, {}),
      fact: `${m.name} goes around ${home.name}. ${m.note}`, learn: { label: `${m.name}: a moon of ${home.name}`, emoji: "🌙" } };
  }
  if (type === "dwarf") {
    const fakes = [...MOONS.map((x) => ({ name: x.name, says: x.planet === "Pluto" ? "moon of Pluto" : `moon of ${x.planet}` })),
      ...["Mercury", "Mars"].map((name) => ({ name, says: "planet" }))].filter((x) => !DWARF_NAMES.has(x.name));
    const right = { name: d.name, says: "dwarf planet" };
    const wrong = pickDistractors(rng, right, fakes, [], 3, (x) => x.name);
    return { eyebrow: "Moon Spotter", prompt: "Which of these is a dwarf planet?", media: { kind: "word", text: "🧊 Dwarf planet", sub: "Which one is it?" },
      ...ask(rng, right, wrong, { note: (x) => x.says }),
      fact: `${d.name} is a dwarf planet. ${d.note}`, learn: { label: `${d.name} = dwarf planet`, emoji: "🧊" } };
  }
  // "moonbig" / "moonsmall"
  const big = type === "moonbig";
  const wrong = pickDistractors(rng, m, big ? moonBigRivals(m) : moonSmallRivals(m), [], 3, (x) => x.name);
  return { eyebrow: "Moon Spotter", prompt: `Which of these moons is the ${big ? "biggest" : "smallest"}?`,
    media: { kind: "emoji", text: big ? "🌕" : "🌑" }, ...ask(rng, m, wrong, { note: (x) => km(x.km) + " wide" }),
    fact: `${m.name} is ${km(m.km)} wide, the ${big ? "biggest" : "smallest"} of these. ${m.note}`,
    learn: { label: `${m.name}: ${km(m.km)} wide`, emoji: "🌙" } };
}

export const planets = specMaker("planets", PLANET_SPECS, buildPlanet);

// =====================================================================================
// 🧲 EVERYDAY SCIENCE: magnets, floating, circuits, materials, solids/liquids/gases
// =====================================================================================
const levelOf = (row, test) => (typeof row.lv === "number" ? row.lv : row.lv[test] || 2);
const isTrick = (row, test) => (row.trick || []).includes(test);

// Each test: which rows can be the answer, which can be wrong, and what to say.
const TESTS = {
  mag: {
    eyebrow: "Magnet test", emoji: "🧲", prompt: "Which of these would a magnet pick up?",
    right: (t) => t.mag === true, wrong: (t) => t.mag === false,
    note: (t) => (t.mag ? "magnetic" : "not magnetic"), lead: (t) => `${t.name} ${t.many ? "stick" : "sticks"} to a magnet!`, learn: "magnetic",
  },
  nomag: {
    eyebrow: "Magnet test", emoji: "🧲", prompt: "Which of these metals does NOT stick to a magnet?", test: "mag",
    right: (t) => t.mag === false && t.metal, wrong: (t) => t.mag === true,
    note: (t) => (t.mag ? "magnetic" : "not magnetic"), lead: (t) => `${t.name} ${t.many ? "don't" : "doesn't"} stick to a magnet.`, learn: "not magnetic",
  },
  float: {
    eyebrow: "Sink or float?", emoji: "🛁", prompt: "Drop these into a bowl of water. Which one floats?",
    right: (t) => t.float === true, wrong: (t) => t.float === false,
    note: (t) => (t.float ? "floats" : "sinks"), lead: (t) => `${t.name} floats!`, learn: "floats",
  },
  sink: {
    eyebrow: "Sink or float?", emoji: "🛁", prompt: "Which of these would sink to the bottom of a bowl of water?", test: "float",
    right: (t) => t.float === false, wrong: (t) => t.float === true,
    note: (t) => (t.float ? "floats" : "sinks"), lead: (t) => `${t.name} sinks.`, learn: "sinks",
  },
  elec: {
    eyebrow: "Circuit test", emoji: "💡", prompt: "You test each of these in a circuit. Which one lets electricity through?",
    right: (t) => t.elec === true, wrong: (t) => t.elec === false,
    note: (t) => (t.elec ? "conductor" : "insulator"), lead: (t) => `${t.name} lets electricity through: it's a conductor!`, learn: "conductor",
  },
  insul: {
    eyebrow: "Circuit test", emoji: "🔌", prompt: "Which of these would stop electricity flowing round a circuit?", test: "elec",
    right: (t) => t.elec === false, wrong: (t) => t.elec === true,
    note: (t) => (t.elec ? "conductor" : "insulator"), lead: (t) => `${t.name} is an insulator: electricity can't get through it.`, learn: "insulator",
  },
};
const PREFIX = { mag: "mg_", nomag: "nm_", float: "fl_", sink: "sk_", elec: "el_", insul: "in_" };

const STUFF_SPECS = [];
for (const [type, T] of Object.entries(TESTS)) {
  const test = T.test || type;
  // A thing can only be the right answer if it has a fun fact for this test.
  for (const t of THINGS.filter((x) => T.right(x) && x.notes[test])) {
    add(STUFF_SPECS, type, PREFIX[type] + t.id, isTrick(t, test) ? 3 : levelOf(t, test), { t });
  }
}
for (const m of MATERIALS) add(STUFF_SPECS, m.natural ? "natural" : "made", (m.natural ? "nt_" : "mp_") + m.id, m.lv, { m });
for (const s of SUBSTANCES) add(STUFF_SPECS, "state", "st_" + s.id, s.lv, { s });

function buildStuff(spec, rng, level = spec.level) {
  const { type } = spec;
  if (TESTS[type]) {
    const T = TESTS[type], test = T.test || type, t = spec.t;
    // Easy questions never use the surprising ones (an egg that sinks is a hard question!).
    const wrongs = THINGS.filter((x) => T.wrong(x) && (level >= 2 || !isTrick(x, test)));
    // Medium and hard questions love sneaky wrong answers: aluminium foil in a magnet question, ebony in a float one.
    const sneaky = level >= 2 ? wrongs.filter((x) => isTrick(x, test)) : [];
    const wrong = pickDistractors(rng, t, sneaky.length ? rng.shuffle(sneaky).slice(0, 1) : [], wrongs, 3, (x) => x.id);
    const shownTrick = wrong.find((x) => isTrick(x, test) && x.notes[test]);
    let fact = `${T.lead(t)} ${t.notes[test]}`;
    if (shownTrick && fact.length + shownTrick.notes[test].length < 230) fact += ` (${shownTrick.notes[test]})`;
    return { eyebrow: T.eyebrow, prompt: T.prompt, media: { kind: "emoji", text: T.emoji },
      ...ask(rng, t, wrong, { note: T.note }), fact, learn: { label: `${t.name}: ${T.learn}`, emoji: T.emoji } };
  }
  if (type === "natural" || type === "made") {
    const m = spec.m, natural = type === "natural";
    const wrong = pickDistractors(rng, m, MATERIALS.filter((x) => x.natural !== natural), [], 3, (x) => x.id);
    return { eyebrow: "Natural or made?", prompt: natural ? "Which of these materials comes from nature?" : "Which of these materials is made by people?",
      media: { kind: "emoji", text: natural ? "🌿" : "🏭" }, ...ask(rng, m, wrong, { note: (x) => (x.natural ? "natural" : "made by people") }),
      fact: `${m.name} ${natural ? "is a natural material" : "is made by people"}. ${m.note}`,
      learn: { label: `${m.name}: ${natural ? "natural" : "made by people"}`, emoji: natural ? "🌿" : "🏭" } };
  }
  // "state"
  const s = spec.s, st = STATES[s.state];
  const wrong = pickDistractors(rng, s, SUBSTANCES.filter((x) => x.state !== s.state), [], 3, (x) => x.id);
  return { eyebrow: "Solid, liquid or gas?", prompt: `At room temperature, which of these is a ${s.state}?`,
    media: { kind: "word", text: `${st.emoji} ${cap(s.state)}`, sub: "at room temperature" },
    ...ask(rng, s, wrong, { note: (x) => x.state }),
    fact: `${s.name} is a ${s.state} at room temperature. ${s.note}`, learn: { label: `${s.name}: ${s.state}`, emoji: st.emoji } };
}

export const materials = specMaker("materials", STUFF_SPECS, (spec, rng) => buildStuff(spec, rng));

// For tests: the tables and rules, so test/science.test.js can check every answer against them.
export const RULES = { GAP, SPIN_GAP, TESTS };
