import test from "node:test";
import assert from "node:assert/strict";
import { loadGameMeta } from "../public/js/game-meta.js";

test("startup bypasses an older browser-cached catalogue", async () => {
  const fresh = { cards: { cards: [], packs: [] } };
  const got = await loadGameMeta(async (url, options) => {
    assert.equal(url, "/api/meta");
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => fresh };
  });
  assert.equal(got, fresh);
});

test("an old catalogue or failed response cannot quietly start broken card controls", async () => {
  await assert.rejects(loadGameMeta(async () => ({ ok: true, json: async () => ({ topics: [] }) })), /out of date/);
  await assert.rejects(loadGameMeta(async () => ({ ok: false })), /Could not load/);
});
