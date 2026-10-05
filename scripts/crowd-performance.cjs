// Read-only production renderer crowd fixture; animation-frame paced, no simulation claims.
async page => {
  const origin = new URL(page.url()).origin;
  await page.route('**/__crowd_review__', route => route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#111b27"></body></html>'}));
  await page.goto(origin+'/__crowd_review__');
  await page.setViewportSize({width:1280,height:720});
  const result = await page.evaluate(async () => {
    const {createRenderer}=await import('/src/render.js');
    const {createGame,addPlayer}=await import('/src/sim.js');
    const {mapById,safePosition}=await import('/src/maps.js');
    const {collectLights}=await import('/src/lighting.js');
    const canvas=document.createElement('canvas');canvas.id='crowd';canvas.style.cssText='display:block;width:1280px;height:720px;image-rendering:pixelated';document.body.append(canvas);
    const renderer=createRenderer(canvas),state=createGame(54),map=mapById('clock_gallery');
    Object.assign(state,{phase:'playing',mapId:'clock_gallery',wave:8,time:330});
    for(let i=0;i<4;i++){
      const p=addPlayer(state,'p'+i,'Staff '+i,{},['custodian','conservator','guard','custodian'][i]);
      Object.assign(p,{x:560+i*34,y:410+(i%2)*30,invulnerable:0,weapons:['slingshot','lantern','disc','storm'],lastWeapon:'lantern',upgrades:['orbit'],shotAge:.5,castAge:10,face:1});
    }
    for(let i=0;i<60;i++){
      const type=i===59?'warden':['mite','moth','thorn'][i%3];
      const base=safePosition(map,{x:360+(i%10)*51,y:270+Math.floor(i/10)*50},type==='warden'?24:12,24);
      state.enemies.push({id:i+100,type,...base,baseX:base.x,baseY:base.y,hp:80,maxHp:80,r:type==='warden'?24:12,hit:0,phase:i*.31,face:i%2?1:-1,slow:0,stagger:0,stage:2,attack:type==='thorn'?'fan':'needle',fireIn:.25,shotAge:1,aimX:-1,aimY:0});
    }
    for(let i=0;i<48;i++) state.shots.push({id:1000+i,hostile:i<24,weapon:i%2?'slingshot':'disc',x:0,y:0,vx:i%2?115:-100,vy:i%3?32:-45,r:i<24?3:2,age:0,life:5,color:i%4});
    const costs=[],cadence=[],copies=[];let lastTs=null,lightsRange=[999,0],visibleEnemyRange=[999,0];
    const start=performance.now();
    for(let f=0;f<150;f++){
      const ts=await new Promise(resolve=>requestAnimationFrame(resolve)),t=(ts-start)/1000;
      state.time=330+t;
      state.players.forEach((p,i)=>{Object.assign(p,safePosition(map,{x:555+i*31+Math.sin(t*1.1+i)*23,y:405+(i%2)*28+Math.cos(t+i)*20},10,18));p.vx=Math.cos(t*1.1+i)*25;p.vy=-Math.sin(t+i)*20;p.face=p.vx<0?-1:1;p.aimX=p.face;p.aimY=.2;p._orbit=t*2+i;});
      state.enemies.forEach((e,i)=>{Object.assign(e,safePosition(map,{x:e.baseX+Math.sin(t*1.7+i)*8,y:e.baseY+Math.cos(t*1.3+i)*6},e.r,24));e.phase=t+i*.31;e.fireIn=(.2+i*.073-t*.43)%1.8;if(e.fireIn<0)e.fireIn+=1.8;const dx=state.players[0].x-e.x,dy=state.players[0].y-e.y,d=Math.hypot(dx,dy)||1;e.aimX=dx/d;e.aimY=dy/d;e.face=dx<0?-1:1;});
      state.shots.forEach((s,i)=>{s.x=340+((i*47+t*(i%2?92:-83))%510+510)%510;s.y=280+((i*37+t*25)%270);s.age=t+i*.05;});
      state.effects=[];
      for(let i=0;i<4;i++){
        const p=state.players[i],age=(t+i*.15)%.7;
        state.effects.push({id:2000+i,type:'lantern',x:p.x,y:p.y-10,radius:90,color:i,life:.7-age,maxLife:.7});
        state.effects.push({id:2010+i,type:'storm',x:state.enemies[i*13].x,y:state.enemies[i*13].y-10,fromX:p.x,fromY:p.y-13,color:i,life:.35-((t+i*.07)%.35),maxLife:.35});
        state.effects.push({id:2020+i,type:'death',x:440+i*90+Math.sin(t+i)*10,y:330+i*25,color:i,life:.35-((t+i*.09)%.35),maxLife:.35});
      }
      const a=performance.now();renderer.draw(state,'p0',t,{shake:false,reducedMotion:false});const cost=performance.now()-a;
      if(f>=30){costs.push(cost);if(lastTs!==null)cadence.push(ts-lastTs);}
      lastTs=ts;
      const n=collectLights(state).length;lightsRange=[Math.min(lightsRange[0],n),Math.max(lightsRange[1],n)];
      const v=state.enemies.filter(e=>Math.abs(e.x-renderer.camera.x)<340&&Math.abs(e.y-renderer.camera.y)<200).length;visibleEnemyRange=[Math.min(visibleEnemyRange[0],v),Math.max(visibleEnemyRange[1],v)];
      if(f===50||f===120){const copy=document.createElement('canvas');copy.width=1280;copy.height=720;copy.id='frame-'+f;copy.getContext('2d').drawImage(canvas,0,0);copy.style.display='none';document.body.append(copy);copies.push({frame:f,timeSeconds:t,lights:n,renderMs:cost});}
    }
    const stats=xs=>{const sort=[...xs].sort((a,b)=>a-b),q=p=>+sort[Math.floor((sort.length-1)*p)].toFixed(2);return {count:xs.length,mean:+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2),p50:q(.5),p95:q(.95),p99:q(.99),max:q(1),over16_7:xs.filter(x=>x>16.7).length,over33_3:xs.filter(x=>x>33.3).length};};
    return {fixture:'Production renderer only; synthetic bounded crowd; not simulation or network profiling',warmupFrames:30,measuredFrames:120,backing:[canvas.width,canvas.height],players:4,enemies:60,visibleEnemyRange,shots:48,hostileShots:24,effects:12,lightsRange,renderMs:stats(costs),animationFrameIntervalMs:stats(cadence),captures:copies,elapsedSeconds:+((performance.now()-start)/1000).toFixed(2)};
  });
  for(const frame of [50,120]){
    await page.evaluate(f=>{document.querySelectorAll('canvas').forEach(c=>c.style.display=c.id==='frame-'+f?'block':'none');},frame);
    await page.locator('#frame-'+frame).screenshot({path:'.local/art-review/crowd-frame-'+frame+'.png'});
  }
  return result;
}
