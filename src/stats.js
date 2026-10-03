// 📈 STATS - how many kids play, and how often. Private: only someone with the stats key can read it.
//
// Privacy first (it's a kids' site): we only ever store
//   - a random device id that the browser makes up (not a name, not an IP address, no cookies)
//   - the day it visited
//   - counts of games played per topic
// Nothing here can tell you WHO someone is.

import { DurableObject } from "cloudflare:workers";

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10); // "2026-10-03" (UTC)

export class Stats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS visits (day TEXT NOT NULL, vid TEXT NOT NULL, PRIMARY KEY (day, vid));
      CREATE TABLE IF NOT EXISTS firsts (vid TEXT PRIMARY KEY, day TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS counts (day TEXT NOT NULL, kind TEXT NOT NULL, topic TEXT NOT NULL, n INTEGER NOT NULL,
        PRIMARY KEY (day, kind, topic));
      CREATE TABLE IF NOT EXISTS maxes (day TEXT NOT NULL, kind TEXT NOT NULL, v INTEGER NOT NULL, PRIMARY KEY (day, kind));
    `);
  }

  // A device opened the site today.
  visit(vid) {
    const day = dayOf();
    this.sql.exec("INSERT OR IGNORE INTO visits (day, vid) VALUES (?, ?)", day, vid);
    this.sql.exec("INSERT OR IGNORE INTO firsts (vid, day) VALUES (?, ?)", vid, day);
    if (Math.random() < 0.01) this.sql.exec("DELETE FROM visits WHERE day < ?", dayOf(Date.now() - 400 * DAY));
  }

  // Something happened: kind = "solo" | "room_created" | "room_game" | "room_players", topic = "flags"...
  count(kind, topic = "", n = 1) {
    this.sql.exec(
      `INSERT INTO counts (day, kind, topic, n) VALUES (?, ?, ?, ?)
       ON CONFLICT (day, kind, topic) DO UPDATE SET n = n + excluded.n`, dayOf(), kind, topic, n,
    );
  }

  // Remember the biggest value of the day (e.g. the biggest challenge room).
  max(kind, v) {
    this.sql.exec(
      `INSERT INTO maxes (day, kind, v) VALUES (?, ?, ?)
       ON CONFLICT (day, kind) DO UPDATE SET v = MAX(v, excluded.v)`, dayOf(), kind, v,
    );
  }

  report(days = 30) {
    days = Math.max(7, Math.min(365, Number(days) || 30));
    const now = Date.now();
    const since = dayOf(now - (days - 1) * DAY);
    const one = (q, ...a) => this.sql.exec(q, ...a).one().n;
    const distinctSince = (d) => one("SELECT COUNT(DISTINCT vid) AS n FROM visits WHERE day >= ?", d);
    const last30 = dayOf(now - 29 * DAY);

    // one row per day, filled in so quiet days show as 0
    const series = [];
    for (let i = days - 1; i >= 0; i--) series.push({ day: dayOf(now - i * DAY), visitors: 0, newVisitors: 0, solo: 0, roomGames: 0, roomPlayers: 0 });
    const byDay = new Map(series.map((r) => [r.day, r]));
    for (const r of this.sql.exec("SELECT day, COUNT(*) AS n FROM visits WHERE day >= ? GROUP BY day", since)) byDay.get(r.day) && (byDay.get(r.day).visitors = r.n);
    for (const r of this.sql.exec("SELECT day, COUNT(*) AS n FROM firsts WHERE day >= ? GROUP BY day", since)) byDay.get(r.day) && (byDay.get(r.day).newVisitors = r.n);
    const topics = {};
    for (const r of this.sql.exec("SELECT day, kind, topic, n FROM counts WHERE day >= ?", since)) {
      const d = byDay.get(r.day);
      if (d && r.kind === "solo") d.solo += r.n;
      if (d && r.kind === "room_game") d.roomGames += r.n;
      if (d && r.kind === "room_players") d.roomPlayers += r.n;
      if (r.topic) {
        const t = (topics[r.topic] = topics[r.topic] || { solo: 0, roomGames: 0, roomPlayers: 0 });
        if (r.kind === "solo") t.solo += r.n;
        if (r.kind === "room_game") t.roomGames += r.n;
        if (r.kind === "room_players") t.roomPlayers += r.n;
      }
    }

    // "how often": how many different days each device came back in the last 30 days
    const freq = { once: 0, twice: 0, threeToSix: 0, sevenPlus: 0 };
    for (const r of this.sql.exec("SELECT COUNT(*) AS d FROM visits WHERE day >= ? GROUP BY vid", last30)) {
      if (r.d >= 7) freq.sevenPlus++; else if (r.d >= 3) freq.threeToSix++; else if (r.d === 2) freq.twice++; else freq.once++;
    }

    const roomGames = series.reduce((s, r) => s + r.roomGames, 0);
    const roomPlayers = series.reduce((s, r) => s + r.roomPlayers, 0);
    return {
      generatedAt: new Date(now).toISOString(),
      days,
      today: distinctSince(dayOf(now)),
      last7: distinctSince(dayOf(now - 6 * DAY)),
      last30: distinctSince(last30),
      allTime: one("SELECT COUNT(*) AS n FROM firsts"),
      regulars: freq.threeToSix + freq.sevenPlus, // came back on 3+ different days in the last 30
      frequency: freq,
      games: { solo: series.reduce((s, r) => s + r.solo, 0), roomGames, avgRoomSize: roomGames ? +(roomPlayers / roomGames).toFixed(1) : 0,
        biggestRoom: one("SELECT COALESCE(MAX(v), 0) AS n FROM maxes WHERE kind = 'room_size' AND day >= ?", since) },
      topics,
      series,
    };
  }
}
