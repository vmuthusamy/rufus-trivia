// 🔬 SCIENCE & SPACE - experiments, your amazing body, planet Earth, and space.
// Mostly science, with space mixed in. The questions live in two files:
//   science-banks.js      🧪 Science Lab, 🫀 Your Amazing Body
//   earth-space-banks.js  🌋 Planet Earth, 🚀 Space
// Want more space questions (or fewer)? Change the numbers in `parts` at the bottom.

import { mixTopic } from "../kit.js";
import { lab, body } from "./science-banks.js";
import { earth, space } from "./earth-space-banks.js";

export default mixTopic({
  id: "science",
  title: "Science & Space",
  emoji: "🔬",
  color: "#22d3ee",
  blurb: "Experiments, your body, planet Earth and space.",
  orbit: ["🧪", "🧲", "🌋", "🫀", "🔭", "🪐", "⚡", "🌈"],
  music: "cosmic",
  // How often each part comes up (out of 18): about 7 in 10 questions are science, 3 in 10 are space.
  parts: [
    [5, lab],    // 🧪 materials, forces, light, sound, electricity, scientists
    [4, body],   // 🫀 bones, heart, brain, senses
    [4, earth],  // 🌋 volcanoes, weather, rocks, oceans
    [5, space],  // 🚀 planets, astronauts, telescopes
  ],
});
