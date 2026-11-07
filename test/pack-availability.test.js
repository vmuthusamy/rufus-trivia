import test from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, CARDS, drawTable, publicCards } from '../src/shared/cards.js';
import { packAvailability, seasonLabel } from '../public/js/pack-availability.js';
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
  assert.equal(CARDS.length,47);
});
