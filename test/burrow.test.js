// The wallet, on a real SQLite database: nothing here may pay twice, spend twice or lose a pack.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { BurrowCore } from "../src/shared/burrow-core.js";
import { ECONOMY, STARTER, PACKS, dayOf } from "../src/shared/cards.js";

// Make node:sqlite look like a Durable Object's storage.sql.
function burrow({ now, random } = {}) {
  const db = new DatabaseSync(":memory:");
  const sql = {
    exec(query, ...values) {
      if (!values.length && query.includes(";")) { db.exec(query); return { toArray: () => [] }; }
      const stmt = db.prepare(query);
      if (/^\s*(SELECT)/i.test(query)) return { toArray: () => stmt.all(...values).map((r) => ({ ...r })) };
      stmt.run(...values);
      return { toArray: () => [] };
    },
  };
  // All-or-nothing, like ctx.storage.transactionSync.
  const transaction = (fn) => {
    db.exec("BEGIN");
    try { const out = fn(); db.exec("COMMIT"); return out; } catch (err) { db.exec("ROLLBACK"); throw err; }
  };
  return new BurrowCore(sql, transaction, { now, random });
}

const nonce = (n) => "nonce-test-" + n;

test("a new player has no coins and the starter card, which is featured", () => {
  const b = burrow();
  const s = b.state();
  assert.equal(s.coins, 0);
  assert.deepEqual(s.cards, { [STARTER]: 1 });
  assert.equal(s.featured, STARTER);
  assert.equal(b.state().cards[STARTER], 1, "looking again doesn't give another copy");
});

test("paying the same game twice pays once, and gives back the same receipt", () => {
  const b = burrow();
  const first = b.settle({ game: "game-1", coins: 70 });
  const again = b.settle({ game: "game-1", coins: 70 });
  assert.equal(first.coins, 70);
  assert.equal(again.coins, 70);
  assert.equal(again.replay, true);
  assert.equal(again.credited, first.credited);
  assert.equal(b.state().coins, 70);
});

test("coins keep earning past 300; next day resets only the daily counter", () => {
  let t = Date.parse("2026-11-01T10:00:00Z");
  const b = burrow({ now: () => t });
  assert.equal(b.settle({ game: "a", coins: 250 }).credited, 250);
  const over = b.settle({ game: "b", coins: 100 });
  assert.equal(over.credited, 100);
  assert.equal(over.capped, 0);
  assert.equal(b.settle({ game: "c", coins: 50 }).credited, 50, "all coins count");
  t = Date.parse("2026-11-02T01:00:00Z");
  assert.equal(b.state().today, 0, "a new day");
  assert.equal(b.settle({ game: "d", coins: 50 }).credited, 50);
  assert.equal(b.state().coins, 450);
});

