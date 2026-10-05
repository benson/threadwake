// Temporal samples use production rendering; they do not simulate a play session.
async page => {
  const origin = new URL(page.url()).origin;
  await page.goto(origin);
  await page.setViewportSize({width: 1280, height: 1200});
  const samples = await page.evaluate(async () => {
    const {createRenderer} = await import('/src/render.js');
    const {createGame, addPlayer} = await import('/src/sim.js');
    const {pixelText} = await import('/src/pixel-ui.js');
    const viewport = document.createElement('canvas'), renderer = createRenderer(viewport);
    const sheet = document.createElement('canvas'); sheet.id = 'ability-review';
    sheet.width = 1200; sheet.height = 1200;
    const ctx = sheet.getContext('2d'); ctx.imageSmoothingEnabled = false;
    document.querySelector('#game').hidden = true; document.body.append(sheet);
    document.body.style.height = 'auto'; document.body.style.overflow = 'auto';
    const kinds = ['lantern', 'storm', 'restore', 'repel'], ages = [0, .08, .16, .24];
    kinds.forEach((kind, row) => ages.forEach((age, col) => {
      const s = createGame(42); addPlayer(s, 'qa', 'Staff', {}, kind === 'repel' ? 'guard' : 'conservator');
      const p = s.players[0]; p.x = 600; p.y = 400; p.aimX = 1; p.aimY = 0;
      p.castAge = row > 1 ? age : 999; p.shotAge = row < 2 ? age : 999;
      p.weapons = [kind === 'storm' ? 'storm' : kind === 'repel' ? 'disc' : 'lantern']; p.lastWeapon = p.weapons[0];
      s.phase = 'playing'; s.wave = 1; s.time = age;
      const maxLife = row < 2 ? .28 : .35;
      s.effects = [{id: 1, type: row < 2 ? kind : 'sweep', ability: kind,
        x: kind === 'storm' ? 685 : 600, y: kind === 'storm' ? 350 : 400,
        fromX: 616, fromY: 387, radius: kind === 'repel' ? 132 : kind === 'restore' ? 110 : 115,
        life: maxLife - age, maxLife}];
      renderer.draw(s, 'qa', age, {shake: false, reducedMotion: true});
      ctx.drawImage(viewport, 180, 28, 280, 280, col * 300 + 10, row * 300 + 20, 280, 280);
      pixelText(ctx, kind.toUpperCase() + ' ' + Math.round(age * 1000) + 'MS', col * 300 + 12, row * 300 + 5, 1);
    }));
    return {kinds, ages};
  });
  await page.locator('#ability-review').screenshot({path: '.local/art-review/ability-motion.png'});
  await page.goto(origin);
  return samples;
}
