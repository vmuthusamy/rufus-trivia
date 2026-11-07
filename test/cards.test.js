// The rules for coins, packs and cards. These protect the decisions the family made:
// rarity belongs to cards, and Legendary is the hardest thing to find.
import test from "node:test";
import assert from "node:assert/strict";
import { CARDS, CARD_BY_ID, ECONOMY, PACKS, RARITIES, STARTER, coinsFor, creditToday, dayOf, drawTable, publicCards, rollPack } from "../src/shared/cards.js";
import { ART, BACK, COIN, PACK_ART } from "../public/js/card-art.js";

// Same recipe every run, so a failure can be reproduced.
function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("the confirmed Character pack: every rarity as the family decided", () => {
  const rarity = (id) => CARD_BY_ID[id].rarity;
  assert.equal(rarity("renard"), "common");
  assert.equal(rarity("marthina"), "rare");
  assert.equal(rarity("fiery"), "epic");
  assert.equal(rarity("felix"), "epic");
  assert.equal(rarity("rufus"), "divine");
  assert.equal(rarity("family"), "legendary");
  assert.equal(CARD_BY_ID.marthina.name, "Martina");
});

test("Flag cards inherit character rarity, with the World Poster Legendary", () => {
  const tiers = { Renard: "common", Martina: "rare", Fiery: "epic", Felix: "epic", Rufus: "divine" };
  assert.equal(CARD_BY_ID.poster.rarity, "legendary");
  const odds = Object.fromEntries(drawTable("flag"));
  assert.equal(odds.poster, 0.5);
  for (const c of CARDS.filter((x) => x.pack === "flag" && x.rarity !== "legendary")) {
    assert.equal(c.rarity, tiers[c.name.split(" ")[0]], c.id);
    if (c.rarity === "divine") {
      assert.equal(odds[c.id], 1);
      assert.ok(!PACKS.flag.newCards.includes(c.id));
    }
  }
});

test("every card belongs to a pack that exists (a new pack needs an entry in PACKS)", () => {
  for (const c of CARDS) assert.ok(PACKS[c.pack], `${c.id} is in pack "${c.pack}": add it to PACKS in cards.js`);
  for (const p of Object.values(PACKS)) {
    assert.ok(CARDS.some((c) => c.pack === p.id), `${p.id} has no cards`);
    assert.ok(p.safety && p.odds && p.newCards.length, `${p.id} needs safety, odds and newCards`);
    for (const id of p.newCards) assert.equal(CARD_BY_ID[id].pack, p.id);
  }
});

test("a distinct pack never has the same card twice", () => {
  const random = seeded(5);
  for (const id of Object.keys(PACKS).filter((k) => PACKS[k].distinct)) {
    for (let i = 0; i < 500; i++) {
      const { cards } = rollPack(id, {}, {}, random);
      assert.equal(new Set(cards).size, cards.length, id);
    }
  }
});

test("every card has real artwork", () => {
  for (const c of CARDS) assert.ok(ART[c.id] && ART[c.id].length > 50, `${c.id} has no picture`);
  for (const id of Object.keys(PACKS)) assert.ok(PACK_ART[id], `pack ${id} has no picture`);
  assert.ok(BACK && COIN);
});

test("the card pictures never use a quiz flag file, so they can't become an answer key", () => {
  for (const [id, html] of Object.entries({ ...ART, ...PACK_ART })) {
    assert.ok(!/\/f\/[0-9a-z]+\.svg/.test(html), `${id} uses a quiz flag file`);
  }
});

test("/api/meta's card list has names and odds, but no pictures", () => {
  const text = JSON.stringify(publicCards());
  assert.ok(!text.includes("/f/"));
  assert.ok(!text.includes("data:image"));
  assert.ok(!text.includes("<svg"));
});

test("each pack's odds add up to 100, and rarer means less likely", () => {
  for (const id of Object.keys(PACKS)) {
    const sum = drawTable(id).reduce((a, [, chance]) => a + chance, 0);
    assert.ok(Math.abs(sum - 100) < 1e-9, `${id} adds up to ${sum}`);
  }
  const odds = Object.fromEntries(drawTable("char"));
  assert.ok(odds.renard > odds.marthina && odds.marthina > odds.fiery && odds.fiery > odds.rufus && odds.rufus > odds.family);
  assert.equal(odds.fiery, odds.felix);
});

test("no pack is named after a rarity, and packs never guarantee Divine or Legendary", () => {
  const names = Object.values(RARITIES).map((r) => r.label.toLowerCase());
  for (const p of Object.values(PACKS)) {
    assert.ok(!names.some((n) => p.title.toLowerCase().includes(n)), p.title);
    for (const id of p.newCards) {
      assert.ok(!["divine", "legendary"].includes(CARD_BY_ID[id].rarity), `${id} can't be a guaranteed new card`);
    }
  }
});

test("rarer cards always have a bigger safety number, so Legendary stays hardest", () => {
  const { safety } = PACKS.char;
  assert.ok(safety.family > safety.rufus);
});

test("a pack has the right number of cards, sorted rarest last, and one new card while any are missing", () => {
  const random = seeded(2);
  const owned = { [STARTER]: 1 };
  const rank = (id) => (CARD_BY_ID[id].rarity ? RARITIES[CARD_BY_ID[id].rarity].n : 0);
  for (let i = 0; i < 2000; i++) {
    const missing = PACKS.char.newCards.filter((id) => !owned[id]);
    const { cards } = rollPack("char", owned, {}, random);
    assert.equal(cards.length, ECONOMY.cardsPerPack);
    assert.ok(cards.every((c, k) => k === 0 || rank(cards[k - 1]) <= rank(c)));
    if (missing.length) assert.ok(cards.some((c) => missing.includes(c)));
    if (i % 400 === 399) for (const c of cards) owned[c] = (owned[c] || 0) + 1;
  }
});

