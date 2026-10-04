// 🦁 ANIMAL KINGDOM - a "mixed" topic: several question makers stirred together with mixTopic().
//
//   🐾 animal facts   made fresh from the table in data/animals.js (baby names, group names, mammal or reptile?)
//   🏆 animal records made fresh from data/animal-records.js (fastest? heaviest? lives longest? where? what does it eat?)
//   🌍 amazing animals, 🐍 Snake Spotter, 🦊 Rufus's Fox Facts, 🦖 Fiery's Dino Dig   (see animal-banks.js)
//
// Want more snakes? Make its number in `parts` (at the bottom) bigger. Want a new part? Write a bankTopic and add it there.

import { ANIMALS, CLASSES } from "../data/animals.js";
import { RECORDS, HOME_NOTES } from "../data/animal-records.js";
import { pickFresh, pickDistractors, pickWeighted, mixIn, CONTINENTS, CONTINENT_EMOJI } from "../kit.js";
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

// 🎯 BINGO (see shared/bingo.js): when the answer is an animal, these squares would ALSO be right, so a
// bingo game never has both: the animal itself (and its plural), its twin (a panda IS a bear),
// kinds of it from the question banks (a milk snake IS a snake), and lookalikes (the 🐆 emoji looks like a cheetah).
const KINDS = {
  Snake: ["Rattlesnake", "Cobra", "Milk snake", "Hognose snake", "Green anaconda", "Reticulated python",
    "Inland taipan", "Sidewinder", "Paradise tree snake", "Barbados threadsnake", "Other snakes",
    "Black mamba", "Adder", "King cobra"],
  Fox: ["Fennec fox", "Arctic fox", "Red fox", "Gray fox", "Bat-eared fox", "A vixen", "Felix", "Renard", "Marthina"],
  Whale: ["Blue whale"],
  Lizard: ["Chameleon"],
  Leopard: ["Cheetah"],
  Eagle: ["Peregrine falcon"],
};
const sameAs = (a) => [a.name, a.plural, ...ANIMALS.filter((x) => twins(a, x)).flatMap((x) => [x.name, x.plural]), ...(KINDS[a.name] || [])];
// Every animal whose baby (or group) is called `word`: "A joey is a baby…" kangaroo AND koala are right.
const sameWord = (rows, field, word) => rows.filter((x) => x[field].includes(word)).flatMap(sameAs);

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
      media: { kind: "emoji", text: pic(a) }, choices: items.map((w) => ({ label: cap(w) })), answer, fact, learn,
      alsoRight: a.baby.slice(1) }; // 🎯 a baby wolf is a pup, but also a cub, whelp or puppy
  }
  // "A joey is a baby..." -> kangaroo (never offering koala, which also has joeys)
  const wrong = pickDistractors(rng, a, WITH_BABY.filter((x) => !x.baby.includes(word) && x.emoji), [], 3, keyOf);
  const { items, answer } = mixIn(rng, a, wrong);
  return { key: keyOf(a), level, eyebrow: "Baby animals", prompt: `${cap(an(word))} is a baby…`,
    media: { kind: "word", text: cap(word), sub: "🍼 is a baby what?" }, choices: choices(items), answer, fact, learn,
    alsoRight: sameWord(WITH_BABY, "baby", word) };
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
      media: { kind: "word", text: herd, sub: `lots of ${a.plural}` }, choices: items.map((w) => ({ label: cap(w) })), answer, fact, learn,
      alsoRight: a.group.slice(1) }; // 🎯 a group of whales is a pod, or a school, a gam or a herd
  }
  // "A pride is a group of..." -> lions
  const wrong = pickDistractors(rng, a, WITH_GROUP.filter((x) => !x.group.includes(word) && x.emoji), [], 3, keyOf);
  const { items, answer } = mixIn(rng, a, wrong);
  return { key: keyOf(a), level, eyebrow: "Animal groups", prompt: `${cap(an(word))} is a group of…`,
    media: { kind: "word", text: cap(word), sub: "👀 a group of what?" },
    choices: choices(items).map((c, i) => ({ ...c, label: cap(items[i].plural) })), answer, fact, learn,
    alsoRight: sameWord(WITH_GROUP, "group", word) }; // 🎯 a pride of lions... or of peacocks!
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
    noBingo: true, // 🎯 lots of animals on a bingo card could be mammals: it only works with its 4 choices
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
    alsoRight: sameAs(a), // 🎯 🐍 is a snake... and a milk snake is a snake too
  };
}

