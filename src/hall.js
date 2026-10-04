// 🏆 HALL OF FAME - one shared scoreboard, stored in this Durable Object's own SQLite database.
// Only GameRoom (on the server) can submit scores, so nobody can post a fake score from their browser.

import { DurableObject } from "cloudflare:workers";
import { ADJECTIVES, ANIMALS, nameKey } from "./shared/names.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const NAME_KEEP = 365 * 24 * 60 * 60 * 1000; // a name nobody has played with for a year is free again
const LOCK_MS = 15 * 60 * 1000;
const FUN_WINDOW = 10 * 60 * 1000; // speed limit window for Rufus fun stickers (see awardFun)
const ANIMAL_BY_EMOJI = Object.fromEntries(ANIMALS.map(([name, emoji]) => [emoji, name]));

// A name key kids can read out and type: "comet-otter-473".
function newNameCode() {
  const b = new Uint32Array(3);
  crypto.getRandomValues(b);
  return `${ADJECTIVES[b[0] % ADJECTIVES.length]}-${ANIMALS[b[1] % ANIMALS.length][0]}-${100 + (b[2] % 900)}`.toLowerCase();
}
// "Comet Otter 473" and "comet-otter-473" are the same key.
const cleanCode = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export class HallOfFame extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL, pid TEXT NOT NULL,
        name TEXT NOT NULL, emoji TEXT NOT NULL, color TEXT NOT NULL,
        score INTEGER NOT NULL, correct INTEGER NOT NULL, answered INTEGER NOT NULL,
        created INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS runs_topic_score ON runs (topic, score DESC);
      CREATE INDEX IF NOT EXISTS runs_topic_pid ON runs (topic, pid);
      CREATE TABLE IF NOT EXISTS stickers (pid TEXT NOT NULL, id TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (pid, id));
      CREATE TABLE IF NOT EXISTS played (pid TEXT NOT NULL, topic TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL,
        PRIMARY KEY (pid, topic, kind));
      CREATE TABLE IF NOT EXISTS devices (dev TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS names (
        nkey TEXT PRIMARY KEY, pid TEXT NOT NULL, nick TEXT NOT NULL, look TEXT NOT NULL, code TEXT NOT NULL,
        at INTEGER NOT NULL, fails INTEGER NOT NULL DEFAULT 0, fail_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS names_pid ON names (pid);
    `);
  }

  // ---------- one-of-a-kind names ----------
  // The first player to use a typed-in name ("Arvind") keeps it, so nobody else can show up
  // on the leaderboard or in a challenge room as them. The owner gets a secret name key
  // ("comet-otter-473") to be the same player on another device.
  // Returns { ok: true, key, fresh } or { ok: false, taken: true }.
  claimName(pid, { nick, adj, animal, color }) {
    const nkey = nameKey(nick);
    if (!nkey) return { ok: true };
    const now = Date.now();
    const row = this.sql.exec("SELECT pid, code, at FROM names WHERE nkey = ?", nkey).toArray()[0];
    if (row && row.pid !== pid && row.at > now - NAME_KEEP) return { ok: false, taken: true };
    const mine = row && row.pid === pid;
    const code = mine ? row.code : newNameCode();
    this.sql.exec("DELETE FROM names WHERE pid = ? AND nkey != ?", pid, nkey); // one name per player
    this.sql.exec(
      `INSERT INTO names (nkey, pid, nick, look, code, at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (nkey) DO UPDATE SET pid = excluded.pid, nick = excluded.nick, look = excluded.look, code = excluded.code, at = excluded.at`,
      nkey, pid, nick, JSON.stringify({ adj, animal, color }), code, now,
    );
    if (!mine) this.unnameOthers(pid, nkey);
    return { ok: true, key: code, fresh: !mine };
  }

  // Anyone else already on the board with this name (from before it was claimed) becomes a mystery animal.
  unnameOthers(pid, nkey) {
    const rows = this.sql.exec("SELECT DISTINCT pid, name, emoji FROM runs WHERE pid != ?", pid).toArray();
    for (const r of rows) {
      if (nameKey(r.name) !== nkey) continue;
      this.sql.exec("UPDATE runs SET name = ? WHERE pid = ? AND name = ?", `Mystery ${ANIMAL_BY_EMOJI[r.emoji] || "Fox"}`, r.pid, r.name);
    }
  }

  // My reserved name and its key (only asked for with my private player id).
  myName(pid) {
    const row = this.sql.exec("SELECT nick, code FROM names WHERE pid = ?", pid).toArray()[0];
    return row ? { nick: row.nick, key: row.code } : {};
  }

  // "It's me!": the right name key gives back that player, so this device can play as them.
  // 5 wrong guesses locks the name for 15 minutes, so a key can't be guessed by trying lots.
  unlockName(nick, code) {
    const nkey = nameKey(nick);
    const row = nkey && this.sql.exec("SELECT * FROM names WHERE nkey = ?", nkey).toArray()[0];
    if (!row) return { ok: false, reason: "Nobody has that name yet, so you can just use it!" };
    const now = Date.now();
    if (row.fails >= 5 && now - row.fail_at < LOCK_MS) return { ok: false, reason: "Too many tries! Wait 15 minutes, then try again." };
    if (cleanCode(code) !== row.code) {
      const fails = now - row.fail_at < LOCK_MS ? row.fails + 1 : 1;
      this.sql.exec("UPDATE names SET fails = ?, fail_at = ? WHERE nkey = ?", fails, now, nkey);
      return { ok: false, reason: "That key doesn't match. Check it on your other device!" };
    }
    this.sql.exec("UPDATE names SET fails = 0, at = ? WHERE nkey = ?", now, nkey);
    return { ok: true, player: { id: row.pid, ...JSON.parse(row.look), nick: row.nick } };
  }

  // A player walking into a room: their stickers, and whether they may use their typed-in name.
  welcome(pid, named, wantStickers) {
    return {
      stickers: wantStickers ? this.stickers(pid) : [],
      name: named ? this.claimName(pid, named) : null,
    };
  }

  // ---------- stickers (achievements) ----------
  // A player's stickers, in the order they earned them.
  stickers(pid) {
    return this.sql.exec("SELECT id FROM stickers WHERE pid = ? ORDER BY at, id", pid).toArray().map((r) => r.id);
  }

  // Same, with when each one was earned (for the sticker book).
  stickerDetails(pid) {
    return this.sql.exec("SELECT id, at FROM stickers WHERE pid = ? ORDER BY at, id", pid).toArray();
  }

  // ---------- "remember me": a device's players, backed up so Safari wiping storage doesn't lose them ----------
  getDevice(dev) {
    const row = this.sql.exec("SELECT data FROM devices WHERE dev = ?", dev).toArray()[0];
    return row ? JSON.parse(row.data) : null;
  }

  saveDevice(dev, data) {
    this.sql.exec("INSERT OR REPLACE INTO devices (dev, data, at) VALUES (?, ?, ?)", dev, JSON.stringify(data), Date.now());
  }

  award(pid, ids) {
    for (const id of ids) this.sql.exec("INSERT OR IGNORE INTO stickers (pid, id, at) VALUES (?, ?, ?)", pid, id, Date.now());
  }

  // 🦊 Rufus fun stickers, sent by a browser (the worker has already checked they're only fun ones).
  // Asking twice is fine: you just get it once. Returns which ones are new, and the whole collection.
  // A little speed limit stops anyone hammering it: 10 tries per player, and 40 per connection (who),
  // every 10 minutes. The counts only live in memory and are forgotten after that.
  awardFun(pid, ids, who) {
    const now = Date.now();
    this.funTries = this.funTries || new Map();
    for (const [k, v] of this.funTries) if (now - v.since > FUN_WINDOW) this.funTries.delete(k);
    const limits = [["p:" + pid, 10], ["w:" + who, 40]].map(([k, max]) => [this.funTries.get(k) || { k, n: 0, since: now }, max]);
    if (limits.some(([t, max]) => t.n >= max)) return { ok: false, slow: true };
    for (const [t] of limits) { t.n += 1; this.funTries.set(t.k, t); }
    const had = new Set(this.stickers(pid));
    const fresh = ids.filter((id) => !had.has(id));
    this.award(pid, fresh);
    return { ok: true, fresh, stickers: this.stickers(pid) };
  }

  // Count a game someone played; returns what we need for "Explorer" and "Team Player".
  // current = the topics you can play today (retired ones like Space Explorer don't count towards Explorer).
  recordPlay(pid, topic, kind, current) {
    this.sql.exec(
      `INSERT INTO played (pid, topic, kind, n) VALUES (?, ?, ?, 1)
       ON CONFLICT (pid, topic, kind) DO UPDATE SET n = n + 1`, pid, topic, kind,
    );
    const played = this.sql.exec("SELECT DISTINCT topic FROM played WHERE pid = ?", pid).toArray().map((r) => r.topic);
    return {
      topicsPlayed: played.filter((t) => !current || current.includes(t)).length,
      roomGames: this.sql.exec("SELECT COALESCE(SUM(n), 0) AS n FROM played WHERE pid = ? AND kind = 'room'", pid).one().n,
    };
  }

  bestOf(topic, pid, since = 0) {
    return this.sql.exec(
      "SELECT MAX(score) AS best FROM runs WHERE topic = ? AND pid = ? AND created >= ?", topic, pid, since,
    ).one().best;
  }

  rankOf(topic, score, since = 0) {
    return 1 + this.sql.exec(
      `SELECT COUNT(*) AS n FROM (
         SELECT MAX(score) AS s FROM runs WHERE topic = ? AND created >= ? GROUP BY pid
       ) WHERE s > ?`, topic, since, score,
    ).one().n;
  }

  // Called by GameRoom when a solo run ends.
  submit(run) {
    const now = Date.now();
    const prevBest = this.bestOf(run.topic, run.pid) ?? 0;
    this.sql.exec(
      `INSERT INTO runs (topic, pid, name, emoji, color, score, correct, answered, created)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      run.topic, run.pid, run.name, run.emoji, run.color, run.score, run.correct, run.answered, now,
    );
    const best = Math.max(prevBest, run.score);
    const players = this.sql.exec("SELECT COUNT(DISTINCT pid) AS n FROM runs WHERE topic = ?", run.topic).one().n;
    const result = {
      score: run.score,
      prevBest,
      best,
      newBest: run.score > prevBest,
      rank: this.rankOf(run.topic, best),
      weekRank: this.rankOf(run.topic, this.bestOf(run.topic, run.pid, now - WEEK) ?? 0, now - WEEK),
      runRank: this.rankOf(run.topic, run.score),
      players,
    };
    if (Math.random() < 0.05) this.prune(now);
    return result;
  }

  // Top 10 for a topic. period: "all" or "week".
  top(topic, period, pid) {
    const since = period === "week" ? Date.now() - WEEK : 0;
    const rows = this.sql.exec(
      `SELECT pid, name, emoji, color, MAX(score) AS score, correct, created
       FROM runs WHERE topic = ? AND created >= ?
       GROUP BY pid ORDER BY score DESC, created ASC LIMIT 10`, topic, since,
    ).toArray();
    const myBest = pid ? this.bestOf(topic, pid, since) : null;
    return {
      topic, period,
      rows: rows.map((r) => ({ name: r.name, emoji: r.emoji, color: r.color, score: r.score, correct: r.correct, me: r.pid === pid })),
      me: myBest == null ? null : { best: myBest, rank: this.rankOf(topic, myBest, since) },
    };
  }

  // A player changed their name or avatar: update every score they already have on the board.
  rename({ pid, name, emoji, color }) {
    const res = this.sql.exec("UPDATE runs SET name = ?, emoji = ?, color = ? WHERE pid = ?", name, emoji, color, pid);
    return { updated: res.rowsWritten };
  }

  // Keep the table small: old runs that aren't anybody's personal best can go.
  prune(now) {
    this.sql.exec(
      `DELETE FROM runs WHERE created < ? AND id NOT IN (
         SELECT id FROM (SELECT id, MAX(score) FROM runs GROUP BY topic, pid)
       )`, now - 2 * WEEK,
    );
  }
}
