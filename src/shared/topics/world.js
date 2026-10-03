// 🗺️ CAPITALS & LANDMARKS - capital cities and famous places around the world.
// Mixes two question makers: capitals (from the flag data) and landmarks (from Wikidata + Commons photos).

import { capitalQuestion, CAPITAL_COUNT } from "./capitals.js";
import { landmarkQuestion, LANDMARK_COUNT } from "./landmarks.js";

export default {
  id: "world",
  title: "Capitals & Landmarks",
  emoji: "🗺️",
  color: "#38bdf8",
  blurb: "Capital cities and famous places around the world.",
  size: CAPITAL_COUNT + LANDMARK_COUNT,
  orbit: ["🗼", "🗽", "🏛️", "🕌", "🏯", "⛩️", "🌉", "🗿"],
  music: "city",

  next(ctx) {
    // A bit more landmarks than capitals: the photos are the fun part.
    return ctx.rng.chance(0.6) ? landmarkQuestion(ctx) : capitalQuestion(ctx);
  },
};
