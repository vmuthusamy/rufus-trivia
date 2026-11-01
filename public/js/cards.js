// 🃏 THE CARD HOUSE - coins, packs and your collection, in the browser.
//
// The server decides everything (see src/shared/burrow-core.js): what's in a pack, how many coins
// you have, which cards you own. This file only shows it, like the rest of the game.
//
// The pictures live in card-art.js, which is big, so it's only loaded when a card is about to be shown.
// Everything here uses "rc-" class names (cards.css) so it can't clash with app.css.

import { spriteSVG } from "./sprites.js";
import { pendingCoins } from "./coin-display.js";
import { pendingOrders } from "./pack-orders.js";

const $ = (id) => document.getElementById(id);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const coinIcon = `<span class="rc-coin" aria-hidden="true">${spriteSVG("paw")}</span>`;

let d = null;        // things app.js shares with us (see initCards)
let art = null;      // the pictures, once they've loaded
let artLoad = null;
const orders = pendingOrders(() => localStorage);
const pendingPurchase = (pid) => orders.get(pid, C().packs.map((p) => p.id));
const keepPurchase = (pid, order) => orders.set(pid, order);

// What we know from the server, and which room of the house we're looking at.
const W = { pid: null, wallet: null, loading: null, request: 0, receipt: null, error: false };
const V = { view: "house", room: "cards", filter: "all", pack: "char", sel: null, bought: null, flipped: [], busy: false };

const C = () => d.S.meta.cards;
const card = (id) => C().cards.find((c) => c.id === id);
const pack = (id) => C().packs.find((p) => p.id === id);
const owned = (id) => (W.wallet && W.wallet.cards[id]) || 0;
const label = (c) => (c.rarity ? C().rarities[c.rarity].label : "Rarity not assigned");
const rank = (c) => (c.rarity ? C().rarities[c.rarity].n : 0);

function loadArt() {
  artLoad = artLoad || import("./card-art.js").then((m) => { art = m; return m; }).catch((error) => { artLoad = null; throw error; });
  return artLoad;
}

// ---------- drawing a card ----------
function stampsHTML(ids) {
  if (!ids || !ids.length) return "";
  const emoji = ids.map((id) => d.stickerInfo(id)).filter(Boolean).map((s) => `<i class="rc-stamp">${s.emoji}</i>`).join("");
  return `<span class="rc-stamps" aria-hidden="true">${emoji}</span>`;
}

// The same card everywhere. live: true lets a Divine or Legendary card shimmer (a few at a time, never whole grids).
function cardHTML(id, { stamps, live } = {}) {
  const c = card(id);
  if (!c) return "";
  const r = c.rarity || "plain";
  const gems = c.rarity ? `<span class="rc-gems" aria-hidden="true">${"◆".repeat(C().rarities[c.rarity].n)}</span>` : "";
  return `<span class="rc-cq"><span class="rc-card rc-${r}${live ? " rc-live" : ""}" role="img" aria-label="${c.name}, ${label(c)}">
    <span class="rc-frame"></span>
    <span class="rc-face">
      ${r === "legendary" ? `<span class="rc-ribbon">Legendary</span>` : ""}
      <span class="rc-art">${art.ART[id] || ""}${stampsHTML(stamps)}</span>
      <span class="rc-name">${c.name}</span>
      <span class="rc-rar">${gems}<span>${label(c)}</span></span>
    </span>
  </span></span>`;
}

const packHTML = (id) => `<span class="rc-pack rc-p-${id}"><span class="rc-crimp"></span><span class="rc-pk-art">${art.PACK_ART[id] || ""}</span><span class="rc-pk-name">${pack(id).title.replace(" Pack", "")}</span><span class="rc-crimp"></span></span>`;

// A small card for the lobby, the podium and the Hall of Fame. Pictures load the first time one is needed.
export function cardThumb(id) {
  const box = document.createElement("span");
  box.className = "rc-thumb";
  const c = d.S.meta && card(id);
  if (!c) return box;
  box.title = `${c.name} · ${label(c)}`;
  const fill = () => { box.innerHTML = cardHTML(id); };
  if (art) fill(); else loadArt().then(fill).catch(() => {});
  return box;
}

