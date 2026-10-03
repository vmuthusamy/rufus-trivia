// 🏙️ CAPITAL CITY questions (used by the "Capitals & Landmarks" topic).
// Built from the same country data as the flags, which shows how one dataset can power a whole new topic.

import { COUNTRIES } from "../data/countries.js";
import { FAMOUS, KNOWN } from "../data/flag-notes.js";
import { pickFresh, pickDistractors, mixIn } from "../kit.js";

const WITH_CAPITAL = COUNTRIES.filter((c) => c.capital);
const key = (c) => "c_" + c.code;
const tier = (c) => (FAMOUS.has(c.code) ? 1 : KNOWN.has(c.code) ? 2 : 3);

export const CAPITAL_COUNT = WITH_CAPITAL.length;

function poolFor(level) {
  if (level === 1) return WITH_CAPITAL.filter((c) => tier(c) === 1);
  if (level === 2) return WITH_CAPITAL.filter((c) => tier(c) <= 2);
  return WITH_CAPITAL.filter((c) => tier(c) >= 2);
}

function distractorsFor(rng, c, level) {
  const sameCont = WITH_CAPITAL.filter((x) => x.continent === c.continent);
  if (level === 1) {
    const famousElsewhere = WITH_CAPITAL.filter((x) => tier(x) <= 2 && x.continent !== c.continent);
    return pickDistractors(rng, c, famousElsewhere, WITH_CAPITAL, 3, key);
  }
  return pickDistractors(rng, c, sameCont, WITH_CAPITAL, 3, key);
}

export function capitalQuestion({ rng, level, used, avoid, missed }) {
  const c = pickFresh(rng, poolFor(level), { used, avoid, missed, keyOf: key });
  const { items, answer } = mixIn(rng, c, distractorsFor(rng, c, level));
  const reveal = items.map((x) => ({ label: `${x.capital} · ${x.name}`, img: x.img }));
  const fact = `${c.capital} is the capital of ${c.name}, a country in ${c.continent}.`;
  const learn = { label: `${c.capital} (${c.name})`, img: c.img };

  if (rng.chance(level === 3 ? 0.5 : 0.35)) {
    // City -> country
    return {
      key: key(c), level, mode: "capitalToCountry",
      eyebrow: "Capital quest",
      prompt: `${c.capital} is the capital of which country?`,
      media: { kind: "word", text: c.capital, sub: "🏙️ Capital city" },
      choices: items.map((x) => (level === 3 ? { label: x.name } : { label: x.name, img: x.img })),
      answer, reveal, fact, learn,
    };
  }
  // Country -> city (the flag is a helpful clue)
  return {
    key: key(c), level, mode: "countryToCapital",
    eyebrow: "Capital quest",
    prompt: `What is the capital of ${c.name}?`,
    media: { kind: "flag", img: c.img, caption: c.name },
    choices: items.map((x) => ({ label: x.capital })),
    answer, reveal, fact, learn,
  };
}
