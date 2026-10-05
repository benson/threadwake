# Continuing craft work

## 2026-10-05 — side boundary visibility

Real keyboard movement to `x=18` exposed a clipped broom tip and side panels drawn on walkable floor. The side wall art now sits beyond the existing west/east collision boundaries, and the camera includes 49 pixels of exterior wall at either edge. Neither the playable area nor combat geometry changes. A second real keyboard pass confirmed the entire broom remains visible at the west edge.

The gallery boundary browser check now covers both sides in all four rooms, verifies full weapon clearance and pointer mapping, and retains north/south checks. The eight-panel side sheet was visually inspected alongside the actual gameplay screenshot. No UI or copy was added.

## 2026-10-05 — north wall and camera boundary

Fresh-profile keyboard play cleared waves one and two, earned four credits, chose Padded waistcoat and Tin soldier, and entered Natural History with the expected health and one companion. Moving to the north boundary then exposed a rendering mismatch: the decorative back wall occupied the top 125 pixels of playable floor, and the camera clipped the custodian at `y=18`.

The baked back wall now sits above the floor boundary. The camera includes that exterior wall when following actors near the north edge, keeping their complete bodies below the HUD. The 1200×800 playable area, collision rules, spawn positions and progression are unchanged. Real keyboard movement verified the corrected north edge. `scripts/north-edge-smoke.cjs` checks all four galleries, pointer mapping and south-edge visibility, and renders a native-scale contact sheet for visual inspection.

## 2026-10-05 — readable Grand Clock warnings

A real-keyboard wave-eight encounter with seven selected curios reached victory in 23.7 seconds, ending at 66/140 HP with five shots cleared. It covered movement, exhibit cover, held sweeping and all boss stages; this is one seeded workshop encounter, not a full-run difficulty judgment.

The final-stage warning was visually tangled with the brass clock face. A bounded Gemini image review independently identified that overlap and the similarity between white warning dots and friendly marble flecks. The boss warning now uses outlined coral ticks outside the body, previews the actual radial count/orientation at discharge, and places the aimed spread beyond the shared weapon muzzle. Simulation, attack timing, damage and other enemy cues are unchanged. The review misread part of the decorative floor clock as a warning; that claim was rejected.

Validation: all 77 tests and production build pass. `scripts/boss-warning-review.cjs` renders all three real stages immediately before/after discharge (13, 13 and 19 hostile shots); the complete six-panel sheet was visually inspected at native resolution. The tenth image review cost $0.0047595; cumulative spend is $0.1416025 against the existing $5 cap.

## 2026-10-04 — boss cues and workshop build repair

The Grand Clock's aimed warning now shows five rays for its five-shot fan and three for its final three-shot spread. Attack timings and damage are unchanged. A wave-eight keyboard playtest exposed a separate workshop initialization bug: `startGame` replaces player objects, so selected curios were being assigned to a discarded reference. Workshop builds now apply to the active player. Replay version 5 rejects takes recorded with the old initialization.

Validation: 77 tests and production build passed. Workshop browser smoke now checks that Padded waistcoat produces 140 HP; replay and export/import remain pixel-identical with the selected build, with no page errors or mobile overflow. An 18-second wave-eight movement/sweep pass with seven selected curios ended at 122/140 HP and six shots cleared. This is a bounded control/readability check, not a completed boss fight or balance verdict.

## Active direction — After Hours

On October 4, Benson rejected the time-echo premise and selected a haunted museum night shift. The game is being redesigned as **After Hours**: a custodian with automatic marble shots, an immediate broom sweep, and borrowed curios that create unusual survivor builds. This supersedes the woodland/echo design documented below. Keep the existing hosting and earned progression while replacing the old mechanic.

The integrated redesign replaces the old mechanic, art, sound and upgrade meanings. Four galleries have shared visible/collision geometry; marbles originate at the visible weapon socket; player damage follows the torso rather than the feet. Protocol 3 and replay 4 reject incompatible older sessions. Existing banked progression is retained.

