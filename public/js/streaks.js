// 🔥 STREAKS - what happens when you get answers right in a row.
// Like the announcer in a big video game ("Killing Spree!"), but friendly.
// Change the names, colours and Rufus's jokes here!

// The big milestones. `at` = how many in a row. `colors` = the banner's two colours.
export const TIERS = [
  { at: 3, name: "Hat Trick!", emoji: "🎩", colors: ["#ff8a1f", "#ffd23f"] },
  { at: 5, name: "Brain Spree!", emoji: "🧠", colors: ["#f472b6", "#ff8a1f"] },
  { at: 7, name: "On Fire!", emoji: "🔥", colors: ["#ff2d55", "#ff8a1f"] },
  { at: 10, name: "Fact Frenzy!", emoji: "⚡", colors: ["#ffd23f", "#38bdf8"] },
  { at: 15, name: "Running Wild!", emoji: "🌪️", colors: ["#3ddc97", "#38bdf8"] },
  { at: 20, name: "Unstoppable!", emoji: "🚀", colors: ["#8b5cf6", "#38bdf8"] },
  { at: 25, name: "Untouchable!", emoji: "🛡️", colors: ["#38bdf8", "#a3e635"] },
  { at: 30, name: "Invincible!", emoji: "💎", colors: ["#67e8f9", "#8b5cf6"] },
  { at: 40, name: "Galaxy Brain!", emoji: "🌌", colors: ["#8b5cf6", "#f472b6"] },
  { at: 50, name: "LEGENDARY!", emoji: "👑", colors: ["#ffd23f", "#ff8a1f"] },
];
// After 50, every 10 more in a row is MYTHIC.
const MYTHIC = { name: "MYTHIC!", emoji: "🦄", colors: ["#ff2d55", "#8b5cf6"] };

// Little shout-outs between milestones (after 10 in a row), so it never feels the same.
const HYPE = [
  "Can't stop, won't stop!", "Combo King!", "Big brain energy!", "Too easy?!", "Brain on turbo!",
  "Keep it rolling!", "Pure genius!", "Rufus is shook!", "Legend in the making!", "Nothing can stop you!",
  "Brain cells: ACTIVATED", "Smarty pants alert!", "Turbo mode!", "Unreal!",
];

// What Rufus says. {n} = how many in a row, {name} = the player's name.
const SAY = {
  low: ["You're on a roll!", "{n} in a row! Tail spin!", "Keep it going, {name}!", "Ooh, a streak! Don't stop now!", "{n} in a row! My tail is wagging!"],
  mid: ["{n} in a row! That's SO cool!", "Whoa! My tail is spinning just watching you!", "{n}! Are you some kind of genius?",
    "Okay, now you're just showing off! 😄", "{n} in a row! I need sunglasses, you're too bright! 😎"],
  high: ["{n} in a row?! Are you using Claude, bro?!", "Rufus is SPEECHLESS. 🤐", "I'm calling the Hall of Fame right now!",
    "Is this a world record?!", "Bro. BRO. {n} in a row?!", "Even my tail can't spin this fast!", "Are you a robot? Beep boop? 🤖"],
};
// Extra jokes that fit each topic.
const TOPIC_SAY = {
  flags: { mid: ["Did you swallow an atlas?!", "Are you secretly a flag robot?"], high: ["You know more flags than the United Nations!"] },
  world: { mid: ["Are you a secret travel agent?!", "Have you been to ALL these places?!"], high: ["You're a walking world map!", "You could fly a plane with this brain!"] },
  space: { mid: ["Are you an astronaut in disguise?!"], high: ["NASA is going to call you!"] },
  math: { mid: ["Are you using a calculator?!", "Is there a calculator hiding in your pocket?"], high: ["Are you using a calculator… or Claude?!"] },
};
const BROKEN = ["Nooo, your {n} streak! Let's start a new one!", "{n} in a row was amazing! Go again!", "Streak over at {n}. Still legendary!"];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

// Which milestone has this streak reached? (index into TIERS, or -1)
export function tierIndex(n) {
  let t = -1;
  TIERS.forEach((x, i) => { if (n >= x.at) t = i; });
  return t;
}

// Everything that should happen after a right answer that makes a streak of `n`.
//   banner: { text, sub, emoji, colors, size: "big" | "mini", level } or null
//   say:    what Rufus says
//   level:  0-12, how hyped the sounds and effects should be
export function celebrate(n, topicId, name) {
  if (n < 3) return null;
  const vars = { n, name };
  const band = n >= 20 ? "high" : n >= 10 ? "mid" : "low";
  const lines = [...SAY[band], ...((TOPIC_SAY[topicId] || {})[band] || [])];
  const say = fill(pick(lines), vars);
  const ti = tierIndex(n);
  const exact = TIERS.find((x) => x.at === n);
  const mythic = n > 50 && n % 10 === 0;
  if (exact || mythic) {
    const t = exact || MYTHIC;
    const level = exact ? ti + 1 : TIERS.length + (n - 50) / 10;
    return { say, level, banner: { text: t.name, sub: `${n} IN A ROW`, emoji: t.emoji, colors: t.colors, size: "big", level } };
  }
  // Between milestones: after 10, sometimes throw in a random shout-out.
  const t = TIERS[Math.max(ti, 0)];
  if (n > 10 && Math.random() < 0.6) {
    return { say, level: ti, banner: { text: pick(HYPE), sub: `x${n}`, emoji: t.emoji, colors: t.colors, size: "mini", level: ti } };
  }
  return { say, level: ti, banner: null };
}

// A streak of `n` just ended. Only worth a comment if it was a good one.
export function streakBroken(n) {
  return n >= 5 ? fill(pick(BROKEN), { n }) : null;
}

// The little badge next to the score: the emoji changes as the streak grows.
export function badge(n) {
  if (n < 2) return { text: "", cls: "" };
  const emoji = n >= 50 ? "👑" : n >= 30 ? "💎" : n >= 20 ? "🚀" : n >= 10 ? "⚡" : "🔥";
  const cls = n >= 30 ? "t3" : n >= 20 ? "t2" : n >= 10 ? "t1" : n >= 3 ? "t0" : "";
  return { text: `${emoji} x${n}`, cls };
}
