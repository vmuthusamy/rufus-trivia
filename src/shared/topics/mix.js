// 🎲 MIX IT UP - Rufus stirs several topics together into one game.
//
// The player picks which topics go in the pot (at least 2). A mix game is just mixTopic() from kit.js
// with every chosen topic as a part, all with the same weight, so each question is a dice roll:
// a flag, then maybe a maths puzzle, then a book question...
//
// Every mix question's key gets its topic's name in front ("fr" becomes "flags-fr"), so:
//   - two topics can never have a question with the same key
//   - the browser knows which topic each question came from, and remembers it there
//     (so a flag you saw in a mix won't come straight back in Flag Frenzy, and the other way round)
// That's why a topic id must never have a "-" in it.

import { TOPICS, TOPIC_BY_ID, canPlay, topicCard } from "./index.js";
import { mixTopic } from "../kit.js";

export const MIX = {
  id: "mix",
  title: "Mix it up",
  emoji: "🎲",
  color: "#a78bfa",
  blurb: "Rufus stirs your favourite topics together",
  music: "adventure", // Fox Adventure (see MUSIC in public/js/sound.js)
  min: 2,             // the fewest topics a mix can have
};

// Check a list of topics someone wants to mix. Returns a tidy copy, or null if it isn't allowed.
// Allowed = 2 or more different topics you can play today (no retired or made-up ones, no doubles).
// The tidy copy is always in home-screen order, so the same mix makes the same game whatever order you tapped them in.
export function cleanMix(list) {
  if (!Array.isArray(list) || list.length < MIX.min || list.length > TOPICS.length) return null;
  if (new Set(list).size !== list.length) return null;
  if (!list.every((id) => typeof id === "string" && canPlay(id))) return null;
  return TOPICS.map((t) => t.id).filter((id) => list.includes(id));
}

// Can someone start a game of this? Returns { topic, mix } (mix = the chosen topics, only for 🎲), or null.
export function playable(topic, mix) {
  if (topic === MIX.id) {
    const clean = cleanMix(mix);
    return clean ? { topic, mix: clean } : null;
  }
  return canPlay(topic) ? { topic, mix: null } : null;
}

// "flags-fr" -> ["flags", "fr"]: which topic a mix question came from, and its key inside that topic.
export function splitKey(key) {
  const i = key.indexOf("-");
  return [key.slice(0, i), key.slice(i + 1)];
}

// One topic inside the mix. Before asking it for a question, it only gets ITS OWN keys from the
// used / seen recently / missed lists (without the name in front); its question gets the name put back on.
function inTheMix(topic) {
  const start = topic.id + "-";
  const own = (keys) => new Set([...(keys || [])].filter((k) => k.startsWith(start)).map((k) => k.slice(start.length)));
  return {
    size: topic.size,
    next(ctx) {
      const q = topic.next({ ...ctx, used: own(ctx.used), avoid: own(ctx.avoid), missed: own(ctx.missed) });
      return {
        ...q,
        key: start + q.key,
        eyebrow: `${topic.emoji} ${q.eyebrow}`,                 // "🚩 Name that flag": which topic this one is from
        media: q.media || { kind: "emoji", text: topic.emoji }, // no picture? show the topic's emoji, not a 🎲
      };
    },
  };
}

// The mix topic for a list of topic ids (made once, then remembered).
const made = new Map();
export function mixOf(ids) {
  const name = ids.join("+");
  if (!made.has(name)) {
    made.set(name, mixTopic({
      ...MIX,
      orbit: ids.map((id) => TOPIC_BY_ID[id].emoji),
      parts: ids.map((id) => [1, inTheMix(TOPIC_BY_ID[id])]), // [1, ...] = every topic equally likely
    }));
  }
  return made.get(name);
}

// The topic to build questions from: a normal topic, or the mix of the chosen ones.
export function topicFor(id, mix) {
  return id === MIX.id ? mixOf(mix) : TOPIC_BY_ID[id];
}

// What the browser may know about the game's topic (see topicCard in index.js). A mix also says what's in it.
export function gameCard(id, mix) {
  if (id !== MIX.id) return topicCard(TOPIC_BY_ID[id]);
  return { ...topicCard(mixOf(mix)), mix: mix.slice() };
}

// ---------- fresh rematches in challenge rooms ----------
// A room remembers what it already asked, per topic (asked = { flags: ["fr", "jp"], math: [...] }), so a rematch
// gets new questions. Mix questions are filed under the topic they came from, so switching between
// Flag Frenzy and a mix with flags in it stays fresh too.

// What this game should skip: the room's list for its topic, in the game's own key style.
export function askedBefore(asked = {}, topic, mix) {
  if (topic !== MIX.id) return asked[topic] || [];
  return mix.flatMap((id) => (asked[id] || []).map((k) => `${id}-${k}`));
}

// Add this game's questions to the room's list (newest last, at most 600 per topic).
export function rememberAsked(asked = {}, topic, keys) {
  const out = { ...asked };
  for (const full of keys) {
    const [t, key] = topic === MIX.id ? splitKey(full) : [topic, full];
    out[t] = [...(out[t] || []).filter((k) => k !== key), key].slice(-600);
  }
  return out;
}
