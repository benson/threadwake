// Real keyboard input through the first draft; no simulation mutation.
async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1200,height:750});
  await page.goto('http://127.0.0.1:4323/');
  await page.screenshot({path:'.local/art-review/start-screen.png'});
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  await page.keyboard.down('Space');
  for(let i=0;i<20;i++){
    if(await page.evaluate(()=>window.__threadwake.state.phase!=='playing'))break;
    const key=['s','a','w','d'][i%4];
    await page.keyboard.down(key);await page.waitForTimeout(2100);await page.keyboard.up(key);
    if(i===8)await page.screenshot({path:'.local/art-review/live-combat.png'});
  }
  await page.keyboard.up('Space');
  const result=await page.evaluate(()=>({phase:window.__threadwake.state.phase,time:window.__threadwake.state.time,hp:window.__threadwake.state.players[0].hp,kills:window.__threadwake.state.kills}));
  await page.screenshot({path:'.local/art-review/first-draft.png'});
  if(result.phase!=='draft')throw Error('Opening did not reach draft: '+JSON.stringify(result));
  const pick=page.locator('#choices button').first();
  const choice=await pick.textContent();await pick.click();
  await page.waitForFunction(()=>window.__threadwake.state.phase==='playing');
  await page.keyboard.press('Escape');
  if(errors.length)throw Error(errors.join('\n'));
  return {...result,choice,errors};
}
