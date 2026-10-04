# Threadwake: craft review

Threadwake is an original pixel woodland survivor for 1–4 players, built with a 640×360 Canvas renderer, DOM controls, and a shared authoritative JavaScript simulation. You receive screenshots and this description; you have not played it. Review the game for legibility, coherence, animation intent, and whether the distinctive mechanic is understandable.

The owner specifically found the UI floating outside the arena, the first wave too slow, and permanent progression too hard to discover. They want continuing refinement, more intricate readable art, polished motion, and visible footsteps that preview the echo.

Current revision:

- Canvas and all HUD/dialogs share a fixed 960×540 coordinate system scaled together into the browser. Letterboxing sits outside the whole game field.
- First wave is 38 seconds; enemies arrive before one second and ranged attacks before eight. Later waves are 65 seconds.
- Automatic needles target nearby enemies. Space creates an echo from the actual previous three seconds of movement. The thread between player and echo cuts enemies and catches hostile projectiles. Longer threads deal more damage. Up to two echoes coexist for 7.2 seconds each; baseline recast is 5.5 seconds.
- Discrete footstep marks are actual history samples. A hollow prospective anchor shares the cast calculation; gold denotes a projected anchor when there is insufficient movement history. The preview dims while recharging.
- Catches empower the next volley and charge flowers; thread contact also charges them. Full flowers burst for damage and nearby healing. Allied crossed threads resonate; frost and garden upgrades create combinations.
- Memories are banked per completed wave and one-time milestone. A HUD balance opens a three-trait shop during play; spending applies to the next run. Traits are small bounded permanent bonuses. This is casual browser-local progression.
- Character motion includes planted alternating feet, cloth follow-through, cast preparation and release, enemy windups, hit reactions, echo expiry rings, and flower charge stages.

Constraints: keep the HUD restrained, no decorative edge stripes/selection rails, preserve crisp pixel art and combat contrast, keep input responsive, preserve reduced-motion support, do not add generic dashboard chrome or unnecessary explanations. Propose improvements before recommending new systems. Be candid rather than flattering.

Return at most five ranked findings. For each: evidence type, precise problem, smallest concrete improvement, and a practical verification. Also identify the single change most likely to make this feel crafted rather than merely functional. Avoid claiming animation timing or gameplay difficulty from a still image alone.
