// Real keyboard path and real draft choices; never changes simulation state.
async page => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4320/');
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  const milestones=[];
  await page.keyboard.down('Space');
  for(let i=0;i<85;i++){
    const state=await page.evaluate(()=>({phase:window.__threadwake.state.phase,wave:window.__threadwake.state.wave,map:window.__threadwake.state.mapId,hp:window.__threadwake.state.players[0].hp,time:window.__threadwake.state.time,kills:window.__threadwake.state.kills}));
    if(state.phase==='lost'){milestones.push(state);break;}
    if(state.phase==='draft'){
      await page.keyboard.up('Space');milestones.push(state);
      await page.locator('#choices button').first().click();
      await page.keyboard.down('Space');
    }
    if(state.wave>=3){
      milestones.push(state);
      await page.screenshot({path:'.local/art-review/natural-history-live.png'});
      break;
    }
    const key=['s','a','w','d'][i%4];
    await page.keyboard.down(key);await page.waitForTimeout(1800);await page.keyboard.up(key);
  }
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  return {milestones,method:'real repeating keyboard route, first offered upgrade, no health or state mutation'};
}