// The "animal facts" part: picks one of the makers above.
const facts = {
  size: WITH_BABY.length + WITH_GROUP.length + ANIMALS.length,
  next(ctx) {
    const makers = ctx.level === 1
      ? [[3, babyQuestion], [2, groupQuestion], [3, classQuestion], [2, whoQuestion]]
      : [[3, babyQuestion], [3, groupQuestion], [2, classQuestion], [2, kindQuestion], [1, whoQuestion]];
    return freshest(ctx, makers);
  },
};

// 🔄 KEEPING IT FRESH. Roll the dice to pick a question maker (the bigger its weight, the more often it wins).
// If it can only offer something this player saw recently, roll again among the others, so a kid who has
// played lots of games gets new questions from a bigger part instead of a repeat from a small one.
// A question the player got wrong before (ctx.missed) is fine: bringing those back is on purpose.
// Only when EVERY maker is out of fresh questions do we allow a repeat.
function freshest(ctx, makers) {
  const { used, avoid, missed } = ctx;
  const isFresh = (q) => !used.has(q.key) && (!avoid || !avoid.has(q.key) || (missed && missed.has(q.key)));
  let left = makers.slice(), fallback = null;
  while (left.length) {
    const make = pickWeighted(ctx.rng, left);
    left = left.filter(([, m]) => m !== make);
    const q = make(ctx);
    if (!q) continue;
    if (isFresh(q)) return q;
    if (!fallback || (used.has(fallback.key) && !used.has(q.key))) fallback = q;
  }
  return fallback;
}

// ======================================================================
// 🏆 ANIMAL RECORDS - "Which of these is the fastest?" made fresh from data/animal-records.js
// ======================================================================
// Each record question picks a WINNER, then 3 animals it beats by a clear gap. Every number in the
// table is a range [low, high], and the winner's LOW number must beat every loser's HIGH number by `gap`
// (1.5 = at least half as much again). Easy questions use big gaps, hard ones smaller (but still clear!) gaps.
// These all need their 4 choices ("the fastest of THESE"), so they're never used in Quiz Bingo.
export const STATS = {
  fast:  { field: "speed",  most: true,  key: "rf_", eyebrow: "Animal records 🏆", prompt: "Which of these is the fastest on land?", gap: { 1: 1.8, 2: 1.5, 3: 1.25 } },
  slow:  { field: "speed",  most: false, key: "rs_", eyebrow: "Animal records 🐌", prompt: "Which of these is the slowest?", gap: { 1: 2, 2: 1.6, 3: 1.3 } },
  heavy: { field: "weight", most: true,  key: "rh_", eyebrow: "Animal records 🏆", prompt: "Which of these is the heaviest?", gap: { 1: 3, 2: 2, 3: 1.5 } },
  light: { field: "weight", most: false, key: "rw_", eyebrow: "Animal records 🪶", prompt: "Which of these is the lightest?", gap: { 1: 3, 2: 2, 3: 1.5 } },
  old:   { field: "life",   most: true,  key: "rl_", eyebrow: "Animal records 🎂", prompt: "Which of these can live the longest?", gap: { 1: 2, 2: 1.6, 3: 1.3 } },
};
// The picture shown with each kind (never an animal, so it can't give the answer away).
const STAT_EMOJI = { fast: "💨", slow: "⏳", heavy: "⚖️", light: "🎈", old: "🎂" };
// What goes in "things you learned" at the end.
const LEARN = {
  fast: (a) => `up to ${SAY.speed(a.speed[1])}`, slow: () => "super slow!", heavy: (a) => `up to ${SAY.weight(a.weight[1])}`,
  light: () => "super light!", old: (a) => `lives up to ${SAY.life(a.life[1])}`,
};
// How often each kind comes up (fastest, heaviest and oldest are the most fun).
const STAT_MIX = [[3, "fast"], [3, "heavy"], [2, "old"], [1, "slow"], [1, "light"]];

