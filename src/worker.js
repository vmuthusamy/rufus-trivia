// The front door. Everything under /api/ comes here; every other URL is a file from public/.
//
//   GET  /api/meta                      topics + nickname word lists
//   POST /api/solo                      start a solo run      -> { id }
//   GET  /api/solo/:id/ws               websocket for that run
//   POST /api/rooms                     make a challenge room -> { code }
//   GET  /api/rooms/:code               is this room real? who's in it?
//   GET  /api/rooms/:code/ws            websocket for that room
//   GET  /api/hall?topic=&period=&pid=  Hall of Fame top 10
//   POST /api/hall/rename               update my name on my Hall of Fame scores
//   POST /api/names/check               is this typed-in name allowed?

import { TOPICS, TOPIC_BY_ID, topicCard } from "./shared/topics/index.js";
import { ADJECTIVES, ANIMALS, COLORS, cleanPlayer, checkNick } from "./shared/names.js";
import { SOLO, ROOM_LIMITS } from "./shared/scoring.js";
import { COUNTRIES } from "./shared/data/countries.js";

export { GameRoom } from "./room.js";
export { HallOfFame } from "./hall.js";

// No vowels, so a random room code can never spell a word.
const CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ";
const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{5}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function newCode() {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return [...b].map((x) => CODE_LETTERS[x % CODE_LETTERS.length]).join("");
}

function shuffled(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

const roomStub = (env, code) => env.ROOMS.get(env.ROOMS.idFromName("room:" + code));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      if (path === "/api/meta") {
        return json({
          topics: TOPICS.map(topicCard),
          names: { adjectives: ADJECTIVES, animals: ANIMALS, colors: COLORS },
          solo: SOLO,
          room: ROOM_LIMITS,
          // Every flag picture, shuffled, with NO names: used to decorate the menus and
          // to preload flags so questions appear instantly. Gives away nothing.
          gallery: shuffled(COUNTRIES.map((c) => c.img)),
        });
      }

      if (path === "/api/solo" && request.method === "POST") {
        const b = await body(request);
        const player = cleanPlayer(b.player);
        if (!TOPIC_BY_ID[b.topic] || !player) return json({ error: "Pick a topic and a nickname first." }, 400);
        const id = env.ROOMS.newUniqueId();
        await env.ROOMS.get(id).init({ kind: "solo", topic: b.topic, hostId: player.id });
        return json({ id: id.toString() });
      }

      let m = path.match(/^\/api\/solo\/([0-9a-f]{64})\/ws$/);
      if (m) return env.ROOMS.get(env.ROOMS.idFromString(m[1])).fetch(request);

      if (path === "/api/rooms" && request.method === "POST") {
        const b = await body(request);
        const player = cleanPlayer(b.player);
        const settings = {
          count: Number(b.count), timer: Number(b.timer), level: String(b.level),
        };
        if (!TOPIC_BY_ID[b.topic] || !player) return json({ error: "Pick a topic and a nickname first." }, 400);
        if (!ROOM_LIMITS.counts.includes(settings.count) || !ROOM_LIMITS.timers.includes(settings.timer) ||
            !ROOM_LIMITS.levels.includes(settings.level)) {
          return json({ error: "Those room settings aren't allowed." }, 400);
        }
        for (let tries = 0; tries < 8; tries++) {
          const code = newCode();
          const res = await roomStub(env, code).init({ kind: "room", code, topic: b.topic, settings, hostId: player.id });
          if (res.ok) return json({ code });
        }
        return json({ error: "Couldn't make a room right now. Try again!" }, 503);
      }

      m = path.match(/^\/api\/rooms\/([A-Za-z]{5})(\/ws)?$/);
      if (m) {
        const code = m[1].toUpperCase();
        if (!CODE_RE.test(code)) return json({ exists: false }, 404);
        if (m[2]) return roomStub(env, code).fetch(request);
        const info = await roomStub(env, code).peek();
        return json(info, info.exists ? 200 : 404);
      }

      // Is this typed-in name allowed? (The builder asks before saving.)
      if (path === "/api/names/check" && request.method === "POST") {
        const b = await body(request);
        return json(checkNick(b.nick));
      }

      // Put my new name/avatar on all my Hall of Fame scores.
      if (path === "/api/hall/rename" && request.method === "POST") {
        const b = await body(request);
        const player = cleanPlayer(b.player);
        if (!player) return json({ error: "That name won't work." }, 400);
        const hall = env.HALL.get(env.HALL.idFromName("global"));
        return json(await hall.rename({ pid: player.id, name: player.name, emoji: player.emoji, color: player.color }));
      }

      if (path === "/api/hall") {
        const topic = url.searchParams.get("topic") || "flags";
        if (!TOPIC_BY_ID[topic]) return json({ error: "Unknown topic" }, 400);
        const period = url.searchParams.get("period") === "week" ? "week" : "all";
        const pid = url.searchParams.get("pid") || "";
        const hall = env.HALL.get(env.HALL.idFromName("global"));
        return json(await hall.top(topic, period, /^[a-zA-Z0-9_-]{8,40}$/.test(pid) ? pid : null));
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Something went wrong. Try again!" }, 500);
    }
  },
};
