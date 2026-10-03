// End-to-end check against a running server:
//   npm run dev            (in one terminal)
//   npm run test:e2e       (in another)
// Plays a solo run and a 2-player challenge over real WebSockets.

import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = () => "t" + Math.random().toString(36).slice(2, 14);

async function post(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}

// A pretend player: connects, says hello, remembers every state the server sends.
// lurk: true = open the link but don't say hello yet (still picking an avatar)
function player(path, profile, extra = {}, { lurk = false } = {}) {
  const ws = new WebSocket(WS + path);
  const p = { ws, states: [], peeks: [], errors: [], closed: null, profile };
  p.ready = new Promise((resolve) => {
    ws.onopen = () => {
      ws.send(JSON.stringify(lurk ? { t: "lurk" } : { t: "hello", player: profile, ...extra }));
      resolve();
    };
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.t === "state") p.states.push(m);
    if (m.t === "peek") p.peeks.push(m);
    if (m.t === "error") p.errors.push(m.message);
  };
  ws.onclose = (e) => { p.closed = e.code; };
  p.send = (o) => ws.send(JSON.stringify(o));
  p.last = () => p.states[p.states.length - 1];
  p.waitFor = async (fn, ms = 20000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const s = p.states.find(fn);
      if (s) return s;
      await sleep(25);
    }
    throw new Error("timed out waiting; last state: " + JSON.stringify(p.last() && { phase: p.last().phase, event: p.last().event, qi: p.last().qi }));
  };
  return p;
}

const profile = (adj, animal, color = "#ff8a1f") => ({ id: rid(), adj, animal, color });

async function soloRun() {
  const me = profile("Turbo", "Fox");
  const bad = await post("/api/solo", { topic: "flags", player: { ...me, adj: "Rude" } });
  assert.equal(bad.status, 400, "made-up nicknames are refused");

  const { data } = await post("/api/solo", { topic: "flags", player: me });
  assert.match(data.id, /^[0-9a-f]{64}$/);

  // Someone else can't hijack my solo game.
  const intruder = player(`/api/solo/${data.id}/ws`, profile("Sneaky", "Raccoon"));
  await intruder.ready;
  await sleep(300);
  assert.ok(intruder.errors.length, "intruder gets an error");

  const p = player(`/api/solo/${data.id}/ws`, me, { avoid: ["fr", "de"], missed: [] });
  await p.ready;
  await p.waitFor((s) => s.phase === "countdown");
  let answered = 0, lastScore = 0;
  for (let qi = 0; qi < 60; qi++) {
    const q = await p.waitFor((s) => s.phase === "question" && s.qi === qi, 8000).catch(() => null);
    if (!q) break;
    assert.equal(q.question.choices.length, 4);
    assert.equal(q.question.answer, undefined, "answer is never sent with the question");
    assert.equal(q.reveal, undefined);
    p.send({ t: "answer", q: qi, choice: qi % 4, ms: 1200 });
    p.send({ t: "answer", q: qi, choice: (qi + 1) % 4, ms: 900 }); // second answer must be ignored
    const r = await p.waitFor((s) => s.phase === "reveal" && s.qi === qi);
    answered++;
    assert.equal(r.mine.choice, qi % 4, "first answer counts, second is ignored");
    assert.equal(r.mine.correct, r.reveal.answer === qi % 4);
    assert.equal(r.mine.correct, r.mine.points > 0);
    const me2 = r.players[0];
    assert.equal(me2.score, lastScore + r.mine.points);
    lastScore = me2.score;
    assert.ok(r.reveal.fact && r.reveal.key);
    p.send({ t: "next" });
    if (me2.lives <= 0) break;
  }
  const fin = await p.waitFor((s) => s.phase === "final");
  assert.equal(fin.final.me.score, lastScore);
  const hall = await p.waitFor((s) => s.phase === "final" && s.final.hall);
  assert.equal(hall.final.hall.score, lastScore);
  assert.ok(hall.final.hall.rank >= 1);
  p.ws.close();
  intruder.ws.close();

  const board = await (await fetch(`${BASE}/api/hall?topic=flags&period=all&pid=${me.id}`)).json();
  assert.ok(board.me && board.me.best === Math.max(lastScore, 0) || lastScore === 0, "my best shows on the board");

  // Put my real name on my scores.
  assert.equal((await post("/api/names/check", { nick: "poop" })).data.ok, false, "rude names refused");
  const ok = await post("/api/names/check", { nick: "arvind" });
  assert.deepEqual(ok.data, { ok: true, nick: "Arvind" });
  const renamed = await post("/api/hall/rename", { player: { ...me, nick: "Arvind" } });
  assert.ok(renamed.data.updated >= 1, "my runs got renamed");
  const board2 = await (await fetch(`${BASE}/api/hall?topic=flags&period=all&pid=${me.id}`)).json();
  if (board2.rows.some((r) => r.me)) assert.equal(board2.rows.find((r) => r.me).name, "Arvind");
  console.log(`  solo: ${answered} questions, ${lastScore} points, hall rank #${hall.final.hall.rank}, renamed to Arvind`);
}

