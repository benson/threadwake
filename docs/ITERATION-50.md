# Threadwake — 50-improvement playtest pass

Completed implementation checklist for the sustained iteration requested October 4, 2026. Independent agents played both the production baseline and revised game with browser controls; headless balance runs are separately labeled. Release gates are documented below.

## Readability, art, and motion

1. [x] Give echoes a distinct, bright silhouette.
2. [x] Show an echo's remaining lifetime and imminent expiry.
3. [x] Mark echo anchors on the ground.
4. [x] Keep offscreen echoes locatable.
5. [x] Keep threads readable through scenery.
6. [x] Communicate thread tension through its motion.
7. [x] Distinguish flower charge stages at game scale.
8. [x] Make charged flowers clearly ready to harvest.
9. [x] Show bloom size and healing reach in the burst.
10. [x] Add distinct enemy attack anticipation poses.
11. [x] Improve hostile projectile cores and trails.
12. [x] Strengthen player impact and damage feedback.
13. [x] Strengthen enemy hit reactions and debris.
14. [x] Improve player/party identity markings.
15. [x] Make downed allies easier to locate and revive.

## Combat and balance

16. [x] Extend echo lifetime beyond its base cooldown.
17. [x] Allow a bounded overlap between old and new echoes.
18. [x] Make movement history timing independent of update step size.
19. [x] Give stationary casts a useful, clearly projected anchor.
20. [x] Reward taut threads with stronger cutting damage.
21. [x] Add co-op resonance where allies' threads cross.
22. [x] Convert caught bullets into stronger outgoing attacks.
23. [x] Give catches a useful charge target when no flower touches the thread.
24. [x] Improve garden build healing/damage viability.
25. [x] Let carefully arranged blooms chain into neighboring flowers.
26. [x] Give frost and needles a meaningful combination.
27. [x] Connect orbiting blades to the garden mechanic.
28. [x] Give waves distinct spawn rhythms.
29. [x] Give moths more legible movement behavior.
30. [x] Telegraph thorn volleys distinctly.
31. [x] Give the final boss escalating attack phases.
32. [x] Track actual player wave participation for fair progression.

## Controls, feedback, and iteration tools

33. [x] Buffer near-ready casts and support holding the cast control.
34. [x] Improve controller dead zones and pause controls.
35. [x] Fix focus, visibility, and touch-capture input resets.
36. [x] Separate active echo lifetime from ability recharge in the HUD.
37. [x] Show wave time remaining and boss health clearly.
38. [x] Give upgrades semantic icons and visible stack ranks.
39. [x] Make the current loadout inspectable during a run.
40. [x] Make friend invites accessible after a run starts.
41. [x] Bank wave rewards before a run ends and survive interrupted sessions.
42. [x] Add persistent play milestones with bounded rewards.
43. [x] Separate music and effects volume controls.
44. [x] Add useful readiness, damage, wave, and boss sound cues.
45. [x] Make onboarding respond to completed actions and input device.
46. [x] Detect stale network sessions and expose connection health.
47. [x] Guard client/server and checkpoint version compatibility.
48. [x] Improve network rendering responsiveness without trusting client damage/state.
49. [x] Expand workshop scenarios to cover the new mechanics.
50. [x] Add repeatable playtest/balance evidence and regression coverage for the new pass.

## Evidence received so far

- Independent live play reached the first draft and second wave using real WASD/Space. Observations: echo endpoint can leave the viewport; scenery hides threads; flower healing lacks feedback; upgrade icons are assigned by card position instead of upgrade identity.
- Baseline real-health simulations found needle builds substantially stronger than garden and memory builds. These are bot results, not human enjoyment scores.

## What changed after feedback

Three agents worked on independent play, combat/balance, and visual iteration, using GPT-6 Astra, GPT-6.1 Sol, and GPT-6 Sol. The independent player returned for a second actual-control run into wave 2. Reported improvements included the bright echo silhouette, overlapping memories, visible flower stages, numerical upgrade previews, and three memories retained after leaving early.

The feedback led to further revisions: duplicate frost/Bloomcall stacks now improve their mechanics; narrow mobile upgrade cards became stacked rows; milestone notifications temporarily hide the lesson they otherwise obscured. A reported immediate Escape/Space timing issue did not reproduce in the final fresh-page control check; ordinary held casting and pause/resume both passed.

The combat sweep found an unintended stationary shield: the player-end cap of a thread caught bullets from every direction. Swept collision ordering now permits a body hit before a thread behind the player. Standing still with casts dropped from surviving to the boss to losing in wave 1. This is an intentional correction: placement and movement should matter.

## Verification

- 39 automated tests pass, including 16 focused simulation regressions for the new mechanics, deterministic recovery, actual participation, upgrade stack values, and collision ordering.
- Real browser controls verified movement, held casts yielding two overlapping echoes, near-ready buffering, solo pause, focus input reset, and independent music/effects persistence.
- A mocked Gamepad API verified radial dead zone, movement, cast, and menu pause/resume. No physical controller verification is claimed.
- Two actual local browser players verified shared movement, casts, names, and reload/reconnect without duplicated players. Real WebSocket smoke also checked protocol rejection, ping, room capacity, and reconnection.
- Workshop replay matched final pixels before/after replay and exported/imported takes. Thorn and crossed-thread scenarios also replayed identically. Takes carry a simulation version so obsolete recordings are rejected.
- Mobile viewport checks at 390×844 covered draft, options, and memories. The revised stacked draft was visually checked with representative real upgrade text. Real phone hardware remains untested.
- The build succeeds. GitHub Actions must pass the same tests and build, deploy the worker, pass its live WebSocket smoke, and then publish Pages.

## Scope and limits

All 50 listed items are implemented. This is a substantial iteration pass, not a claim of finished balance or universal enjoyment. Real-health bots are reproducible policies; their win rates are not human difficulty scores. Local progression is intentionally casual and browser-local. Version 2 requires reloading old clients, and old-version rooms may need a new invite.

## Final real-health balance sweep

Seeds 1, 42, and 918, with 1/2/4 players and four draft policies, produced 36 complete runs. Needle won 9/9, memory 7/9, novice oval movement 9/9, and aggressive flower-chasing garden 5/9. Another nine garden runs used the same oval movement as needle: 7/9 wins, including 3/3 solo. These labels describe bot policies, not player skill groups.

Representative seed-42 changes from the baseline:

| Policy                                  | Baseline                    | Revised                     |
| --------------------------------------- | --------------------------- | --------------------------- |
| Garden, solo, aggressive flower chasing | Lost wave 3; 18 blooms      | Lost wave 5; 98 blooms      |
| Garden, 2 players                       | Boss 82 seconds; 128 blooms | Boss 38 seconds; 195 blooms |
| Garden, 4 players                       | Boss 43 seconds; 147 blooms | Boss 28 seconds; 197 blooms |
| Memory, solo                            | Lost wave 6                 | Won; boss 26 seconds        |
| Memory, 2 players                       | Lost to boss                | Won; boss 26 seconds        |
| Needle, solo                            | Boss 59 seconds             | Boss 18 seconds             |

The revised controlled solo garden run won with a 38-second boss, 238 HP healed, and 203 thread kills; needle remained faster. Stationary solo lost at 35 seconds without casts and 39 seconds with casts after the endpoint-shield fix. Further human play can assess whether the strong needle route needs additional restraint.
