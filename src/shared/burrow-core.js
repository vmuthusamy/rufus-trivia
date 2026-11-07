// 🕳️ THE BURROW - where one player's coins and cards are kept. (Foxes really do bury spare food for later!)
//
// This is the logic. src/burrow.js wraps it in a Durable Object: one burrow per player, so two
// things can't happen to the same wallet at the same moment. It's kept separate from Cloudflare
// so `npm test` can run it against a real SQLite database.
//
// Three rules keep the wallet honest:
//   - Paying for a game twice pays once (each game has a row in `paid`).
//   - Buying with the same nonce twice buys once, and gives back the same pack.
//   - A pack is rolled and saved BEFORE the browser sees it, so refreshing can't re-roll it
//     and bad Wi-Fi can't lose it. Unopened packs just wait for you.

import { CARD_BY_ID, ECONOMY, PACKS, STARTER, creditToday, dayOf, rollPack } from "./cards.js";

import { packAvailability } from "../../public/js/pack-availability.js";

// Good random numbers from the server (Math.random is fine for games, not for what's in a pack).
function strongRandom() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] / 4294967296;
}

export class BurrowCore {
  // sql: { exec(query, ...values) }, transaction: run a function all-or-nothing
  constructor(sql, transaction, { now = Date.now, random = strongRandom } = {}) {
    this.sql = sql;
    this.transaction = transaction;
    this.now = now;
    this.random = random;
    sql.exec(`
      CREATE TABLE IF NOT EXISTS wallet (
        k INTEGER PRIMARY KEY CHECK (k = 1),
        coins INTEGER NOT NULL DEFAULT 0,
        day TEXT NOT NULL DEFAULT '',
        today INTEGER NOT NULL DEFAULT 0,
        featured TEXT,
        since TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, n INTEGER NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS paid (game TEXT PRIMARY KEY, coins INTEGER NOT NULL, credited INTEGER NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS packs (
        id TEXT PRIMARY KEY, nonce TEXT NOT NULL UNIQUE, pack TEXT NOT NULL, cards TEXT NOT NULL,
        at INTEGER NOT NULL, opened INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS coin_adjustments (game TEXT PRIMARY KEY, coins INTEGER NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS coin_migrations (id TEXT PRIMARY KEY);
    `);
    this.restoreLimitedCoins();
  }

  // Give back only amounts proved by old game receipts, once, without changing cards or purchases.
  restoreLimitedCoins() {
    this.transaction(() => {
      if (this.sql.exec("SELECT id FROM coin_migrations WHERE id = ?", "no-daily-limit-v1").toArray().length) return;
      const owed = this.sql.exec("SELECT game, coins - credited AS amount, at FROM paid WHERE coins > credited").toArray();
      const total = owed.reduce((n, r) => n + r.amount, 0);
      const w = this.row();
      if (total && w) {
        const now = this.now(), day = dayOf(now);
        const today = (w.day === day ? w.today : 0) + owed.filter((r) => dayOf(r.at) === day).reduce((n, r) => n + r.amount, 0);
        for (const r of owed) this.sql.exec("INSERT INTO coin_adjustments (game, coins, at) VALUES (?, ?, ?)", r.game, r.amount, now);
        this.sql.exec("UPDATE wallet SET coins = coins + ?, day = ?, today = ? WHERE k = 1", total, day, today);
        this.sql.exec("UPDATE paid SET credited = coins WHERE coins > credited");
      }
      this.sql.exec("INSERT INTO coin_migrations (id) VALUES (?)", "no-daily-limit-v1");
    });
  }

  row() { return this.sql.exec("SELECT * FROM wallet WHERE k = 1").toArray()[0] || null; }

  // A brand new player: an empty wallet, and the starter card so they've got something to show.
  ensure() {
    const have = this.row();
    if (have) return have;
    this.sql.exec("INSERT INTO wallet (k, featured) VALUES (1, ?)", STARTER);
    this.addCard(STARTER);
    return this.row();
  }

  addCard(id) {
    this.sql.exec(
      `INSERT INTO cards (id, n, at) VALUES (?, 1, ?)
       ON CONFLICT (id) DO UPDATE SET n = n + 1`, id, this.now(),
    );
  }

  owned() {
    return Object.fromEntries(this.sql.exec("SELECT id, n FROM cards").toArray().map((c) => [c.id, c.n]));
  }

  packView(row) {
    return { id: row.id, pack: row.pack, cards: JSON.parse(row.cards), opened: !!row.opened };
  }

