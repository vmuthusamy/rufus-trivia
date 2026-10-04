// 🦁 ANIMAL KINGDOM - a "mixed" topic: several question makers stirred together with mixTopic().
//
//   🐾 animal facts   made fresh from the table in data/animals.js (baby names, group names, mammal or reptile?)
//   🌍 amazing animals, 🐍 Snake Spotter, 🦊 Rufus's Fox Facts, 🦖 Fiery's Dino Dig   (see animal-banks.js)
//
// Want more snakes? Make its number in `parts` (at the bottom) bigger. Want a new part? Write a bankTopic and add it there.

import { ANIMALS, CLASSES } from "../data/animals.js";
import { pickFresh, pickDistractors, pickWeighted, mixIn, mixTopic } from "../kit.js";
import { snakes, foxes, dinos, wild } from "./animal-banks.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const an = (word) => (/^[aeiou]/i.test(word) ? "an " : "a ") + word; // "an owlet", "a joey"
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const pic = (a) => a.emoji || "🐾";
// Answer buttons show each animal's emoji, unless one of them has none (then none do, so it doesn't stand out).
const choices = (rows) => (rows.every((a) => a.emoji) ? rows.map((a) => ({ label: a.name, emoji: a.emoji })) : rows.map((a) => ({ label: a.name })));

// Easy questions use the "1" rows; medium uses 1 and 2; hard leans on the 2s and 3s.
const byLevel = (rows, key, level) =>
  rows.filter((a) => (level === 1 ? a[key] === 1 : level === 2 ? a[key] <= 2 : a[key] >= 2));

const WITH_BABY = ANIMALS.filter((a) => a.baby);
const WITH_GROUP = ANIMALS.filter((a) => a.group);
const MAIN_CLASSES = ["mammal", "bird", "reptile", "amphibian", "fish", "insect"];
const CLASS_EYEBROW = "Mammal, bird or reptile?";
// A panda IS a bear and a ladybug IS a beetle, so never offer one as the "wrong" answer for the other.
const TWINS = [["Panda", "Bear"], ["Ladybug", "Beetle"]];
const twins = (a, b) => TWINS.some(([x, y]) => (a.name === x && b.name === y) || (a.name === y && b.name === x));

// "A joey is a baby…" only works when the word belongs to one or two animals.
// ("A chick is a baby…" could be almost any bird, so we never ask it that way round.)
const owners = (rows, field, word) => rows.filter((x) => x[field].includes(word)).length;

// ---------- baby animals ----------
function babyQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = (a) => "ab_" + slug(a.name);
  const a = pickFresh(rng, byLevel(WITH_BABY, "bl", level), { used, avoid, missed, keyOf });
  const word = a.baby[0];
  const fact = `A baby ${a.name.toLowerCase()} is called ${an(word)}.` + (a.note ? " " + a.note : "");
  const learn = { label: `${a.name}: ${word}`, emoji: pic(a) };
  if (owners(WITH_BABY, "baby", word) > 2 || rng.chance(0.5)) {
    // "What is a baby kangaroo called?" -> joey
    const others = [...new Set(WITH_BABY.map((x) => x.baby[0]))].filter((w) => !a.baby.includes(w));
    const { items, answer } = mixIn(rng, word, rng.shuffle(others).slice(0, 3));
    return { key: keyOf(a), level, eyebrow: "Baby animals", prompt: `What is a baby ${a.name.toLowerCase()} called?`,
      media: { kind: "emoji", text: pic(a) }, choices: items.map((w) => ({ label: cap(w) })), answer, fact, learn };
  }
  // "A joey is a baby..." -> kangaroo (never offering koala, which also has joeys)
  const wrong = pickDistractors(rng, a, WITH_BABY.filter((x) => !x.baby.includes(word) && x.emoji), [], 3, keyOf);
  const { items, answer } = mixIn(rng, a, wrong);
  return { key: keyOf(a), level, eyebrow: "Baby animals", prompt: `${cap(an(word))} is a baby…`,
    media: { kind: "word", text: cap(word), sub: "🍼 is a baby what?" }, choices: choices(items), answer, fact, learn };
}

