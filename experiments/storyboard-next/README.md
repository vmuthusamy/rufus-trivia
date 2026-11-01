# Rufus: reversible experience experiment

Local implementation of the reviewed direction. Built in a separate folder so the original can be restored by opening its URL; production files are unchanged by this experiment.

## Compare

- New: http://127.0.0.1:8791/?theme=park&night=1
- Original: http://127.0.0.1:8790/?theme=park&night=1
- New Fox House: http://127.0.0.1:8791/?night=1

Select Animal Kingdom and board/open the book. The boarding screen explains the existing solo rules. Begin the expedition to connect to the real local game server. Questions, answer reveals, scores, lives, deadlines and earned stickers come from GameRoom/Hall. The surrounding scenery stays visible. Finish expedition ends the run through the server; Back to exploring restores your place.

All six room/ride destinations now start real solo games. The map room and World Balloons offer Country Maps, Capital Quest, US State Explorer and the existing flags game. Challenge rooms and Bingo remain in the original app.

## Run locally

For a fresh checkout, install dependencies from the repository root:

```sh
npm ci
npm ci --prefix experiments/storyboard-next
```

Then, in one terminal:

```sh
WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler dev --config experiments/storyboard-backend/wrangler.json --local --ip 127.0.0.1 --port 8793 --persist-to /tmp/rufus-storyboard-next-state
```

In another:

```sh
node experiments/storyboard-next/preview-server.mjs
```

The preview pins its own Three.js version. Existing local setups may share the original experiment’s installation through an ignored `node_modules` symlink; fresh checkouts use the install commands above. To run the original comparison too, install its dependencies with `npm ci --prefix experiments/storyboard`. The real backend runs entirely locally. This preview has a separate origin and local test database; it does not import or alter your online profile, scores or stickers. Do not use this development proxy as an internet-facing server.

## Revert

Open the original URL on port 8790. No production rollback or Git reset is needed. The original `experiments/storyboard` files were not edited. `baseline-manifest.json` records their source hashes when this experiment began. Keep the new folder if useful; it is not imported by production.

To stop this experiment, stop its two local terminal processes. Do not stop or replace the original preview on 8790.

## What changed

- Shared Three.js renderer; park is built when first visited. Day and evening house scenes are cached rather than rebuilt on every resize.
- Aspect-correct room camera, interpolated park camera, explicit glow roles and cleanup on exit.
- Consistent explicit motion controls, still scenery while answering, keyboard focus restored to the actual opener, and HTML fallback if WebGL is unavailable.
- Real Animal Kingdom solo adapter reuses the app's `net.js` and `store.js`; no answer bank or client grading in this path.
- Responsive question dock, question-index boat stops, server score/hearts, final notebook, and server-confirmed sticker album. Every room uses this same server-driven adapter.
- Reconnect uses an ownership baseline so it does not celebrate old stickers again. Server clocks continue while the tab is away or scenery is paused.

## Checks performed

- `node --test experiments/storyboard-next/journey-state.test.mjs`: 5 passing checks for ownership baselines, new sticker differences, reconnect, countdown offsets and question progress.
- With both servers running: `node experiments/storyboard-next/integration.test.mjs`: real API/proxy/WebSocket flow, hidden answers before reveal, server scoring, reconnect at the same question/score, advance, finish and persisted collection.
- Browser: real answer and reveal, desktop 1280px and phone 390px, switching shared canvas from park back to house. Original source hashes checked unchanged.

Still needs your visual acceptance. No performance certification or real-device frame-rate measurement is claimed. No production deploy, push or multiplayer migration is included.

## Scene music and companions

Tap **Music** to listen; it starts off on each page load. Fox House daytime uses “Rufus’s reading room”; evening uses “By the fireplace.” Park daytime uses “Wonder Park parade”; evening uses “Lanterns after dark.” These are original Rufus melodies arranged with gentler instruments, tempo and percussion for each setting. No external recordings or Disney music are used. Questions lower the music volume; hiding the tab stops it. A volume slider controls both music and answer sounds. Pausing visual motion does not mute the music.

The experiment-local `scene-sound.js` derives from this repository’s existing `public/js/sound.js`; the production file is unchanged. `scene-mood.js` maps the four settings to arrangements. Both are plain JavaScript.

Before starting Animal Kingdom, choose Rufus or Fiery as your companion. The existing server question pool (including Fox Facts and Dino Dig) is unchanged; the order still varies by run. Question-provided character artwork now renders too. The remaining room topics reuse the existing question generators.

Checks: seven focused tests pass, and browser controls were checked for music activation, park/day and house/night mood changes, muted state, and Fiery selection. Listening quality is for your local playtest; no claim of an audio listening review is made.


## Six-room house and geography (October 12)

The Fox House is now a cutaway house with a Story Studio, Star Attic, Playroom, Cozy Lounge, Fiery’s Kitchen and Map Room. Select a room to move the camera inside; **All rooms** returns to the overview. HTML room buttons remain available when WebGL is unavailable. Scenery obeys Pause motion, reduced-motion preferences, hidden tabs and the question reading state. Only one Three.js canvas is used for the two settings.

`house-rooms.js` is the room guide: change a room’s name or description there. `house-stage.js` builds furniture and its movements. For example, the chair’s `Math.sin(t*1.05)*.065` controls how quickly and how far it rocks; a smaller final number makes a gentler rocking chair.

The immediate previous bookshelf implementation is saved in `bookshelf-backup/` (restore its five files into this experiment if wanted). The earlier port-8790 baseline remains unchanged and is the simplest comparison.

The isolated backend entry at `../storyboard-backend/worker.js` registers the three geography topics **only for this local experiment**, then uses the original GameRoom, HallOfFame and Stats. Production’s registry and source files are unchanged. Each new topic has a server-awarded master sticker; topic titles come from `/api/meta`. No external inference or cloud services are needed.

US state geometry comes from pinned us-atlas 3.0.1 / US Census 2017 boundaries. `node experiments/storyboard-backend/build-states.mjs` rebuilds 50 anonymous map SVG files and server-side state metadata. Country map SVGs and capital questions reuse the existing bank. Capital Quest highlights the associated country; it does not pinpoint the capital city. Geographic source credits are linked in the preview footer.

Validation: 127 existing project tests pass; 12 focused experiment tests pass, including 2,700 generated geography questions over fixed seeds/difficulties and assets for all 50 states. Real local API tests also pass for countries, capitals, states and mix (private answers, server reveal, reconnect, next, finish, sticker persistence). Phone and desktop layout are checked in the browser; visual acceptance remains yours.

## Development status

Saved on `codex/fox-house-park-experiment` while product features continue on the existing website. This is an opt-in local experiment, not a production replacement. Multiplayer host/join, shared adventure rounds and Bingo are not wired into this interface yet. Production deployment stays on `main`.
