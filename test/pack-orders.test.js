import test from "node:test";
import assert from "node:assert/strict";
import { pendingOrders } from "../public/js/pack-orders.js";
const order = { pack: "char", nonce: "purchase-fixed-123" };
test("lost replies and reloads reuse the saved order; success clears it", () => {
  const data = new Map();
  const storage = () => ({ getItem: (k) => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: (k) => data.delete(k) });
  const first = pendingOrders(storage); first.set("player-one", order);
  assert.deepEqual(first.get("player-one", ["char"]), order);
  const reloaded = pendingOrders(storage);
  assert.deepEqual(reloaded.get("player-one", ["char"]), order);
  assert.equal(reloaded.get("player-two", ["char"]), null);
  reloaded.set("player-one", null);
  assert.equal(pendingOrders(storage).get("player-one", ["char"]), null);
});
test("blocked storage still preserves the in-tab purchase, and invalid pack data is ignored", () => {
  const blocked = pendingOrders(() => { throw new Error("blocked"); });
  blocked.set("player-one", order);
  assert.deepEqual(blocked.get("player-one", ["char"]), order);
  assert.equal(blocked.get("player-one", ["math"]), null);
  blocked.set("player-one", null);
  assert.equal(blocked.get("player-one", ["char"]), null);
});