// ---------- groups of animals ----------
function groupQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = (a) => "ag_" + slug(a.name);
  const a = pickFresh(rng, byLevel(WITH_GROUP, "gl", level), { used, avoid, missed, keyOf });
  const word = a.group[0];
  const fact = `A group of ${a.plural} is often called ${an(word)}!` + (a.note ? " " + a.note : "");
  const learn = { label: `${an(word)} of ${a.plural}`, emoji: pic(a) };
  const herd = a.emoji ? `${a.emoji} ${a.emoji} ${a.emoji}` : "🐾 🐾 🐾";
  if (owners(WITH_GROUP, "group", word) > 2 || rng.chance(0.5)) {
    // "A group of flamingos is called a..." -> flamboyance
    const others = [...new Set(WITH_GROUP.map((x) => x.group[0]))].filter((w) => !a.group.includes(w));
    const { items, answer } = mixIn(rng, word, rng.shuffle(others).slice(0, 3));
    return { key: keyOf(a), level, eyebrow: "Animal groups", prompt: `What is a group of ${a.plural} called?`,
      media: { kind: "word", text: herd, sub: `lots of ${a.plural}` }, choices: items.map((w) => ({ label: cap(w) })), answer, fact, learn };
  }
  // "A pride is a group of..." -> lions
  const wrong = pickDistractors(rng, a, WITH_GROUP.filter((x) => !x.group.includes(word) && x.emoji), [], 3, keyOf);
  const { items, answer } = mixIn(rng, a, wrong);
  return { key: keyOf(a), level, eyebrow: "Animal groups", prompt: `${cap(an(word))} is a group of…`,
    media: { kind: "word", text: cap(word), sub: "👀 a group of what?" },
    choices: choices(items).map((c, i) => ({ ...c, label: cap(items[i].plural) })), answer, fact, learn };
}

// ---------- mammal, bird, reptile...? ----------
function classQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = (a) => "ac_" + slug(a.name);
  const pickable = ANIMALS.filter((a) => !a.noPick);
  // Hard questions love the tricky ones: whales are mammals, penguins are birds, spiders aren't insects...
  const trickyFirst = (rows) => (level >= 2 ? rows.filter((a) => a.trick) : rows.filter((a) => !a.trick));
  const unused = (rows) => rows.filter((a) => !used.has(keyOf(a)));
  // Pick a group that still has animals we haven't asked about in this game.
  let cls = MAIN_CLASSES[0], pool = [];
  for (cls of rng.shuffle(MAIN_CLASSES)) {
    const all = unused(pickable.filter((a) => a.cls === cls));
    pool = trickyFirst(all).length ? trickyFirst(all) : all;
    if (pool.length) break;
  }
  const info = CLASSES[cls];
  const a = pickFresh(rng, pool, { used, avoid, missed, keyOf });
  const notCls = pickable.filter((x) => x.cls !== cls);
  const wrong = pickDistractors(rng, a, trickyFirst(notCls), notCls, 3, keyOf);
  const { items, answer } = mixIn(rng, a, wrong);
  const sneaky = wrong.find((x) => x.trick && x.note);
  return {
    key: keyOf(a), level, eyebrow: CLASS_EYEBROW,
    prompt: `Which one is ${an(info.label.toLowerCase())}?`,
    media: { kind: "word", text: `${info.emoji} ${info.label}`, sub: "Which one is it?" },
    choices: choices(items), answer,
    // After answering, every choice says what it really is: "Squid · mollusc"
    reveal: items.map((x) => ({ add: ` · ${CLASSES[x.cls] ? CLASSES[x.cls].label.toLowerCase() : x.kind || x.cls}` })),
    fact: `${a.name}: yes! ${info.what}` + (sneaky ? ` (${sneaky.note})` : a.note ? ` ${a.note}` : ""),
    learn: { label: `${a.name} = ${info.label.toLowerCase()}`, emoji: pic(a) },
  };
}