// Unowned library entries have a cover. The artwork is shown only after choosing Preview.
function coveredCardHTML(c) {
  return `<span class="rc-cq"><span class="rc-card rc-covered">
    <span class="rc-cover-rarity rc-tier-${c.rarity || "unknown"}"><span aria-hidden="true">${c.rarity ? "◆".repeat(C().rarities[c.rarity].n) : "◇"}</span> ${label(c)}</span>
    <span class="rc-covered-symbol" aria-hidden="true">🦊</span>
    <strong>${c.name}</strong><span class="rc-covered-state">Not collected</span>
    <span class="rc-preview-action">Preview card ↗</span>
  </span></span>`;
}

// ---------- the wallet ----------
function renderWallet() {
  const chip = $("meCoins");
  if (!chip) return;
  const on = !!(d.S.profile && W.wallet);
  // Keep the door visible while loading. A missing wallet is not a zero balance.
  chip.classList.toggle("hidden", !d.S.profile);
  $("meCoinsN").textContent = W.error ? "Retry" : on ? W.wallet.coins.toLocaleString() : "…";
  chip.setAttribute("aria-label", W.error ? "Coins unavailable: retry in Card House" : on ? "My Rufus Coins: open the Card House" : "Loading Rufus Coins: open the Card House");
  const collection = $("meCards"), home = $("cardsBtn");
  collection.classList.toggle("hidden", !d.S.profile);
  if (!on) {
    collection.textContent = "🃏";
    collection.setAttribute("aria-label", "Open the Card House");
  }
  if (on) {
    const have = C().cards.filter((c) => (W.wallet.cards[c.id] || 0) > 0).length;
    collection.textContent = `🃏 ${have}`;
    collection.setAttribute("aria-label", `My card collection: ${have} of ${C().cards.length} collected`);
    home.textContent = `🃏 Cards · ${have} / ${C().cards.length}`;
  } else {
    home.textContent = "🃏 Card House";
  }
}

async function loadWallet() {
  const request = ++W.request;
  const p = d.S.profile;
  if (!p) { W.pid = null; W.wallet = null; renderWallet(); return null; }
  const pid = p.id;
  W.error = false;
  renderWallet();
  W.loading = d.post("/api/burrow", { player: d.playerPayload() })
    .then((w) => { if (request === W.request && d.S.profile?.id === pid) { W.pid = pid; W.wallet = w; renderWallet(); } return w; })
    .catch(() => {
      if (request === W.request && d.S.profile?.id === pid) { W.error = true; renderWallet(); }
      return null;
    });
  return W.loading;
}

// A different player sat down: show their coins, not the last player's.
export function walletFor(profile) {
  if (profile ? profile.id !== W.pid : W.pid) { W.wallet = null; W.error = false; renderWallet(); loadWallet(); }
}

// Refresh the visible balance without interrupting a pack reveal or keyboard focus.
async function refreshWallet() {
  const w = await loadWallet();
  if (w && d.S.screen === "cards" && V.view === "house" && !V.busy) {
    const active = document.activeElement;
    const act = active?.dataset.rc, id = active?.dataset.id;
    render(false);
    if (act) $("cardsRoot").querySelector(`[data-rc="${act}"]${id ? `[data-id="${id}"]` : ""}`)?.focus({ preventScroll: true });
  }
}

// Leaving results can happen before the payment receipt arrives over the socket.
export function refreshCoinsAfterGame(st) {
  refreshWallet();
  if (st?.phase === "final" && st.coins && !st.final?.coins) {
    const pid = d.S.profile?.id;
    for (const delay of [1000, 3000, 10000]) setTimeout(() => {
      if (d.S.profile?.id === pid && !d.S.g && !V.busy) refreshWallet();
    }, delay);
  }
}

