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
    `);
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
