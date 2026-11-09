import test from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, CARDS, drawTable, publicCards } from '../src/shared/cards.js';
import { packAvailability, seasonLabel, seasonShort, seasonOrder, seasonHello } from '../public/js/pack-availability.js';
test('Diwali has exact start and end boundaries and readable Central dates', () => {
  const p=PACKS.diwali, start=Date.parse(p.season.startsAt), end=Date.parse(p.season.endsAt);
  assert.equal(packAvailability(p,start-1),'upcoming');
  assert.equal(packAvailability(p,start),'open');
  assert.equal(packAvailability(p,end-1),'open');
  assert.equal(packAvailability(p,end),'ended');
  assert.match(seasonLabel(p,start),/Nov 15, 2026.*11:59 PM CST/);
  assert.match(seasonLabel(p,end),/collected cards stay yours/);
  assert.deepEqual(publicCards().packs.find(p=>p.id==='diwali').season,p.season);
  assert.equal(packAvailability(PACKS.char,end),'open');
});
test('every permanent pack has its distinct new Legendary and each stays below one percent', () => {
  for(const [pack,id] of Object.entries({char:'family_stage',flag:'world_parade',adventure:'ad_treehouse',math:'ma_carnival',space:'sp_voyage'})) {
    assert.equal(CARDS.find(c=>c.id===id)?.rarity,'legendary');
    assert.equal(Object.fromEntries(drawTable(pack))[id],0.5);
    assert.ok(!PACKS[pack].newCards.includes(id));
  }
  assert.equal(CARDS.length,59);
});

for (const [id, lastDay] of [["scienceweek", "Nov 15"], ["thanksgiving", "Nov 29"]]) {
  test(`${id} opens for exactly seven days with six permanent collectible cards`, () => {
    const p = PACKS[id], start = Date.parse(p.season.startsAt), end = Date.parse(p.season.endsAt);
    assert.equal(end - start, 7 * 24 * 60 * 60 * 1000);
    assert.equal(packAvailability(p, start - 1), 'upcoming');
    assert.equal(packAvailability(p, start), 'open');
    assert.equal(packAvailability(p, end - 1), 'open');
    assert.equal(packAvailability(p, end), 'ended');
    assert.ok(seasonLabel(p, start - 1).includes(lastDay));
    assert.ok(seasonLabel(p, start).includes(lastDay));
    const cards = CARDS.filter(c => c.pack === id);
    assert.equal(cards.length, 6);
    assert.deepEqual(cards.map(c => c.rarity).sort(), ['common','divine','epic','epic','legendary','rare']);
    assert.equal(publicCards().cards.filter(c => c.pack === id).length, 6, 'expired cards remain in the public catalogue');
  });
}

// The owner's rule: a seasonal pack can be bought for at least a week, then only NEW purchases stop.
test('every seasonal pack is open for at least seven days and only buying expires', () => {
  const seasonal = Object.values(PACKS).filter(p => p.season);
  assert.ok(seasonal.length >= 3);
  for (const p of seasonal) {
    const start = Date.parse(p.season.startsAt), end = Date.parse(p.season.endsAt);
    assert.ok(Number.isFinite(start) && Number.isFinite(end), p.id);
    assert.ok(end - start >= 7 * 24 * 60 * 60 * 1000, `${p.id} is open for at least a week`);
    assert.equal(p.season.limited, true);
    assert.ok(CARDS.some(c => c.pack === p.id), `${p.id} cards stay in the catalogue`);
  }
});

// Shelf words a 9-year-old can use; the exact minute stays in seasonLabel().
test('short season lines count days in plain words', () => {
  const p = PACKS.scienceweek, start = Date.parse(p.season.startsAt), end = Date.parse(p.season.endsAt), hour = 3600000;
  assert.equal(seasonShort(p, start - 5 * hour), 'Opens Mon, Nov 9 · here for 7 days');
  assert.equal(seasonShort(p, start), '7 days left · last day Sun, Nov 15');
  assert.equal(seasonShort(p, end - 25 * hour), '2 days left · last day Sun, Nov 15', 'Saturday evening: Saturday and Sunday are left');
  assert.equal(seasonShort(p, end - 24 * hour), 'Last day!', 'from midnight on the last day');
  assert.equal(seasonShort(p, end - 1), 'Last day!');
  assert.equal(seasonShort(p, end), 'Event ended · your cards stay yours');
  assert.equal(seasonShort(PACKS.char, start), '');
});

test('the shelf shows open events first, then coming soon, then ended; Rufus greets the newest open one', () => {
  const ids = (now) => seasonOrder(Object.values(PACKS), now).map(p => p.id);
  const at = (iso) => Date.parse(iso);
  assert.deepEqual(ids(at('2026-11-08T18:00:00Z')), ['diwali', 'scienceweek', 'thanksgiving']);
  assert.deepEqual(ids(at('2026-11-20T18:00:00Z')), ['thanksgiving', 'diwali', 'scienceweek'], 'coming soon before ended');
  assert.deepEqual(ids(at('2026-11-25T18:00:00Z')), ['thanksgiving', 'diwali', 'scienceweek']);
  assert.equal(seasonHello(Object.values(PACKS), at('2026-11-08T18:00:00Z')), PACKS.diwali.season.hello);
  assert.equal(seasonHello(Object.values(PACKS), at('2026-11-10T18:00:00Z')), PACKS.scienceweek.season.hello, 'two open: the newer one says hello');
  assert.equal(seasonHello(Object.values(PACKS), at('2026-11-20T18:00:00Z')), null, 'nothing open: the usual welcome');
  for (const p of Object.values(PACKS).filter(p => p.season)) assert.ok(p.season.hello && p.season.hello.length < 80, `${p.id} has a short hello`);
});