async function soloQuit() {
  const me = profile("Daring", "Owl");
  const { data } = await post("/api/solo", { topic: "math", player: me });
  const p = player(`/api/solo/${data.id}/ws`, me);
  await p.ready;
  const q = await p.waitFor((s) => s.phase === "question" && s.qi === 0, 8000);
  p.send({ t: "answer", q: 0, choice: 0, ms: 800 });
  await p.waitFor((s) => s.phase === "reveal");
  p.send({ t: "quit" }); // "End run" button
  const fin = await p.waitFor((s) => s.phase === "final" && s.final.hall);
  assert.equal(fin.final.quit, true);
  assert.equal(fin.final.asked, 1);
  assert.ok(fin.final.hall.rank >= 1, "a quit run still reaches the Hall of Fame");
  p.ws.close();
  console.log(`  quit after 1 question (${q.question.media.text}): saved with ${fin.final.me.score} points`);
}

async function challenge() {
  const a = profile("Mighty", "Panda", "#38bdf8");
  const b = profile("Cosmic", "Otter", "#3ddc97");
  const late = profile("Zippy", "Bee", "#ffd23f");

  assert.equal((await post("/api/rooms", { topic: "flags", count: 7, timer: 10, level: "mixed", player: a })).status, 400, "bad settings refused");
  const { data } = await post("/api/rooms", { topic: "flags", count: 5, timer: 10, level: "mixed", player: a });
  assert.match(data.code, /^[BCDFGHJKLMNPQRSTVWXZ]{5}$/);
  const peek = await (await fetch(`${BASE}/api/rooms/${data.code}`)).json();
  assert.equal(peek.exists, true);
  assert.equal((await fetch(`${BASE}/api/rooms/ZZZZZ`)).status, 404);

  const path = `/api/rooms/${data.code}/ws`;
  const A = player(path, a);
  await A.ready;
  await A.waitFor((s) => s.phase === "lobby" && s.players.length === 1);
  const aSeat = A.last().me;
  assert.equal(A.last().hostId, aSeat, "creator is host");

  // B opens the link and is still picking an avatar: the host sees "1 choosing".
  const B = player(path, b, {}, { lurk: true });
  await B.ready;
  await A.waitFor((s) => s.choosing === 1);
  assert.ok(B.peeks.length >= 1 && B.states.length === 0, "someone still choosing only gets a peek");
  B.send({ t: "hello", player: { ...b, adj: "Silly" } }); // ...picks a name and joins
  await A.waitFor((s) => s.choosing === 0 && s.players.length === 2);
  B.send({ t: "hello", player: b }); // ...then changes their mind in the lobby
  await A.waitFor((s) => s.players.some((p) => p.name === "Cosmic Otter"));
  const bSeat = (await B.waitFor((s) => s.me)).me;

  B.send({ t: "start" }); // not the host: ignored
  await sleep(300);
  assert.equal(A.last().phase, "lobby", "only the host can start");

  A.send({ t: "start" });
  await A.waitFor((s) => s.phase === "countdown");
  let lateP = null;
  for (let qi = 0; qi < 5; qi++) {
    const qa = await A.waitFor((s) => s.phase === "question" && s.qi === qi);
    const qb = await B.waitFor((s) => s.phase === "question" && s.qi === qi);
    assert.deepEqual(qa.question, qb.question, "everyone gets the exact same question");
    if (qi === 1) { lateP = player(path, late); await lateP.ready; } // someone joins mid-game
    A.send({ t: "answer", q: qi, choice: 0, ms: 500 });
    await A.waitFor((s) => s.qi === qi && s.event === "answered" && s.players.find((p) => p.id === aSeat).answered);
    const mid = B.states.filter((s) => s.qi === qi && s.phase === "question").pop();
    assert.equal(mid.reveal, undefined, "no answer leaks before everyone has answered");
    B.send({ t: "answer", q: qi, choice: 1, ms: 2500 });
    if (lateP && qi >= 1) lateP.send({ t: "answer", q: qi, choice: 2, ms: 3000 });
    const ra = await A.waitFor((s) => s.phase === "reveal" && s.qi === qi);
    const ans = ra.reveal.answer;
    const pa = ra.players.find((p) => p.id === aSeat), pb = ra.players.find((p) => p.id === bSeat);
    assert.equal(pa.last.correct, ans === 0);
    assert.equal(pb.last.correct, ans === 1);
    B.send({ t: "next" }); // not host: ignored (auto-advance still happens)
    A.send({ t: "next" });
  }
  const fa = await A.waitFor((s) => s.phase === "final");
  const ranking = fa.final.ranking;
  assert.equal(ranking.length, 3, "late joiner is ranked too");
  const scores = Object.fromEntries(fa.players.map((p) => [p.id, p.score]));
  for (let i = 1; i < ranking.length; i++) assert.ok(scores[ranking[i - 1]] >= scores[ranking[i]], "ranking is sorted by score");

  A.send({ t: "rematch" });
  await B.waitFor((s) => s.phase === "lobby" && s.event === "rematch");
  // Privacy: nobody's private player id is ever sent to anyone.
  for (const st of [...A.states, ...B.states, ...lateP.states]) {
    const txt = JSON.stringify(st);
    for (const secret of [a.id, b.id, late.id]) assert.ok(!txt.includes(secret), "a private player id leaked to the room");
  }
  // The host removes a player: they're gone and can't come back to this room.
  const lateSeat = lateP.states.at(-1).me;
  A.send({ t: "kick", seat: lateSeat });
  await A.waitFor((s) => s.event === "kick" && !s.players.some((p) => p.id === lateSeat));
  await sleep(300);
  assert.equal(lateP.closed, 4003, "removed player is disconnected");
  const back = player(path, late);
  await back.ready;
  await sleep(400);
  assert.ok(back.errors.some((e) => /removed/.test(e)), "removed player can't rejoin");
  // The host presses Leave in the lobby: they vanish from the list and B becomes host.
  A.send({ t: "leave" });
  const after = await B.waitFor((s) => s.event === "leave" && !s.players.some((p) => p.id === aSeat));
  assert.equal(after.hostId, bSeat, "host hands over to the next player");
  console.log(`  challenge ${data.code}: final scores ${fa.players.map((p) => `${p.name}=${p.score}`).join(", ")}`);
  for (const p of [A, B, lateP]) p.ws.close();
}

