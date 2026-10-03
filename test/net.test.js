// The browser's reconnect logic (public/js/net.js), tested with a pretend browser.
import { test } from "node:test";
import assert from "node:assert/strict";

class FakeWS {
  static all = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeWS.all.push(this); }
  send(d) { this.sent.push(d); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen && this.onopen(); }
  drop(code = 1006) { this.readyState = 3; this.onclose && this.onclose({ code }); }
}
const listeners = {};
globalThis.WebSocket = FakeWS;
globalThis.location = { protocol: "https:", host: "rufustrivia.test" };
globalThis.document = { visibilityState: "visible", addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener: () => {} };
const { openGame } = await import("../public/js/net.js");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function game() {
  FakeWS.all = [];
  const statuses = [];
  const conn = openGame("/api/rooms/BCDFG/ws", { hello: () => ({ t: "hello" }), onMessage: () => {}, onStatus: (s, c) => statuses.push([s, c]) });
  return { conn, statuses };
}

test("iPad sleeps and wakes: only ONE new connection, not two", async () => {
  const { conn } = game();
  FakeWS.all[0].open();
  FakeWS.all[0].drop();                 // Wi-Fi died while asleep -> a retry gets scheduled
  listeners.visibilitychange();         // ...and the tab wakes up before the retry fires
  assert.equal(FakeWS.all.length, 2);
  await sleep(900);                     // the old retry timer must NOT open a third one
  assert.equal(FakeWS.all.length, 2);
  conn.close();
});

test("a replaced old connection saying 'replaced' (4000) does not end the game", async () => {
  const { conn, statuses } = game();
  const first = FakeWS.all[0];
  first.open();
  first.drop();
  listeners.visibilitychange();
  FakeWS.all[1].open();
  first.onclose({ code: 4000 });        // a late goodbye from the old one
  assert.ok(!statuses.some(([s]) => s === "ended"), "game must keep going");
  conn.close();
});

test("the CURRENT connection being closed by the server does end the game", () => {
  const { conn, statuses } = game();
  FakeWS.all[0].open();
  FakeWS.all[0].drop(4003);             // removed by the host
  assert.deepEqual(statuses.at(-1), ["ended", 4003]);
  conn.close();
});

test("says hello every time it (re)connects", () => {
  const { conn } = game();
  FakeWS.all[0].open();
  assert.deepEqual(FakeWS.all[0].sent, ['{"t":"hello"}']);
  conn.close();
});
