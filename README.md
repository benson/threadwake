# Threadwake

A pixel woodland survivor for one to four friends. Play at **https://threadwake.bensonperry.com**. No account or install.

Move with WASD or arrows. Needles fire automatically. Space (or click) unwinds your recent footsteps into an echo; holding casts again when ready. Two echoes can overlap, and a ring around each shows its remaining life. Stretch threads to cut harder and cross a friend's thread to resonate. Catches strengthen your next volley and charge flowers. Holding a thread over a flower also charges it; a full flower bursts, clearing threats and healing the party. Stay beside a fallen friend to revive them.

Eight waves, sixteen stackable upgrades, and the Unraveler at dawn. A run usually takes around ten minutes including upgrade choices. A controller uses the left stick and A. Touch controls are included; real phone hardware has not been verified.

## Iteration workshop

Open **/lab.html** or choose Workshop on the title screen. The workshop and game share the same sprite drawing functions, animation parameters, renderer, and simulation. There is no separate mock animation to keep in sync.

- Pose preview, direction and cloak variants, frame stepping, timeline and contact sheets.
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

The frontend uses Vite with two entry points and no UI framework. Pixel sprites are authored in source; backgrounds are baked and actors are sorted by their feet. The VT323 font is bundled with its license. Audio is synthesized locally from original note patterns.

```sh
npx wrangler dev --config worker/wrangler.toml
```

For local multiplayer, open `http://127.0.0.1:4319/?server=ws://127.0.0.1:8787`, then choose Play with friends. The server override is accepted only on localhost. Room links preserve it for local tests.

## Multiplayer

One Cloudflare Durable Object owns each room and runs the simulation at 30 Hz. Browsers send only bounded movement, cast, and upgrade choices; the server broadcasts state at 15 Hz. Remote movement is interpolated. All damage, enemy spawns, catches, revives, and wave transitions are authoritative. The room continues when its creator leaves; a connected player inherits the start/restart control.

An opaque token stored in session storage resumes a disconnected player. Seats are reserved for 60 seconds. A disconnected player's draft receives an automatic choice after 10 seconds, so the party can continue. Empty rooms stop ticking. Private wave/upgrade checkpoints support short server interruptions; a server restart can roll the run back to the last checkpoint. Ordinary socket reconnects retain the current in-memory run. Active rooms consume server time and do not hibernate while a run is ticking.

Memories bank after each participated wave, plus a win bonus and five one-time play milestones. Small permanent traits are browser-local, bounded on the server, and designed for casual co-op, not competitive rankings. They are not an account save or cheat-resistant economy. Clearing browser storage removes them. Protocol 2 rejects incompatible clients and recovery checkpoints; reload after an update and create a new room if an old room cannot resume.

Open Memories from the in-run balance, Pause, or the title screen. Purchases apply to the next run, including online restarts. The first wave now lasts 38 seconds. Visible footsteps and a hollow prospective anchor show where an echo will form; all game controls share the arena's fixed frame.

## Validation and release

`npm test` covers deterministic replay, casts and catches, flower bursts, every upgrade, late joins, synchronized drafts, disconnects, revives, win/loss, invalid input, recovery checkpoints, and full-run reference players. Automated balance runs are regression evidence, not a substitute for human playtesting.

`npm run test:multiplayer` runs a real WebSocket room exercise against local Wrangler. Pass a deployed WebSocket base to `node worker/smoke.mjs` for the same live check. `scripts/ui-smoke.cjs` is a Playwright CLI real-control smoke test against the production preview on port 4320; it checks movement, cast, pause, and combat progress without modifying game state.

The 50-improvement pass and its playtest evidence are recorded in `docs/ITERATION-50.md`. Additional browser regressions cover held/buffered casts, input resets, separate sound controls, a mocked controller, multiplayer reconnects, and pixel-identical workshop replay including thorn and co-op scenarios. Controller API tests and mobile viewport checks do not replace physical-device testing.

Continuing craft work and pending review priorities are recorded in `docs/ITERATION-LOG.md`.

GitHub Actions gates deployment on tests and build, deploys the Worker, runs a live multiplayer smoke, then publishes `dist/` to GitHub Pages. DNS maps `threadwake.bensonperry.com` to that repository's Pages deployment. Cloudflare credentials are repository secrets, never frontend configuration.