// Fixes from the multiplayer review + changing the quiz + fresh rematches.
async function reviewFixes() {
  const a = profile("Brave", "Lion"), b = profile("Jolly", "Frog");
  const { data } = await post("/api/rooms", { topic: "flags", count: 10, timer: 10, level: "mixed", player: a });
  const path = `/api/rooms/${data.code}/ws`;
  let A = player(path, a);
  const B = player(path, b);
  await Promise.all([A.ready, B.ready]);
  await B.waitFor((s) => s.players.length === 2);
  const aSeat = (await A.waitFor((s) => s.me)).me;

  // Changing the quiz: only the host, only allowed values.
  B.send({ t: "settings", topic: "math", count: 5, timer: 10, level: "easy" });
  A.send({ t: "settings", topic: "nope", count: 5, timer: 10, level: "easy" });
  A.send({ t: "settings", topic: "space", count: 7, timer: 10, level: "easy" });
  await sleep(400);
  assert.equal(B.last().topic.id, "flags", "non-host and invalid quiz changes are ignored");
  A.send({ t: "settings", topic: "space", count: 5, timer: 15, level: "easy" });
  const changed = await B.waitFor((s) => s.event === "settings");
  assert.deepEqual([changed.topic.id, changed.settings.count, changed.settings.timer], ["space", 5, 15]);

  // A stand-in host (while the real host's Wi-Fi blips) can't remove the real host.
  A.ws.close();
  await B.waitFor((s) => s.hostId === s.me);
  B.send({ t: "kick", seat: aSeat });
  await sleep(400);
  A = player(path, a);
  await A.ready;
  const back = await A.waitFor((s) => s.me === aSeat);
  assert.equal(A.errors.length, 0, "real host wasn't banned");
  assert.equal(back.hostId, aSeat, "real host is host again");

  // Switching to a new player on the same connection: no ghost left behind, and they stay host.
  A.send({ t: "hello", player: profile("Mega", "Llama") });
  const sw = await B.waitFor((s) => s.players.some((p) => p.name === "Mega Llama"));
  assert.ok(!sw.players.some((p) => p.name === "Brave Lion"), "old player isn't left as a ghost");
  assert.equal(sw.hostId, sw.players.find((p) => p.name === "Mega Llama").id, "host role moved with them");

  // Round 1. Someone's connection drops mid-question: wait a few seconds for them, then a proper timeout.
  A.send({ t: "start" });
  await B.waitFor((s) => s.phase === "question" && s.qi === 0 && s.round === 1);
  B.send({ t: "answer", q: 0, choice: 0, ms: 500 });
  A.ws.close();
  const dropAt = Date.now();
  await sleep(1500);
  assert.equal(B.last().phase, "question", "the question doesn't end the instant someone drops");
  const rv = await B.waitFor((s) => s.phase === "reveal" && s.qi === 0 && s.round === 1, 10000);
  const graceMs = Date.now() - dropAt;
  assert.ok(graceMs >= 4000, "waited for them to come back");
  const dropped = rv.players.find((p) => p.name === "Mega Llama");
  assert.ok(dropped.last && dropped.last.timeout, "the dropped player gets a timeout");
  assert.equal(dropped.streak, 0, "and their streak resets");
  const keysOf = (round) => B.states.filter((s) => s.phase === "reveal" && s.round === round).map((s) => s.reveal.key);
  for (let qi = 0; qi < 5; qi++) {
    await B.waitFor((s) => s.qi === qi && s.round === 1 && (s.phase === "question" || s.phase === "reveal"));
    if (B.last().phase === "question") B.send({ t: "answer", q: qi, choice: 1, ms: 700 });
    await B.waitFor((s) => s.phase === "reveal" && s.qi === qi && s.round === 1);
    B.send({ t: "next" });
  }
  await B.waitFor((s) => s.phase === "final" && s.round === 1);

  // Round 2 (rematch, same topic): every question is new.
  B.send({ t: "rematch" });
  await B.waitFor((s) => s.phase === "lobby" && s.event === "rematch");
  B.send({ t: "start" });
  for (let qi = 0; qi < 5; qi++) {
    await B.waitFor((s) => s.phase === "question" && s.qi === qi && s.round === 2);
    B.send({ t: "answer", q: qi, choice: 2, ms: 700 });
    await B.waitFor((s) => s.phase === "reveal" && s.qi === qi && s.round === 2);
    B.send({ t: "next" });
  }
  const r1 = [...new Set(keysOf(1))], r2 = [...new Set(keysOf(2))];
  assert.equal(r2.filter((k) => r1.includes(k)).length, 0, "rematch questions are all new");
  console.log(`  quiz change, host protection, no ghosts, drop grace (${(graceMs / 1000).toFixed(1)}s), fresh rematch (${r1.length}+${r2.length} different questions)`);
  B.ws.close();
}

const t0 = Date.now();
console.log("solo run…");
await soloRun();
console.log("solo quit…");
await soloQuit();
console.log("challenge room…");
await challenge();
console.log("review fixes…");
await reviewFixes();
console.log(`✔ e2e passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(0);
