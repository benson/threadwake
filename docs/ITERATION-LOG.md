# Continuing craft work

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

## Work to continue

- Integrated trail/anchor motion checks passed; workshop input replay and export/import produce identical final pixels in garden, thorn, and co-op scenarios. Build passes.
- First field/opening increment shipped as `2bd5cc1`; Actions run `37236556555` passed tests/build, Worker, live multiplayer and Pages. The public browser confirmed the 38-second opening, fixed field and in-run shop.
- Publish the movement/contrast increment through the same gated pipeline after its integrated browser checks.
- Continue focused playtests for combat readability, visual crowding, movement/cast continuity, and frame pacing. Fix demonstrated friction rather than adding unrelated systems or UI.
- OpenRouter reviews are requested, but the API-key location and spending cap are still pending. No paid call has been made. `scripts/openrouter-review.mjs` requires an explicitly approved ignored budget ledger and environment credential; it retains reservations for unknown costs. Reviews must distinguish screenshot/source evidence from actual play.
- The thread heartbeat `keep-improving-threadwake` is already active every 30 minutes. Preserve it rather than creating duplicates; notify only meaningful changes or blockers. The owner asked to keep improving until told to stop.
