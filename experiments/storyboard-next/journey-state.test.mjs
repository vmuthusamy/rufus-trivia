import test from 'node:test';
import assert from 'node:assert/strict';
import {stickerChanges,stopLabel,secondsLeft} from './journey-state.js';
test('first ownership snapshot is an album baseline, not a new award',()=>{const result=stickerChanges(null,['speedy']);assert.deepEqual(result.fresh,[]);assert(result.owned.has('speedy'));});
test('only newly confirmed stickers are announced, and repeated snapshots are quiet',()=>{const first=stickerChanges(new Set(['speedy']),['speedy','streak3']);assert.deepEqual(first.fresh,['streak3']);assert.deepEqual(stickerChanges(first.owned,['speedy','streak3']).fresh,[]);});
test('reconnection baselines do not replay previously earned rewards',()=>assert.deepEqual(stickerChanges(null,['speedy','streak3']).fresh,[]));
test('server time offset determines the displayed countdown and clamps expiry',()=>{assert.equal(secondsLeft({deadline:15000},6000,3000),6);assert.equal(secondsLeft({deadline:15000},16000,0),0);});
test('solo discoveries follow question index, not score or a fictional total',()=>{assert.equal(stopLabel({phase:'question',qi:7,score:0}),'Discovery 8');assert.equal(stopLabel({phase:'final',final:{asked:9}}),'9 discoveries');});
