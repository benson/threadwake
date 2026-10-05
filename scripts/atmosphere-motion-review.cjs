// Run with the repository Playwright CLI: run-code --filename scripts/atmosphere-motion-review.cjs
// Uses the real renderer, public state shapes, and the shared water footprint.
async page => {
  const url = typeof process !== 'undefined' && process.env.REVIEW_URL
    ? process.env.REVIEW_URL : 'http://127.0.0.1:4330/';
  await page.goto(url);
  await page.setViewportSize({width:1280,height:1800});
  const review = await page.evaluate(async () => {
    const { createRenderer } = await import('/src/render.js');
    const { WATER_POOL, inWater } = await import('/src/ambience.js');
    const { drawAtmosphereGround } = await import('/src/atmosphere.js');
    const times = [0, 1.2, 3.6, 6.4, 12.6, 14.1];
    const closeTimes = [0, 1.2, 4.2, 12.6];
    const staff = (id, character, x, y, color, vx, vy) => ({
      id, name:'Review', character, x, y, color, vx, vy,
      hp:100, maxHp:100, dead:false, face:1, aimX:1, aimY:0,
      shotAge:999, castAge:999, hit:0, upgrades:[],
      weapons:[character==='guard'?'disc':character==='conservator'?'lantern':'slingshot'],
      lastWeapon:character==='guard'?'disc':character==='conservator'?'lantern':'slingshot',
    });
    const state = {
      seed:13, mapId:'sculpture_court', wave:5, players:[
        staff('review-a','custodian',578,394,0,62,22),
        staff('review-b','conservator',622,415,1,-48,-14),
      ], enemies:[], companions:[], shots:[], effects:[], pickups:[], flowers:[],
    };
    const source = document.createElement('canvas');
    const renderer = createRenderer(source);
    const render = (time, players=state.players) => {
      renderer.draw({...state,players},'review-a',time,{reducedMotion:false,shake:false});
      return source;
    };
    const atlas = document.createElement('canvas');
    atlas.id='atmosphere-review'; atlas.width=1280; atlas.height=1080;
    const ctx=atlas.getContext('2d'); ctx.imageSmoothingEnabled=false;
    times.forEach((time,i) => {
      const source=render(time);
      ctx.drawImage(source,0,0,source.width,source.height,
        (i%2)*640,Math.floor(i/2)*360,640,360);
      // A small raster index keeps the image legible without browser fonts.
      ctx.fillStyle='#101925'; ctx.fillRect((i%2)*640+8,Math.floor(i/2)*360+8,16,16);
      ctx.fillStyle='#dbb96f';
      for(let bar=0;bar<=i;bar++) ctx.fillRect((i%2)*640+11+bar*2,Math.floor(i/2)*360+12,1,7);
    });
    const close = document.createElement('canvas');
    close.id='water-review'; close.width=800; close.height=600;
    const water=close.getContext('2d'); water.imageSmoothingEnabled=false;
    closeTimes.forEach((time,i) => {
      const source=render(time);
      const ratio=source.width/640;
      const worldLeft=WATER_POOL.x-100, worldTop=WATER_POOL.y-75;
      const screenLeft=worldLeft-600+320, screenTop=worldTop-400+180;
      water.drawImage(source,screenLeft*ratio,screenTop*ratio,
        200*ratio,150*ratio,(i%2)*400,Math.floor(i/2)*300,400,300);
    });
    // Compare only the ground pass, so a foreground actor cannot count as
    // evidence that its mirrored sprite reached the water.
    const ground = players => {
      const canvas=document.createElement('canvas');
      canvas.width=1200; canvas.height=800;
      drawAtmosphereGround(canvas.getContext('2d'), {...state,players},1.2,
        {id:'sculpture_court'}, {reducedMotion:false});
      return canvas.getContext('2d');
    };
    const a=ground(state.players), b=ground([]);
    let changed=0;
    for(let y=WATER_POOL.y+3;y<WATER_POOL.y+24;y++)
      for(let x=WATER_POOL.x-40;x<WATER_POOL.x+40;x++) {
        if(!inWater('sculpture_court',x,y))continue;
        const aa=a.getImageData(x,y,1,1).data, bb=b.getImageData(x,y,1,1).data;
        if(aa[0]!==bb[0]||aa[1]!==bb[1]||aa[2]!==bb[2])changed++;
      }
    document.body.innerHTML='';
    document.body.style.cssText='margin:0;background:#101925';
    document.body.append(atlas,close);
    return {times,closeTimes,water:WATER_POOL,reflectionPixelsChanged:changed,
      atlasSize:[atlas.width,atlas.height],waterSize:[close.width,close.height]};
  });
  // Keep both canvases in the viewport before capturing their exact pixels.
  for (const [id,path] of [
    ['#atmosphere-review','.local/art-review/atmosphere-motion.png'],
    ['#water-review','.local/art-review/water-reflections.png'],
  ]) {
    await page.locator(id).screenshot({path});
  }
  if(review.reflectionPixelsChanged<15)
    throw Error('Actor reflection did not change enough water pixels: '+JSON.stringify(review));
  return review;
}
