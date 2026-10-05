// Real pause controls; a labeled full-inventory fixture stresses layout and descriptions.
async page => {
  const origin = new URL(page.url()).origin, errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:1280,height:800});
  await page.goto(origin);
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.locator('#loadout button').first().hover();
  if (!await page.locator('#item-description').textContent()) throw Error('Starter has no description');
  const pausedTime = await page.evaluate(()=>window.__threadwake.state.time);
  await page.waitForTimeout(250);
  if (pausedTime !== await page.evaluate(()=>window.__threadwake.state.time)) throw Error('Item inspection resumed the game');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.evaluate(async()=>{
    const {UPGRADES}=await import('/src/sim.js');
    const p=window.__threadwake.state.players[0];
    p.weapons=['slingshot','lantern','disc','storm'];
    p.upgrades=UPGRADES.flatMap(u=>[u.id,u.id]);
  });
  await page.keyboard.press('Escape');
  const items=page.locator('#loadout button');
  const count=await items.count();
  if(count!==20)throw Error('Expected all 20 acquired item types, got '+count);
  await page.locator('[data-item="weapon:storm"]').hover();
  if(!/jumps/.test(await page.locator('#item-description').textContent()))throw Error('Hover did not inspect lightning');
  await page.locator('[data-item="curio:heavy"]').focus();
  if(!/170%/.test(await page.locator('#item-stats').textContent()))throw Error('Focus shows wrong owned stack');
  await page.locator('[data-item="curio:frost"]').click();
  if(!/next weapon hit/i.test(await page.locator('#item-description').textContent()))throw Error('Click did not inspect frost');
  const layouts=[];
  for(const [width,height] of [[1280,800],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(80);
    const layout=await page.locator('#options').evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,
        overflow:el.scrollHeight-el.clientHeight};
    });
    if(layout.left< -1||layout.top< -1||layout.right>width+1||layout.bottom>height+1||layout.overflow>2)
      throw Error('Pause layout clips: '+JSON.stringify(layout));
    layouts.push(layout);
    await page.screenshot({path:`.local/art-review/item-inspection-${width}x${height}.png`});
  }
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  if(await page.locator('#options').evaluate(el=>el.open))throw Error('Continue left inspector open');
  if(errors.length)throw Error(errors.join('\n'));
  return {count,layouts,errors};
}
