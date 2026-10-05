// Inspect every gallery at the shared north collision boundary.
async page => {
  await page.goto('http://127.0.0.1:4323/');
  await page.setViewportSize({width:1280,height:800});
  const results=await page.evaluate(async()=>{
    const {createRenderer}=await import('/src/render.js');
    const {createGame,addPlayer,startGame}=await import('/src/sim.js');
    const {MAPS}=await import('/src/maps.js');
    const plate=document.createElement('canvas');plate.id='north-edge-review';plate.width=1280;plate.height=720;
    const ctx=plate.getContext('2d'),results=[];
    for(const [i,map] of MAPS.entries()){
      const s=createGame(42);addPlayer(s,'a');startGame(s);
      s.mapId=map.id;s.wave=map.waves[0];s.flowers=[];s.enemies=[];
      const p=s.players[0];p.x=600;p.y=18;
      const canvas=document.createElement('canvas'),renderer=createRenderer(canvas);
      renderer.draw(s,'a',0,{shake:false,reducedMotion:true});
      const headY=p.y-40-(renderer.camera.y-180);
      if(headY<60)throw Error(map.id+': north-edge actor clips or overlaps top HUD');
      const pointer=renderer.screenToWorld(320,p.y-(renderer.camera.y-180));
      if(Math.abs(pointer.x-p.x)>.01||Math.abs(pointer.y-p.y)>.01)throw Error('Camera pointer mapping diverges');
      ctx.drawImage(canvas,(i%2)*640,Math.floor(i/2)*360);
      p.y=782;renderer.draw(s,'a',10,{shake:false,reducedMotion:true});
      for(let j=0;j<40;j++)renderer.draw(s,'a',10+j/30,{shake:false,reducedMotion:true});
      if(p.y-(renderer.camera.y-180)>360)throw Error('South edge clips');
      results.push({gallery:map.id,headY,pointerMapping:true});
    }
    document.querySelector('#game').hidden=true;document.body.append(plate);
    return results;
  });
  await page.locator('#north-edge-review').screenshot({path:'.local/art-review/north-edge-galleries.png'});
  return results;
}
