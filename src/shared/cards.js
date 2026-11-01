// 🃏 RUFUS CARDS - the collectible cards, the packs they come in, and Rufus Coins.
//
// How it works:
//   - Right answers earn Rufus Coins (the server counts them, so they can't be faked).
//   - Coins buy packs. A pack is a theme; rarity belongs to each card, not to the pack.
//   - Cards are just for fun: they never change scores, timing or answers.
//
// Want to change how the game feels? Every number lives in ECONOMY or PACKS below.
// Try changing one, then run `npm test` and refresh!
//
// The pictures are in public/js/card-art.js (made by `npm run build:cards`).
// Nothing in here is a picture on purpose: this list goes to every browser in /api/meta,
// so it must never pair a country's name with a /f/ flag file (that would be the Flag Frenzy answer key).

import { CARD_LIST } from "./data/card-list.js";

export const RARITIES = {
  common: { label: "Common", n: 1 },
  rare: { label: "Rare", n: 2 },
  epic: { label: "Epic", n: 3 },
  divine: { label: "Divine", n: 4 },
  legendary: { label: "Legendary", n: 5 },
};

export const ECONOMY = {
  coinsPerRight: 10, // earned for each right answer
  dailyCoins: null,  // no daily limit: every right answer earns coins
  packPrice: 100,
  cardsPerPack: 3,
};

// The cards themselves: { id, pack, name, rarity, story? }. rarity: null = not decided yet.
// They're designed in the prototype, and copied here by `npm run build:cards`.
export const CARDS = CARD_LIST;

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const idsIn = (pack) => CARDS.filter((c) => c.pack === pack).map((c) => c.id);

// New five-card sets use the same rarity weights. These are base draw odds, not whole-pack odds.
function themedPackRules(packId) {
  const ids = idsIn(packId);
  const weights = { common: 40, rare: 35, epic: 12, divine: 1 };
  return {
    odds: Object.fromEntries(ids.map((id) => [id, weights[CARD_BY_ID[id].rarity]])),
    newCards: ids.filter((id) => ["common", "rare", "epic"].includes(CARD_BY_ID[id].rarity)),
    safety: Object.fromEntries(ids.filter((id) => CARD_BY_ID[id].rarity === "divine").map((id) => [id, 40])),
    distinct: true,
  };
}

// Flag rarity follows the character, never the country. Keep each Rufus at 1% and the poster at 0.5%.
function flagPackRules() {
  const ids = idsIn("flag");
  const grouped = (rarity) => ids.filter((id) => CARD_BY_ID[id].rarity === rarity);
  const epicTotal = 100 - 40 - 35 - grouped("divine").length - 0.5;
  return {
    odds: Object.fromEntries(ids.map((id) => {
      const rarity = CARD_BY_ID[id].rarity;
      const weight = rarity === "legendary" ? 0.5 : rarity === "divine" ? 1
        : ({ common: 40, rare: 35, epic: epicTotal }[rarity] / grouped(rarity).length);
      return [id, weight];
    })),
    newCards: ids.filter((id) => ["common", "rare", "epic"].includes(CARD_BY_ID[id].rarity)),
  };
}

// The card everyone starts with, so every player has something to show off.
export const STARTER = "renard";

// A pack:
//   kind:     what to call its cards while they have no rarity yet
//   odds:     % chance per card. Cards not listed share whatever is left, equally.
//   newCards: one card in every pack is a NEW one from this list, until you own them all.
//             Never put a Divine or Legendary here: with only 6 cards they'd turn up in about 3 packs!
//   safety:   "if you still haven't seen this card after this many packs, the next pack has it".
//             Legendary has a longer maximum wait; lucky draws can still give it before Divine.
//   distinct: true = never the same card twice in one pack
export const PACKS = {
  char: {
    id: "char", title: "Rufus Family Pack", theme: "The Rufus family, in their real game designs.",
    odds: { renard: 40, marthina: 35, fiery: 11.75, felix: 11.75, rufus: 1, family: 0.5 },
    newCards: ["renard", "marthina", "fiery", "felix"],
    safety: { rufus: 40, family: 80 },
  },
  flag: {
    id: "flag", title: "Flags of the World Pack", theme: "Rufus and friends holding the flags of the world.",
    kind: "Flag adventure", ...flagPackRules(),
    safety: { poster: 80 },
  },
  adventure: {
    id: "adventure", title: "Family Adventures Pack", theme: "Cosy days with all five friends.",
    kind: "Family adventure", ...themedPackRules("adventure"),
  },
  math: {
    id: "math", title: "Math Club Pack", theme: "Number trains, fraction feasts and clever little puzzles.",
    kind: "Math Club", ...themedPackRules("math"),
  },
  space: {
    id: "space", title: "Space Explorers Pack", theme: "Moon visits, rocket rides and a sky full of stars.",
    kind: "Space Explorer", ...themedPackRules("space"),
  },
};

