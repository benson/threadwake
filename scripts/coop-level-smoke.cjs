// Real two-client pickup -> shared level -> simultaneous draft -> same-fight resume.
async page => {
  const origin=new URL(page.url()).origin,errors=[],held=new Set();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?server=ws://127.0.0.1:8787');
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.waitForFunction(()=>window.__threadwake.state.players.length===1);
  const guest=await page.context().newPage();guest.on('pageerror',e=>errors.push(e.message));
  try {
    await guest.goto(page.url());
    await guest.waitForFunction(()=>window.__threadwake.state.players.length===2);
    await guest.locator('#lobby-character').click();
    await guest.locator('#character-choices button').filter({hasText:'Conservator'}).click();
    await guest.getByRole('button',{name:'Done',exact:true}).click();
    await page.getByRole('button',{name:'Start shift',exact:true}).click();
    await guest.waitForFunction(()=>window.__threadwake.state.phase==='playing');
    await guest.keyboard.down('Space');
    for(let frame=0;frame<250;frame++){
      const s=await page.evaluate(async()=>{
        const s=window.__threadwake.state,p=s.players.find(p=>p.id===window.__threadwake.identity);
        const {mapById,steerAroundCover}=await import('/src/maps.js'),d=q=>Math.hypot(q.x-p.x,q.y-p.y);
        const enemies=[...s.enemies].sort((a,b)=>d(a)-d(b));
        const q=[...s.pickups].sort((a,b)=>d(a)-d(b)).find(q=>!enemies.some(e=>Math.hypot(e.x-q.x,e.y-q.y)<65));
        let goal=q||{x:600+160*Math.cos(s.time*.25),y:400+150*Math.sin(s.time*.25)};
        if(enemies[0]&&d(enemies[0])<100){const e=enemies[0],r=d(e)||1;goal={x:p.x+(p.x-e.x)/r*120,y:p.y+(p.y-e.y)/r*120};}
        goal=steerAroundCover(mapById(s.mapId),p,goal,12);
        return {phase:s.phase,level:s.level,wave:s.wave,time:s.time,xp:s.xp,dx:goal.x-p.x,dy:goal.y-p.y};
      });
      if(s.phase==='lost')throw Error('Team lost before first shared level');
      if(s.phase==='draft'){
        for(const k of held)await page.keyboard.up(k);held.clear();await guest.keyboard.up('Space');
        await guest.waitForFunction(()=>window.__threadwake.state.phase==='draft');
        const guestBefore=await guest.evaluate(()=>({level:window.__threadwake.state.level,xp:window.__threadwake.state.xp,time:window.__threadwake.state.time}));
        if(guestBefore.level!==s.level||guestBefore.xp!==s.xp||guestBefore.time!==s.time)throw Error('Clients disagree on XP draft');
        await page.locator('#choices button').first().click();
        await page.waitForFunction(()=>Object.keys(window.__threadwake.state.choices).length===1);
        if(await page.evaluate(()=>window.__threadwake.state.phase)!=='draft')throw Error('Did not wait for teammate');
        await guest.locator('#choices button').first().click();
        await page.waitForFunction(()=>window.__threadwake.state.phase==='playing');
        const after=await page.evaluate(()=>({wave:window.__threadwake.state.wave,time:window.__threadwake.state.time,upgrades:window.__threadwake.state.players.map(p=>p.upgrades.length),weapons:window.__threadwake.state.players.map(p=>p.weapons)}));
        if(after.wave!==s.wave||after.time-s.time>.4||after.upgrades.some(n=>n!==1))throw Error('Shared upgrade did not resume encounter: '+JSON.stringify(after));
        if(errors.length)throw Error(errors.join('\n'));
        return {level:s.level,time:s.time,shared:guestBefore,after,errors};
      }
      const wanted=new Set(['Space']);
      if(s.dx>16)wanted.add('d');else if(s.dx< -16)wanted.add('a');
      if(s.dy>16)wanted.add('s');else if(s.dy< -16)wanted.add('w');
      for(const k of held)if(!wanted.has(k)){await page.keyboard.up(k);held.delete(k);}
      for(const k of wanted)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}
      await page.waitForTimeout(200);
    }
    throw Error('No shared level reached');
  } finally {for(const k of held)await page.keyboard.up(k);await guest.close();await page.goto(origin);}
}
