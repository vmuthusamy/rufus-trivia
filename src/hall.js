// 🏆 HALL OF FAME - one shared scoreboard, stored in this Durable Object's own SQLite database.
// Only GameRoom (on the server) can submit scores, so nobody can post a fake score from their browser.

import { DurableObject } from "cloudflare:workers";

const WEEK = 7 * 24 * 60 * 60 * 1000;

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
    `);
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

  // Count a game someone played; returns what we need for "Explorer" and "Team Player".
  recordPlay(pid, topic, kind) {
    this.sql.exec(
      `INSERT INTO played (pid, topic, kind, n) VALUES (?, ?, ?, 1)
       ON CONFLICT (pid, topic, kind) DO UPDATE SET n = n + 1`, pid, topic, kind,
    );
    return {
      topicsPlayed: this.sql.exec("SELECT COUNT(DISTINCT topic) AS n FROM played WHERE pid = ?", pid).one().n,
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
