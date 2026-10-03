// 🧮 MATH BLAST - every question is invented on the spot from random numbers,
// so it never runs out and never repeats the same set.
// Pitched at 9-10 year olds: easy = adding/taking away, medium = times tables & sharing,
// hard = two steps, fractions of a number, and Rufus story problems.

import { mixIn } from "../kit.js";

const between = (rng, lo, hi) => lo + rng.int(hi - lo + 1);
const flip = (n) => Number(String(n).split("").reverse().join(""));

// Wrong answers that look believable: off by one, off by ten, digits swapped...
function nearMisses(rng, ans, extra = []) {
  const seen = new Set([ans]);
  const out = [];
  const ideas = [...extra, ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, flip(ans), ans + 5, ans - 5];
  for (const n of rng.shuffle(ideas)) {
    if (out.length === 3) break;
    if (Number.isInteger(n) && n >= 0 && !seen.has(n)) { seen.add(n); out.push(n); }
  }
  while (out.length < 3) {
    const n = ans + between(rng, -12, 12);
    if (n >= 0 && !seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}

// Each maker returns { key, eyebrow, prompt, show, ans, wrong, fact, emoji? }
const MAKERS = {
  1: [
    function add(rng) {
      const a = between(rng, 12, 68), b = between(rng, 6, 99 - a);
      const tens = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10, ones = (a % 10) + (b % 10);
      return { key: `add${a}-${b}`, eyebrow: "Quick maths", show: `${a} + ${b}`, ans: a + b,
        wrong: [a + b + 10, a + b - 10],
        fact: `${a} + ${b} = ${a + b}. Tip: add the tens (${tens}) and the ones (${ones}), then put them together!` };
    },
    function take(rng) {
      const a = between(rng, 25, 99), b = between(rng, 5, a - 8);
      return { key: `sub${a}-${b}`, eyebrow: "Quick maths", show: `${a} − ${b}`, ans: a - b,
        wrong: [a + b],
        fact: `${a} − ${b} = ${a - b}. Check it backwards: ${a - b} + ${b} = ${a}.` };
    },
    function easyTimes(rng) {
      const a = rng.pick([2, 5, 10]), b = between(rng, 2, 10);
      return { key: `mul${a}x${b}`, eyebrow: "Times tables", show: `${a} × ${b}`, ans: a * b,
        wrong: [a + b, a * (b + 1)],
        fact: a === 5 ? `${a} × ${b} = ${a * b}. Trick: ×5 is half of ×10 (${b * 10} ÷ 2).`
          : a === 10 ? `${a} × ${b} = ${a * b}. Trick: to times by 10, just stick a 0 on the end!`
          : `${a} × ${b} = ${a * b}. Doubling ${b} gives you ${a * b}!` };
    },
  ],
  2: [
    function times(rng) {
      const a = between(rng, 3, 12), b = between(rng, 3, 12);
      return { key: `mul${a}x${b}`, eyebrow: "Times tables", show: `${a} × ${b}`, ans: a * b,
        wrong: [a * (b - 1), a * (b + 1), (a + 1) * b, a + b],
        fact: a === 9 || b === 9
          ? `${a} × ${b} = ${a * b}. Nine trick: the digits of a 9-times answer add up to 9!`
          : `${a} × ${b} = ${a * b}. That's also ${b} × ${a}!` };
    },
    function share(rng) {
      const b = between(rng, 2, 10), q = between(rng, 2, 12), a = b * q;
      return { key: `div${a}/${b}`, eyebrow: "Sharing", show: `${a} ÷ ${b}`, ans: q,
        wrong: [q + 1, q - 1, b],
        fact: `${a} ÷ ${b} = ${q}, because ${b} × ${q} = ${a}.` };
    },
    function missing(rng) {
      const x = between(rng, 6, 48), b = between(rng, 8, 45);
      return { key: `miss${x}+${b}`, eyebrow: "Missing number", show: `▢ + ${b} = ${x + b}`, ans: x,
        prompt: "What number goes in the box?",
        wrong: [x + b + b, x + 10],
        fact: `The box is ${x}, because ${x + b} − ${b} = ${x}.` };
    },
    function bigAdd(rng) {
      const a = between(rng, 120, 480), b = between(rng, 25, 99);
      return { key: `add${a}-${b}`, eyebrow: "Big numbers", show: `${a} + ${b}`, ans: a + b,
        wrong: [a + b + 100, a + b - 10],
        fact: `${a} + ${b} = ${a + b}. Line up the hundreds, tens and ones, then add each column.` };
    },
  ],
  3: [
    function twoStep(rng) {
      const a = between(rng, 3, 9), b = between(rng, 3, 9), c = between(rng, 2, 20);
      return { key: `ts${a}x${b}+${c}`, eyebrow: "Two-step challenge", show: `${a} × ${b} + ${c}`, ans: a * b + c,
        prompt: "Times first, then add!",
        wrong: [a * (b + c), a * b - c, a + b + c],
        fact: `First ${a} × ${b} = ${a * b}, then ${a * b} + ${c} = ${a * b + c}.` };
    },
    function brackets(rng) {
      const a = between(rng, 2, 9), b = between(rng, 2, 9), c = between(rng, 2, 6);
      return { key: `br${a}+${b}x${c}`, eyebrow: "Two-step challenge", show: `(${a} + ${b}) × ${c}`, ans: (a + b) * c,
        prompt: "Brackets first!",
        wrong: [a + b * c, (a + b) * (c + 1)],
        fact: `Brackets first: ${a} + ${b} = ${a + b}, then ${a + b} × ${c} = ${(a + b) * c}.` };
    },
    function bigTimes(rng) {
      const a = between(rng, 12, 49), b = between(rng, 3, 9);
      const tens = Math.floor(a / 10) * 10, ones = a % 10;
      return { key: `mul${a}x${b}`, eyebrow: "Big times", show: `${a} × ${b}`, ans: a * b,
        wrong: [a * b + b, a * b - b, tens * b + ones],
        fact: `${a} × ${b} = ${a * b}. Split it: ${tens} × ${b} = ${tens * b}, ${ones} × ${b} = ${ones * b}, add them up!` };
    },
    function fractionOf(rng) {
      const [sym, d] = rng.pick([["½", 2], ["⅓", 3], ["¼", 4], ["⅕", 5], ["⅒", 10]]);
      const ans = between(rng, 3, 15), n = ans * d;
      return { key: `fr${d}of${n}`, eyebrow: "Fractions", show: `${sym} of ${n}`, ans,
        prompt: `What is ${sym} of ${n}?`,
        wrong: [n - d, ans * 2, n / 2 === ans ? ans + 2 : n / 2],
        fact: `${sym} of ${n} means ${n} ÷ ${d} = ${ans}.` };
    },
  ],
};

// ---------- RUFUS STORY PROBLEMS ----------
// Set in the real levels of Adventures of Rufus, with his friends (Martina, Renard, Fiery)
// and the baddies (squirrels, wasps, bookworms, King Clown, Mr. Donut, the Moon snakes...).
// Each one: level (1-3), place (the game level it happens in), emoji, and make(rng).
// make() returns { key, prompt, ans, wrong?, fact }. Keep them gentle: dodge, chase, share, cool down.
const STORIES = [
  // ----- easy: adding and taking away -----
  { level: 1, place: "The Library", emoji: "📚", make(rng) {
    const a = between(rng, 12, 45), b = between(rng, 8, 40);
    return { key: `read${a}+${b}`, prompt: `Rufus reads ${a} pages of his comic before lunch and ${b} pages after. How many pages is that?`,
      ans: a + b, fact: `${a} + ${b} = ${a + b} pages. Rufus loves a good comic!` };
  } },
  { level: 1, place: "The Library", emoji: "🐛", make(rng) {
    const a = between(rng, 40, 99), b = between(rng, 6, a - 15);
    return { key: `worm${a}-${b}`, prompt: `A library book has ${a} pages. Sneaky bookworms chew up ${b} of them. How many pages are left?`,
      ans: a - b, fact: `${a} − ${b} = ${a - b} pages left. Shoo, bookworms!` };
  } },
  { level: 1, place: "The Backyard", emoji: "🐿️", make(rng) {
    const a = between(rng, 6, 30), b = between(rng, 4, 25);
    return { key: `sq${a}+${b}`, prompt: `Rufus dodges ${a} squirrels in the Backyard, then ${b} more in the Neighborhood. How many squirrels did he dodge?`,
      ans: a + b, fact: `${a} + ${b} = ${a + b} squirrels. Nobody's quicker than Rufus!` };
  } },
  { level: 1, place: "The School Gym", emoji: "🐝", make(rng) {
    const a = between(rng, 25, 70), b = between(rng, 5, a - 10);
    return { key: `wasp${a}-${b}`, prompt: `There are ${a} wasps buzzing in the School Gym. ${b} fly out of the window. How many are still buzzing?`,
      ans: a - b, fact: `${a} − ${b} = ${a - b} wasps. Bzzzz!` };
  } },
  { level: 1, place: "Candy Kingdom", emoji: "🍩", make(rng) {
    const a = between(rng, 20, 60), b = between(rng, 4, a - 6);
    return { key: `donut${a}-${b}`, prompt: `Rufus collects ${a} donuts in Candy Kingdom and munches ${b} of them. How many are left?`,
      ans: a - b, fact: `${a} − ${b} = ${a - b} donuts. Save some for Mr. Donut... or not!` };
  } },
  { level: 1, place: "Fiery's Fire Quest", emoji: "🔥", make(rng) {
    const a = between(rng, 8, 40), b = between(rng, 8, 40);
    return { key: `mallow${a}+${b}`, prompt: `Fiery toasts ${a} marshmallows and Renard toasts ${b}. How many marshmallows altogether?`,
      ans: a + b, fact: `${a} + ${b} = ${a + b} toasty marshmallows!` };
  } },
  { level: 1, place: "The Neighborhood", emoji: "⛑️", make(rng) {
    const n = between(rng, 2, 10);
    return { key: `helm${n}`, prompt: `Rufus pops the helmets off ${n} armored squirrels. Each helmet is worth 10 points. How many points?`,
      ans: n * 10, wrong: [n + 10, n * 5], fact: `${n} × 10 = ${n * 10}. Trick: times 10 just adds a zero!` };
  } },
  { level: 1, place: "Rufus's Treat Party", emoji: "🐾", make(rng) {
    const n = between(rng, 2, 10);
    return { key: `paw${n}`, prompt: `Each golden paw is worth 5 stars. Rufus finds ${n} golden paws. How many stars is that?`,
      ans: n * 5, wrong: [n + 5, n * 10], fact: `${n} × 5 = ${n * 5} stars. Counting in 5s: ${Array.from({ length: n }, (_, i) => (i + 1) * 5).join(", ")}!` };
  } },
  { level: 1, place: "Rufus's Treat Party", emoji: "🍪", make(rng) {
    const a = between(rng, 10, 50), b = between(rng, 5, 40);
    return { key: `treat${a}+${b}`, prompt: `Rufus has ${a} treats. Martina gives him ${b} more. How many treats does he have now?`,
      ans: a + b, fact: `${a} + ${b} = ${a + b} treats. Thanks, Martina!` };
  } },

  // ----- medium: times tables and sharing -----
  { level: 2, place: "The Theme Park", emoji: "🤡", make(rng) {
    const a = between(rng, 3, 9), b = between(rng, 3, 9);
    return { key: `juggle${a}x${b}`, prompt: `The King Clown has ${a} clown helpers. Each one juggles ${b} balls. How many balls are flying?`,
      ans: a * b, wrong: [a + b], fact: `${a} × ${b} = ${a * b} balls. What a circus!` };
  } },
  { level: 2, place: "Donut Doom", emoji: "🍩", make(rng) {
    const a = between(rng, 3, 9), b = between(rng, 4, 12);
    return { key: `dbox${a}x${b}`, prompt: `Mr. Donut hides ${a} boxes with ${b} donuts in each box. How many donuts is he hiding?`,
      ans: a * b, wrong: [a + b], fact: `${a} × ${b} = ${a * b} donuts. Sprinkles everywhere!` };
  } },
  { level: 2, place: "Rufus's Treat Party", emoji: "🦊", make(rng) {
    const q = between(rng, 3, 12);
    return { key: `share4x${q}`, prompt: `Rufus shares ${q * 4} treats equally between 4 foxes: himself, Martina, Renard and Fiery. How many does each fox get?`,
      ans: q, wrong: [q * 2, q + 4], fact: `${q * 4} ÷ 4 = ${q} treats each. Sharing is caring!` };
  } },
  { level: 2, place: "The Library", emoji: "🐛", make(rng) {
    const a = between(rng, 3, 9), b = between(rng, 3, 9);
    return { key: `chew${a}x${b}`, prompt: `Each bookworm chews ${a} pages a minute. How many pages does one bookworm chew in ${b} minutes?`,
      ans: a * b, wrong: [a + b], fact: `${a} × ${b} = ${a * b} pages. Hungry worm!` };
  } },
  { level: 2, place: "The Library", emoji: "📖", make(rng) {
    const p = between(rng, 3, 10), n = between(rng, 3, 9);
    return { key: `nights${p * n}/${p}`, prompt: `Rufus reads ${p} pages every night. How many nights will it take him to finish a ${p * n}-page book?`,
      ans: n, wrong: [n + 1, p], fact: `${p * n} ÷ ${p} = ${n} nights. Bedtime stories for Fiery!` };
  } },
  { level: 2, place: "The Theme Park", emoji: "🎢", make(rng) {
    const r = between(rng, 3, 9), c = between(rng, 2, 6);
    return { key: `coaster${r}x${c}`, prompt: `The Theme Park roller coaster has ${r} cars with ${c} seats each. How many riders fit?`,
      ans: r * c, wrong: [r + c], fact: `${r} × ${c} = ${r * c} riders. Wheeeee!` };
  } },
  { level: 2, place: "Snakes on the Moon", emoji: "🌕", make(rng) {
    const b = between(rng, 2, 9);
    return { key: `moon6x${b}`, prompt: `On the Moon you can jump about 6 times higher than on Earth. On Earth Rufus jumps ${b} blocks high. How high on the Moon?`,
      ans: 6 * b, wrong: [6 + b, 5 * b], fact: `6 × ${b} = ${6 * b} blocks! The Moon's gravity is only about 1/6 of Earth's, so jumps really are about 6 times higher.` };
  } },
  { level: 2, place: "Meteor Dash Home", emoji: "☄️", make(rng) {
    const a = between(rng, 2, 9), b = between(rng, 2, 9);
    return { key: `meteor${a}x${b}`, prompt: `${a} meteors fall every 10 seconds. How many fall in ${b * 10} seconds?`,
      ans: a * b, wrong: [a * b * 10, a + b], fact: `${b * 10} seconds is ${b} lots of 10, so ${a} × ${b} = ${a * b} meteors. Dodge!` };
  } },
  { level: 2, place: "Jetpack Training", emoji: "🚀", make(rng) {
    const per = between(rng, 2, 8), n = between(rng, 3, 9);
    return { key: `fuel${per * n}/${per}`, prompt: `Rufus's jetpack holds ${per * n} litres of fuel. Each flight uses ${per} litres. How many flights can he make?`,
      ans: n, wrong: [n + 1, per], fact: `${per * n} ÷ ${per} = ${n} flights. Whoosh!` };
  } },
  { level: 2, place: "Candy Kingdom", emoji: "💎", make(rng) {
    const start = between(rng, 6, 40), found = between(rng, 5, 30);
    return { key: `gems?+${found}=${start + found}`, prompt: `Rufus had some gems. He found ${found} more in Candy Kingdom and now has ${start + found}. How many did he start with?`,
      ans: start, wrong: [start + found + found, found], fact: `${start + found} − ${found} = ${start}. He started with ${start} gems.` };
  } },

  // ----- hard: two steps, fractions, shapes -----
  { level: 3, place: "The Library", emoji: "📚", make(rng) {
    const s = between(rng, 3, 8), b = between(rng, 6, 12), e = between(rng, 3, 12);
    return { key: `shelf${s}x${b}-${e}`, prompt: `The Library has ${s} shelves with ${b} books on each. Bookworms nibble ${e} books. How many books are safe?`,
      ans: s * b - e, wrong: [s * b, s * b + e, s + b - e], fact: `${s} × ${b} = ${s * b} books, then ${s * b} − ${e} = ${s * b - e} safe books.` };
  } },
  { level: 3, place: "Upside Down Lava Boss", emoji: "🌋", make(rng) {
    const d = between(rng, 4, 12), k = between(rng, 3, 9);
    return { key: `cool${d * k}/${d}`, prompt: `The Upside Down Lava Boss is ${d * k} degrees too hot. Each splash of water cools it by ${d} degrees. How many splashes to cool it down?`,
      ans: k, wrong: [k + 1, k - 1, d], fact: `${d * k} ÷ ${d} = ${k} splashes. Sizzle!` };
  } },
  { level: 3, place: "Snakes on the Moon", emoji: "🐍", make(rng) {
    const k = between(rng, 2, 9), m = between(rng, 2, 9);
    return { key: `snakes${k}-${m}`, prompt: `On the Moon there are ${k} king cobras, twice as many rattlesnakes, and ${m} milk snakes. How many snakes in total?`,
      ans: k + 2 * k + m, wrong: [k + 2 + m, 2 * k + m, k + k + m], fact: `Rattlesnakes: 2 × ${k} = ${2 * k}. Then ${k} + ${2 * k} + ${m} = ${3 * k + m} snakes. Sssss!` };
  } },
  { level: 3, place: "Fiery's Fire Quest", emoji: "🔥", make(rng) {
    const half = between(rng, 6, 30);
    return { key: `half${half * 2}`, prompt: `Fiery eats ½ of the ${half * 2} marshmallows. How many does Fiery eat?`,
      ans: half, wrong: [half * 2, half + 2, half - 2], fact: `½ of ${half * 2} = ${half * 2} ÷ 2 = ${half}.` };
  } },
  { level: 3, place: "The Neighborhood", emoji: "⛑️", make(rng) {
    const q = between(rng, 2, 9);
    return { key: `quarter${q * 4}`, prompt: `¼ of the ${q * 4} squirrels in the Neighborhood wear helmets. How many squirrels wear helmets?`,
      ans: q, wrong: [q * 2, q * 3, q + 4], fact: `¼ of ${q * 4} means ${q * 4} ÷ 4 = ${q}.` };
  } },
  { level: 3, place: "The School Gym", emoji: "🏀", make(rng) {
    const w = between(rng, 12, 40), h = between(rng, 8, 25);
    return { key: `gym${w}x${h}`, prompt: `The School Gym is a rectangle ${w} m long and ${h} m wide. How far is it all the way around the edge?`,
      ans: 2 * (w + h), wrong: [w + h, w * h, 2 * w + h], fact: `All the way around = ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)} m. That's called the perimeter!` };
  } },
  { level: 3, place: "The Library", emoji: "📖", make(rng) {
    const a = between(rng, 8, 30);
    return { key: `double${a}`, prompt: `Rufus reads ${a} pages on Monday and twice as many on Tuesday. How many pages did he read on both days?`,
      ans: a * 3, wrong: [a * 2, a + 2, a * 4], fact: `Tuesday: 2 × ${a} = ${a * 2}. Both days: ${a} + ${a * 2} = ${a * 3} pages.` };
  } },
  { level: 3, place: "King Clown", emoji: "👑", make(rng) {
    const s = between(rng, 3, 9), t = between(rng, 4, 12);
    return { key: `clownfly${s}x${t}`, prompt: `The King Clown's jetpack flies ${s} metres every second. How far does he zoom in ${t} seconds?`,
      ans: s * t, wrong: [s + t, s * (t - 1)], fact: `${s} × ${t} = ${s * t} metres. Catch him, Rufus!` };
  } },
  { level: 3, place: "The Theme Park", emoji: "🎟️", make(rng) {
    const cost = between(rng, 3, 8), rides = between(rng, 2, 6), extra = between(rng, 1, cost - 1);
    const have = cost * rides + extra;
    return { key: `tix${have}/${cost}`, prompt: `Each Theme Park ride costs ${cost} tickets. Rufus has ${have} tickets. How many tickets are left after ${rides} rides?`,
      ans: extra, wrong: [have - cost, rides, cost - extra], fact: `${rides} × ${cost} = ${cost * rides} tickets spent, so ${have} − ${cost * rides} = ${extra} left.` };
  } },
];

export default {
  id: "math",
  title: "Math Blast",
  emoji: "🧮",
  color: "#3ddc97",
  blurb: "Fast sums, times tables and Rufus story problems.",
  size: 1000, // practically endless: numbers are random every time
  orbit: ["➕", "➗", "✖️", "➖", "🔢", "🧮", "💯", "📐"],
  music: "brain",

  next({ rng, level, used }) {
    // About half the time it's a Rufus story problem, otherwise a quick sum.
    const stories = STORIES.filter((s) => s.level === level);
    let q;
    for (let tries = 0; tries < 20; tries++) {
      if (stories.length && rng.chance(0.5)) {
        const s = rng.pick(stories);
        q = { ...s.make(rng), eyebrow: "Rufus story problem", emoji: s.emoji, place: s.place };
      } else {
        q = rng.pick(MAKERS[level] || MAKERS[2])(rng);
      }
      q.key = q.key.replace(/[^a-z0-9_-]/gi, "_").slice(0, 32); // safe to store in the browser
      if (!used.has(q.key)) break;
    }
    const wrong = nearMisses(rng, q.ans, (q.wrong || []).filter((n) => n !== q.ans));
    const { items, answer } = mixIn(rng, q.ans, wrong);
    return {
      key: q.key,
      level,
      eyebrow: q.eyebrow,
      prompt: q.prompt || "What's the answer?",
      media: q.show ? { kind: "word", text: q.show, sub: q.show.includes("=") ? "" : "= ?" }
        : q.place ? { kind: "story", text: q.emoji, place: q.place }
        : { kind: "emoji", text: q.emoji || "🧮" },
      choices: items.map((n) => ({ label: String(n) })),
      answer,
      fact: q.fact,
      learn: {
        label: q.show ? `${q.show.replace("▢", String(q.ans))}${q.show.includes("=") ? "" : " = " + q.ans}` : q.fact.split(/[.!]/)[0],
        emoji: q.emoji || "🧮",
      },
    };
  },
};
