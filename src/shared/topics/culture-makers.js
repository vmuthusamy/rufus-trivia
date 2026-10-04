// 🧩🎭 Question MAKERS for "Books & Pop Culture": instead of a fixed list of questions, these build a
// fresh question from the tables in data/stories.js (like the flag questions come from the country table).
//
//   emojiPuzzles   🧩 "Which film is this emoji puzzle?"  🦁 👑 🐗 🌅 -> The Lion King
//   characters     🎭 "Which story is Baloo from?"  and the other way round: "Which of these characters is from Moana?"
//
// The tricky part is never letting a WRONG choice also be right:
//   - an emoji puzzle never offers a title whose own puzzle shares an emoji (🦁 is in The Lion King AND Narnia)
//   - a character's `in` list says every story they're in, and those are never used as wrong choices
//   - "crossover" stories (Shrek, The LEGO Movie, Wreck-It Ralph) are full of other stories' characters,
//     so they're never a wrong choice, and never asked about the other way round.

import { STORIES, CHARACTERS } from "../data/stories.js";
import { pickFresh, pickDistractors, mixIn, pickWeighted } from "../kit.js";

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");
const STORY = Object.fromEntries(STORIES.map((s) => [s.id, s]));
const emojisOf = (s) => s.clue.split(" ");
const first = (s) => (s.clue ? emojisOf(s)[0] : { game: "🎮", tv: "📺", book: "📚", film: "🎬" }[s.kind]);

// Easy questions use the lv 1 rows; medium uses 1 and 2; hard leans on the 2s and 3s.
const atLevel = (row, level) => (level === 1 ? row.lv === 1 : level === 2 ? row.lv <= 2 : row.lv >= 2);

// Pick a row we haven't asked in this game, preferring this level and things this player hasn't seen lately.
function pickRow(rows, { rng, level, used, avoid, missed }, keyOf, blocked = () => false) {
  const open = rows.filter((r) => !used.has(keyOf(r)) && !blocked(r));
  const fresh = (xs) => xs.filter((r) => !(avoid && avoid.has(keyOf(r))));
  const here = open.filter((r) => atLevel(r, level));
  let pool = fresh(here);
  if (!pool.length) pool = fresh(open);
  if (!pool.length) pool = here.length ? here : open.length ? open : rows;
  return pickFresh(rng, pool, { used, avoid, missed, keyOf });
}

// ---------- 🧩 emoji puzzles ----------
const PUZZLES = STORIES.filter((s) => s.clue && (s.kind === "film" || s.kind === "book"));
const KIND_WORD = { film: "film", book: "book" };
const sharesEmoji = (a, b) => emojisOf(a).some((e) => emojisOf(b).includes(e));

function puzzleQuestion(ctx) {
  const { rng, level } = ctx;
  const keyOf = (s) => "ez_" + s.id;
  const s = pickRow(PUZZLES, ctx, keyOf);
  // Wrong choices: same kind (films with films), and no shared emoji, so only one title fits the clue.
  const fair = PUZZLES.filter((x) => x.kind === s.kind && x.id !== s.id && !sharesEmoji(s, x));
  const wrong = pickDistractors(rng, s, fair.filter((x) => atLevel(x, level)), fair, 3, (x) => x.id);
  const { items, answer } = mixIn(rng, s, wrong);
  return {
    key: keyOf(s),
    level,
    eyebrow: "Emoji puzzle",
    prompt: `Which ${KIND_WORD[s.kind]} is this emoji puzzle?`,
    media: { kind: "word", text: s.clue, sub: "🧩 Crack the code!" },
    choices: items.map((x) => ({ label: x.title })),
    answer,
    fact: s.note,
    learn: { label: s.title, emoji: first(s) },
  };
}

export const emojiPuzzles = {
  id: "emoji-puzzles",
  title: "Emoji Puzzles",
  size: PUZZLES.length,
  next: puzzleQuestion,
};

// ---------- 🎭 characters ----------
const fwdKey = (c) => "cf_" + slug(c.name);
const revKey = (c) => "cr_" + slug(c.name);
const home = (c) => STORY[c.in[0]];
const PICKABLE = STORIES.filter((s) => !s.crossover);
// Asking "Which of these is from Shrek?" is unfair (Captain Hook is in Shrek too), so only non-crossover homes.
const REVERSIBLE = CHARACTERS.filter((c) => !home(c).crossover);
// Films and books are both "stories"; games and TV shows are only mixed with their own kind.
const PROMPT_KIND = { film: "story", book: "story", game: "game", tv: "TV show" };
const sameFamily = (a, b) => PROMPT_KIND[a.kind] === PROMPT_KIND[b.kind];

// "Which story is Baloo from?" -> The Jungle Book
function fromWhere(ctx) {
  const { rng, level } = ctx;
  // Never ask about a character both ways round in one game (the first question gives the second away).
  const c = pickRow(CHARACTERS, ctx, fwdKey, (x) => ctx.used.has(revKey(x)));
  const s = home(c);
  const notIn = PICKABLE.filter((x) => !c.in.includes(x.id) && sameFamily(x, s));
  const wrong = pickDistractors(rng, s, notIn.filter((x) => x.kind === s.kind), notIn, 3, (x) => x.id);
  const { items, answer } = mixIn(rng, s, wrong);
  return {
    key: fwdKey(c),
    level,
    eyebrow: "Who's from where?",
    prompt: `Which ${PROMPT_KIND[s.kind]} is ${c.name} from?`,
    media: { kind: "word", text: c.name, sub: "🎭 Where do they come from?" },
    choices: items.map((x) => ({ label: x.title })),
    answer,
    fact: c.note,
    learn: { label: `${c.name} · ${s.title}`, emoji: c.emoji || first(s) },
    alsoRight: c.in.slice(1).map((id) => STORY[id].title), // 🎯 Dumbledore is in The LEGO Movie too
  };
}

// "Which of these characters is from Moana?" -> Tamatoa
function whoIsFrom(ctx) {
  const { rng, level } = ctx;
  const c = pickRow(REVERSIBLE, ctx, revKey, (x) => ctx.used.has(fwdKey(x)));
  const s = home(c);
  const notIn = CHARACTERS.filter((x) => !x.in.includes(s.id));
  const wrong = pickDistractors(rng, c, notIn.filter((x) => home(x).kind === s.kind), notIn, 3, (x) => x.name);
  const { items, answer } = mixIn(rng, c, wrong);
  return {
    key: revKey(c),
    level,
    eyebrow: "Who's from where?",
    prompt: `Which of these characters is from ${s.title}?`,
    media: { kind: "word", text: s.title, sub: "🎭 Who's in it?" },
    choices: items.map((x) => ({ label: x.name })),
    answer,
    // After answering, every choice shows where it's really from: "Baloo · The Jungle Book"
    reveal: items.map((x) => ({ add: ` · ${home(x).title}` })),
    fact: c.note,
    learn: { label: `${c.name} · ${s.title}`, emoji: c.emoji || first(s) },
    noBingo: true, // 🎯 only works with its 4 choices
  };
}

export const characters = {
  id: "characters",
  title: "Who's from where?",
  size: CHARACTERS.length, // one question per character per game (asked one way round OR the other)
  next: (ctx) => pickWeighted(ctx.rng, [[3, fromWhere], [2, whoIsFrom]])(ctx),
};
