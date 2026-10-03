// 🎮 GAME ROOM - one of these runs for every game (a solo run or a challenge room).
//
// Why this keeps things fair:
//   - Questions AND answers live only here on the server. Browsers get the question
//     without the answer, and only find out after everyone has locked in.
//   - Everyone in a room gets the exact same questions at the same moment.
//   - The server times every answer and works out the points itself.
//   - Scores reach the Hall of Fame straight from here, never from a browser.

import { DurableObject } from "cloudflare:workers";
import { TOPIC_BY_ID, topicCard } from "./shared/topics/index.js";
import { freshSeed } from "./shared/rng.js";
import { buildGame, buildQuestion, publicQuestion } from "./shared/game.js";
import { SOLO, ROOM_LIMITS, scoreAnswer } from "./shared/scoring.js";
import { cleanPlayer, cleanKeys } from "./shared/names.js";

const COUNTDOWN_MS = 3500;        // "3, 2, 1, GO!"
const GRACE_MS = 700;             // a little wiggle room for slow Wi-Fi after the timer ends
const ROOM_REVEAL_MS = 9000;      // challenge: time to read the fact + see the scoreboard (host can skip)
const SOLO_REVEAL_MAX_MS = 60000; // solo: auto-continue if nobody taps "Next"
const IDLE_TTL_MS = 3 * 60 * 60 * 1000; // tidy up games nobody has touched for 3 hours

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    const row = this.sql.exec("SELECT v FROM kv WHERE k = 'state'").toArray()[0];
    this.s = row ? JSON.parse(row.v) : null;
    // Keep-alive pings get answered without waking the game up.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ka"}', '{"t":"ka"}'));
  }

  save() {
    this.s.lastActive = Date.now();
    this.sql.exec("INSERT OR REPLACE INTO kv (k, v) VALUES ('state', ?)", JSON.stringify(this.s));
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
    if (msg.t === "start" && this.s.phase === "lobby" && isHost) return this.startGame();
    if (msg.t === "next" && this.s.phase === "reveal" && (this.s.kind === "solo" || isHost)) return this.advance();
    if (msg.t === "rematch" && this.s.phase === "final" && isHost && this.s.kind === "room") return this.rematch();
  }

  async webSocketClose(ws) {
    if (!this.s) return;
    try { ws.close(); } catch {}
    // If everyone still here has answered, don't make them wait for the person who left.
    if (this.s.phase === "question" && this.allAnswered(ws)) return this.reveal();
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

  async onHello(ws, msg) {
    const p = cleanPlayer(msg.player);
    const s = this.s;
    if (!p) return this.sendError(ws, "Pick a nickname first!");
    if (s.kind === "solo" && p.id !== s.hostId) return this.sendError(ws, "This is someone else's game.");

    // Only one connection per player (e.g. if they opened two tabs).
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && (other.deserializeAttachment() || {}).pid === p.id) {
        try { other.send(JSON.stringify({ t: "replaced" })); other.close(4000, "Opened somewhere else"); } catch {}
      }
    }

    let player = s.players[p.id];
    let event = "rejoin";
    if (player && (s.phase === "lobby" || s.phase === "final")) {
      // Changed your avatar in the lobby? Update it (scores are only kept during a game).
      const before = player.name;
      Object.assign(player, { adj: p.adj, animal: p.animal, color: p.color, emoji: p.emoji, name: this.uniqueName(p.name, p.id) });
      if (player.name !== before) event = "update";
    }
    if (!player) {
      if (s.order.length >= ROOM_LIMITS.maxPlayers) return this.sendError(ws, "This room is full!");
      player = s.players[p.id] = {
        ...p, name: this.uniqueName(p.name),
        score: 0, streak: 0, bestStreak: 0, correct: 0, lives: SOLO.lives,
        avoid: cleanKeys(msg.avoid, 300), missed: cleanKeys(msg.missed, 100),
        joinedAt: Date.now(), history: [],
      };
      s.order.push(p.id);
      event = "join"; // joining late is fine: you just start with 0 points
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
      // Avoid questions ANY player in the room has seen recently, so it's fresh for everyone.
      const avoid = new Set(s.order.flatMap((id) => s.players[id].avoid).slice(-800));
      const missed = new Set(s.order.flatMap((id) => s.players[id].missed).slice(-200));
      s.questions = buildGame(topic, { seed: s.seed, count: s.settings.count, levelSetting: s.settings.level, avoid, missed });
    } else {
      s.questions = [];
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
    if (solo) {
      const topic = TOPIC_BY_ID[s.topic];
      const used = new Set(s.questions.map((q) => q.key));
      s.questions.push(buildQuestion(topic, {
        seed: s.seed, index: s.qi, levelSetting: "ramp", total, used,
        avoid: new Set(solo.avoid), missed: new Set(solo.missed),
      }));
    }
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
    this.save();

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
    const s = this.s;
    if (s.phase !== "question") return;
    const answers = s.answers[s.qi];
    const q = s.questions[s.qi];
    for (const id of s.order) {
      if (answers[id]) continue;
      const p = s.players[id];
      p.streak = 0;
      if (s.kind === "solo") p.lives -= 1;
      answers[id] = { choice: -1, ms: s.settings.timer * 1000, correct: false, points: 0, streak: 0, timeout: true };
      p.history.push({ key: q.key, correct: false });
    }
    return this.reveal();
  }

  async reveal() {
    const s = this.s;
    s.phase = "reveal";
    s.phaseAt = Date.now();
    const solo = s.kind === "solo";
    s.deadline = s.phaseAt + (solo ? SOLO_REVEAL_MAX_MS : ROOM_REVEAL_MS);
    await this.setWake(s.deadline, "advance");
    this.broadcast("reveal");
  }

  async advance() {
    if (this.s.phase !== "reveal") return;
    return this.nextQuestion();
  }

  async finish() {
    const s = this.s;
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
        id, name: p.name, emoji: p.emoji, color: p.color, score: p.score, streak: p.streak,
        correct: p.correct, connected: here.has(id), rank: ranking.indexOf(id) + 1,
        answered: !!a,
      };
      if (s.kind === "solo") out.lives = p.lives;
      if (showAnswers && a) out.last = { choice: a.choice, correct: a.correct, points: a.points, timeout: !!a.timeout };
      return out;
    });

    const view = {
      t: "state", event, kind: s.kind, code: s.code, me: pid, hostId: this.effectiveHost(except),
      topic: topicCard(TOPIC_BY_ID[s.topic]), settings: s.settings, phase: s.phase, round: s.round,
      qi: s.qi, total: s.kind === "room" ? s.settings.count : null,
      phaseAt: s.phaseAt, deadline: s.deadline, serverNow: Date.now(),
      players,
      choosing: s.kind === "room" ? this.choosingCount(except) : 0,
      question: q && (s.phase === "question" || s.phase === "reveal") ? publicQuestion(q) : null,
      mine: answers[pid] ? { choice: answers[pid].choice } : null,
    };

    if (s.phase === "reveal" && q) {
      view.reveal = { answer: q.answer, fact: q.fact, labels: q.reveal || null, key: q.key, learn: q.learn, credits: q.credits || null };
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
        ranking,
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
