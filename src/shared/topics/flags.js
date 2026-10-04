// 🚩 FLAG FRENZY - the main topic.
// Every question is built fresh from 195 countries, 4 question styles and
// randomly picked wrong answers, so games almost never repeat.

import { COUNTRIES } from "../data/countries.js";
import { FAMOUS, KNOWN, LOOKALIKES, CONTINENT_TRICKY, FACTS } from "../data/flag-notes.js";
import { CONTINENTS, CONTINENT_EMOJI, pickFresh, pickDistractors, mixIn } from "../kit.js";

const key = (c) => c.code;
const tier = (c) => (FAMOUS.has(c.code) ? 1 : KNOWN.has(c.code) ? 2 : 3);
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

const TIER1 = COUNTRIES.filter((c) => tier(c) === 1);
const TIER12 = COUNTRIES.filter((c) => tier(c) <= 2);
const TIER23 = COUNTRIES.filter((c) => tier(c) >= 2);

// Which countries a question at this level can be ABOUT.
function poolFor(level, rng) {
  if (level === 1) return TIER1;
  if (level === 2) return rng.chance(0.7) ? TIER12.filter((c) => tier(c) === 2) : TIER12;
  return rng.chance(0.75) ? TIER23 : COUNTRIES;
}

function lookalikesOf(code) {
  const out = new Set();
  for (const g of LOOKALIKES) if (g.includes(code)) g.forEach((x) => x !== code && out.add(x));
  return [...out].map((c) => BY_CODE.get(c)).filter(Boolean);
}

// Wrong answers: easy = far away and famous, medium = same continent, hard = lookalikes.
function distractorsFor(rng, c, level) {
  const sameCont = COUNTRIES.filter((x) => x.continent === c.continent);
  if (level === 1) {
    const far = TIER12.filter((x) => x.continent !== c.continent);
    return pickDistractors(rng, c, far, TIER12, 3, key);
  }
  if (level === 2) {
    return pickDistractors(rng, c, sameCont.filter((x) => tier(x) <= 2), sameCont.concat(TIER12), 3, key);
  }
  return pickDistractors(rng, c, lookalikesOf(c.code), sameCont, 3, key);
}

export function factFor(c) {
  if (FACTS[c.code]) return FACTS[c.code];
  return c.capital
    ? `${c.name} is in ${c.continent}, and its capital city is ${c.capital}.`
    : `${c.name} is a country in ${c.continent}.`;
}

const asReveal = (x) => ({ label: x.name, img: x.img });

const MODES = {
  // Show a flag, pick the country name.
  flagToName(rng, c, level) {
    const { items, answer } = mixIn(rng, c, distractorsFor(rng, c, level));
    return {
      eyebrow: "Name that flag",
      prompt: "Which country flies this flag?",
      media: { kind: "flag", img: c.img },
      choices: items.map((x) => ({ label: x.name })),
      answer,
      reveal: items.map(asReveal),
    };
  },

  // Show a country name, pick its flag.
  nameToFlag(rng, c, level) {
    const { items, answer } = mixIn(rng, c, distractorsFor(rng, c, level));
    return {
      eyebrow: "Find the flag",
      prompt: `Which flag belongs to ${c.name}?`,
      media: { kind: "word", text: c.name, sub: level === 1 ? `${CONTINENT_EMOJI[c.continent]} ${c.continent}` : "" },
      choices: items.map((x) => ({ img: x.img })),
      answer,
      reveal: items.map(asReveal),
    };
  },

  // Show a flag, pick the continent.
  flagToContinent(rng, c) {
    const others = rng.shuffle(CONTINENTS.filter((k) => k !== c.continent)).slice(0, 3);
    const { items, answer } = mixIn(rng, c.continent, others);
    return {
      eyebrow: "Where in the world?",
      prompt: "Which continent is this flag from?",
      media: { kind: "flag", img: c.img },
      choices: items.map((k) => ({ label: k, emoji: CONTINENT_EMOJI[k] })),
      answer,
    };
  },

  // Four flags, three from one continent. Which one is the odd one out?
  oddOneOut(rng, c, level) {
    const home = rng.pick(CONTINENTS.filter((k) => k !== c.continent));
    const pool = COUNTRIES.filter((x) => x.continent === home && !CONTINENT_TRICKY.has(x.code));
    const preferred = level >= 3 ? pool : pool.filter((x) => tier(x) <= 2);
    const three = pickDistractors(rng, c, preferred, pool, 3, key);
    const { items, answer } = mixIn(rng, c, three);
    return {
      eyebrow: "Odd one out",
      prompt: `Three of these flags are from ${home}. Which one is NOT?`,
      media: { kind: "word", text: `${CONTINENT_EMOJI[home]} ${home}`, sub: "Spot the visitor!" },
      choices: items.map((x) => ({ img: x.img })),
      answer,
      reveal: items.map(asReveal),
    };
  },
};

// How often each style shows up at each level.
const MIX = {
  1: [["flagToName", 55], ["nameToFlag", 30], ["flagToContinent", 15]],
  2: [["flagToName", 45], ["nameToFlag", 35], ["flagToContinent", 8], ["oddOneOut", 12]],
  3: [["flagToName", 40], ["nameToFlag", 40], ["oddOneOut", 20]],
};

export default {
  id: "flags",
  title: "Flag Frenzy",
  emoji: "🚩",
  color: "#ff8a1f",
  blurb: "195 countries. Can you name them all?",
  size: COUNTRIES.length,
  orbit: "flags",
  music: "parade",

  next({ rng, level, used, avoid, missed }) {
    const c = pickFresh(rng, poolFor(level, rng), { used, avoid, missed, keyOf: key });
    let mode = rng.weighted(MIX[level] || MIX[2]);
    if (mode === "flagToContinent" && CONTINENT_TRICKY.has(c.code)) mode = "flagToName";
    const q = MODES[mode](rng, c, level);
    return { key: c.code, level, mode, ...q, fact: factFor(c), learn: { label: c.name, img: c.img } };
  },
};
