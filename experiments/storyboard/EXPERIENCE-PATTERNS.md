# Rufus experience patterns

Status: reviewed direction, 2026-10-12. This document guides the next implementation; it does not claim the changes below are already built. See [Claude's full review](CLAUDE-EXPERIENCE-REVIEW.md).

## Keep the world visible through the game

Keep the warm handmade Fox House, miniature carnival, and pixel foxes. The next improvement is to make these places participate in trivia:

- Pull a book out of the shelf; its illustrated scene stays beside the question.
- Board a ride; each question is a physical stop along its route.
- Answer using clear HTML controls. The scenery becomes still while reading and answering.
- Show the server's explanation at reveal. Where structured data supports it, the scene illustrates the fact.
- Show an earned sticker in a notebook at home or a park passport. Ownership comes from the existing game.
- Return to the chosen book or ride, preserving selection and keyboard focus.

Wrong answers still advance through the journey. Track position shows questions completed, not correctness. Avoid invented educational claims and never derive hidden answers from scenery.

## Motion rules

| Moment | Treatment | Still alternative |
|---|---|---|
| Exploring | Slow chair, steam, curtains and ride cycles; one selected object has emphasis | Composed static pose |
| Selecting | Immediate outline/highlight; short book lift or fox movement | Instant highlight and position |
| Entering | Optional 400–600 ms camera/book transition; question controls become usable independently | Immediate destination |
| Answering | Still scene; HTML question and choices take priority | Same |
| Reveal | Server result and fact appear immediately; brief visual explanation where useful | Final explanatory pose |
| Reward | Existing server-confirmed new sticker gets a small announcement; fuller album reveal between rounds or at the end | Static sticker and accessible text |
| Returning | Short transition and focus restoration to the invoking control | Immediate return and focus |

Use one motion policy for CSS and Three.js: system preference, explicit user choice, tab visibility, current screen and question phase. Explicit motion opt-in must work consistently; animation must never be required for understanding. Preserve the manual pause control. No automatic audio.

## Reusable implementation boundaries

- One stage manager owns the renderer, animation scheduling, aspect ratio, quality settings, context loss and disposal. Build each world lazily and cache it appropriately.
- Scene modules expose build, mood, focus, phase/state, update and dispose operations. Reuse geometries and appropriate materials. Tag glow roles explicitly.
- HTML owns text, controls, focus, announcements and fallback. CSS handles nearby decorative details. Three.js owns spatial objects and camera composition.
- A fixture adapter may grade local examples. The production adapter only presents server public state and forwards existing player intents; fixture answer banks never ship as real-game logic.
- Reuse existing `handleStickers`, ownership persistence, queues and fun-tap pathways. Do not award stickers from animation or repeat celebrations when reconnecting to an ownership snapshot.
- Read server timestamps if needed to synchronize visuals. Never gate choices on animation, invent a client deadline, or extend server time.
- Plain ES modules are sufficient. Format new code into readable functions with comments a young designer can understand.

## Build in this order

1. **Polish the experiment:** fix house aspect and rebuilds; fix the zero-delta camera snap; unify motion preferences; restore focus to the real opener; resolve mobile clock/caption overlap; simplify close-up framing. Add lifecycle cleanup and lazy/shared rendering. Acceptance: phone/tablet/desktop composition, consistent pause behavior, usable no-WebGL fallback, and stable memory after warmup. These checks are not yet complete.
2. **Connect one real journey:** Animal Kingdom with real questions and existing stickers behind an opt-in route/flag. Keep normal trivia available. Acceptance: server-only results/deadlines, immediate answer readiness, reconnect to current progress, existing collection intact, no duplicate reward presentation, and appropriate existing unit/e2e checks. Judge the experience before expanding.
3. **Extend the pattern:** other books/rides and the album/passport entry points. Preserve modes and existing features; explicitly resolve the relationship between Wonder Express and Arcade. Profile real phones/tablets, wire the existing lightweight-mode signal, and credit any shipped dependencies/assets.

## Scope discipline

Do not add another world, runtime AI, a framework migration, a free camera, autoplay sound, or a pile of competing effects in this slice. Richness should come from responsive objects, purposeful transitions, readable lighting and the connection between the scene and the game. Device performance is measured, not inferred from a screenshot.
