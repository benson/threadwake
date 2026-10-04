// Real simulation timestamps around one broom hit; fixed scene isolates impact readability.
async page => {
 await page.goto('http://127.0.0.1:4323/');
 await page.setViewportSize({width:1280,height:720});
 const result=await page.evaluate(async()=>{
  const {createGame,addPlayer,startGame,step}=await import('/src/sim.js');
  const {createRenderer}=await import('/src/render.js');
  const s=createGame(42);addPlayer(s,'a');startGame(s);
  const p=s.players[0];p.x=600;p.y=400;p._fire=100;s._spawn=s._flower=100;s._opening=2;s.flowers=[];
  s.enemies=[{id:800,type:'thorn',x:650,y:400,r:13,hp:160,maxHp:160,hit:0,phase:0,slow:0,brittle:0,stagger:0,_fire:100,_shatter:0,aimX:-1,aimY:0,face:-1}];
  const c=document.createElement('canvas'),renderer=createRenderer(c);
  const plate=document.createElement('canvas');plate.id='sweep-frames';plate.width=1280;plate.height=720;const ctx=plate.getContext('2d');
  const samples=[];
  for(let i=0;i<4;i++){
   if(i)for(let j=0;j<(i===1?1:2);j++)step(s,{a:{cast:i===1&&j===0}},1/30);
   renderer.draw(s,'a',s.time,{shake:false,reducedMotion:true});
   const x=(i%2)*640,y=Math.floor(i/2)*360;ctx.drawImage(c,x,y);
   samples.push({time:s.time,hp:s.enemies[0].hp,hit:s.enemies[0].hit,x:s.enemies[0].x});
  }
  document.querySelector('#game').hidden=true;document.body.append(plate);
  return samples;
 });
 await page.locator('#sweep-frames').screenshot({path:'.local/art-review/sweep-impact.png'});
 return result;
}
