# After Hours: craft review

After Hours is an original haunted-museum survivor for 1–4 players, built with a 640×360 Canvas renderer, DOM controls, and a shared authoritative JavaScript simulation. If supplied only screenshots, you have not played it: distinguish visible evidence from hypotheses requiring play.

The owner wants sustained refinement of original hand-drawn art, crisp animation, accurate hitboxes, responsive combat, and coherent UI. They rejected the former woodland echo mechanic and selected the haunted museum direction. Evaluate this game on its own terms.

Current direction:

- Canvas and all HUD/dialogs share a fixed 960×540 coordinate system scaled together into the browser. Letterboxing sits outside the whole game field.
- A night custodian automatically fires gift-shop marbles. Space, click, or controller A triggers an immediate broom sweep that damages and knocks back nearby exhibits and clears hostile projectiles. Holding the action repeats when ready.
- Porcelain beetles, specimen moths, and animated armor occupy a tiled museum hall. The Grand Clock ends the eight-wave shift.
- Four maps carry the shift through Antiquities, Natural History, Sculpture Court, and the Clock Gallery. Exhibit geometry is shared by rendering and authoritative collisions.
- Between waves, borrow curios with distinct object illustrations and mechanical upgrades. The setting supplies the twist without requiring another minigame.
- Supply carts charge through proximity and sweeping, then heal and clear nearby threats. Cooperative play preserves shared combat and ally recovery.
- Credits are banked at completed waves and one-time milestones. The Staff kit offers three bounded permanent bonuses that apply next shift. Browser-local progression from the previous version is preserved.
- The start screen presents credits, best wave, permanent equipment, and the gallery route. Upgrade purchases show exact before-and-after stats; results provide direct access to permanent equipment.
- An animation workshop supports action timing, scenarios, and deterministic replay. Reduced-motion support must remain useful.

Constraints: keep the HUD restrained, no decorative edge stripes or selection rails, preserve crisp pixel art and combat contrast, keep input responsive, and do not add generic dashboard chrome or unnecessary explanations. Visible additions and copy rewrites require owner approval. Propose new systems rather than assuming they are authorized.

Return at most five ranked findings. For each, give the evidence type, precise problem, smallest concrete improvement, and practical verification. Identify the single change most likely to improve craft. Do not infer animation quality, collision accuracy, or difficulty from a still image alone.
