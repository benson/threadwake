// Three actual boss stages, immediately before and after discharge.
async page => {
  await page.goto('http://127.0.0.1:4323/');
  await page.setViewportSize({width:1280,height:1200});
  const result=await page.evaluate(async()=>{
    const {createGame,addPlayer,startGame,step}=await import('/src/sim.js');
    const {createRenderer}=await import('/src/render.js');
    const canvas=document.createElement('canvas'),renderer=createRenderer(canvas);
    const plate=document.createElement('canvas');plate.id='boss-warning-review';plate.width=1280;plate.height=1080;
    const ctx=plate.getContext('2d'),samples=[];
    for(let i=0;i<3;i++){
      const s=createGame(42);addPlayer(s,'a');startGame(s);
      const p=s.players[0];p.x=600;p.y=400;p._fire=100;
      s.mapId='clock_gallery';s.wave=8;s._spawn=s._flower=100;s._opening=2;s.flowers=[];
      const boss={id:800,type:'warden',x:740,y:400,r:24,hp:[1000,500,200][i],maxHp:1000,hit:0,phase:1,stage:i+1,attack:['ring','fan','spiral'][i],fireIn:.1,_fire:.1,_locked:true,aimX:-1,aimY:0,face:-1,slow:0,stagger:0,brittle:0};
      s.enemies=[boss];
      renderer.draw(s,'a',s.time,{shake:false,reducedMotion:true});ctx.drawImage(canvas,0,i*360,640,360);
      for(let j=0;j<5;j++)step(s,{},1/30);
      renderer.draw(s,'a',s.time,{shake:false,reducedMotion:true});ctx.drawImage(canvas,640,i*360,640,360);
      samples.push({stage:i+1,shots:s.shots.filter(b=>b.hostile).length});
    }
    document.querySelector('#game').hidden=true;document.body.append(plate);
    return samples;
  });
  await page.locator('#boss-warning-review').screenshot({path:'.local/art-review/boss-warning-review.png'});
  return result;
}
