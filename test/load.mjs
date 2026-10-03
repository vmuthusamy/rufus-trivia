// 🧪 LOAD + FAIRNESS TEST: lots of pretend kids playing challenge rooms at the same time.
//
//   node test/load.mjs                                   # against npm run dev (6 rooms x 25 players)
//   node test/load.mjs --base https://rufustrivia.com --rooms 3 --players 10 --questions 3
//
// For every question in every room it checks:
//   - everyone got exactly the same question and the same deadline
//   - everyone saw the same right answer at the reveal
//   - points only for right answers, and final scores = the sum of the points
// and it measures how far apart the question arrived for the first and last player.
// (Only challenge rooms are used, so it never touches the Hall of Fame.)

import assert from "node:assert/strict";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const BASE = arg("--base", "http://127.0.0.1:8787");
const WS = BASE.replace(/^http/, "ws");
const ROOMS = Number(arg("--rooms", 6)), PLAYERS = Number(arg("--players", 25)), QUESTIONS = Number(arg("--questions", 5));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ADJ = ["Turbo", "Sneaky", "Mighty", "Cosmic", "Fuzzy", "Jolly", "Speedy", "Brave", "Clever", "Lucky"];
const ANI = ["Fox", "Panda", "Tiger", "Frog", "Monkey", "Lion", "Koala", "Octopus", "Unicorn", "Dragon"];
const bot = (i) => ({ id: "load" + Math.random().toString(36).slice(2, 12), adj: ADJ[i % 10], animal: ANI[Math.floor(i / 10) % 10], color: "#38bdf8" });

function connect(code, player) {
  const ws = new WebSocket(`${WS}/api/rooms/${code}/ws`);
  const me = { ws, player, states: [], qArrive: {}, errors: [] };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.t === "error") me.errors.push(m.message);
    if (m.t !== "state") return;
    me.states.push(m);
    if (m.phase === "question" && me.qArrive[m.qi] === undefined) {
      me.qArrive[m.qi] = performance.now();
      const delay = 300 + Math.random() * 3500; // kids take different amounts of time
      setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: "answer", q: m.qi, choice: Math.floor(Math.random() * 4), ms: delay })), delay);
    }
  };
  me.open = new Promise((res, rej) => { ws.onopen = () => { ws.send(JSON.stringify({ t: "hello", player })); res(); }; ws.onerror = rej; });
  return me;
}

async function room(n) {
  const host = bot(0);
  const res = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic: ["flags", "world", "math", "space"][n % 4], count: QUESTIONS, timer: 10, level: "mixed", player: host }) });
  const made = await res.json();
  if (!made.code) throw new Error(`couldn't make a room: ${made.error} (rooms allow 5, 10, 15 or 20 questions)`);
  const { code } = made;
  const kids = [connect(code, host)];
  for (let i = 1; i < PLAYERS; i++) kids.push(connect(code, bot(i)));
  await Promise.all(kids.map((k) => k.open));
  const t0 = performance.now();
  while (performance.now() - t0 < 15000 && (kids[0].states.at(-1)?.players.length || 0) < PLAYERS) await sleep(100);
  assert.equal(kids[0].states.at(-1).players.length, PLAYERS, `room ${code}: everyone got in`);
  kids[0].ws.send(JSON.stringify({ t: "start" }));
  const end = performance.now() + QUESTIONS * 25000 + 15000;
  while (performance.now() < end && !kids.every((k) => k.states.at(-1)?.phase === "final")) await sleep(200);

  const spreads = [];
  for (let qi = 0; qi < QUESTIONS; qi++) {
    const qs = kids.map((k) => k.states.find((s) => s.phase === "question" && s.qi === qi));
    assert.ok(qs.every(Boolean), `room ${code} q${qi + 1}: everyone got the question`);
    const same = JSON.stringify(qs[0].question);
    assert.ok(qs.every((s) => JSON.stringify(s.question) === same && s.deadline === qs[0].deadline), `room ${code} q${qi + 1}: identical question + deadline`);
    const rv = kids.map((k) => k.states.find((s) => s.phase === "reveal" && s.qi === qi));
    assert.ok(rv.every((s) => s && s.reveal.answer === rv[0].reveal.answer), `room ${code} q${qi + 1}: same answer for everyone`);
    for (const p of rv[0].players) if (p.last) assert.equal(p.last.correct, p.last.points > 0, "points only for right answers");
    const arrivals = kids.map((k) => k.qArrive[qi]);
    spreads.push(Math.max(...arrivals) - Math.min(...arrivals));
  }
  const fin = kids[0].states.at(-1);
  assert.equal(fin.phase, "final", `room ${code} finished`);
  // final score = sum of every reveal's points
  for (const p of fin.players) {
    let sum = 0;
    for (let qi = 0; qi < QUESTIONS; qi++) sum += (kids[0].states.find((s) => s.phase === "reveal" && s.qi === qi).players.find((x) => x.id === p.id).last || { points: 0 }).points;
    assert.equal(p.score, sum, `${p.name}: score adds up`);
  }
  kids.forEach((k) => k.ws.close());
  return { code, spreads, errors: kids.flatMap((k) => k.errors) };
}

const t0 = performance.now();
console.log(`${ROOMS} rooms x ${PLAYERS} players x ${QUESTIONS} questions against ${BASE}…`);
const results = await Promise.all(Array.from({ length: ROOMS }, (_, i) => room(i)));
const all = results.flatMap((r) => r.spreads).sort((a, b) => a - b);
const pct = (p) => all[Math.min(all.length - 1, Math.floor(p * all.length))].toFixed(0);
console.log(`✔ ${ROOMS * PLAYERS} players, ${ROOMS * QUESTIONS} questions: all fair (same questions, answers and deadlines; scores add up)`);
console.log(`  question reached the first and last kid within: median ${pct(0.5)} ms, worst ${pct(0.99)} ms`);
const errs = results.flatMap((r) => r.errors);
if (errs.length) console.log(`  server messages: ${[...new Set(errs)].join("; ")}`);
console.log(`  took ${((performance.now() - t0) / 1000).toFixed(1)}s`);
process.exit(0);
