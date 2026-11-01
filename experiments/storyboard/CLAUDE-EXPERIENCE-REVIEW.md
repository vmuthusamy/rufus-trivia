# Claude experience review — 2026-10-12

Requested by the user. Produced by the installed Claude Code CLI (reported model: `claude-opus-5-5`) with all tools disabled. Inputs: current storyboard code, repository guidelines, public-question/sticker definitions, and four previously captured screenshots. This is a static design/code review, not browser QA, animation observation or a performance benchmark. No application code was changed for this review.

Read [EXPERIENCE-PATTERNS.md](EXPERIENCE-PATTERNS.md) for the implementation direction and corrections checked against the real trivia code. The original review below is retained unedited so its advice remains distinguishable from our decisions.

---

# Rufus Fox House & Wonder Park: Design and Code Review

*Review only. I read the supplied source and the four static screenshots. I did not run anything, and I make no claims about frame rate or how the motion looks in practice.*

## 1. Verdict

**What already feels rich.** The evening park (`rufus-night-park.png`) is the strongest frame. The palette is coherent: navy sky, warm cream paths, dusty pastel rides. The instanced bulbs and additive halo sprites (`park-stage.js:43–57`) do most of the "magic" with very little geometry. The HTML ride signs are projected onto 3D anchors (`layout`, `park-stage.js:73`), so the scene stays accessible without losing the diorama feel. "Rufus is here" is a charming wayfinding device.

In the evening house, the hearth, steam, candle and rocking chair give the pixel fox a home rather than a background. The chair belongs to the button so they rock together (`fox-house.js:9`). The bookshelf-as-menu metaphor reads instantly for a 9-year-old.

The engineering instincts are also sound:
- delta clamping
- a local clock that never jumps after a hidden tab
- a paused pose that still reads (`ride-motion.js:50`)
- real HTML controls, plus a flat fallback when WebGL is missing

**What still feels like a mockup.**
1. **The learning moment leaves the world.** `renderAdventure` runs inside a modal `<dialog>` with a ~79%-opaque backdrop (`dialog::backdrop{background:#26372bc9}`). The ride you just chose disappears exactly when the journey "happens." The three stops exist only as text chips in `#journey-progress`.
2. **The house's 3D room is mostly wallpaper.** The bookshelf covers ~55% of it, the bubble covers the window and lamp, and the armchair hides behind Rufus. The visible richness is CSS. The Three.js room costs a WebGL context while showing mainly a window and a floor.
3. **The close-up is a zoomed map, not a destination.** In `rufus-animated-coaster.png`, the park banner, moon and pennant string sit over the coaster, and bulbs float as large dots. Only the signs and fox are hidden (`.close-up .ride-signs,.close-up .park-fox`).
4. **Overlays collide.** In the mobile screenshot, the window label reads "The stars are out. T▢ fire is warm." because the clock (`.home-clock`, left 33%) sits on top of it.

**Recommended direction:** *the world is the progress bar.* Each question is a stop the ride physically arrives at. The question card docks beside a visible, quietly paused scene. Celebrations happen in one consistent place. That is "exotic" in the sense you asked for: one distinctive idea carried through, rather than more effects.

## 2. Problems (max 6, by priority)

**P1: Room camera ignores aspect; resize rebuilds the room.**
*Observed code issue:* `initRoom` (`fox-house.js:53`) creates a fixed `OrthographicCamera(-6,6,4.4,-4.4)`. Its `ResizeObserver` calls `renderer.setSize` and then `drawRoom()`, but never updates `left/right/top/bottom`. Compare the park's `layout()`, which does this correctly.
*Inferred effect:* on a ~360px-wide phone the room is squashed horizontally, and the mobile screenshot's narrow window is consistent with that.
Separately, `drawRoom` (`:56`) disposes and rebuilds every mesh on each resize, theme change and day/night toggle. Night should change light and material values, not geometry.

