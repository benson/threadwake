// Isolated production-renderer fixture for lamp-driven surface highlights.
async page => {
  const origin=new URL(page.url()).origin;
  await page.route('**/__material_review__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0;background:#111b27"></body>'}));
  await page.goto(origin+'/__material_review__');await page.setViewportSize({width:1280,height:720});
  const result=await page.evaluate(async()=>{
    const {createRenderer}=await import('/src/render.js');
    const {createGame,addPlayer}=await import('/src/sim.js');
    const results=[];
    for(const [mapId,x,y] of [['antiquities',335,323],['sculpture_court',558,418],['sculpture_court',295,326]])for(const t of [0,2]){
      const state=createGame(54);Object.assign(state,{phase:'playing',mapId,wave:mapId==='antiquities'?2:6,time:200+t});
      const p=addPlayer(state,'p0','Conservator',{},'conservator');
      Object.assign(p,{x:x+t*13,y:y-t*6,invulnerable:0,weapons:['lantern'],lastWeapon:'lantern',shotAge:99,aimX:-1,aimY:0,face:-1});
      const canvas=document.createElement('canvas'),id=mapId+'-'+x+'-'+t;
      canvas.id=id;canvas.style.cssText='width:1280px;height:720px;image-rendering:pixelated;display:none';document.body.append(canvas);
      const renderer=createRenderer(canvas);renderer.draw(state,'p0',t,{shake:false,reducedMotion:false});
      results.push(id);
    }
    return results;
  });
  for(const id of result){
    await page.evaluate(id=>document.querySelectorAll('canvas').forEach(c=>c.style.display=c.id===id?'block':'none'),id);
    await page.locator('#'+id).screenshot({path:'.local/art-review/material-'+id+'.png'});
  }
  return {captures:result,renderer:'production with material pass before telegraphs'};
}