## 2026-10-04 — museum release and blind art review

Museum release `2270f46` passed Actions `37243641980` (tests/build, Worker, live multiplayer, Pages); public HTTP confirmed the exact new bundle. Benson subsequently requested continuous goal execution instead of timer gaps. The heartbeat is paused and the active chat goal now drives ongoing work.

Start screen now shows permanent equipment, saved credits, best wave and the four-gallery route. Sixteen curios have original pixel illustrations. All game/UI ornament is raster pixel work, including the favicon, controls and workshop guides. The custodian has a planted stride, aimed slingshot/recoil and a gripped immediate broom action. A bottom-edge playtest exposed HUD occlusion; the existing sweep meter now feathers when the player's body passes underneath. Drafts hide the underlying HUD to prevent overlapping text.

Independent OpenRouter image reviews covered 76 numbered assets/poses/effects/maps plus actual start, combat and draft screenshots. Findings and limits are in `ART-REVIEW.md`. Two revision passes corrected the arrowhead, metronome, paperweight, jack-in-the-box, beetle legs, cart charge states and exhibit silhouettes. Projectiles and impact/protection effects now separate from quieter floor ornament. Seven review requests cost $0.117284 total against the authorized cumulative $5 cap; preserve `.local/openrouter/budget.json` and do not reset it.

Validation: all 75 tests passed, including geometry, map collision, legacy progression, recovery and real-health complete runs. Focused presentation/budget tests passed after the final presentation change. Build passed. Browser checks covered five field sizes, purchases applying next shift, held/buffered sweep, mocked controller input, smooth movement/pause, two-client local multiplayer and reconnect, and pixel-identical workshop replay/export/import. Actual keyboard play reached the first draft at 38 seconds with 31 kills and 110 HP, picked a curio and resumed. A focused bottom-edge check verified the meter at 12% opacity over the visible torso. Physical phone/controller hardware remains unverified. Bot wins and still-image reviews are not claims of AAA quality or human enjoyment.

Next: temporal stride/attack contact sheets (the initial actor sheet is a pose sampler, not a frame sequence), crowded late-wave human play, remaining supply-state readability at 1×, and a clearer permanent-equipment entry label if approved. Ship through existing tests → Worker → live multiplayer → Pages gates.

## 2026-10-04 — temporal animation pass

Ordered temporal contact sheets exposed stationary feet on the tin soldier and armor, plus a telescoping broom and abrupt recovery. These actors now receive actual displacement velocities from the simulation; their steps stop when stationary or staggered. The broom rotates at a fixed 24px shaft length and returns continuously to its carrying angle. The head is more legible, and slingshot firing adds a shoulder kick/band settle while its authoritative muzzle stays fixed.

The shared motion sheet generator samples eight times per sequence, separately covering walking, sweep, firing, toy soldier, armor and moth. A Sonnet review supplied hypotheses rather than playback claims; an early sheet clipped long broom extremes, so the fixture was widened before final inspection. All 76 tests pass, including actual movement velocity and stagger regression; production build passes. Continuing priority: stronger foot contact/passing silhouettes and a real crowded late-wave playthrough. OpenRouter cumulative cost is now $0.133432 across eight requests, still under the existing $5 cap.

Shipped as `a58af00` through Actions `37244248260`. The initial live multiplayer check lost both sockets during lobby rename; a fresh unchanged live smoke passed, and the unchanged failed-job rerun passed Worker/live multiplayer/Pages. No gate was relaxed. Workshop replay/export/import remained pixel identical. A real repeating keyboard route (no health/state mutation) reached wave one draft with 95 HP/35 kills, wave two draft with 12 HP/84 kills, then Natural History at 84.5 HP after the upgrade. This is a bounded input-route check, not a human difficulty verdict.

