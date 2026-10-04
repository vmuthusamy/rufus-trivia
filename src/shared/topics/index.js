// All the topics in the game. To add one:
//   1. import it below
//   2. add it to the TOPICS list
// The order here is the order of the cards on the home screen.

import flags from "./flags.js";
import world from "./world.js";
import space from "./space.js";
import math from "./math.js";
import animals from "./animals.js";

export const TOPICS = [flags, world, animals, space, math];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

// What the browser is allowed to know about a topic (no answers in here!).
//   orbit: what circles around Rufus on the home screen ("flags", or a list of emoji)
//   music: which song plays for this topic (see MUSIC in public/js/sound.js)
export function topicCard(t) {
  return {
    id: t.id, title: t.title, emoji: t.emoji, color: t.color, blurb: t.blurb, size: t.size,
    orbit: t.orbit || [t.emoji], music: t.music || "adventure",
  };
}
