# Continuing craft work

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
