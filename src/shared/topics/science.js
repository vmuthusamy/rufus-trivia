// 🔬 SCIENCE & SPACE - experiments, your amazing body, planet Earth, and space.
// Mostly science, with space mixed in. The questions come from four files:
//   science-banks.js      🧪 Science Lab, 🫀 Your Amazing Body        (written by hand)
//   earth-space-banks.js  🌋 Planet Earth, 🚀 Space                   (written by hand)
//   science-makers.js     🧲 everyday science tests, 🪐 Planet Patrol  (made fresh from the tables in
//                         data/materials.js and data/planets.js, so there are lots of different ones)
// Want more space questions (or fewer)? Change the numbers in `parts` at the bottom.

import { mixTopic } from "../kit.js";
import { lab, body } from "./science-banks.js";
import { earth, space } from "./earth-space-banks.js";
import { materials, planets } from "./science-makers.js";

export default mixTopic({
  id: "science",
  title: "Science & Space",
  emoji: "🔬",
  color: "#22d3ee",
  blurb: "Experiments, your body, planet Earth and space.",
  orbit: ["🧪", "🧲", "🌋", "🫀", "🔭", "🪐", "⚡", "🌈"],
  music: "cosmic",
  // How often each part comes up (out of 24):
  //   science = 5 + 4 + 4 + 4 = 17 (about 7 in 10)      space = 4 + 3 = 7 (about 3 in 10)
  parts: [
    [5, lab],       // 🧪 materials, forces, light, sound, electricity, scientists
    [4, body],      // 🫀 bones, heart, brain, senses
    [4, earth],     // 🌋 volcanoes, weather, rocks, oceans
    [4, materials], // 🧲 magnet test, sink or float, circuit test, natural or made, solid/liquid/gas
    [4, space],     // 🚀 astronauts, stars, telescopes, rockets
    [3, planets],   // 🪐 Planet Patrol: planet order, sizes, gas giants, moons, dwarf planets
  ],
});
