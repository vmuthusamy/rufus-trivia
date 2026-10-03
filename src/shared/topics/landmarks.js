// 🗼 LANDMARK questions (used by the "Capitals & Landmarks" topic).
// Built from src/shared/data/landmarks.js, which scripts/build-landmarks.mjs makes from
// Wikidata + Wikimedia Commons photos. Famous places (in lots of Wikipedias) are the easy ones.

import { LANDMARKS } from "../data/landmarks.js";
import { LANDMARK_FACTS } from "../data/landmark-notes.js";
import { COUNTRIES } from "../data/countries.js";
import { pickFresh, pickDistractors, mixIn } from "../kit.js";

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
const key = (l) => "l_" + l.id;
const tier = (l) => (l.discovered ? 3 : l.links >= 110 ? 1 : l.links >= 65 ? 2 : 3);
const country = (l) => BY_CODE.get(l.countries[0]);
const continent = (l) => country(l).continent;
const oneCountry = (l) => l.countries.length === 1;

const T1 = LANDMARKS.filter((l) => tier(l) === 1);
const T12 = LANDMARKS.filter((l) => tier(l) <= 2);
const T23 = LANDMARKS.filter((l) => tier(l) >= 2);

export const LANDMARK_COUNT = LANDMARKS.length;

function poolFor(level, rng) {
  if (level === 1) return T1;
  if (level === 2) return rng.chance(0.65) ? T12.filter((l) => tier(l) === 2) : T12;
  return T23;
}

// Wrong answers: easy = famous places far away, medium = same continent, hard = same continent, less famous.
function others(rng, l, level) {
  const sameCont = LANDMARKS.filter((x) => continent(x) === continent(l) && x.id !== l.id);
  if (level === 1) return pickDistractors(rng, l, T12.filter((x) => continent(x) !== continent(l)), T12, 3, key);
  if (level === 2) return pickDistractors(rng, l, sameCont.filter((x) => tier(x) <= 2), sameCont.concat(T12), 3, key);
  return pickDistractors(rng, l, sameCont, LANDMARKS, 3, key);
}

// "in the United Kingdom", "in the Netherlands", but "in France"
const THE = new Set(["gb", "us", "nl", "ph", "cz", "ae", "bs", "gm", "mv", "mh", "sb", "cf", "km", "sc", "do", "cg", "cd"]);
const withThe = (code) => (THE.has(code) ? "the " : "") + BY_CODE.get(code).name;
const countriesOf = (l) => l.countries.map(withThe).join(" and ");
const credit = (l) => `${l.name}: ${l.credit.author} · ${l.credit.license}`;

export function landmarkFact(l) {
  const where = `It's in ${countriesOf(l)}, in ${continent(l)}.`;
  if (LANDMARK_FACTS[l.title]) return `${LANDMARK_FACTS[l.title]} ${where}`;
  const d = l.desc ? l.desc.charAt(0).toUpperCase() + l.desc.slice(1).replace(/\.$/, "") : "";
  return d ? `${l.name}: ${d}. ${where}` : `${l.name} is a famous place. ${where}`;
}

const asLabel = (x) => ({ label: x.name, img: x.img });

const MODES = {
  // A photo: what is this place?
  photoToName(rng, l, level) {
    const { items, answer } = mixIn(rng, l, others(rng, l, level));
    return {
      eyebrow: "Where am I?", prompt: "What is this famous place?",
      media: { kind: "photo", img: l.img },
      choices: items.map((x) => ({ label: x.name })), answer,
      reveal: items.map(asLabel), credits: [credit(l)],
    };
  },
  // A photo (and its name on easier levels): which country is it in?
  photoToCountry(rng, l, level) {
    const home = country(l);
    const pool = COUNTRIES.filter((c) => c.code !== home.code && !l.countries.includes(c.code));
    const near = pool.filter((c) => c.continent === home.continent);
    const wrong = pickDistractors(rng, home, level === 1 ? pool : near, pool, 3, (c) => c.code);
    const { items, answer } = mixIn(rng, home, wrong);
    return {
      eyebrow: "Landmark hunt", prompt: level === 3 ? "Which country is this landmark in?" : "Which country is it in?",
      media: { kind: "photo", img: l.img, caption: level === 3 ? "" : l.name },
      choices: items.map((c) => ({ label: c.name, img: c.img })), answer, credits: [credit(l)],
    };
  },
  // A name: which photo is it?
  nameToPhoto(rng, l, level) {
    const { items, answer } = mixIn(rng, l, others(rng, l, level));
    return {
      eyebrow: "Spot the landmark", prompt: "Which picture shows this place?",
      media: { kind: "word", text: l.name, sub: level === 1 ? `📍 ${country(l).name}` : "" },
      choices: items.map((x) => ({ img: x.img })), answer,
      reveal: items.map(asLabel), credits: items.map(credit),
    };
  },
  // Four photos: which one is in this country? (hard)
  inCountry(rng, l) {
    const home = country(l);
    const away = LANDMARKS.filter((x) => continent(x) === continent(l) && !x.countries.includes(home.code));
    const wrong = pickDistractors(rng, l, away, LANDMARKS.filter((x) => !x.countries.includes(home.code)), 3, key);
    const { items, answer } = mixIn(rng, l, wrong);
    return {
      eyebrow: "Landmark hunt", prompt: `Which of these is in ${withThe(home.code)}?`,
      media: { kind: "flag", img: home.img, caption: home.name },
      choices: items.map((x) => ({ img: x.img })), answer,
      reveal: items.map(asLabel), credits: items.map(credit),
    };
  },
};

const MIX = {
  1: [["photoToName", 45], ["photoToCountry", 30], ["nameToPhoto", 25]],
  2: [["photoToName", 40], ["photoToCountry", 25], ["nameToPhoto", 35]],
  3: [["photoToName", 35], ["photoToCountry", 15], ["nameToPhoto", 30], ["inCountry", 20]],
};

export function landmarkQuestion({ rng, level, used, avoid, missed }) {
  const l = pickFresh(rng, poolFor(level, rng), { used, avoid, missed, keyOf: key });
  let mode = rng.weighted(MIX[level] || MIX[2]);
  if ((mode === "photoToCountry" || mode === "inCountry") && !oneCountry(l)) mode = "photoToName";
  const q = MODES[mode](rng, l, level);
  return { key: key(l), level, mode, ...q, fact: landmarkFact(l), learn: { label: l.name, img: l.img } };
}