**P1: Two WebGL contexts at startup.**
*Observed:* `initRoom()` creates one renderer (`fox-house.js:53`), and `createPark` creates a second one on load even in house mode (`fox-house.js:50`, `park-stage.js:15`). Every park mesh also gets its own `MeshStandardMaterial` (`park-stage.js:24`).
*Inferred risk:* memory pressure and context loss on older iPads and low-end tablets. Neither renderer handles `webglcontextlost`. This needs real-device checking, not guessing.

**P2: Layering and composition collisions.**
*Observed in screenshots:* the mobile window label overlaps the clock. The bubble hides the 3D lamp and window on desktop. In close-up, the banner, moon and hint stay on screen. `focusRide` (`park-stage.js:20`) only toggles `.close-up` on the map.
*Design opinion:* close-up should hide `.park-banner`, `.night-sky .moon` and the pennant string, and keep one caption.

**P2: Motion policy is split between CSS and JS.**
*Observed:* `fox-house.css:26` kills all CSS animation under `prefers-reduced-motion`. If the user then presses "Play motion," `syncMotion` (`fox-house.js:24`) resumes Three.js but the fire, rocking and steam stay frozen. The opt-in is only half honoured. CSS should key off `body[data-motion=running]` alone, with JS as the single source of truth.

**P2: Accessibility details.**
*Observed:*
- `#effects` and `#light` change their label *and* flip `aria-pressed`. A screen reader hears "Pause motion, pressed," which is ambiguous. Pick one: keep a constant label with `aria-pressed`, or switch the label without it.
- The dialog `close` handler always focuses `#open-book` (`fox-house.js:48`), even when it was opened from a story card or `#quick-open`. Focus should return to the button that opened it.

**P3: Fragile scene tagging and fox rendering.**
*Observed:*
- Glowing accents are found by matching a hex colour (`o.material.color.getHex()===0x83b9b8`, `park-stage.js:59`). Recolouring the water silently breaks the night glow. Tag these with `userData.glow` instead.
- Ripples set `material.transparent=true` every frame (`ride-motion.js:19`). Set it once at build time.

*Inferred risk:* `cozy-rock` rotates the whole `.rufus` button ±2° (`fox-house.css:32`). Rotating a `pixelated` SVG at non-right angles can shimmer the fox's edges. Rock the chair only and let Rufus bob vertically by whole pixels, which keeps the pixel identity crisp.

**Integration note (not a bug):** `renderAdventure` decides correctness inline (`i===q.answer`, `fox-house.js:46`), and `park-data.js` ships answers to the browser. That is fine for a local fixture, but this code must not survive into production (see §4).

## 3. Storyboard

**Core rule.** The scene is a *view of state*, like `app.js` re-rendering from each state message. Question content and enabled choices render the moment state arrives. No animation gates answer readiness, and the scene never reads a deadline. Ride pose is a pure function: `poseFor(phase, questionIndex, count)`.

| Phase | House (books) | Park (rides) | Timing intent | Reduced motion |
|---|---|---|---|---|
| **Ambient** | Fire, steam, pendulum, slow chair rock; curtains breathe | Rides loop; halos breathe at night | 4–8 s cycles, nothing faster than the pendulum | Static poses; night is shown by light alone |
| **Hover/tap** | Book lifts (exists); Rufus greets via bubble | Sign lifts; matching 3D ride gets a soft ground halo; fox walks over | ≤150 ms response; fox walk ~0.7 s (exists) | Outline and halo appear instantly; fox jumps |
| **Entering** | Book slides out, room light warms, card docks beside the shelf | Camera eases to the ride; park chrome fades; car waits at stop 1 | 400–600 ms, skippable; card content is live immediately | Crossfade ≤150 ms or instant |
| **Answering** | Scene holds still and dims slightly; focus on choices | Car parked at the stop; scene paused (your existing rule) | Zero scenery motion. The only motion is a server timer, if the mode has one | Same |
| **Reveal** | Triggered by server reveal state: chosen and right choices marked, fact appears | Same; then the car glides to the next stop *behind* the next question | Mark ≤200 ms; glide runs while the next card is already usable | Car snaps to next stop |
| **Sticker earned** | Only if the reveal state carries it: sticker emoji flies into Rufus's notebook on the mantel | Sticker lands in a ride "photo booth" frame at the gate | One beat (~800 ms), never blocking the next question; `aria-live` text names it | Static card plus text announcement |
| **Return** | Book slides back; focus returns to the invoking button | Camera eases out; chrome fades in; focus returns to the sign or button | 400 ms | Instant |

