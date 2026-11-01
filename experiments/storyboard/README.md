## Reviewed experience direction

[Claude experience review — October 12](CLAUDE-EXPERIENCE-REVIEW.md) · [Implementation patterns and next milestones](EXPERIENCE-PATTERNS.md)

The review covers current screenshots and source, with verified qualifications for the real sticker and game integration. The next direction keeps the world visible during trivia and uses ride stops/book scenes to show progress. Review findings are documented; this review did not change the app.

## Living scenes and ride close-ups

All six rides now move in both daylight and evening. Coaster cars follow the track, the train has three carriages, the safari boat cruises the lagoon, carousel animals bob, balloons sway, and the wheel turns with upright cabins. Select a ride, then use **Watch this ride** for a camera close-up; **Back to park map** restores the overview.

The Fox House has Rufus in a rocking chair, swaying curtains, a pendulum clock, tea steam, and drifting fireplace embers. Night firelight also changes gently. Both scenes pause when a question is open, the tab is hidden, or Pause motion is selected. Reduced-motion preferences start with a still scene. Scene time advances only while playing, so resuming does not jump the rides ahead.

`ride-motion.js` contains the six ride builders and their movement speeds. The implementation uses Three.js curves to position and orient vehicles. Inspiration: the official [roller coaster example](https://threejs.org/examples/#webxr_vr_rollercoaster) and [Curve documentation](https://threejs.org/docs/pages/Curve.html). Models and motion here are authored for Rufus; no external 3D assets were added.

## Evening atmosphere

Open `http://127.0.0.1:8790/?theme=park&night=1` for the illuminated carnival, or `http://127.0.0.1:8790/?night=1` for the fireside room. The Daytime / Evening button changes both settings.

- Carnival: moon and twinkling stars, colored canopy bulbs, glowing coaster rail, illuminated paths, lantern halos, and a slowly turning wheel with upright cabins.
- Fox House: a flickering fireplace, mantel candles, warm reading lamp, a moon outside the window, and Rufus under a striped blanket.
- Pause motion freezes the decorative animation. Reduced-motion preferences start it paused; questions and hidden tabs also pause it. Park geometry is built once; tiny bulbs share a single instanced mesh and halos share a texture. No audio autoplays.
- These remain local visual experiments and sample questions, separate from the production game's scoring.

Try an experiment: change the `lightColors` list in `park-stage.js` to give the carnival your own colors. The fire shapes and blanket live in `fox-house.css`.

# Wonder Park update

The Theme Park now has a separate carnival map. The bookshelf is exclusive to Fox House.

## Six attractions

- Rufus’s Animal Kingdom — river safari / animal discoveries.
- Starlight Mountain — space coaster / launch pad, planet tunnel, moon station.
- Once Upon a Carousel — storybook carousel / familiar tales.
- Around the World Balloons — balloon voyage / flags and places.
- Fiery’s Number Wheel — carnival wheel / counting and multiplication.
- The Wonder Express — train / mixed-topic stations.

Select a sign or tap a 3D attraction. Rufus moves to its entrance. Board the ride, answer at three discovery stops, then return to the park. Correct and incorrect answers both show the fact and continue the journey. On a phone, swipe the map or use the ride picker; its selection pans to the attraction. Evening lights and reduced-motion support are included.

These are original miniature attractions inspired by the idea of themed amusement-park journeys. There are no external park assets, logos, paid services or runtime model calls. The rides are still design-preview fixtures, with 18 authored questions. They do not write real scores. The actual production server remains responsible for question secrecy, answer validation, deadlines and multiplayer.

## Files

- `park-data.js`: ride names, stories, roles, three stops and facts. Start here to change a journey.
- `park-stage.js`: Three.js scenery, projected HTML signs, click targets and Rufus location. Rides animate while the visible park is playing; static poses render on selection, resize or lighting changes when paused.
- `fox-house.js`: shared preview flow; house still uses one sample question and park uses three stops.

## Verification for this update

Six rides and 18 question records passed shape/answer-reference checks. In-browser Starlight Mountain boarding, all three stops (including a wrong answer), completion and return to park worked. Switching back to Fox House restored its bookshelf and original sample story. At 390px, selecting Wonder Express via the ride picker changed the attraction and preserved the 390px page width; evening mode rendered without console errors. The map intentionally scrolls horizontally inside its own frame. Renderer-failure fallback remains unforced. No production files changed or deployment performed.

---

# Fox House design update

The experiment homepage now follows the supplied Fox House sketch. The original six-beat storyboard is preserved at `story-workshop.html`.

- Rufus and a Three.js living area sit on the left; a three-row bookshelf sits on the right.
- Six books select existing topic families, with category names underneath.
- The theme selector changes between the house and an outdoor story-garden interpretation of the theme park. Daytime/evening switches lighting colors. No rides or walkable 3D navigation yet.
- Each book opens a mission → one sample question → learning feedback → discovery ending.
- Three role-play invitations let children become the picnic planner, world explorer or space explorer. Acting out prompts is optional; nothing records voice, location or camera input.
- Keyboard-operable HTML buttons sit above Three.js scenery. All game flow works without the room renderer. The room renders only on resize or a theme/light change.
- This is an authored, client-side design fixture. Production questions, answers, timing, scoring and rooms still belong to the existing server; do not reuse these sample answers as a competitive-game implementation.

## Easy places to experiment

`fox-house-data.js`: change a book’s `title`, `description`, `role` or `pretend` line. Refresh to see the new story. The original topic template is still `src/shared/topics/_template.js` when it is time to add a real topic.

`fox-house.js`: room shapes and interactive flow. `fox-house.css`: room placement, shelf appearance and phone layout.

## Checked for this update

Three.js rendered without browser errors. Desktop 1280px and phone 390px layouts had no horizontal overflow. The math incorrect-answer path reached its ending; the animal correct-answer path showed its fact. Theme park, evening mode, opening a book from the phone room footer, closing the dialog, and returning home worked. WebGL-unavailable is handled but not separately forced in this check. Existing production files were not changed and nothing was deployed.

---

# Rufus story workshop

Local design experiment, not connected to live trivia, scoring, rooms or inference.

Run `npm install` in this folder, then `npm start`. Open http://127.0.0.1:8790.
Three.js is pinned to 0.186.1. All assets load locally after installation.

## Compare three directions

1. **Pop-up trail (recommended):** one little paper scene per question. Reuses the foxes and works across topics.
2. **Star explorers:** a strong science setting; less natural for every topic.
3. **Missing picnic:** a familiar neighborhood story. Clues must advance after learning, even when an answer is wrong.

Click a world, then the six storyboard beats. The sample question shows 4 × 6; try both answers. The reveal builds 24 blocks. These are authored preview fixtures, not the production question generator.

## Pilot flow

Invitation → meet the crew → question → learn/reveal → next discovery (repeat questions 2–5) → ending.

Use short dialogue before and after a question. During actual timed play, the question and answer buttons get priority. This workshop exposes director notes for review; those notes are not proposed player UI.

## Proposed integration

- A future `story-stage.js` adapter exposes `mount(element)`, `setPhase(publicState)` and `dispose()`.
- Scene definitions contain scene ID, topic, guide, authored captions, geometry parameters and reduced-motion pose.
- Server phase, round index and deadlines determine what can be shown. Story never writes scores, chooses correct answers or sends network messages.
- Explain math with structured operands from validated reveal data. Existing publicQuestion deliberately excludes answers and facts; do not widen that boundary before reveal.
- Joining late or reconnecting goes directly to the current state, not a queue of old animations.
- HTML owns questions, buttons, focus and screen-reader feedback. Three.js draws the stage. Dynamic import failure or unavailable WebGL leaves readable story cards. Prefer a static game view on slow devices.
- Phone first: all controls are at least 44px; no moving camera during answers. Reduced motion skips stage animation; hidden tabs stop drawing. Render on demand with a capped pixel ratio.
- No hosted AI during play, paid backend, deployment or main-branch push for this experiment.

## Acceptance before game integration

- Child can explain the goal without reading the director notes.
- Correct and incorrect answers both teach a fact and move the story forward.
- Controls work at 390px, with keyboard, reduced motion and WebGL unavailable.
- Actual game remains answerable immediately on a server question state; animations never alter the deadline.
- No answer/fact in public pre-reveal payload; server scoring and multiplayer timing remain authoritative.
- Child and parent pick a setting before production integration.

## Collaboration

See CLAUDE-REVIEW.md for the actual Claude critique and Codex’s corrections. Continue there by deciding: paper-book setting or planet setting; one continuous picnic story or independent discoveries; which five questions make the strongest pilot.

## Sources and credits

- Three.js (MIT): https://threejs.org/ — installed package retains its license.
- Scene setup: https://threejs.org/manual/pages/creating-a-scene.html
- Responsive canvas: https://threejs.org/manual/pages/responsive.html
- Existing pixel sprites: Adventures of Rufus / Rufus Trivia, copied unchanged from public/js/sprites.js (project GPL-3.0).

This experiment does not modify the production credit generator or the live game's files. Add the Three.js credit through scripts/build-landmarks.mjs if the feature is integrated.

## Checks performed

The preview loaded Three.js without console errors. All three world buttons and the incorrect-answer transition were exercised in the browser. At 390px and 1200px widths the document had no horizontal overflow. Manual motion-off worked. WebGL-unavailable and reduced-motion preference paths are implemented but have not been separately exercised. No production game tests were rerun because the experiment does not change its code or data.
