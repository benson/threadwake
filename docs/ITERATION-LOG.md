# Continuing craft work

## 2026-10-04 — field, opening, and footsteps

The owner requested ongoing refinement after the original 50-change pass: UI contained inside the game field, a faster opening, discoverable permanent progression, richer motion and art, and genuine footsteps that preview an echo.

This increment makes the canvas and all controls share a fixed 960×540 field. Dialogs scale with that field, including their backdrops. The first wave lasts 38 seconds, with enemies before one second and catchable projectiles before eight; subsequent waves retain their 65-second duration. Footsteps expose bounded real movement history, and the prospective echo anchor uses the same calculation as the cast.

Memories can be opened from the in-run balance or Pause. Purchases apply to the next run; online purchases survive reconnect and private recovery without changing an active character. Back returns to Pause when the shop was opened there. Character art adds planted alternating steps, cloak follow-through, cast anticipation and release details, and more enemy detail. Workshop recordings now use version 3 because the simulation timing changed.

Verification: 49 tests pass, including opening fairness for 1/2/4-player basic moving parties, chronological footsteps, preview/cast agreement, and trait recovery. Real browser play reached the first draft at 38 seconds, earned three memories, purchased Root while retaining 110/110 active health, and started the next run at 114/114. Browser containment checks pass at five landscape and portrait sizes. Portrait keeps the whole field contained but makes it small; physical phone/controller use remains unverified. Garden reference-bot steering was adjusted to avoid unsafe approaches after opening spawn changes; bot results are regression evidence, not claims about enjoyment.

Independent playtest feedback prompted a second pass on trail visibility over foliage, preview occlusion by the HUD, Pause return behavior, and singular upgrade text.

## Work to continue

- Integrated trail/anchor motion checks passed; workshop input replay and export/import produce identical final pixels in garden, thorn, and co-op scenarios. Build passes.
- Publish through the existing test/build → Worker → live multiplayer → Pages pipeline.
- Next measured issue: solo sends un-interpolated 30 Hz simulation positions to the renderer. On a 120 Hz browser sample, 90 of 120 frames repeated the same moving-player position despite 8.5 ms p95 frame intervals. Investigate smooth presentation without changing authoritative simulation or adding input delay.
- Continue focused playtests for combat readability, visual crowding, movement/cast continuity, and frame pacing. Fix demonstrated friction rather than adding unrelated systems or UI.
- OpenRouter reviews are requested, but the API-key location and spending cap are still pending. No paid call has been made. `scripts/openrouter-review.mjs` requires an explicitly approved ignored budget ledger and environment credential; it retains reservations for unknown costs. Reviews must distinguish screenshot/source evidence from actual play.
- The thread heartbeat `keep-improving-threadwake` is already active every 30 minutes. Preserve it rather than creating duplicates; notify only meaningful changes or blockers. The owner asked to keep improving until told to stop.