// Play `players` kids from an empty collection, and note when each first finds a card.
function playMany(players, seed) {
  const random = seeded(seed);
  const out = [];
  for (let p = 0; p < players; p++) {
    const owned = {};
    let since = {}, packs = 0, rufus = 0, family = 0;
    while (!rufus || !family) {
      packs += 1;
      const r = rollPack("char", owned, since, random);
      since = r.since;
      for (const c of r.cards) owned[c] = (owned[c] || 0) + 1;
      if (!rufus && owned.rufus) rufus = packs;
      if (!family && owned.family) family = packs;
    }
    out.push({ rufus, family });
  }
  return out;
}

test("Legendary is harder to find than Divine for typical, unlucky and unluckiest players", () => {
  const runs = playMany(4000, 3);
  const at = (key, q) => runs.map((r) => r[key]).sort((a, b) => a - b)[Math.floor(runs.length * q)];
  assert.ok(at("family", 0.5) > at("rufus", 0.5), "typical player");
  assert.ok(at("family", 0.9) > at("rufus", 0.9), "unlucky player");
  const worst = (key) => Math.max(...runs.map((r) => r[key]));
  assert.ok(worst("rufus") <= PACKS.char.safety.rufus, "nobody waits forever for Rufus");
  assert.ok(worst("family") <= PACKS.char.safety.family, "nobody waits forever for the family");
  const first = runs.filter((r) => r.family < r.rufus).length / runs.length;
  assert.ok(first < 0.34, `an early lucky Legendary is fine, but it can't be the normal way: ${first}`);
});

test("the safety rule can give both Rufus and the family in one pack, and never replaces the new card", () => {
  const owned = Object.fromEntries(PACKS.char.newCards.slice(0, 3).map((id) => [id, 1]));
  const { cards, since } = rollPack("char", owned, { rufus: 39, family: 79 }, seeded(4));
  assert.ok(cards.includes("rufus") && cards.includes("family"));
  assert.ok(cards.includes(PACKS.char.newCards[3]), "the guaranteed new card is still there");
  assert.deepEqual([since.rufus, since.family], [0, 0]);
});

test("finding a card by luck starts its safety count again", () => {
  const { cards, since } = rollPack("char", { renard: 1, marthina: 1, fiery: 1, felix: 1 }, { family: 10 }, () => 0.992);
  assert.ok(cards.includes("family"));
  assert.equal(since.family, 0);
});

test("coins come from right answers only", () => {
  assert.equal(coinsFor(0), 0);
  assert.equal(coinsFor(7), 7 * ECONOMY.coinsPerRight);
  assert.equal(coinsFor(-3), 0);
  assert.equal(coinsFor(undefined), 0);
});

test("earnings have no daily cap; a new day only resets the daily counter", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const day = dayOf(now);
  assert.deepEqual(creditToday({ day, today: 250 }, 100, now), { day, today: 350, credited: 100, capped: 0 });
  assert.deepEqual(creditToday({ day: "2026-10-31", today: 300 }, 100, now), { day, today: 100, credited: 100, capped: 0 });
  assert.deepEqual(creditToday({ day, today: 3000 }, 40, now).credited, 40);
});


test("distinct packs cannot duplicate even when the random source repeats a value", () => {
  for (const p of Object.values(PACKS).filter((p) => p.distinct)) {
    const owned = Object.fromEntries(CARDS.filter((c) => c.pack === p.id).map((c) => [c.id, 1]));
    for (const n of [0, 0.5, 0.999999]) {
      const { cards } = rollPack(p.id, owned, {}, () => n);
      assert.equal(new Set(cards).size, ECONOMY.cardsPerPack);
    }
    assert.equal(publicCards().packs.find((x) => x.id === p.id).distinct, true);
  }
});

test("duplicate lucky Divine or Legendary cards cannot block the other guarantee", () => {
  const owned = { renard: 1, marthina: 1, fiery: 1 }; // the first slot must keep Felix
  for (const n of [0.99, 0.999]) {
    const { cards, since } = rollPack("char", owned, { rufus: 39, family: 79 }, () => n);
    assert.deepEqual(new Set(cards), new Set(["felix", "rufus", "family"]));
    assert.equal(since.rufus, 0); assert.equal(since.family, 0);
  }
});

test("themed catalogues include a Legendary alongside the original five rarities", () => {
  for (const packId of ["adventure", "math", "space", "diwali"]) {
    const cards = CARDS.filter((c) => c.pack === packId);
    assert.deepEqual(cards.map((c) => c.rarity).sort(), ["common", "divine", "epic", "epic", "legendary", "rare"]);
    const odds = Object.fromEntries(drawTable(packId));
    for (const c of cards) assert.equal(odds[c.id], { common: 40, rare: 35, epic: 11.75, divine: 1, legendary: 0.5 }[c.rarity]);
    const divine = cards.find((c) => c.rarity === "divine").id;
    assert.ok(!PACKS[packId].newCards.includes(divine), "new-card guarantee excludes Divine");
    assert.equal(PACKS[packId].safety[divine], 40);
    const owned = Object.fromEntries(cards.map((c) => [c.id, 1]));
    const result = rollPack(packId, owned, { [divine]: 39 }, () => 0);
    assert.ok(result.cards.includes(divine), "Divine backstop still applies");
    assert.equal(new Set(result.cards).size, 3, "the backstop preserves distinct cards");
  }
});