  // Everything the Card House needs. Reading is free, so opening the page never costs a write
  // once the wallet exists.
  state() {
    return this.transaction(() => {
      const w = this.ensure();
      return {
        coins: w.coins,
        day: dayOf(this.now()),
        // Receipts explain the difference between answer rewards and spendable coins.
        earned: this.sql.exec("SELECT COALESCE(SUM(credited), 0) AS n FROM paid").toArray()[0].n,
        restored: this.sql.exec("SELECT COALESCE(SUM(coins), 0) AS n FROM coin_adjustments").toArray()[0].n,
        recentGames: this.sql.exec("SELECT coins AS earned, credited, at FROM paid ORDER BY at DESC LIMIT 5").toArray(),
        today: w.day === dayOf(this.now()) ? w.today : 0,
        limit: ECONOMY.dailyCoins,
        cards: this.owned(),
        featured: w.featured,
        unopened: this.sql.exec("SELECT * FROM packs WHERE opened = 0 ORDER BY at").toArray().map((r) => this.packView(r)),
      };
    });
  }

  // The card shown next to this player's name. No wallet yet? They'd start with the starter card.
  featured() {
    const w = this.row();
    return (w && w.featured) || STARTER;
  }

  // GameRoom pays for a finished game. Paying the same game again changes nothing and gives the same receipt.
  settle({ game, coins }) {
    if (typeof game !== "string" || !game || game.length > 100) return { ok: false };
    if (!Number.isSafeInteger(coins) || coins < 0) return { ok: false };
    return this.transaction(() => {
      const w = this.ensure();
      const seen = this.sql.exec("SELECT coins, credited FROM paid WHERE game = ?", game).toArray()[0];
      if (seen) {
        return { ok: true, replay: true, earned: seen.coins, credited: seen.credited, capped: seen.coins - seen.credited, coins: w.coins, today: w.day === dayOf(this.now()) ? w.today : 0, limit: ECONOMY.dailyCoins };
      }
      const t = creditToday(w, coins, this.now());
      const total = w.coins + t.credited;
      if (!Number.isSafeInteger(total)) return { ok: false };
      this.sql.exec("UPDATE wallet SET coins = ?, day = ?, today = ? WHERE k = 1", total, t.day, t.today);
      this.sql.exec("INSERT INTO paid (game, coins, credited, at) VALUES (?, ?, ?, ?)", game, coins, t.credited, this.now());
      // Keep the receipt: a delayed room retry must never pay for an old game again.
      return { ok: true, earned: coins, credited: t.credited, capped: t.capped, coins: total, today: t.today, limit: ECONOMY.dailyCoins };
    });
  }

  // Buy a pack. Everything in here happens together, or not at all.
  buy({ pack, nonce }) {
    if (typeof pack !== "string" || !Object.hasOwn(PACKS, pack)) return { ok: false, error: "That pack doesn't exist." };
    if (typeof nonce !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(nonce)) return { ok: false, error: "Try that again." };
    return this.transaction(() => {
      const w = this.ensure();
      const seen = this.sql.exec("SELECT * FROM packs WHERE nonce = ?", nonce).toArray()[0];
      if (seen) return { ok: true, replay: true, pack: this.packView(seen), coins: w.coins, cards: this.owned() }; // a double tap
      // Recover an existing purchase above even after the event ends. Only NEW buys are gated.
      const availability = packAvailability(PACKS[pack], this.now());
      if (availability !== "open") return { ok: false, error: availability === "upcoming" ? "This seasonal pack is not available yet." : "This seasonal event has ended. Your collected cards are still yours." };
      if (w.coins < ECONOMY.packPrice) return { ok: false, short: ECONOMY.packPrice - w.coins, coins: w.coins };

      const since = JSON.parse(w.since);
      const roll = rollPack(pack, this.owned(), since[pack] || {}, this.random);
      const have = this.owned();
      const cards = roll.cards.map((id) => {
        const fresh = !have[id];
        have[id] = (have[id] || 0) + 1;
        this.addCard(id);
        return { id, fresh };
      });
      const id = nonce + "-" + Math.floor(this.random() * 1e9).toString(36);
      this.sql.exec("INSERT INTO packs (id, nonce, pack, cards, at) VALUES (?, ?, ?, ?, ?)", id, nonce, pack, JSON.stringify(cards), this.now());
      const left = w.coins - ECONOMY.packPrice;
      this.sql.exec("UPDATE wallet SET coins = ?, since = ? WHERE k = 1", left, JSON.stringify({ ...since, [pack]: roll.since }));
      // Keep the nonce receipt even after opening; delayed retries must return this same purchase.
      return { ok: true, pack: { id, pack, cards, opened: false }, coins: left, cards: have };
    });
  }

  // The player has seen what was inside.
  opened({ id }) {
    if (typeof id !== "string" || id.length > 120) return { ok: false };
    this.sql.exec("UPDATE packs SET opened = 1 WHERE id = ?", id);
    return { ok: true };
  }

  // Pick the card to show off. Only one you own.
  feature({ card }) {
    if (typeof card !== "string" || !Object.hasOwn(CARD_BY_ID, card)) return { ok: false };
    return this.transaction(() => {
      this.ensure();
      if (!this.owned()[card]) return { ok: false };
      this.sql.exec("UPDATE wallet SET featured = ? WHERE k = 1", card);
      return { ok: true, featured: card };
    });
  }
}
