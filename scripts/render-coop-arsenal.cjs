// Controlled worst-case loadout; real simulation and renderer, not earned play.
async page => {
  await page.goto(new URL('/', page.url()).href);
  await page.setViewportSize({width: 1280, height: 800});
  const result = await page.evaluate(async () => {
    const {createGame, addPlayer, startGame, step} = await import('/src/sim.js');
    const {createRenderer} = await import('/src/render.js');
    const s = createGame(42);
    ['custodian', 'conservator', 'guard', 'custodian'].forEach((c, i) => addPlayer(s, String(i), c, {}, c));
    startGame(s); s.wave = 7; s.mapId = 'clock_gallery'; s._spawn = s._flower = 100; s._opening = 2;
    s.flowers = []; s.enemies = [];
    s.players.forEach((p, i) => {
      p.x = 570 + (i % 2) * 60; p.y = 375 + Math.floor(i / 2) * 50;
      p.weapons = ['slingshot', 'lantern', 'disc', 'storm'];
      p.upgrades = ['fork', 'fork', 'orbit', 'mirror', 'frost'];
      p._fire = 0; p._weaponTimers = {lantern: 0, disc: 0, storm: 0};
    });
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      s.enemies.push({id: 500 + i, type: i % 3 ? 'moth' : 'thorn',
        x: 600 + Math.cos(a) * 140, y: 400 + Math.sin(a) * 105,
        r: 10, hp: 1000, maxHp: 1000, hit: 0, phase: a, slow: 0, brittle: 0,
        stagger: 0, stage: 0, attack: 'fan', shotAge: 999, aimX: -Math.cos(a), aimY: -Math.sin(a),
        _fire: .1, _locked: false, _shatter: 0});
    }
    document.querySelector('#game').hidden = true;
    const canvas = document.createElement('canvas'); canvas.id = 'coop-arsenal';
    canvas.style.cssText = 'width:1280px;height:720px;image-rendering:pixelated';
    document.body.append(canvas);
    const renderer = createRenderer(canvas), frames = [];
    for (let i = 0; i < 10; i++) {
      step(s, Object.fromEntries(s.players.map(p => [p.id, {cast: i === 0}])));
      if ([0, 3, 6, 9].includes(i)) {
        renderer.draw(s, '0', s.time, {shake: false, reducedMotion: true});
        frames.push({time: s.time, effects: s.effects.length, hostile: s.shots.filter(b => b.hostile).length,
          data: canvas.toDataURL()});
      }
    }
    window.__coopReviewFrames = frames;
    return frames.map(({data, ...stats}) => stats);
  });
  for (let i = 0; i < result.length; i++) {
    await page.evaluate(async index => {
      const c = document.querySelector('#coop-arsenal'), img = new Image();
      img.src = window.__coopReviewFrames[index].data; await img.decode();
      const ctx=c.getContext('2d');ctx.save();ctx.setTransform(1,0,0,1,0,0);
      ctx.drawImage(img, 0, 0);ctx.restore();
    }, i);
    await page.screenshot({path: `.local/art-review/coop-arsenal-${i}.png`});
  }
  await page.goto(new URL('/', page.url()).href);
  return result;
}