A follow-up actor review found the custodian's coat obscured the moving boots. The hem is three pixels shorter and the toe caps remain visible through contact/passing poses; feet anchors, hitbox and movement are unchanged. The complete temporal sheet was inspected again at native and enlarged sizes and the build passes. `scripts/gallery-play-smoke.cjs` preserves the real-input gallery-transition check.

## 2026-10-04 — field, opening, and footsteps

The owner requested ongoing refinement after the original 50-change pass: UI contained inside the game field, a faster opening, discoverable permanent progression, richer motion and art, and genuine footsteps that preview an echo.

This increment makes the canvas and all controls share a fixed 960×540 field. Dialogs scale with that field, including their backdrops. The first wave lasts 38 seconds, with enemies before one second and catchable projectiles before eight; subsequent waves retain their 65-second duration. Footsteps expose bounded real movement history, and the prospective echo anchor uses the same calculation as the cast.

Memories can be opened from the in-run balance or Pause. Purchases apply to the next run; online purchases survive reconnect and private recovery without changing an active character. Back returns to Pause when the shop was opened there. Character art adds planted alternating steps, cloak follow-through, cast anticipation and release details, and more enemy detail. Workshop recordings now use version 3 because the simulation timing changed.

Verification: 49 tests pass, including opening fairness for 1/2/4-player basic moving parties, chronological footsteps, preview/cast agreement, and trait recovery. Real browser play reached the first draft at 38 seconds, earned three memories, purchased Root while retaining 110/110 active health, and started the next run at 114/114. Browser containment checks pass at five landscape and portrait sizes. Portrait keeps the whole field contained but makes it small; physical phone/controller use remains unverified. Garden reference-bot steering was adjusted to avoid unsafe approaches after opening spawn changes; bot results are regression evidence, not claims about enjoyment.

Independent playtest feedback prompted a second pass on trail visibility over foliage, preview occlusion by the HUD, Pause return behavior, and singular upgrade text.

## 2026-10-04 — movement continuity and combat contrast

The next actual playtest reached wave three at 66/140 health after 126 seconds. Held casting remained reliable, a wider route recovered blooms in wave two, and Heartwood's predicted 111 health matched its result. It exposed thread occlusion behind the loom, pillars and canopy, plus a stale 1s countdown on completed-wave drafts.

Active threads now retain a muted thin strand over scenery, and the HUD continues updating during drafts. The rendering path now captures lightweight motion snapshots and interpolates confirmed solo positions between the 30 Hz simulation steps. Smooth drawing clocks also drive the camera and cast motion. Spawns, removals, death, revive and run transitions preserve the current authoritative state. Online retains bounded local prediction.

A real browser baseline at roughly 120 Hz repeated player positions on 90/120 frames. With interpolation, all 67 intermediate frames in a 90-frame moving sample advanced the drawn position; p95 frame time remained 8.5 ms. A release check found no backward movement and pause froze the presentation. Solo uses confirmed positions with up to 33 ms presentation delay: an experimental speculative version was rejected after an actual key-release check showed a 5.15 px backwards correction.

All 62 tests and the build pass, including 13 presentation tests for boundaries, discontinuities, stop/reversal, immutable gameplay state and bounded clocks. Pixel-art pose quantization remains intentional; smooth translation does not require increasing the sprite animation frequency.

Integrated browser checks: a real opening completed with 84 HP and correctly displayed `0s` during the draft. Two preview clients connected to the deployed multiplayer service, shared 114 px of movement and a cast, and reconnected without a duplicate player or browser errors.

## 2026-10-04 — attack warnings through scenery

Workshop thorn play showed the default enemies in open ground. A controlled render comparison then placed a thorn windup under the central loom: scenery completely covered the warning before the fix, while the existing red cue remained visible afterward. This is controlled rendering evidence, not a claim that the default encounter produced that exact overlap.

The same attack-warning drawing now runs after scenery, preserving its existing timing, color, geometry and locked direction. The change covers moth, thorn and warden cues and keeps ordinary actor depth ordering. Both comparison frames were visually reviewed; all 62 tests and the build pass.

## 2026-10-04 — scenery fade continuity

