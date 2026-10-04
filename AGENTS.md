# Working on Threadwake

This is a complete game and its iteration workbench. Preserve the single source of truth: the workshop must use the game's actual animation, art, and simulation functions.

- `src/sim.js` is authoritative and DOM-free. Keep input bounded, RNG seeded, and state serializable. Never trust browser world state.
- Public snapshots omit `_` internals. Recovery checkpoints must retain them.
- `src/art.js` owns pixel clusters and palette; `src/animation.js` owns motion. Inspect multiple poses and directions, then inspect at game scale.
- `src/render.js` bakes scenery, sorts by feet, and snaps pixels. Hostile shots and attack anticipation must remain visible over decoration.
- Add a meaningful regression when changing rules, networking, replay, or recovery. Run `npm test`, `npm run build`, and the live multiplayer smoke for server changes.
- Use the workshop for animation and encounter iteration. Export deliberate presets and keep them as source when publishing them; browser local storage is only a personal preview.
- Keep source and reusable scripts. Disposable QA output belongs in ignored `output/` and should be cleaned when no longer useful.
- Ship through this repository's GitHub Pages + Cloudflare Worker workflow. Do not switch hosting providers.
- No decorative accent-edge stripes. Keep player UI concise; developer controls belong in the workshop.

Full-run bots establish reproducible balance baselines. Do not describe their win rates as evidence of human enjoyment or universal balance.
