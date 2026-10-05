# After Hours

The museum is closed. The exhibits disagree. A pixel survivor for one to four friends at **https://threadwake.bensonperry.com**.

Choose your night staff: the Custodian starts with a slingshot and broom sweep, the Conservator carries a spirit lantern and restores nearby staff while freezing exhibits, and the Guard throws returning discs and repels enemies with a shockwave. Move with WASD or arrows. Weapons fire automatically; Space, click, or controller A uses your special ability. Hold to repeat when ready. Supply carts restore health, and staying beside a fallen colleague helps them back up.

Defeated exhibits drop XP. Collect it to level up and borrow a curio during the fight: a porcelain prism strengthens weapon patterns, a miniature orrery circles you, and a tin soldier lends a hand. Sixteen stackable curios change your build. Weapon pickups add slingshots, lanterns, returning discs, and storm coils to your automatic arsenal; health and speed powerups also drop. XP and collected weapons are shared in co-op. Level choices pause the fight and resume it in place; wave transitions no longer trigger upgrade choices. Survive eight waves and the Grand Clock before opening time. The first wave lasts 38 seconds. Touch controls are included; real phone hardware has not been verified.

The shift crosses four maps: Antiquities (waves 1–2), Natural History (3–4), Sculpture Court (5–6), and the Clock Gallery (7–8). Each has its own exhibit layout. Shared map geometry drives the renderer and authoritative collisions.

## Iteration workshop

Open **/lab.html** or choose Workshop on the title screen. The workshop and game share the same sprite drawing functions, animation parameters, renderer, and simulation. There is no separate mock animation to keep in sync.

- Pose preview, direction and uniform variants, frame stepping, timeline and contact sheets.
- Motion presets are saved locally and can be exported/imported as JSON. Open game tabs pick up saved motion settings; presets affect visuals only.
- PNG contact sheets help inspect silhouettes and action extremes.
- The encounter workbench runs the actual combat simulation with repeatable seeds and loadouts.

For a character-animation pass, edit `src/art.js` and `src/animation.js`, inspect the same poses in the workshop, and check them at game scale. For combat changes, edit `src/sim.js` and `src/config.js`, exercise an encounter, then run the simulation and multiplayer checks. The research references and how they informed these tools are recorded in `docs/REFERENCES.md`.

## Development

Node 22 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
```

The frontend uses Vite with two entry points and no UI framework. Pixel sprites are authored in source; backgrounds are baked and actors are sorted by their feet. The VT323 font is bundled with its license. Audio is synthesized locally: an original adaptive music-box score, spatial weapon and enemy cues, pickup and ability sounds, and gentle pointer/keyboard feedback. Separate music and effects controls adjust real mixer buses; playback starts after an input gesture.

```sh
npx wrangler dev --config worker/wrangler.toml
```

For local multiplayer, open `http://127.0.0.1:4319/?server=ws://127.0.0.1:8787`, then choose Play with friends. The server override is accepted only on localhost. Room links preserve it for local tests.

## Multiplayer

One Cloudflare Durable Object owns each room and runs the simulation at 30 Hz. Browsers send only bounded movement, cast, and upgrade choices; the server broadcasts state at 15 Hz. Remote movement is interpolated. All damage, enemy spawns, catches, revives, and wave transitions are authoritative. The room continues when its creator leaves; a connected player inherits the start/restart control.

An opaque token stored in session storage resumes a disconnected player. Seats are reserved for 60 seconds. A disconnected player's draft receives an automatic choice after 10 seconds, so the party can continue. Empty rooms stop ticking. Private wave/upgrade checkpoints support short server interruptions; a server restart can roll the run back to the last checkpoint. Ordinary socket reconnects retain the current in-memory run. Active rooms consume server time and do not hibernate while a run is ticking.

Credits bank after each participated wave, plus a win bonus and five one-time play milestones. Small permanent traits are browser-local, bounded on the server, and designed for casual co-op, not competitive rankings. They are not an account save or cheat-resistant economy. Clearing browser storage removes them. Protocol 4 rejects incompatible clients and recovery checkpoints; reload after an update and create a new room if an old room cannot resume.

The start screen shows your credits, best wave, permanent equipment, and tonight's gallery route. Open Staff kit from the credit balance, Pause, results, or the title screen. Three ranks each add health, movement speed, or shorter special cooldowns; the shop shows exact before-and-after values. Purchases apply to the next shift, including online restarts. Existing Threadwake balances, purchased traits and completed milestones are preserved. All controls share the arena's fixed frame. Workshop recordings use version 8 for the new simulation rules.

## Validation and release

`npm test` covers deterministic replay, broom sweeps, supplies, upgrades, late joins, synchronized drafts, disconnects, revives, win/loss, invalid input, recovery checkpoints, and full-run reference players. Automated balance runs are regression evidence, not a substitute for human playtesting.

`npm run test:multiplayer` runs a real WebSocket room exercise against local Wrangler. Pass a deployed WebSocket base to `node worker/smoke.mjs` for the same live check. `scripts/ui-smoke.cjs` is a Playwright CLI real-control smoke test against the production preview on port 4320; it checks movement, cast, pause, and combat progress without modifying game state.

The historical Threadwake pass is recorded in `docs/ITERATION-50.md`. Browser regressions cover held/buffered sweeps, input resets, separate sound controls, a mocked controller, multiplayer reconnects, and pixel-identical workshop replay. Controller API tests and mobile viewport checks do not replace physical-device testing.

Continuing craft work and pending review priorities are recorded in `docs/ITERATION-LOG.md`.

GitHub Actions gates deployment on tests and build, deploys the Worker, runs a live multiplayer smoke, then publishes `dist/` to GitHub Pages. DNS maps `threadwake.bensonperry.com` to that repository's Pages deployment. Cloudflare credentials are repository secrets, never frontend configuration.

Acquired weapons and curios can be inspected from Pause by hovering, keyboard focus or clicking/tapping. Current stacked effects appear beneath the inventory. Upgrade choices explain the item's effect before showing its next-rank values. Browser fixtures `scripts/item-inspection-smoke.cjs` and `scripts/item-copy-review.cjs` exercise the full catalog and bounded layouts through Playwright CLI.
