// Threat anticipation must survive the same overlapping friendly VFX as bullets.
async page => {
  const origin = new URL(page.url()).origin;
  await page.goto(origin);
  await page.setViewportSize({width:1280,height:2000});
  const result=await page.evaluate(async()=>{
    const {createRenderer,drawAttackTelegraph}=await import('/src/render.js');
    const {PALETTE}=await import('/src/art.js');
    const c=document.createElement('canvas'),renderer=createRenderer(c),ctx=c.getContext('2d');
    const colors=[PALETTE.red,PALETTE.redLight,PALETTE.white].map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
    const maskCanvas=document.createElement('canvas');maskCanvas.width=c.width;maskCanvas.height=c.height;
    const mc=maskCanvas.getContext('2d');mc.scale(2,2);mc._pixelRatio=2;
    const plate=document.createElement('canvas');plate.id='telegraph-overlap';plate.width=1280;plate.height=1920;
    const pc=plate.getContext('2d'),results=[];
    const s={version:4,seed:42,mapId:'clock_gallery',wave:8,time:0,phase:'playing',players:[],enemies:[],companions:[],flowers:[],pickups:[],shots:[],effects:[]};
    for (const [row,[type,fireIn]] of [['moth',.4],['moth',.1],['thorn',.4],['thorn',.1],['warden',.4],['warden',.1]].entries()) {
      const e={id:600,type,x:600,y:400,phase:1,stage:3,attack:type==='thorn'?'fan':'needle',fireIn,aimX:1,aimY:0,hp:100,maxHp:100,shotAge:1,hit:0};
      s.enemies=[e];s.effects=[];
      const draw=()=>{renderer.draw(s,null,0,{shake:false,reducedMotion:false});return ctx.getImageData(0,0,c.width,c.height).data;};
      const warned=draw();
      mc.clearRect(0,0,640,360);mc.save();mc.translate(320-renderer.camera.x,180-renderer.camera.y);
      drawAttackTelegraph(mc,e,0);mc.restore();const isolated=mc.getImageData(0,0,c.width,c.height).data;
      const mask=[];
      for(let j=0;j<isolated.length;j+=4)if(isolated[j+3]===255 && colors.some(a=>a.every((v,k)=>isolated[j+k]===v)))mask.push(j);
      if(mask.some(j=>[0,1,2].some(k=>warned[j+k]!==isolated[j+k])))throw Error(type+' warning is already covered by ambient decoration');
      pc.drawImage(c,320,200,640,320,0,row*320,640,320);
      // Align a fresh storm strike with the first warning pixel to guarantee overlap.
      const first=mask[0],px=(first/4)%c.width,py=Math.floor(first/4/c.width);
      const x=px/2+renderer.camera.x-320,y=py/2+renderer.camera.y-180;
      s.effects=[{id:700,type:'storm',fromX:x-45,fromY:y,x:x+45,y,life:.35,maxLife:.35}];
      const covered=draw();pc.drawImage(c,320,200,640,320,640,row*320,640,320);
      const preserved=mask.filter(j=>[0,1,2].every(k=>warned[j+k]===covered[j+k])).length;
      results.push({type,fireIn,warningPixels:mask.length,preserved});
    }
    document.querySelector('#game').hidden=true;document.body.append(plate);
    return results;
  });
  await page.locator('#telegraph-overlap').screenshot({path:'.local/art-review/telegraph-overlap.png'});
  if(result.some(r=>!r.warningPixels || r.preserved!==r.warningPixels))throw Error('Friendly effects cover anticipation: '+JSON.stringify(result));
  return result;
}
