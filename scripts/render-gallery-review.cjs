// Production-renderer scenery inventory. Controlled art fixtures, not gameplay.
// Run through playwright-cli run-code --filename after opening the ready dev URL.
async page => {
  const origin = new URL(page.url()).origin;
  await page.goto(origin);
  await page.setViewportSize({ width: 2608, height: 1880 });
  const galleries = await page.evaluate(async () => {
    const { createRenderer } = await import('/src/render.js');
    const { MAPS } = await import('/src/maps.js');
    const { createGame, addPlayer } = await import('/src/sim.js');
    document.querySelector('#game').hidden = true;
    document.body.style.cssText = 'background:#101925;margin:0;height:auto;overflow:auto;display:block';
    const root = document.createElement('div');
    root.id = 'gallery-review';
    document.body.append(root);
    const sheet = (id, width, height) => {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      canvas.width = width;
      canvas.height = height;
      canvas.style.cssText = `display:block;width:${width}px;height:${height}px;image-rendering:pixelated`;
      root.append(canvas);
      return canvas;
    };
    for (const map of MAPS) {
      const viewport = document.createElement('canvas');
      const renderer = createRenderer(viewport);
      const state = createGame(42);
      state.phase = 'playing';
      state.mapId = map.id;
      state.wave = map.waves[0];
      renderer.draw(state, null, 0, { shake: false, reducedMotion: true });
      // Stitch exact native-density viewports, including the non-walkable walls.
      const whole = sheet(`gallery-${map.id}-whole`, 2596, 1850);
      const ctx = whole.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      for (const top of [-125, 235, 440]) for (const left of [-49, 591, 609]) {
        renderer.camera.x = left + 320;
        renderer.camera.y = top + 180;
        renderer.draw(state, null, 0, { shake: false, reducedMotion: true });
        ctx.drawImage(viewport, (left + 49) * 2, (top + 125) * 2, 1280, 720);
      }
      // Unscaled 1280x720 backing pixels over the same 640x360 world viewport.
      const combat = sheet(`gallery-${map.id}-native`, 1280, 720);
      const combatRenderer = createRenderer(combat);
      const player = addPlayer(state, 'a', 'Custodian');
      Object.assign(player, { x: 600, y: 400, invulnerable: 0, aimX: 1, aimY: 0 });
      state.enemies = [
        { id: 98, type: 'moth', x: 490, y: 440, hp: 38, maxHp: 38, r: 10, face: 1, phase: .2, stage: 1, fireIn: .3, aimX: 1, aimY: 0, shotAge: 99, hit: 0 },
        { id: 99, type: 'thorn', x: 740, y: 340, hp: 70, maxHp: 70, r: 15, face: -1, phase: .5, stage: 1, fireIn: .65, aimX: -1, aimY: 0, shotAge: 99, hit: 0 },
      ];
      state.shots = [{ id: 201, x: 650, y: 380, vx: -100, vy: 20, hostile: true, r: 4, age: .3, life: 1, color: 0 }];
      combatRenderer.draw(state, 'a', .3, { shake: false, reducedMotion: true });
    }
    return MAPS.map(map => map.id);
  });
  for (const id of galleries) for (const view of ['whole', 'native'])
    await page.locator(`#gallery-${id}-${view}`).screenshot({ path: `.local/art-review/gallery-${id}-${view}.png` });
  return { galleries, images: 8, wholeRoom: '2596x1850 native pixels', combatViewport: '1280x720 native pixels / 640x360 world units', method: 'Production renderer; controlled art fixtures only' };
}
