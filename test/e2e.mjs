// End-to-end check against a running server:
//   npm run dev            (in one terminal)
//   npm run test:e2e       (in another)
// Plays a solo run and a 2-player challenge over real WebSockets.

import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://127.0.0.1:8787";
const WS = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = () => "t" + Math.random().toString(36).slice(2, 14);
// Typed-in names are one-of-a-kind (the first player keeps them), so every test run uses new ones.
const newNick = (start = "Kid") => start + Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

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
  assert.deepEqual(ok.data, { ok: true, nick: "Arvind" }, "without a player it only checks the name");
  const nick = newNick("Arvind");
  const claimed = await post("/api/names/check", { nick: nick.toLowerCase(), player: me });
  assert.equal(claimed.data.nick, nick);
  const renamed = await post("/api/hall/rename", { player: { ...me, nick } });
  assert.ok(renamed.data.updated >= 1, "my runs got renamed");
  const board2 = await (await fetch(`${BASE}/api/hall?topic=flags&period=all&pid=${me.id}`)).json();
  if (board2.rows.some((r) => r.me)) assert.equal(board2.rows.find((r) => r.me).name, nick);
  console.log(`  solo: ${answered} questions, ${lastScore} points, hall rank #${hall.final.hall.rank}, renamed to ${nick}`);
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
    // ...and neither does the scoreboard: scores, streaks and ranks only move at the reveal.
    const stats = (p) => [p.score, p.streak, p.correct, p.rank];
    for (const p of mid.players) {
      const was = qb.players.find((x) => x.id === p.id); // (someone who joined mid-question isn't in the earlier state)
      if (was) assert.deepEqual(stats(p), stats(was), "no points before the reveal");
    }
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

  // Junk messages are ignored (and don't break the room).
  for (const junk of ["null", "42", "[]", '"x"', "{", '{"t":"answer","q":"x","choice":{}}']) A.ws.send(junk);
  await sleep(300);
  assert.equal(A.last().phase, "lobby", "room still fine after junk messages");

  // Changing the quiz: only the host, only allowed values.
  B.send({ t: "settings", topic: "math", count: 5, timer: 10, level: "easy" });
  A.send({ t: "settings", topic: "nope", count: 5, timer: 10, level: "easy" });
  A.send({ t: "settings", topic: "science", count: 7, timer: 10, level: "easy" });
  await sleep(400);
  assert.equal(B.last().topic.id, "flags", "non-host and invalid quiz changes are ignored");
  A.send({ t: "settings", topic: "science", count: 5, timer: 15, level: "easy" });
  const changed = await B.waitFor((s) => s.event === "settings");
  assert.deepEqual([changed.topic.id, changed.settings.count, changed.settings.timer], ["science", 5, 15]);

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

