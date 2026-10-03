// Helpers every topic can use. A topic is just an object like:
//
//   {
//     id: "flags", title: "Flag Frenzy", emoji: "🚩", color: "#ff8a1f",
//     blurb: "Name the flags of the world",
//     size: 195,                       // how many different things it can ask about
//     next(ctx) { return question }    // make ONE question
//   }
//
// ctx = { rng, level, used, avoid, missed }
//   rng    seeded random numbers (see rng.js) - always use this, never Math.random
//   level  1 = easy, 2 = medium, 3 = hard
//   used   Set of keys already asked in THIS game (never repeat these)
//   avoid  Set of keys this player saw recently (try not to repeat these)
//   missed Set of keys this player got wrong before (bring some back to practise)
//
// A question looks like:
//   {
//     key: "jp",                         // what it's about (used for freshness)
//     level: 1,
//     eyebrow: "Name that flag",         // small label above the question
//     prompt: "Which country flies this flag?",
//     media: { kind: "flag", img: "/f/abc.svg" } | { kind: "word", text, sub } | { kind: "emoji", text },
//     choices: [{ label?, img?, emoji? }, ...],   // usually 4
//     answer: 2,                         // index into choices
//     reveal: [{ label, img? }, ...],    // optional: names for every choice, shown after answering
//     fact: "Japan's flag is called...", // Rufus says this after the answer
//     learn: { label: "Japan", img },    // shown in "things you learned" at the end
//   }

export const CONTINENT_EMOJI = {
  Africa: "🦁", Asia: "🐼", Europe: "🏰", "North America": "🦅", "South America": "🦜", Oceania: "🦘",
};
export const CONTINENTS = Object.keys(CONTINENT_EMOJI);

// Pick the next thing to ask about.
// Never repeats `used`; prefers things not in `avoid`; sometimes brings back a `missed` one.
export function pickFresh(rng, pool, { used, avoid, missed, keyOf = (x) => x.key, missedChance = 0.2 }) {
  let open = pool.filter((x) => !used.has(keyOf(x)));
  if (open.length === 0) open = pool.slice(); // ran out: allow repeats rather than crash

  if (missed && missed.size && rng.chance(missedChance)) {
    const retry = open.filter((x) => missed.has(keyOf(x)));
    if (retry.length) return rng.pick(retry);
  }
  const fresh = avoid && avoid.size ? open.filter((x) => !avoid.has(keyOf(x))) : open;
  if (fresh.length) return rng.pick(fresh);
  if (avoid && avoid.size) {
    // Everything has been seen: recycle the ones seen LONGEST ago (a Set keeps the order things were added).
    const when = new Map([...avoid].map((k, i) => [k, i]));
    const oldestFirst = open.slice().sort((a, b) => (when.get(keyOf(a)) ?? -1) - (when.get(keyOf(b)) ?? -1));
    return rng.pick(oldestFirst.slice(0, Math.max(1, Math.ceil(oldestFirst.length / 3))));
  }
  return rng.pick(open);
}

// Choose `n` distractors: first from `preferred`, then topped up from `fallback`.
export function pickDistractors(rng, answer, preferred, fallback, n = 3, keyOf = (x) => x.key) {
  const out = [];
  const seen = new Set([keyOf(answer)]);
  for (const list of [rng.shuffle(preferred), rng.shuffle(fallback)]) {
    for (const x of list) {
      if (out.length >= n) break;
      const k = keyOf(x);
      if (!seen.has(k)) { seen.add(k); out.push(x); }
    }
  }
  return out;
}

// Shuffle the right answer in among the wrong ones.
// Returns { items, answer } where items[answer] is the right one.
export function mixIn(rng, right, wrong) {
  const items = rng.shuffle([right, ...wrong]);
  return { items, answer: items.indexOf(right) };
}

// Build a whole topic from a plain list of questions. This is the EASIEST way
// to add a new topic - see topics/_template.js.
export function bankTopic({ id, title, emoji, color, blurb, eyebrow = "Quiz time", orbit, music, questions }) {
  const bank = questions.map((q, i) => ({ ...q, key: q.id || id + i, level: q.level || 2 }));
  for (const q of bank) {
    if (!q.q || !q.a || !Array.isArray(q.wrong) || q.wrong.length < 3) {
      throw new Error(`Topic "${id}" question "${q.q}" needs q, a and 3 wrong answers`);
    }
  }
  return {
    id, title, emoji, color, blurb, size: bank.length, orbit, music,
    next({ rng, level, used, avoid, missed }) {
      // Prefer a question nobody has seen, at this level, then a nearby level, then any level.
      // Only when there are no fresh ones left at all do we recycle (oldest first, see pickFresh).
      const unused = bank.filter((q) => !used.has(q.key));
      const fresh = (qs) => qs.filter((q) => !(avoid && avoid.has(q.key)));
      const near = (d) => unused.filter((q) => Math.abs(q.level - level) <= d);
      let pool = fresh(near(0));
      if (!pool.length) pool = fresh(near(1));
      if (!pool.length) pool = fresh(unused);
      if (!pool.length) pool = near(0).length ? near(0) : unused.length ? unused : bank;
      const q = pickFresh(rng, pool, { used, avoid, missed });
      const wrong = rng.shuffle(q.wrong).slice(0, 3);
      const { items, answer } = mixIn(rng, q.a, wrong);
      return {
        key: q.key,
        level: q.level,
        eyebrow: q.eyebrow || eyebrow,
        prompt: q.q,
        media: q.emoji ? { kind: "emoji", text: q.emoji } : null,
        choices: items.map((label) => ({ label })),
        answer,
        fact: q.fact || `The answer is ${q.a}.`,
        learn: { label: q.a, emoji: q.emoji || emoji },
      };
    },
  };
}
