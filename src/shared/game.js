// Turning a topic into the questions for one game.

import { makeRng } from "./rng.js";
import { levelFor } from "./scoring.js";

// Build question number `index`. Same seed + same index = same question, every time.
export function buildQuestion(topic, { seed, index, levelSetting, total, used, avoid, missed }) {
  const level = levelFor(levelSetting, index, total);
  const rng = makeRng(`${seed}:${topic.id}:${index}`);
  const q = topic.next({ rng, level, used, avoid: avoid || new Set(), missed: missed || new Set() });
  return { ...q, level: q.level || level };
}

// Build a whole fixed-length game (used by challenge rooms, so everyone gets the same set).
export function buildGame(topic, { seed, count, levelSetting, avoid, missed }) {
  const used = new Set();
  const out = [];
  for (let index = 0; index < count; index++) {
    const q = buildQuestion(topic, { seed, index, levelSetting, total: count, used, avoid, missed });
    used.add(q.key);
    out.push(q);
  }
  return out;
}

// What players see BEFORE answering. No answer, no fact, no key - nothing to peek at.
export function publicQuestion(q) {
  return {
    level: q.level,
    eyebrow: q.eyebrow,
    prompt: q.prompt,
    media: q.media || null,
    choices: q.choices.map((c) => ({ label: c.label, img: c.img, emoji: c.emoji })),
  };
}
