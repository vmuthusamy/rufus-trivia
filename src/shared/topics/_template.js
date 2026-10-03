// 🦊 MAKE YOUR OWN TOPIC!
//
// 1. Copy this file and give it a new name, like  topics/animals.js
// 2. Change the id, title, emoji and colour
// 3. Write your questions (each needs 1 right answer "a" and 3 "wrong" ones)
// 4. Open topics/index.js and add your topic to the list (instructions are there)
// 5. Run `npm run dev` and play it!
//
// Tips:
//   - level 1 = easy, 2 = medium, 3 = hard. Easy questions come first in a game.
//   - "emoji" shows a big picture above the question.
//   - "fact" is what Rufus says after you answer. Make it fun!
//   - More questions = fewer repeats. Aim for at least 30.

import { bankTopic } from "../kit.js";

export default bankTopic({
  id: "my-topic",            // short, no spaces
  title: "My Awesome Topic",
  emoji: "🦕",
  color: "#3ddc97",          // the colour of this topic's card
  blurb: "One line about what this quiz is about.",
  orbit: ["🦕", "🦖", "🌋", "🥚"], // emoji that circle around Rufus when this topic is picked
  music: "adventure",             // song: "adventure", "cosmic", "city" or "brain" (see public/js/sound.js)
  questions: [
    {
      q: "What do caterpillars turn into?",
      a: "Butterflies",
      wrong: ["Bees", "Spiders", "Beetles"],
      level: 1,
      emoji: "🐛",
      fact: "Inside its chrysalis, a caterpillar completely rebuilds its body!",
    },
    // add more questions here...
  ],
});