// Does `a` beat `b` clearly? (most: a's lowest number is bigger than b's highest, times the gap)
export function beats(a, b, stat, gap) {
  const x = a[stat.field], y = b[stat.field];
  if (!x || !y) return false;
  return stat.most ? x[0] >= gap * y[1] : y[0] >= gap * x[1];
}
// Easy questions only use animals everyone knows (lv 1); medium adds lv 2; hard uses them all.
const knownAt = (level) => RECORDS.filter((a) => a.lv <= level);
const recKey = (prefix) => (a) => prefix + slug(a.name);
// "the giraffe", but "the Komodo dragon" (names of places keep their capital letter)
const PLACE = /^(Galápagos|Komodo|Greenland|Andean|African|Asian|American|Tasmanian)\b/;
const the = (a) => "the " + (PLACE.test(a.name) ? a.name : a.name.toLowerCase());
const round = (x) => (x >= 10 ? Math.round(x) : Number(x.toFixed(1)));
const SAY = {
  speed: (v) => (v >= 1 ? `${round(v)} km/h` : `${Math.round(v * 1000)} metres an hour`),
  weight: (v) => (v >= 1000 ? `${round(v / 1000)} tonne${v === 1000 ? "" : "s"}` : v >= 1 ? `${round(v)} kg` : `${round(v * 1000)} grams`),
  life: (v) => `${round(v)} years`,
};
const choicesOf = (rows) => (rows.every((a) => a.emoji) ? rows.map((a) => ({ label: a.name, emoji: a.emoji })) : rows.map((a) => ({ label: a.name })));

function recordFact(stat, a, next) {
  const A = cap(the(a)), B = the(next), say = SAY[stat.field];
  if (stat.field === "speed" && stat.most) return `${A} can run at up to about ${say(a.speed[1])}! The next fastest here, ${B}, manages about ${say(next.speed[1])}.`;
  if (stat.field === "speed") return `${A} only moves at about ${say(a.speed[1])} at most. Even ${B} is much quicker!`;
  if (stat.field === "weight" && stat.most) return `${A} can weigh up to about ${say(a.weight[1])}! The next heaviest here, ${B}, is up to about ${say(next.weight[1])}.`;
  if (stat.field === "weight") return `${A} weighs only about ${say(a.weight[1])} at most. Even ${B} is much heavier!`;
  if (a.life[0] >= 150) return `Scientists think ${the(a)} can live for more than ${say(a.life[0])}! The next oldest here, ${B}, lives up to about ${say(next.life[1])}.`;
  return `${A} can live for up to about ${say(a.life[1])}! The next oldest here, ${B}, lives up to about ${say(next.life[1])}.`;
}

// One record question for this stat, or null if there's nothing left to ask.
function recordFor(name, { rng, level, used, avoid, missed }) {
  const stat = STATS[name], gap = stat.gap[level] || stat.gap[2], keyOf = recKey(stat.key);
  const rows = knownAt(level).filter((a) => a[stat.field]);
  const losersOf = (a) => rows.filter((b) => b !== a && beats(a, b, stat, gap));
  const winners = rows.filter((a) => !used.has(keyOf(a)) && losersOf(a).length >= 3);
  if (!winners.length) return null;
  const a = pickFresh(rng, winners, { used, avoid, missed, keyOf });
  const losers = losersOf(a);
  // Hard questions pick losers that are closer to the winner (still a clear gap, but more of a think).
  const closeness = (b) => (stat.most ? b[stat.field][1] / a[stat.field][0] : a[stat.field][1] / b[stat.field][0]);
  const near = level >= 3 ? losers.slice().sort((x, y) => closeness(y) - closeness(x)).slice(0, 5) : losers;
  const wrong = pickDistractors(rng, a, near, losers, 3, (x) => x.name);
  const { items, answer } = mixIn(rng, a, wrong);
  const next = wrong.slice().sort((x, y) => closeness(y) - closeness(x))[0]; // the runner-up
  return {
    key: keyOf(a), level, eyebrow: stat.eyebrow, prompt: stat.prompt,
    media: { kind: "emoji", text: STAT_EMOJI[name] },
    choices: choicesOf(items), answer,
    fact: recordFact(stat, a, next),
    learn: { label: `${a.name}: ${LEARN[name](a)}`, emoji: a.emoji || "🏆" },
    noBingo: true, // 🎯 "the fastest of THESE" only works with its 4 choices
  };
}

function recordQuestion(ctx) {
  // Try the stats in a random (weighted) order until one still has something new to ask.
  const order = [];
  let left = STAT_MIX.slice();
  while (left.length) { const s = pickWeighted(ctx.rng, left); order.push(s); left = left.filter(([, x]) => x !== s); }
  for (const s of order) { const q = recordFor(s, ctx); if (q) return q; }
  return null;
}