// Coins for a game. Only right answers count: speed and luck don't.
export const coinsFor = (correct) => Math.max(0, Math.floor(correct) || 0) * ECONOMY.coinsPerRight;

// The day a player's daily coins belong to (the same "day" as the stats page: midnight UTC).
export const dayOf = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

// Count today’s earnings for history. Every earned coin is credited.
export function creditToday({ day, today }, coins, now = Date.now()) {
  const d = dayOf(now);
  const before = day === d ? today : 0;
  const credited = Math.max(0, coins);
  return { day: d, today: before + credited, credited, capped: coins - credited };
}

// Each card's chance per normal draw: the listed odds, with the rest shared equally.
export function drawTable(packId) {
  const pack = PACKS[packId];
  const ids = idsIn(packId);
  const listed = ids.filter((id) => id in pack.odds);
  const others = ids.filter((id) => !(id in pack.odds));
  const left = 100 - listed.reduce((sum, id) => sum + pack.odds[id], 0);
  return ids.map((id) => [id, id in pack.odds ? pack.odds[id] : left / others.length]);
}

function drawOne(table, random) {
  let r = random() * table.reduce((total, [, weight]) => total + weight, 0);
  for (const [id, chance] of table) { r -= chance; if (r < 0) return id; }
  return table[0][0];
}

const rank = (id) => (CARD_BY_ID[id].rarity ? RARITIES[CARD_BY_ID[id].rarity].n : 0);

// Open a pack (server only: the browser never rolls).
//   owned: { cardId: copies }, since: { cardId: packs since you last saw it }
//   random: a function giving 0 up to 1 (a test can pass its own)
// Returns the cards, rarest last so the best one is revealed at the end, and the new `since` counts.
export function rollPack(packId, owned = {}, since = {}, random = Math.random) {
  const pack = PACKS[packId];
  const table = drawTable(packId);
  const missing = pack.newCards.filter((id) => !owned[id]);
  const draw = () => {
    // Draw from the remaining cards instead of retrying: even repeated random values cannot duplicate one.
    const available = pack.distinct ? table.filter(([id]) => !cards.includes(id)) : table;
    return drawOne(available, random);
  };
  const cards = [];
  cards.push(missing.length ? missing[Math.floor(random() * missing.length)] : draw());
  while (cards.length < ECONOMY.cardsPerPack) cards.push(draw());

  // The safety rule swaps a card in, rarest card first. It never replaces the new-card slot (the first),
  // and never replaces another safety card: that would throw away a lucky find.
  const next = { ...since };
  const safest = Object.entries(pack.safety).sort((a, b) => rank(b[0]) - rank(a[0]));
  const freeSlot = () => {
    for (let k = cards.length - 1; k > 0; k--) {
      // Keep one copy of a lucky/safety card, but a duplicate can make room for the other guarantee.
      if (!(cards[k] in pack.safety) || cards.indexOf(cards[k]) !== k) return k;
    }
    return -1;
  };
  for (const [id, after] of safest) {
    next[id] = (since[id] || 0) + 1;
    if (next[id] >= after && !cards.includes(id)) {
      const k = freeSlot();
      if (k > 0) cards[k] = id;
    }
    if (cards.includes(id)) next[id] = 0;
  }
  return { cards: cards.sort((a, b) => rank(a) - rank(b)), since: next };
}

// What every browser may know: names, rarities and odds. No pictures, so no answers.
export const publicCards = () => ({
  rarities: RARITIES,
  economy: ECONOMY,
  starter: STARTER,
  cards: CARDS,
  packs: Object.values(PACKS).map((p) => ({
    id: p.id, title: p.title, theme: p.theme, kind: p.kind || null, ids: idsIn(p.id), safety: p.safety,
    odds: Object.fromEntries(drawTable(p.id)), newCards: p.newCards, distinct: !!p.distinct,
  })),
});
