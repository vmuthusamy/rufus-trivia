// 🧭 MAP questions (used by the "Capitals & Landmarks" topic).
// Two kinds:
//   "Which map shows Italy?"        -> four little maps, each with a different country lit up in orange
//   "Which country is highlighted?" -> one map, four country names
// The maps are drawn ahead of time by scripts/build-maps.mjs from Natural Earth (public domain).

import { COUNTRIES } from "../data/countries.js";
import { MAPS } from "../data/maps.js";
import { FAMOUS, KNOWN } from "../data/flag-notes.js";
import { pickFresh, pickDistractors, mixIn } from "../kit.js";

// Places whose borders grown-ups still argue about: we leave them out of map questions.
const NO_MAP = new Set(["il", "ps"]);

const ON_MAP = COUNTRIES.filter((c) => MAPS[c.code] && !NO_MAP.has(c.code));
const BIG = ON_MAP.filter((c) => !MAPS[c.code].tiny); // big enough to spot without a circle
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const key = (c) => "m_" + c.code;
const tier = (c) => (FAMOUS.has(c.code) ? 1 : KNOWN.has(c.code) ? 2 : 3);
const mapOf = (c) => MAPS[c.code].img;

export const MAP_COUNT = ON_MAP.length;

// "Find it" needs countries you can actually see on all four maps, so tiny ones only show up in "name it" at hard level.
function poolFor(level, findIt) {
  if (level === 1) return BIG.filter((c) => tier(c) === 1);
  if (level === 2) return BIG.filter((c) => tier(c) <= 2);
  return (findIt ? BIG : ON_MAP).filter((c) => tier(c) >= 2);
}

function distractorsFor(rng, c, level, findIt) {
  const from = findIt ? BIG : ON_MAP;
  if (level === 1) {
    // Easy: the other choices are famous countries far away, so the shapes look very different.
    const elsewhere = from.filter((x) => x.continent !== c.continent);
    return pickDistractors(rng, c, elsewhere.filter((x) => tier(x) === 1), elsewhere.filter((x) => tier(x) <= 2), 3, key);
  }
  const sameCont = from.filter((x) => x.continent === c.continent);
  if (level === 3) {
    // Hard: next-door neighbours first. Is it Belgium, the Netherlands or Luxembourg?
    const near = MAPS[c.code].near.map((code) => BY_CODE.get(code)).filter((x) => x && from.includes(x));
    return pickDistractors(rng, c, near, sameCont.length >= 4 ? sameCont : from, 3, key);
  }
  return pickDistractors(rng, c, sameCont, from, 3, key);
}

// "Which map shows the Netherlands?" sounds better than "...shows Netherlands?"
const THE = /^(Bahamas|Central African Republic|Comoros|Czech Republic|Dominican Republic|Gambia|Maldives|Marshall Islands|Netherlands|Philippines|Republic of the Congo|Seychelles|Solomon Islands|United )/;
const the = (name) => (THE.test(name) ? "the " + name : name);
const The = (name) => (THE.test(name) ? "The " + name : name);
const listOf = (names) => (names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]);

// A little geography lesson: where it is and who its neighbours are.
export function mapFact(c) {
  const near = MAPS[c.code].near.map((code) => BY_CODE.get(code)).filter(Boolean).map((x) => the(x.name));
  const name = The(c.name);
  let where;
  if (!near.length) where = `${name} is an island country in ${c.continent}.`;
  else if (near.length === 1) where = `${name} is in ${c.continent}, and its only neighbour by land is ${near[0]}.`;
  else if (near.length <= 3) where = `${name} is in ${c.continent} and shares borders with ${listOf(near)}.`;
  else where = `${name} is in ${c.continent} and has ${near.length} neighbours, like ${listOf(near.slice(0, 3))}.`;
  return where + (c.capital ? ` Its capital is ${c.capital}${c.capital.endsWith(".") ? "" : "."}` : "");
}

export function mapQuestion({ rng, level, used, avoid, missed }) {
  const findIt = rng.chance(0.6); // the "find the country on the map" kind is the star
  const c = pickFresh(rng, poolFor(level, findIt), { used, avoid, missed, keyOf: key });
  const { items, answer } = mixIn(rng, c, distractorsFor(rng, c, level, findIt));
  const reveal = items.map((x) => ({ label: x.name, img: x.img }));
  const fact = mapFact(c);
  const learn = { label: c.name, img: mapOf(c) };

  if (findIt) {
    return {
      key: key(c), level, mode: "findOnMap",
      eyebrow: "Map hunt",
      prompt: `Which map shows ${the(c.name)}?`,
      // Easy and medium get the flag as a clue; hard is just the name.
      media: level < 3 ? { kind: "flag", img: c.img, caption: c.name } : { kind: "word", text: c.name, sub: "🧭 Find it on the map" },
      choices: items.map((x) => ({ img: mapOf(x) })),
      answer, reveal, fact, learn,
    };
  }
  return {
    key: key(c), level, mode: "nameOnMap",
    eyebrow: "Map hunt",
    prompt: MAPS[c.code].tiny ? "Which country is inside the orange circle?" : "Which country is glowing orange?",
    media: { kind: "map", img: mapOf(c) },
    choices: items.map((x) => (level < 3 ? { label: x.name, img: x.img } : { label: x.name })),
    answer, reveal, fact, learn,
  };
}
