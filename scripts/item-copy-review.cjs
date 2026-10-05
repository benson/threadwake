// Controlled draft fixtures review every definition in the actual UI.
async page => {
  const origin=new URL(page.url()).origin;
  await page.setViewportSize({width:1280,height:800});
  await page.goto(origin);
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  const ids=await page.evaluate(async()=>{
    const {UPGRADES}=await import('/src/sim.js');
    const s=window.__threadwake.state,p=s.players[0];
    p.weapons=['slingshot','lantern','disc','storm'];
    p.upgrades=UPGRADES.flatMap(u=>[u.id,u.id]);
    s._spawn=s._flower=1000;s.enemies=[];s.shots=[];
    return UPGRADES.map(u=>u.id);
  });
  const results=[];
  for(let i=0;i<ids.length;i+=3){
    await page.evaluate(group=>{
      const s=window.__threadwake.state;s.phase='draft';s.level=7;
      s.choices={[s.players[0].id]:group};
    },ids.slice(i,i+3));
    await page.waitForFunction(first=>document.querySelector('#choices .upgrade-description')?.textContent===first,
      await page.evaluate(async first=>(await import('/src/upgrade-copy.js')).upgradeDetails(window.__threadwake.state.players[0],first,{control:'Space'}).description,ids[i]));
    const state=await page.locator('.draft-content').evaluate(el=>{
      const a=el.getBoundingClientRect(),g=document.querySelector('#game').getBoundingClientRect();
      return {top:a.top,bottom:a.bottom,gameTop:g.top,gameBottom:g.bottom,
        definitions:[...el.querySelectorAll('.upgrade-description')].map(p=>p.textContent)};
    });
    if(state.top<state.gameTop-1||state.bottom>state.gameBottom+1)throw Error('Draft overflows: '+JSON.stringify(state));
    if(state.definitions.length!==Math.min(3,ids.length-i)||state.definitions.some(s=>!s))throw Error('Missing definition');
    results.push(state);
    await page.screenshot({path:`.local/art-review/item-definitions-${i}.png`});
    await page.locator('#choices button').first().click();
    await page.waitForFunction(()=>window.__threadwake.state.phase==='playing');
  }
  await page.goto(origin);
  return results;
}
