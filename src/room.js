// 🎮 GAME ROOM - one of these runs for every game (a solo run or a challenge room).
//
// Why this keeps things fair:
//   - Questions AND answers live only here on the server. Browsers get the question
//     without the answer, and only find out after everyone has locked in.
//   - Everyone in a room gets the exact same questions at the same moment.
//   - The server times every answer and works out the points itself.
//   - Scores reach the Hall of Fame straight from here, never from a browser.

import { DurableObject } from "cloudflare:workers";
import { TOPICS, TOPIC_BY_ID, topicCard } from "./shared/topics/index.js";
import { STICKER_BY_ID, stickersForAnswer, stickersForFinish, stickersForStart, showcase } from "./shared/stickers.js";
import { freshSeed } from "./shared/rng.js";
import { buildGame, buildQuestion, publicQuestion } from "./shared/game.js";
import { SOLO, ROOM_LIMITS, scoreAnswer } from "./shared/scoring.js";
import { cleanPlayer, cleanKeys } from "./shared/names.js";

const COUNTDOWN_MS = 3500;        // "3, 2, 1, GO!"
const GRACE_MS = 700;             // a little wiggle room for slow Wi-Fi after the timer ends
const ROOM_REVEAL_MS = 9000;      // challenge: time to read the fact + see the scoreboard (host can skip)
const SOLO_REVEAL_MS = 8000;      // solo: keep the game flowing (tap "Next" to go sooner)
const IDLE_TTL_MS = 3 * 60 * 60 * 1000; // tidy up games nobody has touched for 3 hours
const RECONNECT_GRACE_MS = 5000;   // if someone's Wi-Fi blips mid-question, wait this long for them to come back

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    const row = this.sql.exec("SELECT v FROM kv WHERE k = 'state'").toArray()[0];
    this.s = row ? JSON.parse(row.v) : null;
    if (this.s) for (const p of Object.values(this.s.players)) p.seat = p.seat || this.newSeat();
    // Keep-alive pings get answered without waking the game up.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ka"}', '{"t":"ka"}'));
  }

  save() {
    clearTimeout(this.saveT);
    this.saveT = null;
    this.s.lastActive = Date.now();
    this.sql.exec("INSERT OR REPLACE INTO kv (k, v) VALUES ('state', ?)", JSON.stringify(this.s));
  }

  // Answers often arrive in a burst: save them together a moment later instead of one write each.
  // (Cloudflare's free plan counts every write, so this lets far more games run per day.)
  saveSoon() {
    if (!this.saveT) this.saveT = setTimeout(() => { this.saveT = null; if (this.s) this.save(); }, 400);
  }

  // ---------- set up (called by the Worker over RPC) ----------

  async init({ kind, code, topic, settings, hostId }) {
    if (this.s) return { ok: false };
    this.s = {
      kind, code: code || null, topic,
      settings: kind === "solo" ? { timer: SOLO.timer, level: "ramp" } : settings,
      hostId, phase: "lobby", round: 0, seed: null,
      players: {}, order: [],
      qi: -1, questions: [], answers: [],
      phaseAt: Date.now(), deadline: null, wake: null, hall: null,
      createdAt: Date.now(),
    };
    this.save();
    await this.scheduleAlarm();
    return { ok: true };
  }

  peek() {
    if (!this.s) return { exists: false };
    const host = this.s.players[this.s.hostId];
    return {
      exists: true, phase: this.s.phase, topic: topicCard(TOPIC_BY_ID[this.s.topic]),
      players: this.s.order.length, host: host ? { name: host.name, emoji: host.emoji } : null,
      settings: this.s.settings,
    };
  }

  async fetch(request) {
    if (!this.s) return new Response("No such game", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a websocket", { status: 426 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // ---------- messages from browsers ----------

  async webSocketMessage(ws, raw) {
    if (!this.s || typeof raw !== "string" || raw.length > 30000) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) return; // junk like `null` or `42`: ignore quietly
    if (msg.t === "hello") return this.onHello(ws, msg);
    // "lurk" = I've opened the join link and I'm still picking my avatar. The host sees
    // a "picking an avatar…" card so they know to wait before pressing Start.
    if (msg.t === "lurk" && this.s.kind === "room") {
      ws.serializeAttachment({ lurk: true });
      return this.broadcast("lurk");
    }

    const pid = (ws.deserializeAttachment() || {}).pid;
    const me = pid && this.s.players[pid];
    if (!me) return;
    const isHost = this.effectiveHost() === pid;

    if (msg.t === "answer") return this.onAnswer(pid, msg);
    // Solo: "I'm done" ends the run now; the score so far still goes to the Hall of Fame
    // (scores only ever go up, so quitting early can't be used to cheat).
    if (msg.t === "quit" && this.s.kind === "solo" && ["countdown", "question", "reveal"].includes(this.s.phase)) {
      this.s.quit = true;
      return this.finish();
    }
    if (msg.t === "leave" && this.s.kind === "room") return this.onLeave(ws, pid);
    if (msg.t === "kick" && this.s.kind === "room" && isHost) return this.onKick(pid, msg.seat);
    if (msg.t === "settings" && this.s.kind === "room" && isHost && this.s.phase === "lobby") return this.onSettings(msg);
    if (msg.t === "start" && this.s.phase === "lobby" && isHost) return this.startGame();
    if (msg.t === "next" && this.s.phase === "reveal" && (this.s.kind === "solo" || isHost)) return this.advance();
    if (msg.t === "rematch" && this.s.phase === "final" && isHost && this.s.kind === "room") return this.rematch();
  }

  async webSocketClose(ws) {
    if (!this.s) return;
    try { ws.close(); } catch {}
    // Everyone still here has answered: give the person who dropped a few seconds to reconnect
    // (iPads nap, Wi-Fi blips) before revealing, rather than ending the question on them.
    if (this.s.phase === "question" && this.allAnswered(ws)) {
      const at = Math.min(this.s.deadline + GRACE_MS, Date.now() + RECONNECT_GRACE_MS);
      if (!this.s.wake || this.s.wake.at > at) await this.setWake(at, "timeup");
    }
    this.broadcast("leave", ws);
  }

  async webSocketError(ws) {
    return this.webSocketClose(ws);
  }

  // A player pressed Quit/Leave in a challenge room.
  async onLeave(ws, pid) {
    const s = this.s;
    if (s.phase === "lobby") {
      // Not playing yet: take them off the list completely.
      delete s.players[pid];
      s.order = s.order.filter((id) => id !== pid);
    }
    if (s.hostId === pid) {
      const here = this.connectedPids(ws);
      const next = s.order.find((id) => id !== pid && here.has(id));
      if (next) s.hostId = next; // hand the room to the next player
    }
    ws.serializeAttachment({});
    this.save();
    try { ws.close(1000, "Left the room"); } catch {}
    if (s.phase === "question" && this.allAnswered(ws)) return this.reveal();
    this.broadcast("leave", ws);
  }

  // The host changed the quiz in the lobby (topic, how many questions, timer, difficulty).
  async onSettings(msg) {
    const s = this.s;
    const count = Number(msg.count), timer = Number(msg.timer), level = String(msg.level);
    if (!TOPIC_BY_ID[msg.topic] || !ROOM_LIMITS.counts.includes(count) || !ROOM_LIMITS.timers.includes(timer) ||
        !ROOM_LIMITS.levels.includes(level)) return; // not allowed: ignore
    s.topic = msg.topic;
    s.settings = { count, timer, level };
    this.save();
    this.broadcast("settings");
  }

  // The host removed someone (e.g. a stranger who guessed the code). They can't come back to this room.
  async onKick(hostPid, seat) {
    const s = this.s;
    const pid = s.order.find((id) => s.players[id].seat === seat);
    // You can't remove yourself, and nobody can remove the room's real host
    // (a stand-in host while the real one's Wi-Fi blips must not be able to lock them out).
    if (!pid || pid === hostPid || pid === s.hostId) return;
    delete s.players[pid];
    s.order = s.order.filter((id) => id !== pid);
    s.banned = [...(s.banned || []), pid];
    this.save();
    for (const ws of this.ctx.getWebSockets()) {
      if ((ws.deserializeAttachment() || {}).pid === pid) {
        try { ws.send(JSON.stringify({ t: "error", message: "The host removed you from this room." })); ws.close(4003, "Removed by host"); } catch {}
      }
    }
    if (s.phase === "question" && this.allAnswered()) return this.reveal();
    this.broadcast("kick");
  }

  async onHello(ws, msg) {
    const p = cleanPlayer(msg.player);
    const s = this.s;
    if (!p) return this.sendError(ws, "Pick a nickname first!");
    if (s.kind === "solo" && p.id !== s.hostId) return this.sendError(ws, "This is someone else's game.");
    if ((s.banned || []).includes(p.id)) return this.sendError(ws, "The host removed you from this room.");

    // Only one connection per player (e.g. if they opened two tabs).
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && (other.deserializeAttachment() || {}).pid === p.id) {
        try { other.send(JSON.stringify({ t: "replaced" })); other.close(4000, "Opened somewhere else"); } catch {}
      }
    }

    // Same connection, different player (they switched to a new player in the lobby):
    // the old one shouldn't linger as a ghost, and if it was the host, the host role moves with them.
    const prev = (ws.deserializeAttachment() || {}).pid;
    if (prev && prev !== p.id && s.players[prev] && s.kind === "room") {
      if (s.hostId === prev) s.hostId = p.id;
      if (s.phase === "lobby" || s.phase === "final") {
        delete s.players[prev];
        s.order = s.order.filter((id) => id !== prev);
      }
    }

    let player = s.players[p.id];
    let event = "rejoin";
    let owned = [];
    if (!player) {
      // Bring their sticker collection along (kept on the server, so it follows them into every room).
      owned = await this.hall().stickers(p.id).catch(() => []);
      if (!this.s) return;
      player = s.players[p.id]; // they might have been added while we waited
    }
    if (player && (s.phase === "lobby" || s.phase === "final")) {
      // Changed your avatar in the lobby? Update it (scores are only kept during a game).
      const before = player.name;
      Object.assign(player, { adj: p.adj, animal: p.animal, color: p.color, emoji: p.emoji, name: this.uniqueName(p.name, p.id) });
      if (Array.isArray(msg.avoid)) player.avoid = cleanKeys(msg.avoid, 300);
      if (Array.isArray(msg.missed)) player.missed = cleanKeys(msg.missed, 100);
      if (player.name !== before) event = "update";
    }
    if (!player) {
      if (s.order.length >= ROOM_LIMITS.maxPlayers) return this.sendError(ws, "This room is full!");
      player = s.players[p.id] = {
        ...p, name: this.uniqueName(p.name), seat: this.newSeat(),
        score: 0, streak: 0, bestStreak: 0, correct: 0, lives: SOLO.lives,
        avoid: cleanKeys(msg.avoid, 300), missed: cleanKeys(msg.missed, 100),
        joinedAt: Date.now(), history: [], stickers: owned,
      };
      s.order.push(p.id);
      event = "join"; // joining late is fine: you just start with 0 points
    }
    if (Array.isArray(msg.showcase)) {
      player.pins = msg.showcase.filter((id) => typeof id === "string" && (player.stickers || []).includes(id)).slice(0, 3);
    }
    ws.serializeAttachment({ pid: p.id });
    this.save();

    if (s.kind === "solo" && s.phase === "lobby") return this.startGame();
    this.broadcast(event);
  }

  // ---------- the game loop ----------

  async startGame() {
    const s = this.s;
    const topic = TOPIC_BY_ID[s.topic];
    s.round += 1;
    s.seed = freshSeed();
    for (const id of s.order) {
      Object.assign(s.players[id], { score: 0, streak: 0, bestStreak: 0, correct: 0, lives: SOLO.lives, history: [] });
    }
    s.answers = [];
    s.qi = -1;
    s.hall = null;
    s.quit = false;
    if (s.kind === "room") {
      // Avoid questions ANY player has seen recently AND everything this room already asked in
      // earlier rounds, so rematches are fresh. Oldest first, so when a topic runs out the
      // questions asked longest ago come back first (see pickFresh in kit.js).
      const asked = (s.asked && s.asked[s.topic]) || [];
      const avoid = new Set([...s.order.flatMap((id) => s.players[id].avoid).slice(-800), ...asked]);
      const missed = new Set(s.order.flatMap((id) => s.players[id].missed).slice(-200));
      s.questions = buildGame(topic, { seed: s.seed, count: s.settings.count, levelSetting: s.settings.level, avoid, missed });
      s.asked = { ...(s.asked || {}), [s.topic]: [...asked.filter((k) => !s.questions.some((q) => q.key === k)), ...s.questions.map((q) => q.key)].slice(-600) };
      // Anonymous counts for the stats page: one more challenge game, and how many played.
      try {
        const stats = this.env.STATS.get(this.env.STATS.idFromName("global"));
        const n = this.connectedPids().size;
        stats.count("room_game", s.topic).catch(() => {});
        stats.count("room_players", s.topic, n).catch(() => {});
        stats.max("room_size", n).catch(() => {});
      } catch {}
    } else {
      s.questions = [];
    }
    // Count this game in each player's history, for the Explorer / Team Player / Party Host stickers.
    const here = this.connectedPids();
    for (const id of s.order) {
      if (!here.has(id)) continue;
      this.hall().recordPlay(id, s.topic, s.kind).then((h) => {
        const pl = this.s && this.s.players[id];
        if (!pl) return;
        const ids = stickersForStart({ kind: s.kind, isHost: id === s.hostId, players: here.size, topicsPlayed: h.topicsPlayed, allTopics: TOPICS.length, roomGames: h.roomGames });
        if (this.give(pl, ids)) { this.saveSoon(); this.broadcast("sticker"); }
      }).catch(() => {});
    }
    s.phase = "countdown";
    s.phaseAt = Date.now();
    s.deadline = s.phaseAt + COUNTDOWN_MS;
    await this.setWake(s.deadline, "go");
    this.broadcast("countdown");
  }

  async nextQuestion() {
    const s = this.s;
    const total = s.kind === "room" ? s.settings.count : SOLO.maxQuestions;
    const solo = s.kind === "solo" ? s.players[s.hostId] : null;
    if (s.qi + 1 >= total || (solo && solo.lives <= 0)) return this.finish();

    s.qi += 1;
    if (solo && !s.questions[s.qi]) this.prepareNextSolo(s.qi);
    s.answers[s.qi] = {};
    s.phase = "question";
    s.phaseAt = Date.now();
    s.deadline = s.phaseAt + s.settings.timer * 1000;
    await this.setWake(s.deadline + GRACE_MS, "timeup");
    this.broadcast("question");
  }

  async onAnswer(pid, msg) {
    const s = this.s;
    if (s.phase !== "question" || msg.q !== s.qi) return;
    const answers = s.answers[s.qi];
    if (answers[pid]) return; // one answer each, no take-backs
    const q = s.questions[s.qi];
    const choice = Number(msg.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) return;

    const now = Date.now();
    if (now > s.deadline + GRACE_MS) return;
    const limit = s.settings.timer * 1000;
    const serverMs = now - s.phaseAt;
    // Trust the browser's stopwatch a little (it doesn't include network lag),
    // but never more than 1.5s better than what the server saw.
    const clientMs = Number(msg.ms);
    let ms = Number.isFinite(clientMs) ? Math.min(serverMs, Math.max(clientMs, serverMs - 1500)) : serverMs;
    ms = Math.max(0, Math.min(limit, ms));

    const p = s.players[pid];
    const correct = choice === q.answer;
    p.streak = correct ? p.streak + 1 : 0;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    const points = scoreAnswer({ correct, msUsed: ms, timeLimitMs: limit, level: q.level, streak: p.streak });
    p.score += points;
    if (correct) p.correct += 1;
    if (!correct && s.kind === "solo") p.lives -= 1;
    answers[pid] = { choice, ms, correct, points, streak: p.streak };
    p.history.push({ key: q.key, correct });
    this.saveSoon();

    if (s.kind === "solo" || this.allAnswered()) return this.reveal();
    this.broadcast("answered");
  }

  allAnswered(leaving) {
    const s = this.s;
    const answers = s.answers[s.qi] || {};
    const here = this.connectedPids(leaving);
    return here.size > 0 && [...here].every((id) => answers[id]);
  }

  async timeUp() {
    if (this.s.phase !== "question") return;
    return this.reveal();
  }

  // Anyone who didn't answer (ran out of time, dropped out, joined late) gets a "timed out":
  // their streak resets and it counts as a miss, however the question ended.
  markUnanswered() {
    const s = this.s;
    const answers = s.answers[s.qi] || (s.answers[s.qi] = {});
    const q = s.questions[s.qi];
    for (const id of s.order) {
      if (answers[id]) continue;
      const p = s.players[id];
      p.streak = 0;
      if (s.kind === "solo") p.lives -= 1;
      answers[id] = { choice: -1, ms: s.settings.timer * 1000, correct: false, points: 0, streak: 0, timeout: true };
      p.history.push({ key: q.key, correct: false });
    }
  }

  async reveal() {
    const s = this.s;
    if (s.phase !== "question") return;
    this.markUnanswered();
    // Stickers for this question (streaks, speedy paws, topic master) - only now, at the reveal,
    // so a sticker popping up can't tell anyone who got it right before they see the answer.
    for (const id of s.order) {
      const a = (s.answers[s.qi] || {})[id], pl = s.players[id];
      if (a && !a.timeout) this.give(pl, stickersForAnswer({ topic: s.topic, correct: a.correct, streak: a.streak, ms: a.ms, correctSoFar: pl.correct }));
    }
    s.phase = "reveal";
    s.phaseAt = Date.now();
    const solo = s.kind === "solo";
    s.deadline = s.phaseAt + (solo ? SOLO_REVEAL_MS : ROOM_REVEAL_MS);
    if (solo) this.prepareNextSolo(); // make the next question now, so its pictures can load during the reveal
    await this.setWake(s.deadline, "advance");
    this.broadcast("reveal");
  }

  // Solo questions are made one at a time (the run is endless). index defaults to "the next one".
  prepareNextSolo(index = this.s.qi + 1) {
    const s = this.s, solo = s.players[s.hostId];
    if (!solo || s.questions[index] || index >= SOLO.maxQuestions) return;
    const used = new Set(s.questions.map((q) => q.key));
    s.questions[index] = buildQuestion(TOPIC_BY_ID[s.topic], {
      seed: s.seed, index, levelSetting: "ramp", total: SOLO.maxQuestions, used,
      avoid: new Set(solo.avoid), missed: new Set(solo.missed),
    });
  }

  async advance() {
    if (this.s.phase !== "reveal") return;
    return this.nextQuestion();
  }

  async finish() {
    const s = this.s;
    if (s.kind === "room") {
      const ranking = this.standings();
      ranking.forEach((id, i) => {
        const pl = s.players[id];
        this.give(pl, stickersForFinish({ kind: "room", rank: i + 1, players: ranking.length, score: pl.score, correct: pl.correct, count: s.qi + 1 }));
      });
    }
    // Save everyone's stickers once more (safe to repeat), in case an earlier save hiccuped.
    for (const id of s.order) {
      const pl = s.players[id];
      if (pl.stickers && pl.stickers.length) this.hall().award(id, pl.stickers).catch(() => {});
    }
    s.phase = "final";
    s.phaseAt = Date.now();
    s.deadline = null;
    await this.setWake(null);
    this.broadcast("final");

    if (s.kind === "solo") {
      const p = s.players[s.hostId];
      if (!p.history.length) {
        // Quit before answering anything: nothing to put on the board.
        s.hall = { skipped: true };
        this.save();
        this.broadcast("hall");
        return;
      }
      try {
        const hall = this.env.HALL.get(this.env.HALL.idFromName("global"));
        s.hall = await hall.submit({
          topic: s.topic, pid: p.id, name: p.name, emoji: p.emoji, color: p.color,
          score: p.score, correct: p.correct, answered: p.history.length,
        });
      } catch (err) {
        console.error("Hall of Fame submit failed", err);
        s.hall = { error: true };
      }
      this.save();
      this.broadcast("hall");
    }
  }

  async rematch() {
    const s = this.s;
    s.phase = "lobby";
    s.phaseAt = Date.now();
    s.questions = [];
    s.answers = [];
    s.qi = -1;
    for (const id of s.order) Object.assign(s.players[id], { score: 0, streak: 0, bestStreak: 0, correct: 0, history: [] });
    this.save();
    this.broadcast("rematch");
  }

  // ---------- timers (Durable Object alarms) ----------

  async setWake(at, what) {
    this.s.wake = at ? { at, what } : null;
    this.save();
    await this.scheduleAlarm();
  }

  async scheduleAlarm() {
    const at = this.s.wake ? this.s.wake.at : Date.now() + IDLE_TTL_MS;
    await this.ctx.storage.setAlarm(at);
  }

  async alarm() {
    const s = this.s;
    if (!s) return;
    const w = s.wake;
    if (w && Date.now() >= w.at - 25) {
      s.wake = null;
      if (w.what === "go") await this.nextQuestion();
      else if (w.what === "timeup") await this.timeUp();
      else if (w.what === "advance") await this.advance();
      if (!this.s.wake) await this.scheduleAlarm();
      return;
    }
    if (!w && Date.now() - s.lastActive >= IDLE_TTL_MS - 1000) {
      // Nobody has played for hours: say goodbye and free the room code.
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(4001, "Room closed"); } catch {} }
      this.s = null;
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.scheduleAlarm();
  }

  // ---------- sending state to browsers ----------

  connectedPids(except) {
    const out = new Set();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      const pid = (ws.deserializeAttachment() || {}).pid;
      if (pid) out.add(pid);
    }
    return out;
  }

  // The host runs the room. If they drop out, the next player in line takes over until they're back.
  effectiveHost(except) {
    const here = this.connectedPids(except);
    if (here.has(this.s.hostId)) return this.s.hostId;
    return this.s.order.find((id) => here.has(id)) || this.s.hostId;
  }

  hall() {
    return this.env.HALL.get(this.env.HALL.idFromName("global"));
  }

  // Give a player stickers they don't have yet (saved on the server for good).
  give(p, ids) {
    const fresh = ids.filter((id) => STICKER_BY_ID[id] && !(p.stickers || []).includes(id));
    if (!fresh.length) return false;
    p.stickers = [...(p.stickers || []), ...fresh];
    this.hall().award(p.id, fresh).catch(() => {});
    return true;
  }

  // Everyone in a room sees each other's public "seat" id, never the private player id
  // (the private one is like a password: it's what proves who you are).
  newSeat() {
    const b = new Uint8Array(6);
    crypto.getRandomValues(b);
    return "s" + [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 9);
  }

  seatOf(pid) {
    const p = this.s.players[pid];
    return p ? p.seat : null;
  }

  // How many people have the join link open but are still picking an avatar.
  choosingCount(except) {
    let n = 0;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      const a = ws.deserializeAttachment() || {};
      if (a.lurk && !a.pid) n++;
    }
    return n;
  }

  uniqueName(name, selfId) {
    const taken = new Set(this.s.order.filter((id) => id !== selfId).map((id) => this.s.players[id].name));
    if (!taken.has(name)) return name;
    for (let n = 2; ; n++) if (!taken.has(`${name} ${n}`)) return `${name} ${n}`;
  }

  standings() {
    const s = this.s;
    return s.order
      .map((id) => s.players[id])
      .sort((a, b) => b.score - a.score || b.correct - a.correct || a.joinedAt - b.joinedAt)
      .map((p) => p.id);
  }

  view(pid, event, except) {
    const s = this.s;
    const here = this.connectedPids(except);
    const q = s.questions[s.qi];
    const answers = s.answers[s.qi] || {};
    const showAnswers = s.phase === "reveal" || s.phase === "final";
    const ranking = this.standings();

    const players = s.order.map((id) => {
      const p = s.players[id];
      const a = answers[id];
      const out = {
        id: p.seat, name: p.name, emoji: p.emoji, color: p.color, score: p.score, streak: p.streak,
        correct: p.correct, connected: here.has(id), rank: ranking.indexOf(id) + 1,
        answered: !!a,
      };
      if (s.kind === "solo") out.lives = p.lives;
      // the stickers they show off: the ones they pinned, or else their 3 rarest
      out.stickers = p.pins && p.pins.length ? p.pins : showcase(p.stickers);
      if (showAnswers && a) out.last = { choice: a.choice, correct: a.correct, points: a.points, timeout: !!a.timeout };
      return out;
    });

    const view = {
      t: "state", event, kind: s.kind, code: s.code, me: this.seatOf(pid), hostId: this.seatOf(this.effectiveHost(except)),
      topic: topicCard(TOPIC_BY_ID[s.topic]), settings: s.settings, phase: s.phase, round: s.round,
      qi: s.qi, total: s.kind === "room" ? s.settings.count : null,
      phaseAt: s.phaseAt, deadline: s.deadline, serverNow: Date.now(),
      players,
      choosing: s.kind === "room" ? this.choosingCount(except) : 0,
      myStickers: (s.players[pid] && s.players[pid].stickers) || [],
      question: q && (s.phase === "question" || s.phase === "reveal") ? publicQuestion(q) : null,
      mine: answers[pid] ? { choice: answers[pid].choice } : null,
    };

    if (s.phase === "reveal" && q) {
      view.reveal = { answer: q.answer, fact: q.fact, labels: q.reveal || null, key: q.key, learn: q.learn, credits: q.credits || null };
      // 🐾 Fastest paw: the quickest right answer in the room
      let fast = null;
      for (const id of s.order) {
        const a = answers[id];
        if (a && a.correct && (!fast || a.ms < fast.ms)) fast = { seat: s.players[id].seat, ms: a.ms };
      }
      if (s.kind === "room" && fast) view.reveal.fastest = fast;
      // The next question's pictures (file names are scrambled, so this gives nothing away):
      // browsers load them now, during the reveal, so the next question pops up instantly.
      const nq = s.questions[s.qi + 1];
      if (nq) view.reveal.next = [nq.media && nq.media.img, ...nq.choices.map((c) => c.img)].filter(Boolean);
      view.mine = answers[pid] || null;
    }
    if (s.phase === "final") {
      const p = s.players[pid];
      const learned = [];
      if (p) {
        const missedKeys = new Set(p.history.filter((h) => !h.correct).map((h) => h.key));
        for (const qq of s.questions) if (missedKeys.has(qq.key) && qq.learn) learned.push(qq.learn);
      }
      view.final = {
        ranking: ranking.map((id) => this.seatOf(id)),
        asked: s.kind === "solo" && p ? p.history.length : s.qi + 1,
        quit: !!s.quit,
        me: p ? { score: p.score, correct: p.correct, bestStreak: p.bestStreak, history: p.history } : null,
        learned: learned.slice(0, 12),
        hall: s.kind === "solo" ? s.hall : null,
      };
    }
    return view;
  }

  broadcast(event, except) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      const a = ws.deserializeAttachment() || {};
      try {
        if (a.pid) ws.send(JSON.stringify(this.view(a.pid, event, except)));
        // Still picking an avatar: just a peek, so they know if the game has started.
        else if (a.lurk) ws.send(JSON.stringify({ t: "peek", phase: this.s.phase, players: this.s.order.length }));
      } catch {}
    }
  }

  sendError(ws, message) {
    try { ws.send(JSON.stringify({ t: "error", message })); ws.close(4002, message.slice(0, 100)); } catch {}
  }
}
