async (page) => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4320/');
  await page.getByRole('button',{name:'Enter the grove',exact:true}).click();
  await page.keyboard.down('d');
  await page.keyboard.down('Space');
  await page.waitForTimeout(5700);
  await page.waitForFunction(()=>window.__threadwake.state.echoes.length===2,{},{timeout:2000});
  await page.keyboard.up('Space');
  await page.keyboard.up('d');
  const held=await page.evaluate(()=>({echoes:window.__threadwake.state.echoes.length,cooldown:window.__threadwake.state.players[0].castCooldown}));
  if(held.echoes!==2 || held.cooldown<4) throw Error('Held cast did not produce overlapping echoes: '+JSON.stringify(held));
  // A tap shortly before cooldown ends must survive until the ability is ready.
  await page.waitForFunction(()=>{const c=window.__threadwake.state.players[0].castCooldown; return c>0 && c<.18;});
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const buffered=await page.evaluate(()=>window.__threadwake.state.players[0].castCooldown);
  if(buffered<5) throw Error('Near-ready cast was dropped: '+buffered);
  await page.keyboard.press('Escape');
  await page.locator('#music-volume').fill('20');
  await page.locator('#effects-volume').fill('70');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('threadwake.settings')));
  if(saved.musicVolume!==20 || saved.effectsVolume!==70) throw Error('Separate volume persistence failed');
  await page.screenshot({path:'output/playwright/iteration-options.png'});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.keyboard.down('a');
  await page.waitForTimeout(200);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('a');
  if(!await page.locator('#options').evaluate(el=>el.open)) throw Error('Blur did not pause solo');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  const x=await page.evaluate(()=>window.__threadwake.state.players[0].x);
  await page.waitForTimeout(200);
  if(await page.evaluate(()=>window.__threadwake.state.players[0].x)!==x) throw Error('Movement stuck after blur');
  await page.screenshot({path:'output/playwright/iteration-combat.png'});
  if(errors.length) throw Error(errors.join('\n'));
  return {held,buffered,volumes:saved,errors};
}
