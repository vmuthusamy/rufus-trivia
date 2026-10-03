import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAnswer, levelFor } from "../src/shared/scoring.js";
import { cleanPlayer, cleanKeys, checkNick } from "../src/shared/names.js";

test("wrong answers score 0", () => {
  assert.equal(scoreAnswer({ correct: false, msUsed: 0, timeLimitMs: 15000, level: 3, streak: 9 }), 0);
});

test("faster and harder answers score more", () => {
  const slow = scoreAnswer({ correct: true, msUsed: 14000, timeLimitMs: 15000, level: 1, streak: 1 });
  const fast = scoreAnswer({ correct: true, msUsed: 1000, timeLimitMs: 15000, level: 1, streak: 1 });
  const hard = scoreAnswer({ correct: true, msUsed: 1000, timeLimitMs: 15000, level: 3, streak: 1 });
  assert.ok(fast > slow && hard > fast);
  assert.equal(scoreAnswer({ correct: true, msUsed: 0, timeLimitMs: 15000, level: 1, streak: 1 }), 1000);
});

test("streak bonus caps at +500", () => {
  const a = scoreAnswer({ correct: true, msUsed: 15000, timeLimitMs: 15000, level: 1, streak: 6 });
  const b = scoreAnswer({ correct: true, msUsed: 15000, timeLimitMs: 15000, level: 1, streak: 60 });
  assert.equal(a, 1000);
  assert.equal(b, 1000);
});

test("mixed games ramp from easy to hard", () => {
  assert.deepEqual([0, 3, 4, 6, 7, 9].map((i) => levelFor("mixed", i, 10)), [1, 1, 2, 2, 3, 3]);
  assert.equal(levelFor("ramp", 0), 1);
  assert.equal(levelFor("ramp", 20), 3);
});

test("nicknames must come from the safe word lists", () => {
  assert.equal(cleanPlayer({ id: "abcdefgh12", adj: "Turbo", animal: "Fox", color: "#ff8a1f" }).name, "Turbo Fox");
  assert.equal(cleanPlayer({ id: "abcdefgh12", adj: "Rude", animal: "Fox" }), null);
  assert.equal(cleanPlayer({ id: "x", adj: "Turbo", animal: "Fox" }), null);
  assert.deepEqual(cleanKeys(["jp", "<script>", 5, "space3"]), ["jp", "space3"]);
});

test("typed-in first names: real names pass, tidied up", () => {
  for (const [input, want] of [["arvind", "Arvind"], ["  Zoë ", "Zoë"], ["mary-jane", "Mary-Jane"], ["Ishita", "Ishita"],
    ["Cassandra", "Cassandra"], ["Dickens", "Dickens"], ["O'Neil", "O'Neil"], ["José Luis", "José Luis"], ["", null]]) {
    const r = checkNick(input);
    assert.equal(r.ok, true, `${input} should be allowed`);
    assert.equal(r.nick, want);
  }
});

test("typed-in names: rude words, numbers, symbols and long names are refused", () => {
  for (const bad of ["fuck", "F u c k", "shit", "Ass", "a-s-s", "Big Butt", "abc123", "Sam 10", "x", "me@mail.com", "site.com",
    "Thisnameiswaytoolong", "<script>", "Hitler"]) {
    assert.equal(checkNick(bad).ok, false, `${bad} should be refused`);
  }
});

test("players: a good typed name becomes the display name, a bad one falls back to the agent name", () => {
  const base = { id: "abcdefgh12", adj: "Turbo", animal: "Fox", color: "#ff8a1f" };
  assert.equal(cleanPlayer({ ...base, nick: "arvind" }).name, "Arvind");
  assert.equal(cleanPlayer({ ...base, nick: "poop" }).name, "Turbo Fox");
});
