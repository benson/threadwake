// Real movement and pause; reads diagnostics without modifying gameplay state.
async page => {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4319/');
  await page.getByRole('button',{name:'Enter the grove',exact:true}).click();
  await page.keyboard.down('d');
  const sample=await page.evaluate(()=>new Promise(resolve=>{
    const frames=[];
    let previous=null;
    function tick(now) {
      const game=window.__threadwake;
      const actual=game.state.players.find(p=>p.id===game.identity);
      const drawn=game.presentation.players.find(p=>p.id===game.identity);
      if(previous!==null) frames.push({dt:now-previous,x:actual.x,drawnX:drawn.x,time:game.state.time,drawnTime:game.presentation.time});
      previous=now;
      if(frames.length<90) requestAnimationFrame(tick);
      else {
        const intervals=frames.map(f=>f.dt).sort((a,b)=>a-b);
        resolve({frames:frames.length,p95Ms:intervals[Math.floor(intervals.length*.95)],
          repeatedSimulationPositions:frames.filter((f,i)=>i&&f.x===frames[i-1].x).length,
          advancingIntermediatePositions:frames.filter((f,i)=>i&&f.x===frames[i-1].x&&f.drawnX>frames[i-1].drawnX).length,
          maxLead:Math.max(...frames.map(f=>f.drawnX-f.x))});
      }
    }
    requestAnimationFrame(tick);
  }));
  const stopProbe=page.evaluate(()=>new Promise(resolve=>{
    const positions=[window.__threadwake.presentation.players[0].x];
    function tick() {
      positions.push(window.__threadwake.presentation.players[0].x);
      if(positions.length<20)requestAnimationFrame(tick);
      else resolve(Math.min(...positions.slice(1).map((x,i)=>x-positions[i])));
    }
    requestAnimationFrame(tick);
  }));
  await page.keyboard.up('d');
  const stopMinimumDelta=await stopProbe;
  if(sample.repeatedSimulationPositions>5 && sample.advancingIntermediatePositions<3)throw Error('Movement still steps at simulation frequency: '+JSON.stringify(sample));
  if(sample.maxLead>0.001)throw Error('Solo presentation ran ahead of confirmed movement');
  if(stopMinimumDelta < -0.001)throw Error('Releasing movement snapped backwards: '+stopMinimumDelta);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await page.evaluate(()=>({time:window.__threadwake.presentation.time,x:window.__threadwake.presentation.players[0].x}));
  await page.waitForTimeout(250);
  const after=await page.evaluate(()=>({time:window.__threadwake.presentation.time,x:window.__threadwake.presentation.players[0].x}));
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Paused presentation drifted');
  if(errors.length)throw Error(errors.join('\n'));
  return {sample,stopMinimumDelta,pauseFrozen:true,errors};
}
