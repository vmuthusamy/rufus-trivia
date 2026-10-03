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
//   POST /api/stickers                  my sticker collection
//   GET/POST /api/me                    "remember me": this device's players, via a cookie
//   POST /api/names/check               is this typed-in name allowed?
//   POST /api/visit                     "this device opened the site today" (anonymous)
//   GET  /api/stats                     private visitor/game stats (needs the x-stats-key header)

import { TOPICS, TOPIC_BY_ID, topicCard } from "./shared/topics/index.js";
import { ADJECTIVES, ANIMALS, COLORS, cleanPlayer, checkNick } from "./shared/names.js";
import { SOLO, ROOM_LIMITS } from "./shared/scoring.js";
import { COUNTRIES } from "./shared/data/countries.js";
import { STICKERS } from "./shared/stickers.js";

const STICKER_IDS = new Set(STICKERS.map((s) => s.id));

function readCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([a-z0-9]+)"));
  return m ? m[1] : null;
}

function newDeviceId() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return "d" + [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 30);
}

export { GameRoom } from "./room.js";
export { HallOfFame } from "./hall.js";
export { Stats } from "./stats.js";

const statsStub = (env) => env.STATS.get(env.STATS.idFromName("global"));

// Compare the stats key without leaking how many characters matched.
async function sameKey(a, b) {
  const enc = new TextEncoder();
  const [x, y] = [enc.encode(a || ""), enc.encode(b || "")];
  if (!x.length || x.length !== y.length) return false;
  return crypto.subtle.timingSafeEqual(x, y);
}

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
  async fetch(request, env, ctx) {
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
          stickers: STICKERS,
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
        ctx.waitUntil(statsStub(env).count("solo", b.topic).catch(() => {}));
        return json({ id: id.toString() });
      }

      let m = path.match(/^\/api\/solo\/([0-9a-f]{64})\/ws$/);
      if (m) return env.ROOMS.get(env.ROOMS.idFromString(m[1])).fetch(request);

      // Is this solo run still going? (So a page reload can pick it back up.)
      m = path.match(/^\/api\/solo\/([0-9a-f]{64})$/);
      if (m) {
        const info = await env.ROOMS.get(env.ROOMS.idFromString(m[1])).peek();
        return json({ exists: info.exists, phase: info.phase }, info.exists ? 200 : 404);
      }

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
          if (res.ok) {
            ctx.waitUntil(statsStub(env).count("room_created", b.topic).catch(() => {}));
            return json({ code });
          }
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

      // A device opened the site today (a random id the browser made up; no names, no IPs).
      if (path === "/api/visit" && request.method === "POST") {
        const b = await body(request);
        if (typeof b.vid === "string" && /^v[a-z0-9]{10,30}$/.test(b.vid)) {
          ctx.waitUntil(statsStub(env).visit(b.vid).catch(() => {}));
        }
        return new Response(null, { status: 204 });
      }

      // Private stats for the grown-ups: needs the STATS_KEY secret.
      if (path === "/api/stats") {
        if (!env.STATS_KEY) return json({ error: "The stats key hasn't been set up yet." }, 503);
        if (!(await sameKey(request.headers.get("x-stats-key"), env.STATS_KEY))) return json({ error: "Wrong stats key." }, 401);
        return json(await statsStub(env).report(url.searchParams.get("days") || 30));
      }

      // Is this typed-in name allowed? (The builder asks before saving.)
      if (path === "/api/names/check" && request.method === "POST") {
        const b = await body(request);
        return json(checkNick(b.nick));
      }

      // My sticker collection (for the sticker book). Needs my private player id, so only I can ask.
      if (path === "/api/stickers" && request.method === "POST") {
        const b = await body(request);
        const player = cleanPlayer(b.player);
        if (!player) return json({ error: "Pick a nickname first." }, 400);
        const rows = await env.HALL.get(env.HALL.idFromName("global")).stickerDetails(player.id);
        return json({ stickers: rows.map((r) => r.id), earned: Object.fromEntries(rows.map((r) => [r.id, r.at])) });
      }

      // "Remember me": this device's players, backed up on the server and found again with a cookie.
      // The cookie is only a random device id (HttpOnly, so page scripts can't read it). No tracking.
      if (path === "/api/me") {
        const hall = env.HALL.get(env.HALL.idFromName("global"));
        const dev = readCookie(request, "rt_dev");
        if (request.method === "GET") {
          const data = dev ? await hall.getDevice(dev) : null;
          return json(data || { profiles: [] });
        }
        if (request.method === "POST") {
          const b = await body(request);
          const profiles = (Array.isArray(b.profiles) ? b.profiles : []).slice(0, 6).map((p) => {
            const c = cleanPlayer(p);
            if (!c) return null;
            const pins = Array.isArray(p.pins) ? p.pins.filter((x) => typeof x === "string" && STICKER_IDS.has(x)).slice(0, 3) : [];
            return { id: c.id, adj: c.adj, animal: c.animal, color: c.color, nick: c.nick, pins };
          }).filter(Boolean);
          const active = profiles.some((p) => p.id === b.active) ? b.active : profiles[0] && profiles[0].id;
          const id = dev && /^d[a-z0-9]{20,40}$/.test(dev) ? dev : newDeviceId();
          await hall.saveDevice(id, { profiles, active });
          const res = json({ ok: true, saved: profiles.length });
          res.headers.append("set-cookie", `rt_dev=${id}; Path=/api; Max-Age=34560000; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`);
          return res;
        }
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
