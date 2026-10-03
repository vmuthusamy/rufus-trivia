// 🗺️ CAPITALS & LANDMARKS - capital cities, famous places and maps of the world.
// Mixes three question makers: capitals (from the flag data), landmarks (from Wikidata + Commons photos)
// and maps (from Natural Earth).

import { capitalQuestion, CAPITAL_COUNT } from "./capitals.js";
import { landmarkQuestion, LANDMARK_COUNT } from "./landmarks.js";
import { mapQuestion, MAP_COUNT } from "./maps.js";

export default {
  id: "world",
  title: "Capitals & Landmarks",
  emoji: "🗺️",
  color: "#38bdf8",
  blurb: "Capital cities, famous places and maps of the world.",
  size: CAPITAL_COUNT + LANDMARK_COUNT + MAP_COUNT,
  orbit: ["🗼", "🗽", "🏛️", "🕌", "🏯", "⛩️", "🌉", "🗿"],
  music: "city",

  next(ctx) {
    // Out of every 20 questions: about 9 landmarks (the photos are the fun part), 6 capitals and 5 maps.
    const roll = ctx.rng.int(20);
    if (roll < 9) return landmarkQuestion(ctx);
    if (roll < 15) return capitalQuestion(ctx);
    return mapQuestion(ctx);
  },
};