// ---------- in a game ----------
export function showHudCoins(st) {
  const box = $("hudCoins");
  if (!box) return;
  if (st.phase !== "final") W.receipt = null;
  box.classList.toggle("hidden", !st.coins);
  const pending = pendingCoins(st.coins || 0);
  const text = "Pending";
  const n = String(pending);
  box.setAttribute("aria-label", `${pending} pending Rufus Coins, saved at game end.`);
  box.querySelector("small").textContent = text;
  const b = box.querySelector("b");
  if (b.textContent !== n) { b.textContent = n; box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
}

// Results screen: what this game earned. The receipt arrives a moment after the results do.
export function showFinalCoins(st) {
  const box = $("finalCoins");
  if (!box) return;
  const got = st.final && st.final.coins;
  const earned = got ? got.earned : st.coins;
  box.classList.toggle("hidden", !earned);
  $("finalCardsBtn").classList.toggle("hidden", !earned && !(W.wallet && W.wallet.coins));
  if (!earned) return;
  const kept = earned;
  let note = "Saving your earned coins…";
  if (got) {
    // A results receipt is historical: it must not overwrite a newer shop balance.
    const receipt = JSON.stringify(got);
    if (W.receipt !== receipt) { W.receipt = receipt; refreshWallet(); }
    note = got.capped
      ? "Previously withheld coins are restored when your wallet updates. Open Card House to see your balance."
      : "Every correct answer earns coins. Open Card House to see your balance and packs.";
  }
  box.innerHTML = `${coinIcon}<span class="rc-final-txt"><b>${got ? "+" + kept : "Saving " + earned} Rufus Coins${got ? " earned" : ""}</b><small>${note}</small></span>`;
  $("finalCoins").querySelector(".rc-coin").classList.add("big");
}

// ---------- the house ----------
const head = (title, sub, extra = "") => `<div class="rc-head"><div><h2 class="rc-h" tabindex="-1">${title}</h2>${sub ? `<p class="rc-lede">${sub}</p>` : ""}</div>${extra}</div>`;
const back = (to, text) => `<button type="button" class="btn ghost" data-rc="go" data-id="${to}">${text}</button>`;
const allIds = () => C().cards.map((c) => c.id);

// A sneak peek only: these concepts are not in the server's purchasable pack catalogue.
function thanksgivingPreview() {
  const ideas = [
    ["rufus", "Rufus’s Harvest Welcome", "🍂"],
    ["marthina", "Martina’s Pumpkin Pie", "🥧"],
    ["renard", "Renard’s Leaf Parade", "🍁"],
    ["fiery", "Fiery’s Cosy Campfire", "🔥"],
    ["felix", "Felix’s Thank-you Letters", "✉️"],
  ];
  return `<aside class="rc-season" aria-label="Thanksgiving pack preview">
    <div class="rc-season-heading"><span class="rc-season-icon" aria-hidden="true">🍂</span><div>
      <p class="rc-season-tags"><span>Coming soon</span><span>Limited edition</span></p>
      <h3 class="rc-hh">Thanksgiving with Rufus</h3>
      <p>A little harvest, a lot of friendship. A seasonal pack of limited-edition cards.</p>
    </div></div>
    <details class="rc-season-preview"><summary>Peek at the planned cards</summary>
      <p class="rc-lede">Concept previews · final artwork and rarities are still being designed.</p>
      <div class="rc-season-grid">${ideas.map(([who, name, prop]) => `<article class="rc-season-card">
        <span class="rc-season-limited">Limited edition</span>
        <div class="rc-season-art" aria-hidden="true">${spriteSVG(who)}<span>${prop}</span></div>
        <h4>${name}</h4><small>Coming soon · Preview</small>
      </article>`).join("")}</div>
    </details>
    <p class="rc-season-note">Not available to buy yet. Dates, price and odds will be shown before launch. Collected cards will stay yours after the event.</p>
  </aside>`;
}

const VIEWS = {
  house() {
    const all = allIds(), have = all.filter(owned).length;
    const rooms = [
      ["cards", "Card room", "Every card", cardHTML("renard") + cardHTML("rufus")],
      ["packs", "Pack room", `${C().packs.length} packs to open`, packHTML("char") + packHTML("flag")],
      ["legendary", "Legendary gallery", "The rarest cards", cardHTML("family") + cardHTML("poster")],
    ];
    const building = `<div class="rc-building"><div class="rc-roof" aria-hidden="true"></div><span class="rc-sign" aria-hidden="true">HOME OF YOUR CARDS</span>
      <div class="rc-rooms">${rooms.map(([id, title, sub, pics]) => `<button type="button" class="rc-room" data-rc="room" data-id="${id}" aria-pressed="${V.room === id}"><span class="rc-window" aria-hidden="true">${pics}</span><strong>${title}</strong><small>${sub}</small></button>`).join("")}</div></div>`;
    const waiting = W.wallet && W.wallet.unopened.length;
    const history = W.wallet?.recentGames || [];
    const coinHistory = `<details class="rc-earning"><summary>Coin history</summary><p>${W.wallet?.earned || 0} saved − ${(W.wallet?.earned || 0) - (W.wallet?.coins || 0)} spent = ${W.wallet?.coins || 0} available.</p>${W.wallet?.restored ? `<p>${W.wallet.restored} previously withheld coins restored.</p>` : ""}${history.map((g) => `<p>${new Date(g.at).toLocaleString()}: ${g.earned} from answers → <strong>${g.credited} saved</strong>.</p>`).join("") || "<p>Finish a game to earn your first coins.</p>"}</details>`;
    const nudge = waiting ? `<div class="rc-nudge"><span>You have ${waiting === 1 ? "a pack" : waiting + " packs"} waiting!</span><button type="button" class="btn primary" data-rc="resume">Open it ▶</button></div>` : "";
    return `<div class="rc-intro"><div><p class="eyebrow">Your collection</p><h2 class="rc-h big" tabindex="-1">Rufus's Card House</h2></div>
      <div class="rc-counts"><div class="rc-count"><b>${have} / ${all.length}</b><small>cards collected</small></div><div class="rc-count"><b>${(W.wallet ? W.wallet.coins : 0).toLocaleString()}</b><small>Rufus Coins</small></div></div></div>
      <details class="rc-earning"><summary>How coins work</summary><p>${C().economy.coinsPerRight} coins per right answer, saved when the game ends. No daily earning limit. No real-money purchases. Save a private player backup from your profile.</p></details>
      <p class="rc-lede">${W.wallet?.today || 0} coins earned today · <button type="button" class="btn ghost" data-rc="balance">Refresh balance</button></p>
      ${coinHistory}${nudge}${building}${thanksgivingPreview()}<section class="rc-floor" aria-label="Selected room">${V.room === "packs" ? VIEWS.packs() : VIEWS.gallery()}</section>`;
  },

  gallery() {
    const legendary = V.room === "legendary";
    const filters = [["all", "All cards"], ...C().packs.map((p) => [p.id, p.title.replace(" Pack", "")])];
    const list = C().cards
      .filter((c) => (legendary ? c.rarity === "legendary" : V.filter === "all" || c.pack === V.filter))
      .map((c) => c.id);
    const tabs = legendary ? "" : `<div class="rc-tabs" role="group" aria-label="Show cards from">${filters.map(([id, t]) => `<button type="button" data-rc="filter" data-id="${id}" aria-pressed="${V.filter === id}">${t}</button>`).join("")}</div>`;
    const cells = list.map((id) => {
      const n = owned(id), c = card(id);
      return `<div class="rc-cell"><button type="button" class="rc-cardbtn" data-rc="look" data-id="${id}" aria-label="${n ? "Look at" : "Preview"} ${c.name}, ${label(c)}, ${n ? "collected" : "not collected"}">${n ? cardHTML(id) : coveredCardHTML(c)}</button>
        ${legendary ? `<h3 class="rc-hh">${c.name}</h3>` : ""}<p class="rc-meta"><span class="${n ? "rc-got" : "rc-miss"}">${n ? `✓ Collected · ${n}` : "Not collected yet"}</span></p></div>`;
    }).join("");
    return head(legendary ? "The Legendary gallery" : "Every card has a home", legendary ? "The hardest cards in the game to find." : "Your collected cards are uncovered. Choose Preview to peek at a card you haven't collected.") + tabs + `<div class="rc-grid ${legendary ? "rc-legend" : ""}">${cells}</div>`;
  },

  packs() {
    const price = C().economy.packPrice;
    const tile = (p) => `<button type="button" class="rc-packtile" data-rc="pack" data-id="${p.id}">${packHTML(p.id)}
      <span class="rc-packinfo"><span class="rc-hh">${p.title}</span><span class="rc-lede">${p.theme}</span><span class="rc-price">${coinIcon} ${price} coins</span></span></button>`;
    return head("Choose a pack", "A pack is a theme. Rarity belongs to each card, so look inside before you buy.") + `<div class="rc-packs">${C().packs.map(tile).join("")}</div>`;
  },

  detail() {
    const id = V.sel, c = card(id), n = owned(id);
    const p = pack(c.pack);
    const story = id === "family" ? "Rufus, Martina, Renard, Fiery and Felix, all together on one Legendary card."
      : id === "poster" ? "Rufus holds one big poster full of flags from around the world."
        : c.story || `From the ${p.title}.`;
    const odds = p.odds[id];
    const chance = `${+odds.toFixed(2)}% base chance on a normal draw. New-card and maximum-wait guarantees change some draws.${p.distinct ? " Cards drawn in the same pack are removed from its remaining draws." : ""}`;
    return head(n ? c.name : `Preview: ${c.name}`, n ? "" : "This card isn't in your collection yet.", back("house", "← Back to the house")) +
      `<div class="rc-detail">${cardHTML(id, { live: true, stamps: W.wallet && W.wallet.featured === id ? (d.S.profile.pins || []) : null })}<div class="rc-detail-copy">
        <span class="${n ? "rc-got" : "rc-miss"}">${n ? `✓ Collected · ${n}` : "Preview only · not owned"}</span><h3 class="rc-hh">${label(c)}</h3><p>${story}</p><p class="rc-lede">${chance}</p>
        <div class="rc-btns">${n ? `<button type="button" class="btn primary" data-rc="feature" data-id="${id}">Feature this card</button>` : ""}<button type="button" class="btn ghost" data-rc="pack" data-id="${c.pack}">See this pack ▶</button></div>
        ${n ? "" : `<p class="rc-tiny">Looking at a card doesn't add it to your collection.</p>`}</div></div>`;
  },

  inspect() {
    const p = pack(V.pack), price = C().economy.packPrice, per = C().economy.cardsPerPack;
    const coins = W.wallet ? W.wallet.coins : 0;
    const pending = pendingPurchase(d.S.profile.id), can = coins >= price || !!pending;
    const cells = p.ids.map((id) => {
      const n = owned(id), c = card(id);
      return `<div class="rc-cell"><button type="button" class="rc-cardbtn" data-rc="look" data-id="${id}" aria-label="Look at ${c.name}">${cardHTML(id)}</button><p class="rc-meta"><span class="${n ? "rc-got" : "rc-miss"}">${n ? `✓ ${n}` : "Not yet"}</span><span class="rc-odds">${+p.odds[id].toFixed(2)}% base</span></p></div>`;
    }).join("");
    const left = p.newCards.filter((id) => !owned(id)).length;
    const rules = [
      `<li>${per} cards in every pack.</li>`,
      left ? `<li>One new Common, Rare or Epic card is guaranteed while any are missing (${left} left).</li>` : "",
      p.distinct ? "<li>Never the same card twice in one pack.</li>" : "",
      ...Object.entries(p.safety).map(([id, after]) => `<li>${card(id).name}: within ${after} purchases of this pack since you last found it, or since your first purchase.</li>`),
      "<li>Percentages are base chances on normal draws, not the chance for a whole pack. Guarantees change some draws.</li>",
      p.distinct ? "<li>Already-drawn cards are excluded; the remaining base weights are rebalanced for the next draw.</li>" : "<li>Duplicate copies are possible. Lucky draws can give Legendary before Divine.</li>",
      "<li>Coins are earned by playing. No real-money purchases or cash value.</li>",
    ].join("");
    return head(p.title, p.theme, back("packs", "← All packs")) +
      `<div class="rc-split"><div class="rc-grid rc-three">${cells}</div><aside class="rc-side"><h3 class="rc-hh">Before you buy</h3><ul class="rc-rules">${rules}</ul>
        <button type="button" class="btn primary" data-rc="buy" ${can && !V.busy ? "" : "disabled"}>${pending ? "Recover pending " + pack(pending.pack).title : "Buy for " + price + " coins"}</button>
        ${can ? "" : `<p class="rc-tiny">You have ${coins.toLocaleString()} coins. You need ${price - coins} more: each right answer earns ${C().economy.coinsPerRight}.</p><button type="button" class="btn ghost" data-rc="play">Go earn coins ▶</button>`}
      </aside></div>`;
  },

  open() {
    const b = V.bought;
    if (!b) return VIEWS.inspect();
    return head("Your pack is ready!", `${pack(b.pack).title}. It's safe: if you leave now, it'll wait for you.`) +
      `<div class="rc-openbox"><div class="rc-bigpack" id="rcBigPack">${packHTML(b.pack)}</div><button type="button" class="btn primary big-open" data-rc="tear">Open the pack</button></div>`;
  },

  reveal() {
    const b = V.bought;
    if (!b) return VIEWS.house();
    const all = V.flipped.length === b.cards.length;
    const cells = b.cards.map((x, i) => {
      const open = V.flipped.includes(i), c = card(x.id);
      return `<div class="rc-rv"><button type="button" class="rc-flipbtn${open ? " open" : ""}" data-rc="flip" data-id="${i}" aria-label="${open ? `${c.name}, ${label(c)}` : `Reveal card ${i + 1}`}">
        <span class="rc-flipper"><span class="rc-fc"><span class="rc-cardback"><span>${art.BACK}</span></span></span><span class="rc-fc rc-front">${cardHTML(x.id, { live: rank(c) >= 4 })}</span></span>
      </button><p class="rc-rtag ${x.fresh ? "new" : "spare"}">${x.fresh ? "New card!" : "Spare copy"}</p></div>`;
    }).join("");
    return head("Reveal your cards", "Tap or press Enter on each card. The rarest comes last.", `<button type="button" class="btn ghost" data-rc="flipall">Reveal all</button>`) +
      `<div class="rc-trio">${cells}</div>
       <div class="rc-after" id="rcAfter" ${all ? "" : "hidden"}><button type="button" class="btn primary" data-rc="seecards">See your cards</button><button type="button" class="btn ghost" data-rc="another">Open another pack</button></div>`;
  },

  feature() {
    const mine = allIds().filter(owned);
    const pins = d.S.profile.pins || [], full = pins.length >= 3;
    const pick = mine.map((id) => `<button type="button" class="rc-pick" data-rc="feature" data-id="${id}" aria-pressed="${W.wallet.featured === id}" aria-label="Feature ${card(id).name}">${cardHTML(id)}</button>`).join("");
    const earned = d.myStickers().map(d.stickerInfo).filter(Boolean);
    const stamps = earned.length
      ? earned.map((s) => {
        const on = pins.includes(s.id);
        return `<button type="button" class="rc-stick" data-rc="stamp" data-id="${s.id}" aria-pressed="${on}" ${!on && full ? "disabled" : ""}><span aria-hidden="true">${s.emoji}</span>${s.name}</button>`;
      }).join("")
      : `<p class="rc-tiny on-sky">No stickers yet. Earn some in a game, and they'll show up here.</p>`;
    const c = card(W.wallet.featured);
    return head("Feature a card", "One card sits beside your name in rooms and on the leaderboard. It never changes your score.", back("house", "← Back to the house")) +
      `<div class="rc-feature"><div class="rc-bigcard">${cardHTML(W.wallet.featured, { stamps: pins, live: true })}</div>
        <div><div class="rc-block"><h3 class="rc-hh">Your card</h3><div class="rc-picks">${pick}</div></div>
        <div class="rc-block"><h3 class="rc-hh">Stamps</h3><p class="rc-lede">Stick up to 3 of your stickers on it. Stamping never uses a sticker up, and these also show next to your name.</p><div class="rc-picks">${stamps}</div></div>
        <div class="rc-block"><h3 class="rc-hh">How it looks</h3><div class="rc-preview"><span class="rc-prev-thumb" id="rcPrev"></span><div><b>${d.displayName(d.S.profile)}</b><small>${c.name} · ${label(c)}</small></div><span class="rc-prev-stamps" aria-hidden="true">${pins.map((id) => (d.stickerInfo(id) || {}).emoji || "").join("")}</span></div></div></div>
      </div>`;
  },
};

function render(focusHead) {
  const root = $("cardsRoot");
  if (!root || !art) return;
  root.innerHTML = VIEWS[V.view]();
  if (V.view === "feature") { const t = $("rcPrev"); if (t) t.append(cardThumb(W.wallet.featured)); }
  if (focusHead) {
    const h = root.querySelector(".rc-h");
    if (h) h.focus({ preventScroll: true });
    root.closest(".screen").scrollTop = 0;
  }
}
function go(view) { V.view = view; render(true); }
// Redraw where we are, and keep the keyboard on the same button.
function redraw(act, id) {
  render(false);
  const b = $("cardsRoot").querySelector(`[data-rc="${act}"][data-id="${id}"]`);
  if (b) b.focus({ preventScroll: true });
}

// ---------- pack opening ----------
function legendaryMoment(id, back) {
  if (document.querySelector("dialog.rc-burst")) return;
  const box = document.createElement("dialog");
  box.className = "rc-burst";
  box.setAttribute("aria-label", `Legendary card: ${card(id).name}`);
  box.innerHTML = `<div class="rc-rays" aria-hidden="true"></div><div class="rc-burst-in"><p class="rc-big">LEGENDARY!</p>${cardHTML(id, { live: true })}<button type="button" class="btn primary">Keep it!</button></div>`;
  const close = () => { box.close(); box.remove(); if (back && back.isConnected) back.focus({ preventScroll: true }); };
  box.querySelector("button").onclick = close;
  box.addEventListener("cancel", (e) => { e.preventDefault(); close(); }); // the Escape key
  document.body.append(box);
  box.showModal();
  d.sound.play("fanfare");
}

function flip(i, btn) {
  const b = V.bought;
  if (!b || V.view !== "reveal" || !btn.isConnected || V.flipped.includes(i)) return;
  V.flipped.push(i);
  const x = b.cards[i], c = card(x.id);
  btn.classList.add("open");
  btn.setAttribute("aria-label", `${c.name}, ${label(c)}`);
  d.announce(`${c.name}, ${label(c)}. ${x.fresh ? "New card." : "Spare copy."}`);
  d.sound.play(rank(c) >= 3 ? "fanfare" : "sticker");
  if (V.flipped.length === b.cards.length) {
    const after = $("rcAfter");
    if (after) after.hidden = false;
    d.post("/api/packs/opened", { player: d.playerPayload(), id: b.id }).catch(() => {});
    if (W.wallet) W.wallet.unopened = W.wallet.unopened.filter((p) => p.id !== b.id);
  }
  if (c.rarity === "legendary") setTimeout(() => { if (V.bought === b && V.view === "reveal" && btn.isConnected) legendaryMoment(x.id, btn); }, reduced() ? 0 : 640);
}

function newNonce() {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return "n" + [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

async function buy() {
  if (V.busy) return;
  V.busy = true;
  ++W.request; // Ignore any older wallet read that finishes during this purchase.
  render(false);
  const player = d.playerPayload();
  const order = pendingPurchase(player.id) || { pack: V.pack, nonce: newNonce() };
  keepPurchase(player.id, order);
  try {
    const r = await d.post("/api/packs/buy", { player, ...order });
    keepPurchase(player.id, null);
    if (d.S.profile?.id !== player.id) { V.busy = false; return; }
    W.wallet.coins = r.coins;
    W.wallet.cards = r.cards;
    W.wallet.unopened = [...W.wallet.unopened.filter((p) => p.id !== r.pack.id), r.pack];
    V.bought = r.pack;
    V.flipped = [];
    renderWallet();
    d.sound.play("coin");
    d.announce("Pack bought.");
    V.busy = false;
    if (d.S.screen === "cards") go("open");
  } catch (e) {
    V.busy = false;
    // A definite rejection made no purchase. An unknown network outcome must retry the same order.
    if (e.status >= 400 && e.status < 500) keepPurchase(player.id, null);
    d.toast(e.status ? e.message : "Connection lost. Retry to recover this same pack; it will not charge twice.");
    if (d.S.profile?.id !== player.id) return;
    if (W.wallet && e.data && e.data.coins != null) { W.wallet.coins = e.data.coins; renderWallet(); }
    if (d.S.screen === "cards") render(false);
  }
}

function saveShowcase(id = W.wallet.featured) {
  return d.post("/api/showcase", { player: d.playerPayload(), card: id, pins: d.S.profile.pins || [] });
}

// The sticker book changed your pins: keep the Hall of Fame's copy up to date.
export function syncShowcase() { if (W.wallet && d.S.profile) saveShowcase().catch((e) => d.toast(e.message)); }

const ACT = {
  retry() { openCardHouse(); },
  async balance() { if (!V.busy) await refreshWallet(); },
  go(id) { d.sound.play("click"); if (id === "packs") { V.room = "packs"; go("house"); } else go(id); },
  room(id) { d.sound.play("pick"); V.room = id; redraw("room", id); },
  filter(id) { d.sound.play("pick"); V.filter = id; redraw("filter", id); },
  look(id) { d.sound.play("click"); V.sel = id; go("detail"); },
  pack(id) { d.sound.play("click"); V.pack = id; go("inspect"); },
  buy,
  tear() {
    const box = $("rcBigPack");
    if (box) box.classList.add("tearing");
    d.sound.play("credit");
    const b = V.bought;
    setTimeout(() => { if (V.bought === b && V.view === "open") go("reveal"); }, reduced() ? 0 : 520);
  },
  flip(id, btn) { flip(Number(id), btn); },
  flipall() {
    $("cardsRoot").querySelectorAll(".rc-flipbtn").forEach((b) => { const i = Number(b.dataset.id); setTimeout(() => flip(i, b), reduced() ? 0 : i * 260); });
  },
  seecards() { d.sound.play("click"); V.room = "cards"; V.filter = V.bought ? V.bought.pack : "all"; V.bought = null; go("house"); },
  another() { d.sound.play("click"); V.pack = V.bought.pack; V.bought = null; go("inspect"); },
  resume() { V.bought = W.wallet.unopened[0]; V.flipped = []; d.sound.play("click"); go("open"); },
  play() { d.play(); },
  async feature(id) {
    if (!owned(id) || V.busy) return;
    V.busy = true;
    const pid = d.S.profile.id;
    try {
      await saveShowcase(id);
      if (d.S.profile?.id !== pid || !W.wallet) return;
      W.wallet.featured = id;
      d.sound.play("sticker");
      if (d.S.screen === "cards") {
        if (V.view === "feature") redraw("feature", id); else go("feature");
      }
    } catch (e) { d.toast("Couldn't save your featured card. Please try again."); }
    finally { V.busy = false; }
  },
  stamp(id) {
    const pins = d.S.profile.pins || [];
    d.setPins(pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id].slice(0, 3));
    d.sound.play("coin");
    saveShowcase().catch((e) => d.toast(e.message));
    redraw("stamp", id);
  },
};

export async function openCardHouse() {
  d.requireProfile(async () => {
    d.show("cards");
    d.host.say("Welcome to my Card House! Every card has a home here.", { mood: "happy" });
    const root = $("cardsRoot");
    if (!art) root.innerHTML = `<p class="rc-lede">Opening the door…</p>`;
    V.view = "house";
    V.bought = null;
    try {
      // Stickers decorate cards, but a slow sticker request must not keep the door shut.
      d.refreshStickers().catch(() => {});
      await Promise.all([loadArt(), loadWallet()]);
    } catch {
      if (d.S.screen !== "cards") return;
      root.innerHTML = `<p class="rc-lede">The Card House didn't open. Check your connection and try again.</p><button type="button" class="btn primary" data-rc="retry">Try again</button>`;
      return;
    }
    if (d.S.screen !== "cards") return;
    if (!W.wallet) {
      root.innerHTML = `<p class="rc-lede">Your collection is unavailable while we reconnect. Your saved cards have not been reset.</p><button class="btn primary" data-rc="retry">Try again</button>`;
      return;
    }
    render(true);
  });
}

// app.js hands over what we need, so this file doesn't need to know how the rest of the game works.
export function initCards(deps) {
  d = deps;
  $("meCards").onclick = openCardHouse;
  $("cardsRoot").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rc]");
    if (!b || b.disabled) return;
    ACT[b.dataset.rc](b.dataset.id, b);
  });
}
