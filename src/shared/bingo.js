// 🎯 QUIZ BINGO - the rules of a bingo game, as plain functions (no server stuff, so the tests can check them).
//
// How a game works:
//   1. buildPool() makes a POOL of 24 questions from the topic. The right answer to each one is a
//      bingo SQUARE: "Japan", a flag picture, "48", "Joey"...
//   2. Every player gets a 4×4 CARD: 16 squares picked at random from the pool (cardFor()).
//      Everyone's card is different, but they all come from the same pool.
//   3. Rufus CALLS the pool's questions one at a time (callOrder()). If the answer is on your card,
//      tap it to stamp it 🐾. If it isn't, tap "Not on my card ✋".
//   4. Line: the first to fill a row, column or diagonal wins. Blackout: the first to fill all 16.
//   5. After every square has been called once, squares someone still needs get a "Second chance!"
//      (secondChance()), so a card can always be finished.
//
// The golden rule: for every call, exactly ONE square in the whole pool is right.
// So two squares can never mean the same thing ("Reptile" and "Reptiles", "48" and "44 + 4"), and a
// question that has other right answers lists them in alsoRight ("a baby wolf is a pup... or a cub!"),
// so those squares never share a pool. Questions that only make sense with their 4 choices
// ("Which one is a mammal?") say noBingo: true and are never used. (Both stay on the server.)

import { makeRng } from "./rng.js";
import { levelFor } from "./scoring.js";

export const BINGO = {
  poolSize: 24,  // squares in a game (each card shows 16 of them)
  cells: 16,     // a 4×4 card
  maxCalls: 40,  // the game always ends by this many calls
  maxLabel: 20,  // longer answers don't fit on a phone-sized square
};

// The 10 ways to make a line on a 4×4 card. Cells are numbered 0-15, row by row:
//    0  1  2  3
//    4  5  6  7
//    8  9 10 11
//   12 13 14 15
export const LINES = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], // rows
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], // columns
  [0, 5, 10, 15], [3, 6, 9, 12],                                  // diagonals
];

// The square a question makes: the right choice ({ label }, { img } or both, maybe with an emoji).
export const squareOf = (q) => q.choices[q.answer];

// ---------- comparing answers ----------
// "The Reptiles!" -> ["reptile"]. Little words don't count, and plurals count as the same word.
const LITTLE = new Set(["a", "an", "the", "of", "or", "and"]);
function singular(w) {
  if (w.length <= 3 || w.endsWith("ss") || w.endsWith("us")) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";              // butterflies -> butterfly
  if (w.endsWith("ves")) return w.slice(0, -3) + "f";              // wolves -> wolf
  if (/(x|ch|sh|ss)es$/.test(w)) return w.slice(0, -2);            // foxes -> fox
  return w.endsWith("s") ? w.slice(0, -1) : w;                     // lions -> lion
}
export function words(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w && !LITTLE.has(w)).map(singular);
}
export const plain = (text) => words(text).join(" ");

// Everything a square "is": its own name (or picture), plus the answers that are also right.
export function tagsOf(q) {
  const sq = squareOf(q);
  const tags = new Set();
  if (sq.label) tags.add(plain(sq.label));
  if (sq.img) tags.add("img:" + sq.img);
  for (const x of q.alsoRight || []) tags.add(plain(x));
  tags.delete("");
  return tags;
}

// Can this question be a bingo square at all?
export function bingoOK(q) {
  if (!q || q.noBingo) return false;
  const sq = squareOf(q);
  if (!sq || !(sq.label || sq.img)) return false;
  return !sq.label || sq.label.length <= BINGO.maxLabel;
}

// Would these two squares muddle each other up? Then they can't be in the same game.
//   - they share a tag: "Reptile" and "Reptiles", "Pup" and a wolf's "Cub", "48" and "44 + 4"
//   - every word of one is inside the other: "Fox" and "Arctic fox", "Africa" and "South Africa"
export function clash(a, b) {
  const ta = tagsOf(a);
  for (const t of tagsOf(b)) if (ta.has(t)) return true;
  const wa = words(squareOf(a).label), wb = words(squareOf(b).label);
  return inside(wa, wb) || inside(wb, wa);
}
// Are all the words of `small` inside `big`? (Only for names with letters: "8" is not "inside" "48 + 8".)
function inside(small, big) {
  if (!small.length || small.length >= big.length || !small.some((w) => /[a-z]/.test(w))) return false;
  return small.every((w) => big.includes(w));
}