test("settle refuses nonsense", () => {
  const b = burrow();
  for (const bad of [{ game: "", coins: 10 }, { game: "x", coins: -5 }, { game: "x", coins: 1.5 }, { game: "x", coins: Number.MAX_SAFE_INTEGER + 1 }, { coins: 10 }]) {
    assert.equal(b.settle(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(b.state().coins, 0);
});

test("you can't buy a pack you can't afford", () => {
  const b = burrow();
  b.settle({ game: "g", coins: ECONOMY.packPrice - 10 });
  const r = b.buy({ pack: "char", nonce: nonce(1) });
  assert.equal(r.ok, false);
  assert.equal(r.short, 10);
  assert.equal(b.state().coins, ECONOMY.packPrice - 10);
  assert.equal(b.state().unopened.length, 0);
});

test("a double tap buys one pack, and gives back the same pack", () => {
  const b = burrow();
  b.settle({ game: "g", coins: 250 });
  const first = b.buy({ pack: "char", nonce: nonce(2) });
  const again = b.buy({ pack: "char", nonce: nonce(2) });
  assert.equal(first.ok, true);
  assert.equal(again.replay, true);
  assert.deepEqual(again.pack, first.pack);
  assert.equal(b.state().coins, 250 - ECONOMY.packPrice);
  const copies = Object.values(b.state().cards).reduce((a, n) => a + n, 0);
  assert.equal(copies, 1 + ECONOMY.cardsPerPack, "starter + one pack");
});

test("a pack is saved before you see it: it waits, unopened, until you say you've seen it", () => {
  const b = burrow();
  b.settle({ game: "g", coins: 100 });
  const { pack } = b.buy({ pack: "flag", nonce: nonce(3) });
  const waiting = b.state().unopened;
  assert.equal(waiting.length, 1);
  assert.deepEqual(waiting[0].cards, pack.cards, "a refresh can't re-roll it");
  assert.deepEqual(b.opened({ id: pack.id }), { ok: true });
  assert.equal(b.state().unopened.length, 0);
});

test("the first pack's new card really is new, and its cards are in the collection", () => {
  const b = burrow();
  b.settle({ game: "g", coins: 100 });
  const { pack, cards } = b.buy({ pack: "char", nonce: nonce(4) });
  assert.ok(pack.cards.some((c) => c.fresh), "at least one new card");
  for (const c of pack.cards) assert.ok(cards[c.id] >= 1);
});

test("you can only feature a card you own", () => {
  const b = burrow();
  assert.equal(b.feature({ card: "family" }).ok, false);
  assert.equal(b.feature({ card: "not-a-card" }).ok, false);
  assert.equal(b.state().featured, STARTER);
  b.settle({ game: "g", coins: 100 });
  const { pack } = b.buy({ pack: "flag", nonce: nonce(5) });
  const mine = pack.cards[0].id;
  assert.deepEqual(b.feature({ card: mine }), { ok: true, featured: mine });
  assert.equal(b.featured(), mine);
});

test("someone with no wallet yet shows the starter card, without a wallet being made for them", () => {
  const b = burrow();
  assert.equal(b.featured(), STARTER);
  assert.equal(b.row(), null);
});

test("the Legendary safety rule survives between packs", () => {
  // A random number that never gives a rare card: only the safety rules can.
  const day = dayOf(Date.parse("2026-11-01T10:00:00Z"));
  let t = Date.parse(`${day}T10:00:00Z`);
  const b = burrow({ now: () => t, random: () => 0.1 });
  let saw = null, n = 0;
  while (!saw && n < 100) {
    n += 1;
    t += 24 * 60 * 60 * 1000;
    b.settle({ game: "g" + n, coins: 100 });
    const { pack } = b.buy({ pack: "char", nonce: nonce("s" + n) });
    if (pack.cards.some((c) => c.id === "family")) saw = n;
  }
  assert.equal(saw, 80);
});


test("a delayed purchase or payout retry stays idempotent after more than a week", () => {
  let t = Date.parse("2026-11-01T10:00:00Z");
  const b = burrow({ now: () => t, random: () => 0.01 });
  b.settle({ game: "original-game", coins: 200 });
  const first = b.buy({ pack: "char", nonce: nonce("old") });
  b.opened({ id: first.pack.id });
  t += 10 * 86400000;
  b.settle({ game: "new-game", coins: 100 });
  b.buy({ pack: "math", nonce: nonce("new") });
  const before = b.state();
  assert.equal(b.settle({ game: "original-game", coins: 200 }).replay, true);
  const replay = b.buy({ pack: "char", nonce: nonce("old") });
  assert.equal(replay.replay, true);
  assert.equal(replay.pack.id, first.pack.id);
  assert.deepEqual(b.state(), before);
});


test("object property names are not valid packs or owned cards", () => {
  const b = burrow(); b.settle({ game: "valid-game", coins: 200 });
  for (const id of ["__proto__", "constructor", "toString", ["char"]]) {
    assert.equal(b.buy({ pack: id, nonce: nonce("invalid") }).ok, false);
    assert.equal(b.feature({ card: id }).ok, false);
  }
  assert.equal(b.state().coins, 200);
  assert.equal(b.featured(), STARTER);
});

test("shop history explains a 410-coin run after 230 saved and two packs", () => {
  let t = Date.parse("2026-11-01T12:00:00Z");
  const b = burrow({ now: () => t, random: () => 0.1 });
  b.settle({ game: "first", coins: 70 }); t++;
  b.settle({ game: "second", coins: 160 }); t++;
  b.buy({ pack: "flag", nonce: nonce("one") });
  b.buy({ pack: "flag", nonce: nonce("two") }); t++;
  const receipt = b.settle({ game: "long-run", coins: 410 });
  assert.equal(receipt.credited, 410);
  const w = b.state();
  assert.equal(w.coins, 440);
  assert.equal(w.earned, 640);
  assert.equal(w.earned - w.coins, 200);
  assert.equal(w.today, 640);
  assert.equal(w.day, "2026-11-01");
  assert.deepEqual(w.recentGames[0], { earned: 410, credited: 410, at: t });
  assert.equal(b.settle({ game: "long-run", coins: 410 }).credited, 410);
  assert.equal(b.state().coins, 440, "a receipt retry must not pay again");
});

test("old daily-cap receipts restore missing coins once, preserving purchases and cards", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const b = burrow({ now: () => now, random: () => 0.1 });
  b.settle({ game: "before", coins: 230 });
  b.buy({ pack: "flag", nonce: nonce("restore-one") });
  b.buy({ pack: "flag", nonce: nonce("restore-two") });
  // A database from before the change: 410 earned, but only 70 credited.
  b.sql.exec("INSERT INTO paid (game, coins, credited, at) VALUES (?, ?, ?, ?)", "old-limited", 410, 70, now);
  b.sql.exec("UPDATE wallet SET coins = 100, today = 300 WHERE k = 1");
  b.sql.exec("DELETE FROM coin_migrations");
  const cards = b.owned();
  const migrated = new BurrowCore(b.sql, b.transaction, { now: () => now });
  assert.equal(migrated.state().coins, 440);
  assert.equal(migrated.state().restored, 340);
  assert.equal(migrated.state().today, 640);
  assert.deepEqual(migrated.owned(), cards);
  assert.equal(migrated.state().unopened.length, 2);
  assert.equal(migrated.settle({ game: "old-limited", coins: 410 }).credited, 410);
  const again = new BurrowCore(b.sql, b.transaction, { now: () => now });
  assert.equal(again.state().coins, 440, "restarting and retrying cannot restore twice");
  assert.equal(again.sql.exec("SELECT COUNT(*) AS n FROM coin_adjustments").toArray()[0].n, 1);
});

test("restoring yesterday's withheld coins does not count them as earned today", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const b = burrow({ now: () => now - 86400000 });
  b.settle({ game: "yesterday", coins: 500 });
  b.sql.exec("UPDATE paid SET credited = 300");
  b.sql.exec("UPDATE wallet SET coins = 300, today = 300 WHERE k = 1");
  b.sql.exec("DELETE FROM coin_migrations");
  const migrated = new BurrowCore(b.sql, b.transaction, { now: () => now });
  assert.equal(migrated.state().coins, 500);
  assert.equal(migrated.state().today, 0);
  assert.equal(migrated.state().restored, 200);
  assert.equal(migrated.settle({ game: "today", coins: 2500 }).credited, 2500);
  assert.equal(migrated.state().coins, 3000, "long games also earn all their coins");
});


test("seasonal purchases obey the server clock, retain receipts and never delete owned cards", () => {
  const start = Date.parse(PACKS.diwali.season.startsAt), end = Date.parse(PACKS.diwali.season.endsAt);
  let now = start - 1;
  const b = burrow({ now: () => now, random: () => 0.5 });
  b.settle({ game: "diwali-test", coins: 500 });
  assert.equal(b.buy({ pack: "diwali", nonce: nonce("early") }).ok, false);
  assert.equal(b.state().coins, 500);
  now = start;
  const first = b.buy({ pack: "diwali", nonce: nonce("season") });
  assert.equal(first.ok, true);
  assert.equal(b.state().coins, 400);
  now = end - 1;
  assert.equal(b.buy({ pack: "diwali", nonce: nonce("last-minute") }).ok, true);
  const before = b.state();
  now = end;
  assert.equal(b.buy({ pack: "diwali", nonce: nonce("too-late") }).ok, false);
  assert.equal(b.state().coins, before.coins);
  assert.deepEqual(b.state().cards, before.cards);
  const retry = b.buy({ pack: "diwali", nonce: nonce("season") });
  assert.equal(retry.replay, true);
  assert.deepEqual(retry.pack, first.pack);
  assert.equal(b.opened({ id: first.pack.id }).ok, true);
  assert.equal(b.feature({ card: first.pack.cards[0].id }).ok, true);
  assert.equal(b.buy({ pack: "char", nonce: nonce("permanent") }).ok, true);
});

for (const p of Object.values(PACKS).filter(p => p.season)) {
  test(`${p.id}: saved profile, featured card and unopened pack survive expiry and a worker restart`, () => {
    let now = Date.parse(p.season.startsAt);
    const b = burrow({ now: () => now, random: () => 0.5 });
    b.settle({ game: "seasonal-earnings", coins: 500 });
    const bought = b.buy({ pack: p.id, nonce: nonce(p.id) });
    assert.equal(bought.ok, true);
    const chosen = bought.pack.cards[0].id;
    assert.equal(b.feature({ card: chosen }).ok, true);
    const before = b.state();
    now = Date.parse(p.season.endsAt) + 365 * 86400000;
    const restarted = new BurrowCore(b.sql, b.transaction, { now: () => now });
    assert.deepEqual(restarted.state().cards, before.cards);
    assert.equal(restarted.featured(), chosen);
    assert.deepEqual(restarted.state().unopened, before.unopened);
    assert.equal(restarted.buy({ pack: p.id, nonce: nonce("late-" + p.id) }).ok, false);
    assert.equal(restarted.state().coins, before.coins);
    assert.equal(restarted.buy({ pack: p.id, nonce: nonce(p.id) }).replay, true);
    assert.equal(restarted.opened({ id: bought.pack.id }).ok, true);
    for (const c of bought.pack.cards) assert.equal(restarted.feature({ card: c.id }).ok, true);
    assert.deepEqual(restarted.state().cards, before.cards);
  });
}