// ---------- "Which continent is home to wild giraffes?" ----------
// Only animals that live wild on exactly ONE continent (see `where` in the table).
const HOMES = [...CONTINENTS, "Antarctica"];
const HOME_EMOJI = { ...CONTINENT_EMOJI, Antarctica: "🧊" };
function whereQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = recKey("rc_");
  const open = (rows) => rows.filter((a) => a.where && !used.has(keyOf(a)));
  const pool = open(knownAt(level)).length ? open(knownAt(level)) : open(RECORDS);
  if (!pool.length) return null;
  const a = pickFresh(rng, pool, { used, avoid, missed, keyOf });
  const wrong = rng.shuffle(HOMES.filter((h) => h !== a.where)).slice(0, 3);
  const { items, answer } = mixIn(rng, a.where, wrong);
  return {
    key: keyOf(a), level, eyebrow: "Where in the wild?",
    prompt: `Which continent is home to wild ${a.plural}?`,
    media: a.emoji ? { kind: "emoji", text: a.emoji } : { kind: "word", text: a.name, sub: "🌍 where do they live?" },
    choices: items.map((h) => ({ label: h, emoji: HOME_EMOJI[h] })), answer,
    fact: HOME_NOTES[a.name] || `Wild ${a.plural} live only in ${a.where}.`,
    learn: { label: `${a.name}: ${a.where}`, emoji: a.emoji || HOME_EMOJI[a.where] },
    ...(a.where === "Oceania" ? { alsoRight: ["Australia"] } : {}), // 🎯 lots of people call it Australia
  };
}

// ---------- "Which of these is a plant-eater?" ----------
// The other 3 always eat the OPPOSITE (plants vs meat), so there's no arguing. Omnivores ("both") sit this one out.
function dietQuestion({ rng, level, used, avoid, missed }) {
  const keyOf = recKey("rd_");
  const known = knownAt(Math.max(level, 2));
  const eats = (rows, d) => rows.filter((a) => a.diet === d);
  const open = (rows) => rows.filter((a) => (a.diet === "plants" || a.diet === "meat") && !used.has(keyOf(a)));
  if (!open(known).length) return null;
  const a = pickFresh(rng, open(known), { used, avoid, missed, keyOf });
  const plant = a.diet === "plants";
  const wrong = pickDistractors(rng, a, eats(known, plant ? "meat" : "plants"), [], 3, (x) => x.name);
  const { items, answer } = mixIn(rng, a, wrong);
  return {
    key: keyOf(a), level, eyebrow: "Who eats what?",
    prompt: plant ? "Which of these is a plant-eater?" : "Which of these is a meat-eater?",
    media: { kind: "emoji", text: plant ? "🌿" : "🍖" },
    choices: choicesOf(items), answer,
    fact: plant
      ? `${cap(the(a))} is a plant-eater, or herbivore. The others here all eat meat: they're carnivores.`
      : `${cap(the(a))} is a meat-eater, or carnivore. The others here all munch plants: they're herbivores.`,
    learn: { label: `${a.name}: ${plant ? "plant-eater" : "meat-eater"}`, emoji: a.emoji || (plant ? "🌿" : "🍖") },
    noBingo: true, // 🎯 lots of animals on a card eat plants: it only works with its 4 choices
  };
}

// The "animal records" part: mostly record-breakers, sometimes where they live or what they eat.
const RECORD_MAKERS = [[6, recordQuestion], [2, whereQuestion], [2, dietQuestion]];
export const records = {
  size: Object.values(STATS).reduce((n, s) => n + RECORDS.filter((a) => a[s.field]).length, 0)
    + RECORDS.filter((a) => a.where).length + RECORDS.filter((a) => a.diet === "plants" || a.diet === "meat").length,
  next(ctx) {
    return freshest(ctx, RECORD_MAKERS) || facts.next(ctx); // asked absolutely everything already: have an animal fact instead
  },
};

// How often each part comes up (out of 25). Records come up a lot: they're made fresh from the
// numbers table, with different animals to compare every time, so they almost never repeat.
// A part that has run out of new questions for this player hands over to the others (see freshest()).
const PARTS = [
  [7, facts],    // 🐾 baby names, group names, mammal or reptile?
  [6, records],  // 🏆 fastest? heaviest? lives longest? where do they live? what do they eat?
  [5, wild],     // 🌍 amazing animals
  [3, snakes],   // 🐍 Snake Spotter
  [2, foxes],    // 🦊 Rufus's Fox Facts
  [2, dinos],    // 🦖 Fiery's Dino Dig
];

export default {
  id: "animals",
  title: "Animal Kingdom",
  emoji: "🦁",
  color: "#a3e635",
  blurb: "Wild animals, snakes, foxes and a few dinosaurs.",
  orbit: ["🦁", "🐍", "🦊", "🐘", "🦒", "🐧", "🦖", "🦋"],
  music: "safari",
  size: PARTS.reduce((sum, [, part]) => sum + part.size, 0),
  next: (ctx) => freshest(ctx, PARTS.map(([weight, part]) => [weight, (c) => part.next(c)])),
};