A controlled seed-42 motion comparison found an abrupt loom fade when the player moved from x554 to x556 at y290: opacity jumped from solid to 45% across the overlap boundary. The same binary switch affected trees and pillars.

Scenery now fades progressively as the player enters those existing overlap regions. The transition follows position through an 18-pixel horizontal and 16-pixel vertical feather, with the existing core opacity preserved. The strongest overlapping player controls the fade in co-op. It needs no additional animation state, so reversing direction responds immediately and the renderer remains deterministic.

The boundary and core frames were visually reviewed: the near-edge pop is gone and the player remains visible behind the loom. All 62 tests and the build pass. The existing workshop browser smoke also passed, including pixel-identical replay/export/import, thorn and co-op replay scenarios, and no page errors.

## Work to continue

- Integrated trail/anchor motion checks passed; workshop input replay and export/import produce identical final pixels in garden, thorn, and co-op scenarios. Build passes.
- First field/opening increment shipped as `2bd5cc1`; Actions run `37236556555` passed tests/build, Worker, live multiplayer and Pages. The public browser confirmed the 38-second opening, fixed field and in-run shop.
- Movement/contrast shipped as `73c61a4`; Actions run `37237224296` passed on rerun. The first live check saw a connection close before its latency reply, so Pages stayed gated; a fresh identical live check and the rerun passed without changing the gate.
- Continue focused playtests for combat readability, visual crowding, movement/cast continuity, and frame pacing. Fix demonstrated friction rather than adding unrelated systems or UI.
- OpenRouter reviews are active under the cumulative $5 approval. `scripts/openrouter-review.mjs` requires the existing ignored budget ledger and environment credential; it retains reservations for unknown costs. Reviews must distinguish screenshot/source evidence from actual play. See the current museum review above; never reset the ledger.
- The thread heartbeat `keep-improving-threadwake` is paused at Benson's request. An active goal drives continuous work without scheduled gaps. Do not reactivate a timer or mark the goal complete merely because a batch ships.

### 2026-10-04 · Clear upgrade comparisons and browser states
- User-requested stat labels now appear once per row, with only values changing; frost correctly describes bonus damage and slow duration, not probability. First-aid synergy explicitly says each sweep heals.
- Suppressed pointer-only default focus outlines and game text selection while retaining keyboard focus and editable input selection. Fixed workshop select background shorthand resetting the pixel chevron's no-repeat sizing.
- Hostile projectiles render above friendly effects. Controlled overlap regression improved visible danger pixels from 29/0 to 29/29.
- Validation: 76 tests passed; production build passed. Browser draft fixture inspected at game scale, pointer outline absent, keyboard focus checked, dropdown styling verified. Late-wave controlled keyboard run used normal health and ended in defeat; no claim of full-run human balance.

### 2026-10-04 · Explain the sweep attack
- Benson read sweeping as defensive. Existing title controls and pause instructions now call it a sweep attack and explicitly list damage, pushback and projectile clearing. The first-sweep lesson leads with damage.
- Browser checked the actual movement-triggered lesson and visually reviewed the whole title and gameplay surfaces; build passed. No mechanics changed.

### 2026-10-04 · Make broom damage register visually
- Controlled real-simulation samples showed sweep damage's 90ms flash already reduced to57ms at the first step, absent at100ms, while the range ring persisted. Extended sweep hit presentation to160ms and added a compact white/gold body impact cluster to enemy hits.
- Regression verifies visible impact after100ms, expiration by200ms and exactly one damage application. 77 tests and production build pass. Reviewed renderer samples at0/33/100/167ms; armor160->108HP, unchanged90px pushback.
- Independent Gemini image review recognized the attached spark as distinct from ring/projectiles. Its claimed camera seam was the contact-sheet divider, and static samples cannot establish playback smoothness. Longer outline temporarily reduces internal sprite detail, consistent with a brief damage flash. Review cost0.003411 USD; cumulative0.136843 of5USD.
