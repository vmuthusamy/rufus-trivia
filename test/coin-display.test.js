import test from "node:test";
import assert from "node:assert/strict";
import { pendingCoins } from "../public/js/coin-display.js";
test("every earned coin is pending, even beyond the old daily limit", () => {
  assert.equal(pendingCoins(410), 410);
  assert.equal(pendingCoins(4000), 4000);
  assert.equal(pendingCoins(0), 0);
});

test("old results and out-of-order reads cannot replace a newer shop balance", async () => {
  const nodes = new Map();
  const node = () => ({ textContent: "", innerHTML: "", classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, querySelector() { return node(); } });
  globalThis.document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); } };
  const { initCards, walletFor, showFinalCoins, refreshCoinsAfterGame } = await import("../public/js/cards.js");
  const requests = [];
  const S = { profile: { id: "test-coin-player" }, screen: "home", meta: { cards: { cards: [], economy: { packPrice: 100 } } } };
  initCards({ S, playerPayload: () => S.profile, post: () => new Promise((resolve) => requests.push(resolve)) });
  const w = (coins) => ({ coins, today: 300, limit: 300, day: "2026-11-01", cards: {}, unopened: [] });
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  walletFor(S.profile);
  requests.shift()(w(100)); await flush();
  assert.equal(nodes.get("meCoinsN").textContent, "100");
  showFinalCoins({ coins: 410, final: { coins: { earned: 410, credited: 70, capped: 340, coins: 300, today: 300, limit: 300 } } });
  assert.equal(nodes.get("meCoinsN").textContent, "100", "old receipt must not restore spent coins");
  requests.shift()(w(100)); await flush();
  refreshCoinsAfterGame(null);
  refreshCoinsAfterGame(null);
  const older = requests.shift(), newer = requests.shift();
  newer(w(80)); await flush();
  older(w(100)); await flush();
  assert.equal(nodes.get("meCoinsN").textContent, "80", "late response must not overwrite a newer read");
  delete globalThis.document;
});