// Stickers: earned on the server, never early, and they follow you into the next room.
async function stickersTest() {
  const kids = [profile("Turbo", "Fox"), profile("Fuzzy", "Panda"), profile("Lucky", "Koala"), profile("Silly", "Frog")];
  const { data } = await post("/api/rooms", { topic: "flags", count: 5, timer: 10, level: "easy", player: kids[0] });
  const path = `/api/rooms/${data.code}/ws`;
  const P = kids.map((k) => player(path, k));
  await Promise.all(P.map((p) => p.ready));
  await P[0].waitFor((s) => s.players.length === 4);
  P[0].send({ t: "start" });
  // Party Host: the host of a 4-player game
  await P[0].waitFor((s) => (s.myStickers || []).includes("partyhost"));
  let fairChecks = 0;
  for (let qi = 0; qi < 5; qi++) {
    const q0 = await P[0].waitFor((s) => s.phase === "question" && s.qi === qi);
    // Each kid picks a different answer, so exactly one of them is right every time.
    // Three answer first. While the fourth is still thinking, nobody's score, streak, right-count or rank
    // may move: that would tell the whole room who got it right before the reveal.
    const last = qi % 4;
    P.forEach((p, i) => { if (i !== last) p.send({ t: "answer", q: qi, choice: i, ms: 400 }); });
    const mid = await P[last].waitFor((s) => s.qi === qi && s.phase === "question" && s.players.filter((p) => p.answered).length === 3);
    const stats = (p) => [p.score, p.streak, p.correct, p.rank];
    for (const p of mid.players) assert.deepEqual(stats(p), stats(q0.players.find((x) => x.id === p.id)), "the scoreboard gives nothing away before the reveal");
    P[last].send({ t: "answer", q: qi, choice: last, ms: 400 });
    const rv = await P[0].waitFor((s) => s.phase === "reveal" && s.qi === qi);
    if (rv.reveal.answer !== last) fairChecks++; // the right kid had already answered, so that check really tested something
    const winner = P[rv.reveal.answer];
    assert.ok(rv.players.find((p) => p.id === winner.last().me).score > 0, "the points arrive at the reveal");
    // nobody got a sticker for this question before the reveal
    for (const p of P) {
      const before = p.states.filter((s) => s.qi === qi && s.phase === "question").pop();
      if (qi === 0) assert.ok(!(before.myStickers || []).includes("speedy"), "no stickers before the reveal");
    }
    if (qi === 0) {
      const w = await winner.waitFor((s) => s.phase === "reveal" && s.qi === 0);
      assert.ok(w.myStickers.includes("speedy"), "the fast right answer earns Speedy Paws");
      const loser = P[(rv.reveal.answer + 1) % 4].states.find((s) => s.phase === "reveal" && s.qi === 0);
      assert.ok(!loser.myStickers.includes("speedy"), "wrong answers don't");
    }
    P[0].send({ t: "next" });
  }
  const fin = await P[0].waitFor((s) => s.phase === "final");
  assert.ok(fairChecks >= 1, "at least one question had the right kid answering early");
  const champSeat = fin.final.ranking[0];
  const champ = P.find((p) => p.last().me === champSeat);
  await champ.waitFor((s) => s.phase === "final" && s.myStickers.includes("champion"));
  P.forEach((p) => p.ws.close());

  // Stickers follow you: the champion joins a brand-new room and shows them off.
  const host2 = profile("Mega", "Llama");
  const r2 = await post("/api/rooms", { topic: "science", count: 5, timer: 10, level: "easy", player: host2 });
  const H = player(`/api/rooms/${r2.data.code}/ws`, host2);
  const C = player(`/api/rooms/${r2.data.code}/ws`, champ.profile);
  await Promise.all([H.ready, C.ready]);
  const seen = await H.waitFor((s) => s.players.some((p) => (p.stickers || []).includes("champion")));
  assert.ok(seen, "other kids see the champion's sticker");
  const book = await post("/api/stickers", { player: champ.profile });
  assert.ok(book.data.stickers.includes("champion"), "sticker book lists it");
  assert.ok(book.data.earned.champion > 0, "with the date it was earned");
  // Pinning: you can show off stickers you own, but not ones you don't.
  C.send({ t: "hello", player: champ.profile, showcase: ["streak50", "champion"] });
  const pinned = await H.waitFor((s) => s.players.some((p) => p.name === champ.last().players.find((x) => x.id === champ.last().me)?.name && p.stickers.length === 1));
  const shown = pinned.players.find((p) => p.stickers.includes("champion")).stickers;
  assert.deepEqual(shown, ["champion"], "only owned stickers can be pinned");
  H.ws.close(); C.ws.close();

  // Explorer: play every topic once (quitting straight away still counts as playing).
  const explorer = profile("Daring", "Owl");
  let last = null;
  const topics = (await (await fetch(BASE + "/api/meta")).json()).topics.map((t) => t.id); // every topic, however many there are
  for (const topic of topics) {
    const { data: g } = await post("/api/solo", { topic, player: explorer });
    last = player(`/api/solo/${g.id}/ws`, explorer);
    await last.ready;
    await last.waitFor((s) => s.phase === "countdown");
    if (topic !== topics[topics.length - 1]) { last.send({ t: "quit" }); await last.waitFor((s) => s.phase === "final"); last.ws.close(); }
  }
  await last.waitFor((s) => (s.myStickers || []).includes("globetrotter"));
  last.send({ t: "quit" });
  last.ws.close();
  console.log(`  stickers: party host, speedy paws (only after the reveal), champion follows them to a new room, explorer`);
}

// "Remember me": the device's players come back from the server via the cookie.
async function rememberMe() {
  const p1 = profile("Turbo", "Fox"), p2 = { ...profile("Shiny", "Kitty"), nick: "renard", pins: ["champion", "fake"] };
  const save = await fetch(BASE + "/api/me", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ profiles: [p1, p2, { id: "x", adj: "Rude", animal: "Fox" }], active: p2.id }) });
  const cookie = (save.headers.get("set-cookie") || "").split(";")[0];
  assert.match(cookie, /^rt_dev=d[a-z0-9]+$/, "sets a remember-me cookie");
  assert.match(save.headers.get("set-cookie"), /HttpOnly/i, "the cookie is HttpOnly");
  const back = await (await fetch(BASE + "/api/me", { headers: { cookie } })).json();
  assert.equal(back.profiles.length, 2, "bad profiles are dropped");
  assert.equal(back.active, p2.id);
  assert.equal(back.profiles[1].nick, "Renard", "typed names come back (tidied)");
  assert.deepEqual(back.profiles[1].pins, ["champion"], "unknown sticker pins are dropped");
  const none = await (await fetch(BASE + "/api/me")).json();
  assert.deepEqual(none.profiles, [], "no cookie, no players");
  console.log("  remember me: cookie restores the device's players");
}

