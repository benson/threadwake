// Exercise the actual selector, keyboard movement, pickups and level-up choice.
// Choose a staff member with ?qaCharacter=guard on the initial localhost URL.
async page => {
  const url = new URL(page.url()), character = url.searchParams.get('qaCharacter') || 'custodian';
  const names = {custodian:'Custodian',conservator:'Conservator',guard:'Guard'};
  const errors = [], milestones = {}, held = new Set();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:1280,height:800});
  await page.goto(url.origin);
  await page.locator('#character-button').click();
  await page.locator('#character-choices button').filter({hasText:names[character]}).click();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  const initial = await page.evaluate(() => {
    const p=window.__threadwake.state.players[0];return {character:p.character,weapons:p.weapons,hp:p.hp,maxHp:p.maxHp};
  });
  if(initial.character!==character || initial.weapons.length!==1)throw Error('Wrong starter: '+JSON.stringify(initial));
  try {
    for(let frame=0;frame<1100;frame++){
      const observation=await page.evaluate(async()=>{
        const {mapById,steerAroundCover}=await import('/src/maps.js');
        const s=window.__threadwake.state,p=s.players[0],distance=q=>Math.hypot(q.x-p.x,q.y-p.y);
        const pickups=[...s.pickups].sort((a,b)=>distance(a)-distance(b));
        const enemies=[...s.enemies].sort((a,b)=>distance(a)-distance(b));
        const safePickup=pickups.find(q=>!enemies.some(e=>Math.hypot(e.x-q.x,e.y-q.y)<65));
        let target=safePickup || {x:600+180*Math.cos(s.time*.25),y:400+170*Math.sin(s.time*.25)};
        if(enemies[0] && distance(enemies[0])<100) {
          const e=enemies[0],d=distance(e)||1;
          target={x:p.x+(p.x-e.x)/d*120,y:p.y+(p.y-e.y)/d*120};
        }
        const goal=steerAroundCover(mapById(s.mapId),p,target,12);
        return {phase:s.phase,time:s.time,wave:s.wave,waveTime:s.waveTime,level:s.level,xp:s.xp,kills:s.kills,hp:p.hp,weapons:p.weapons,upgrades:p.upgrades.length,dx:goal.x-p.x,dy:goal.y-p.y,pickups:s.pickups.length};
      });
      for(const [key,met] of Object.entries({kill:observation.kills>0,xp:observation.xp>0,weapon:observation.weapons.length>1}))
        if(met && milestones[key]==null)milestones[key]=observation.time;
      if(observation.phase==='lost')throw Error('Opening lost: '+JSON.stringify(observation));
      if(observation.phase==='draft'){
        for(const key of held)await page.keyboard.up(key);held.clear();
        milestones['level'+observation.level]=observation.time;
        await page.locator('#choices button').first().click();
        continue;
      }
      if(observation.wave >= 4 || observation.weapons.length === 4){
        await page.screenshot({path:'.local/art-review/arsenal-earned.png'});
        await page.keyboard.press('Escape');
        return {initial,milestones,final:observation,errors};
      }
      const wanted=new Set(['Space']);
      if(observation.dx>16)wanted.add('d');else if(observation.dx< -16)wanted.add('a');
      if(observation.dy>16)wanted.add('s');else if(observation.dy< -16)wanted.add('w');
      for(const key of held)if(!wanted.has(key)){await page.keyboard.up(key);held.delete(key);}
      for(const key of wanted)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
      await page.waitForTimeout(200);
    }
    throw Error('No late arsenal reached: '+JSON.stringify(milestones));
  } finally {for(const key of held)await page.keyboard.up(key);}
}