**Educational purpose.** Position on the track equals questions completed, not score. A wrong answer still advances, which matches your copy "we learn something even when we try a different answer." The fact is framed as a notebook discovery. The pretend line stays on the boarding card.

**Reconnect.** Rebuild from the current state snapshot. Snap to `poseFor` for that index without replaying past stops or past celebrations.

**Duplicate rewards.** Keep a "presented" set keyed by game, question index and sticker id in `sessionStorage`. Celebrate a sticker only the first time its key appears. The Hall-backed collection stays the source of truth for ownership; the set only governs animation.

**Rufus taps.** If a tap ever counts toward a sticker, it must go through the existing `funProgress` path in `rufus.js`. Rocking and idle motion never count.

## 4. Architecture (plain ES modules, no React/R3F)

```
scene/stage.js        one WebGLRenderer, one rAF, delta clamp, resize→aspect,
                      DPR cap, context-loss handling, dispose()
scene/kit.js          shared material palette (cached by colour), shared geometries,
                      instanced helpers, userData tags
scene/house-scene.js  build() once; setMood({night}); update(dt,t); dispose()
scene/park-scene.js   build() once; setFocus(id); poseFor(...); update; dispose
scene/rides/*.js      each ride: {group, update(t), stops:[curve u values]}
motion.js             single policy: toggle + prefers-reduced-motion + html.lite
                      + hidden + dialog open → body[data-motion] AND stage
ui/journey.js         renders a view model {phase, prompt, choices, reveal, stickers};
                      emits choose(i); NEVER computes correctness
adapters/fixture.js   experiment only: grades from park-data.js
adapters/room.js      later: maps server state → view model; passes reveal through
celebrate.js          presented-set dedupe
```

`ride-motion.js` already follows the official curve pattern (`getPointAt`/`getTangentAt`). Extend it so each ride exposes stop positions, and a car eases between them instead of looping during a journey.

**Three.js vs HTML/CSS:**
- **Three.js:** the world (room shell, rides, lights, camera).
- **HTML:** every word and control, including signs, bubble, cards and sticker emoji from `STICKERS`.
- **CSS:** small ambient details next to the sprite (fire, steam).
- **The pixel fox stays SVG/HTML** and should not become a 3D model.

**Adaptive quality** should hook into the existing `fx.watchFrameRate()` / `html.lite` signal rather than a new heuristic. In lite mode: DPR 1, no halos, fewer bulb instances, no ripples, render on demand. Antialias can only be chosen when the renderer is created.

**Code style.** `fox-house.js` is written as dense one-liners. AGENTS asks for simple, commented code a 9-year-old can tweak, so new modules should look like `ride-motion.js` with its "change a speed and refresh" comment.

## 5. Milestones

**M1: Polish the experiment.**
Acceptance criteria:
- No stretched room at 360 px, 768 px or 1440 px.
- Toggling night or theme leaves `renderer.info.memory.geometries` unchanged.
- One WebGL canvas, with the park scene built lazily on first visit.
- Reduced motion means still by default, and "Play motion" resumes CSS *and* Three.js.
- A keyboard-only user can finish a ride, and focus returns to the invoker.
- No overlay collisions in screenshots at three widths.
- The question card docks with the scene visible.