// One-of-a-kind names: the first player keeps a typed-in name; the name key brings them to another device.
async function namesTest() {
  const nick = newNick("Zelda");
  const owner = profile("Brave", "Owl"), copycat = profile("Sneaky", "Owl");
  const claim = await post("/api/names/check", { nick, player: owner });
  assert.equal(claim.data.ok, true);
  assert.match(claim.data.key, /^[a-z]+-[a-z]+-\d{3}$/, "the owner gets a name key");
  assert.equal(claim.data.fresh, true);
  assert.equal((await post("/api/names/check", { nick, player: owner })).data.fresh, false, "asking again keeps the same key");
  const again = await post("/api/names/check", { nick: nick.toUpperCase(), player: copycat });
  assert.equal(again.data.ok, false, "someone else can't take the name, whatever the capitals");
  assert.equal(again.data.taken, true);
  assert.deepEqual((await post("/api/names/mine", { player: copycat })).data, {}, "no key for the copycat");
  assert.equal((await post("/api/names/mine", { player: owner })).data.key, claim.data.key, "the owner can see their key");

  // Sneaking in through a room with the name doesn't work either: they show up as their secret agent name.
  const { data } = await post("/api/rooms", { topic: "flags", count: 5, timer: 10, level: "mixed", player: owner });
  const path = `/api/rooms/${data.code}/ws`;
  const O = player(path, { ...owner, nick }), C = player(path, { ...copycat, nick });
  const notes = [];
  C.ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.t === "nameTaken") notes.push(m.nick); });
  await Promise.all([O.ready, C.ready]);
  await O.waitFor((s) => s.players.length === 2);
  await sleep(300);
  const names = O.last().players.map((p) => p.name).sort();
  assert.deepEqual(names, [nick, "Sneaky Owl"].sort(), "only the owner shows as " + nick);
  assert.deepEqual(notes, [nick], "the copycat is told the name is taken");
  O.ws.close(); C.ws.close();

  // The name key works on another device; wrong guesses get locked out.
  assert.equal((await post("/api/names/unlock", { nick, key: "wrong-key-000" })).data.ok, false);
  const unlocked = await post("/api/names/unlock", { nick, key: claim.data.key.replace(/-/g, " ").toUpperCase() });
  assert.equal(unlocked.data.ok, true, "the right key (typed any old way) unlocks it");
  assert.equal(unlocked.data.player.id, owner.id, "...and gives back the owner's player");
  for (let i = 0; i < 5; i++) await post("/api/names/unlock", { nick, key: `nope-nope-${100 + i}` });
  const locked = await post("/api/names/unlock", { nick, key: claim.data.key });
  assert.equal(locked.data.ok, false, "after 5 wrong keys even the right one waits");
  assert.match(locked.data.reason, /Too many tries/);

  // Picking a new name frees the old one.
  const other = newNick("Link");
  assert.equal((await post("/api/names/check", { nick: other, player: owner })).data.ok, true);
  assert.equal((await post("/api/names/check", { nick, player: copycat })).data.ok, true, "the old name is free again");
  console.log("  names: one-of-a-kind, enforced in rooms, name key unlocks, guessing locked out");
}