// ---------- "What kind of animal is a whale?" (medium and hard) ----------
function kindQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = (a) => "ac_" + slug(a.name); // same key as classQuestion, so one game never asks about the whale twice
  const pool = ANIMALS.filter((a) => a.trick && CLASSES[a.cls]);
  const a = pickFresh(rng, pool, { used, avoid, missed, keyOf });
  // The wrong choices are the ones people mix up: a whale "looks like" a fish, a bat "looks like" a bird...
  const LOOKS_LIKE = { mammal: ["fish", "bird"], bird: ["mammal", "fish"], fish: ["mammal", "reptile"], reptile: ["amphibian", "mammal"],
    amphibian: ["reptile", "fish"], arachnid: ["insect", "reptile"], insect: ["arachnid", "bird"] };
  const right = CLASSES[a.cls].label;
  const others = [...(LOOKS_LIKE[a.cls] || []), ...rng.shuffle(Object.keys(CLASSES))]
    .filter((c, i, list) => c !== a.cls && list.indexOf(c) === i).slice(0, 3);
  const { items, answer } = mixIn(rng, a.cls, others);
  return {
    key: keyOf(a), level, eyebrow: CLASS_EYEBROW,
    prompt: `What kind of animal is ${an(a.name.toLowerCase())}?`,
    media: { kind: "emoji", text: pic(a) },
    choices: items.map((c) => ({ label: CLASSES[c].label, emoji: CLASSES[c].emoji })),
    answer,
    fact: a.note || `${cap(an(a.name.toLowerCase()))} is ${an(right.toLowerCase())}. ${CLASSES[a.cls].what}`,
    learn: { label: `${a.name} = ${right.toLowerCase()}`, emoji: pic(a) },
  };
}

// ---------- "Which animal is this?" (easy warm-up, with the less-common emoji) ----------
function whoQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = (a) => "aw_" + slug(a.name);
  const pool = ANIMALS.filter((a) => a.emoji && !a.noPick);
  const a = pickFresh(rng, pool, { used, avoid, missed, keyOf });
  const fair = pool.filter((x) => !twins(a, x));
  const wrong = pickDistractors(rng, a, fair.filter((x) => x.cls === a.cls), fair, 3, keyOf);
  const { items, answer } = mixIn(rng, a, wrong);
  return {
    key: keyOf(a), level, eyebrow: "Who's that animal?", prompt: "Which animal is this?",
    media: { kind: "emoji", text: a.emoji }, choices: items.map((x) => ({ label: x.name })), answer,
    fact: a.note || `That's ${an(a.name.toLowerCase())}! ${CLASSES[a.cls] ? CLASSES[a.cls].what : ""}`.trim(),
    learn: { label: a.name, emoji: a.emoji },
  };
}

// The "animal facts" part: picks one of the makers above.
const facts = {
  size: WITH_BABY.length + WITH_GROUP.length + ANIMALS.length,
  next(ctx) {
    const makers = ctx.level === 1
      ? [[3, babyQuestion], [2, groupQuestion], [3, classQuestion], [2, whoQuestion]]
      : [[3, babyQuestion], [3, groupQuestion], [2, classQuestion], [2, kindQuestion]];
    return pickWeighted(ctx.rng, makers)(ctx);
  },
};

export default mixTopic({
  id: "animals",
  title: "Animal Kingdom",
  emoji: "🦁",
  color: "#a3e635",
  blurb: "Wild animals, snakes, foxes and a few dinosaurs.",
  orbit: ["🦁", "🐍", "🦊", "🐘", "🦒", "🐧", "🦖", "🦋"],
  music: "safari",
  // How often each part comes up (out of 20)
  parts: [
    [8, facts],    // 🐾 baby names, group names, mammal or reptile?
    [5, wild],     // 🌍 amazing animals
    [3, snakes],   // 🐍 Snake Spotter
    [2, foxes],    // 🦊 Rufus's Fox Facts
    [2, dinos],    // 🦖 Fiery's Dino Dig
  ],
});