**M2: One real vertical slice.** One topic (e.g. Animal Kingdom / River Safari) uses `adapters/room.js`, behind a flag.
Acceptance criteria:
- `npm test` and `npm run test:e2e` pass.
- `publicQuestion()` is unchanged, and WebSocket traffic shows no answer before reveal.
- Choices work the instant question state arrives, even mid-animation.
- Server deadlines are untouched.
- Stickers are celebrated only from reveal state, exactly once across a refresh or reconnect.
- The collection reads from the Hall.
- Stops map to question progress (a fraction of the server's count), never to a hard-coded 3.
- Before writing the adapter, check how `room.js` and `app.js` carry awarded stickers. They were not supplied, so I haven't assumed field names.

**M3: Broader integration.**
- All six rides and the house books map to real topics.
- Decide explicitly how Wonder Express (`mix`) coexists with the existing Arcade theme.
- Bingo stays out of scope.
- Lite mode is wired in.
- Three.js gets a section in the `credits.html` generator.

**Needs real-device profiling:** a low-end Android tablet, an older iPad and a school Chromebook. Measure:
- night mode with PointLights and `MeshStandardMaterial`
- the cost of halos and instanced bulbs
- memory with one context vs two
- context-loss recovery
- thermal behaviour over a 10-minute session

Use the DevTools frame counter (per AGENTS) and `renderer.info`. I'm not citing any targets beyond the existing 60 fps rule.

## 6. Do-not-add list

- No post-processing: bloom, depth of field, SSAO or full-screen blur. The painted halos already do this job.
- No `backdrop-filter`, and no `filter` on moving elements (AGENTS rule).
- No particles beyond the existing embers and steam: no confetti storms, fireworks or snow.
- No 3D Rufus or friends; the pixel sprites are the identity.
- No new rides, rooms or zones until M2 ships.
- No free camera, orbit controls or first-person ride mode.
- No sound or animation tied to correctness before the server reveal.
- No scene-side timers, scoring, streak meters or reward logic.
- No runtime AI, and no `Math.random` in anything that must match across a room.
- No flashing or strobing lights (your CSS comment already says so; keep it).
- No external model or texture downloads without a credits entry.

---

## Codex verification and qualifications

- Confirmed in source: room aspect is fixed; `drawRoom` rebuilds geometry on resize/mood changes; both WebGL renderers initialize at startup; there is no whole-stage `dispose()`/context-loss lifecycle; CSS and JS disagree after explicitly enabling motion under reduced-motion preferences; dialog focus always returns to `open-book`.
- Additional camera issue: `draw()` resets `previous=0`; the next frame passes delta 0 to `updateCamera`, whose zero-delta branch sets blend to 1. This snaps to the target before easing can occur. Separate an explicit snap operation from an animation update; zero elapsed time should not complete a transition.
- The statement that the fox already “walks” means a CSS position transition, not a walk cycle. A real walk animation is still a proposed improvement.
- Sticker timing needs a correction. `src/room.js` awards start, answer/reveal and finish stickers. Only correctness-dependent rewards must wait for reveal. Keep all existing reward types and explicit fun-tap paths. `public/js/app.js:handleStickers` already compares `myStickers` against a baseline and queues only newly observed ownership; reuse this behavior before adding another storage/deduplication system.
- A renderer may read authoritative phase timestamps for visual synchronization; it must never own, extend, pause or gate server deadlines. Late join and reconnect should show the current state immediately.
- Keeping `publicQuestion()` unchanged is the default, not an absolute restriction on later validated reveal-only metadata. Never add answers, facts or hints to its pre-answer payload.
- Geometry counts cannot remain unchanged during the first lazy load of another scene. The useful acceptance check is bounded/stable counts after warmup, no growth on repeated switching, and return to the expected baseline after disposal.
- Material caching must distinguish mutable/emissive materials; sharing only by base color can couple unrelated objects when one changes mood or opacity.
- The review's blanket bans on particles, post-processing and camera controls are scope recommendations for this mobile-first pilot. Keep existing embers/halos and an intentional camera; evaluate any later effect against measurable performance and readability before adding it.
- Existing production game modes stay available through the current UI. Deferring a cinematic Bingo treatment does not mean removing Bingo or other game features.

These findings have not been fixed in this review-only pass. Real-device profiling and end-to-end integration remain future work.