// 🎯 Quiz Bingo: 3 players, random cards from one pool, one tap per call, played all the way to a BINGO.
// The bots can't see the answers (nobody can). They tap at random the first time round, but remember
// every answer the reveals show them, so when a square comes back as a "Second chance!" they know it.
async function bingoRoom() {
  const a = profile("Lucky", "Fox"), b = profile("Fuzzy", "Panda"), c = profile("Zippy", "Bee");
  const room = (extra) => post("/api/rooms", { topic: "flags", count: 10, timer: 10, level: "easy", player: a, ...extra });
  assert.equal((await room({ topic: "science", mode: "bingo" })).status, 400, "no bingo for science");
  assert.equal((await room({ mode: "bingo", win: "corners" })).status, 400, "made-up win rule");
  assert.equal((await room({ mode: "lotto" })).status, 400, "made-up game");
  const { data } = await room({ topic: "math" }); // a normal quiz room…
  const path = `/api/rooms/${data.code}/ws`;
  const A = player(path, a), B = player(path, b);
  await Promise.all([A.ready, B.ready]);
  await A.waitFor((s) => s.players.length === 2);
  assert.equal(A.last().settings.mode, "quiz");

  // …that the host turns into bingo (only the host, only bingo topics)
  const bingo = { count: 10, timer: 10, level: "medium", mode: "bingo", win: "line" };
  A.send({ t: "settings", topic: "culture", ...bingo });
  B.send({ t: "settings", topic: "flags", ...bingo });
  await sleep(300);
  assert.equal(B.last().settings.mode, "quiz", "no bingo for culture, and not from a non-host");
  A.send({ t: "settings", topic: "flags", ...bingo });
  const set = await B.waitFor((s) => s.event === "settings" && s.settings.mode === "bingo");
  assert.deepEqual([set.topic.id, set.settings.win], ["flags", "line"]);
  B.send({ t: "mark", call: 0, cell: 0 }); // not playing yet: ignored
  A.send({ t: "start" });

  const sig = (sq) => `${sq.label || ""}|${sq.img || ""}`;
  const callSig = (st) => st.question.prompt + JSON.stringify(st.question.media);
  const cardOf = (p) => p.states.findLast((s) => s.bingo && s.bingo.card).bingo.card;
  const [ca, cb] = await Promise.all([A, B].map((p) => p.waitFor((s) => s.phase === "countdown" && s.bingo)));
  for (const st of [ca, cb]) {
    assert.equal(st.bingo.card.length, 16, "a 4x4 card");
    assert.equal(new Set(st.bingo.card.map(sig)).size, 16, "16 different squares");
    assert.ok(st.bingo.card.every((sq) => sq.on === 0), "nothing stamped yet");
  }
  assert.notDeepEqual(ca.bingo.card.map(sig), cb.bingo.card.map(sig), "everyone gets a different card");

  const bots = [A, B];
  const known = new Map(); // call -> its right square, learned from the reveals
  const points = new Map(); // seat -> points added up from every reveal
  let C = null, round1 = new Set(), winners = null, calls = 0, secondChances = 0;
  const tapFor = (p, st, qi) => {
    const card = st.bingo.card;
    const want = known.get(callSig(st));
    if (want) { const k = card.findIndex((sq) => sig(sq) === want); return k >= 0 ? k : "none"; }
    return (qi + bots.indexOf(p)) % 3 === 0 ? "none" : (qi * 7 + bots.indexOf(p) * 5) % 16; // a guess
  };
  for (let qi = 0; qi < 40 && !winners; qi++) {
    const qs = await Promise.all(bots.map((p) => p.waitFor((s) => s.phase === "question" && s.qi === qi)));
    calls++;
    if (qs[0].bingo.again) secondChances++;
    assert.equal(qs[0].question.choices, undefined, "a call never shows the choices");
    assert.equal(qs[0].reveal, undefined, "no answer during the call");
    assert.deepEqual(qs[0].question, qs[1].question, "everyone hears the same call");
    if (qi === 0) {
      // Taps that must be ignored: off the card, nonsense, the wrong call, and a quiz answer.
      for (const bad of [{ cell: 16 }, { cell: -1 }, { cell: "x" }, { cell: 2.5 }, { cell: 0, call: 5 }]) B.send({ t: "mark", call: 0, ...bad });
      B.send({ t: "answer", q: 0, choice: 0 });
      await sleep(250);
      assert.ok(!B.last().players.find((p) => p.id === B.last().me).answered, "bad taps don't count");
    }
    if (qi === 1) { // someone joins in the middle of the game: they get a card too
      C = player(path, c);
      await C.ready;
      const cc = await C.waitFor((s) => s.phase === "question" && s.qi === 1 && s.bingo && s.bingo.card);
      assert.equal(cc.bingo.card.length, 16);
      bots.push(C);
      qs.push(cc);
    }
    if (qi === 3) { // B's Wi-Fi blips: same card when they come back
      const before = cardOf(B).map(sig);
      B.ws.close();
      await sleep(150);
      const B2 = player(path, b);
      await B2.ready;
      const back = await B2.waitFor((s) => s.phase === "question" && s.qi === 3);
      assert.deepEqual(back.bingo.card.map(sig), before, "same card after reconnecting");
      bots[1] = B2;
      qs[1] = back;
    }
    const taps = bots.map((p, i) => tapFor(p, qs[i], qi));
    bots.forEach((p, i) => p.send({ t: "mark", call: qi, cell: taps[i], ms: 900 + i * 300 }));
    if (qi === 0) B.send({ t: "mark", call: 0, cell: taps[1] === "none" ? 4 : "none" }); // a second tap: ignored
    const rs = await Promise.all(bots.map((p) => p.waitFor((s) => s.phase === "reveal" && s.qi === qi)));
    bots.forEach((p) => p.send({ t: "mark", call: qi, cell: 0 })); // too late: the call is over
    if (qi === 0) {
      await sleep(200);
      assert.ok(!A.states.some((s) => s.qi === 0 && s.event === "answered" && s.phase === "reveal"), "late taps are ignored");
      assert.equal(A.last().mine.cell, rs[0].mine.cell, "and change nothing");
    }
    const [ra] = rs;
    known.set(callSig(qs[0]), sig(ra.reveal.square));
    rs.forEach((r, i) => {
      const tap = taps[i], mine = r.mine;
      assert.equal(mine.cell, tap, "my first tap is the one that counts");
      assert.equal(mine.right, r.reveal.cell >= 0 ? tap === r.reveal.cell : tap === "none", "right = the answer's square, or 'not on my card' when it isn't");
      assert.equal(r.bingo.card.findIndex((sq) => sig(sq) === sig(r.reveal.square)), r.reveal.cell, "the reveal points at the answer on MY card");
      if (mine.stamp) assert.equal(r.bingo.card[tap].on, 1, "a right tap stamps the square");
    });
    for (const p of ra.players) points.set(p.id, (points.get(p.id) || 0) + p.last.points + p.last.bonus);
    if (ra.bingo.winners) winners = ra.bingo.winners;
    for (const r of rs) for (const sq of r.bingo.card) round1.add(sig(sq));
    A.send({ t: "next" }); // the host skips ahead
  }
  assert.ok(winners && winners.length >= 1, "someone got BINGO");
  assert.ok(round1.size <= 24, "every card comes from one pool of 24 squares");
  const fin = await A.waitFor((s) => s.phase === "final");
  await sleep(200);
  for (const p of fin.players) assert.equal(p.score, points.get(p.id), `${p.name}'s points add up`);
  assert.deepEqual(fin.final.ranking.slice(0, winners.length), winners.map((w) => w.seat), "BINGO winners first, fastest tap first");
  const rest = fin.final.ranking.slice(winners.length).map((seat) => fin.players.find((p) => p.id === seat).score);
  for (let i = 1; i < rest.length; i++) assert.ok(rest[i - 1] >= rest[i], "everyone else by score");
  for (const w of winners) {
    const pl = fin.players.find((p) => p.id === w.seat);
    assert.ok(pl.bingo >= 1 && pl.away === 0, "the winner's card has a line");
    const bot = bots.find((p) => p.last().me === w.seat);
    await bot.waitFor((s) => (s.myStickers || []).includes("bingo_line"));
  }
  // Nothing secret ever reached a browser: no bingo flags, no private ids.
  for (const p of [A, B, ...bots]) for (const st of p.states) {
    const txt = JSON.stringify(st);
    assert.ok(!/alsoRight|noBingo/.test(txt), "bingo flags leaked");
    for (const secret of [a.id, b.id, c.id]) assert.ok(!txt.includes(secret), "a private player id leaked");
  }

  // Rematch: fresh cards from fresh flags. Then the host leaves mid-game and it carries on without them.
  A.send({ t: "rematch" });
  await bots[1].waitFor((s) => s.phase === "lobby" && s.event === "rematch");
  A.send({ t: "start" });
  const fresh = await bots[1].waitFor((s) => s.phase === "countdown" && s.round === 2 && s.bingo);
  const continents = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"]; // (these can come round again)
  assert.equal(fresh.bingo.card.filter((sq) => round1.has(sig(sq)) && !continents.includes(sq.label)).length, 0, "a rematch card has fresh flags");
  await bots[1].waitFor((s) => s.phase === "question" && s.round === 2);
  A.send({ t: "leave" });
  A.ws.close();
  bots.slice(1).forEach((p) => p.send({ t: "mark", call: 0, cell: "none" }));
  const rv = await bots[1].waitFor((s) => s.phase === "reveal" && s.round === 2);
  assert.notEqual(rv.hostId, A.last().me, "the host role moved on");
  console.log(`  bingo: ${calls} calls (${secondChances} second chances), BINGO for ${winners.map((w) => fin.players.find((p) => p.id === w.seat).name).join(" + ")}, scores ${fin.players.map((p) => `${p.name}=${p.score}`).join(", ")}`);
  bots.forEach((p) => p.ws.close());
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
console.log("stickers…");
await stickersTest();
console.log("remember me…");
await rememberMe();
console.log("names…");
await namesTest();
console.log("bingo…");
await bingoRoom();
console.log(`✔ e2e passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(0);