// ---------- making a game ----------
// The pool: `size` questions whose answers can share a card (no clashes, none flagged noBingo).
// Same seed = same pool. avoid/missed work like in a quiz (fresh questions first, some practice).
export function buildPool(topic, { seed, levelSetting, avoid, missed, size = BINGO.poolSize }) {
  const pool = [];
  const used = new Set(); // keys already tried, kept or not, so nothing is tried twice
  for (let tries = 0; pool.length < size && tries < 3000; tries++) {
    const level = levelFor(levelSetting, pool.length, size);
    const rng = makeRng(`${seed}:${topic.id}:bingo:${tries}`);
    const q = topic.next({ rng, level, used, avoid: avoid || new Set(), missed: missed || new Set() });
    const fresh = !used.has(q.key);
    used.add(q.key);
    if (fresh && bingoOK(q) && !pool.some((p) => clash(p, q))) pool.push({ ...q, level: q.level || level });
  }
  if (pool.length < BINGO.cells) throw new Error(`${topic.id}: only ${pool.length} bingo squares`);
  return pool;
}

// A player's card: 16 different squares from the pool (numbers into the pool), in the order they
// sit on the card. Made from the game's secret seed + the player's id, so it's the same card every
// time they reconnect, and different for every player.
export function cardFor(seed, playerId, poolSize) {
  const rng = makeRng(`${seed}:card:${playerId}`);
  return rng.shuffle([...Array(poolSize).keys()]).slice(0, BINGO.cells);
}

// The first time round, every square in the pool is called once, in a random order.
export function callOrder(seed, poolSize) {
  return makeRng(`${seed}:calls`).shuffle([...Array(poolSize).keys()]);
}

// ---------- lines and winning ----------
// marks: 16 numbers, 1 = stamped, 0 = empty.
export const linesDone = (marks) => LINES.filter((line) => line.every((k) => marks[k]));
const empty = (marks, cells) => cells.filter((k) => !marks[k]).length;

// How many more squares this card needs to win. 0 = BINGO!
export function awayFrom(marks, win) {
  if (win === "blackout") return marks.filter((m) => !m).length;
  return Math.min(...LINES.map((line) => empty(marks, line)));
}
export const hasWon = (marks, win) => awayFrom(marks, win) === 0;

// After the first time round: call again a square that someone still needs.
// So the game always ends, it picks from what the player(s) CLOSEST to winning still need.
//   cards: [{ card, marks }] for the players still in the game
//   last:  the square just called (not twice in a row, if there's anything else)
// Returns a number into the pool, or -1 when nobody needs anything.
export function secondChance({ seed, call, cards, win, last }) {
  let best = Infinity, want = new Set();
  for (const { card, marks } of cards) {
    const away = awayFrom(marks, win);
    if (away === 0 || away > best) continue;
    if (away < best) { best = away; want = new Set(); }
    const cells = win === "blackout" ? card.map((_, k) => k) : LINES.filter((line) => empty(marks, line) === away).flat();
    for (const k of cells) if (!marks[k]) want.add(card[k]);
  }
  if (want.size > 1) want.delete(last);
  if (!want.size) return -1;
  return makeRng(`${seed}:again:${call}`).pick([...want].sort((a, b) => a - b));
}

// ---------- what browsers may see ----------
// A call: the question WITHOUT any choices or answers (and never noBingo/alsoRight).
export function publicCall(q) {
  return { level: q.level, eyebrow: q.eyebrow, prompt: q.prompt, media: q.media || null };
}
// A square on a card: just what it shows.
export function publicSquare(q) {
  const sq = squareOf(q);
  return { label: sq.label, img: sq.img, emoji: sq.emoji };
}
