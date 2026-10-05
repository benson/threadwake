// Ordered temporal samples, distinct from the static art inventory.
async page => {
  await page.goto('http://127.0.0.1:4323/');
  await page.setViewportSize({width:1568,height:1450});
  const result=await page.evaluate(async()=>{
    const {drawActor}=await import('/src/art.js');
    const {pixelText}=await import('/src/pixel-ui.js');
    document.querySelector('#game').hidden=true;
    const c=document.createElement('canvas');c.id='motion-review';c.width=1568;c.height=1408;
    document.body.append(c);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    const rows=[{type:'player',motion:'walk'},{type:'player',motion:'sweep'},{type:'player',motion:'fire'},
      {type:'soldier',motion:'walk'},{type:'thorn',motion:'walk'},{type:'moth',motion:'hover'},
      {type:'warden',motion:'walk'},{type:'mite',motion:'walk'}];
    const ages=[0,.04,.08,.12,.18,.24,.30,.38];
    rows.forEach((row,r)=>{
      for(let f=0;f<8;f++){
        const x=f*196,y=r*176,t=row.motion==='walk'||row.motion==='hover'?f*(row.type==='warden'?.2:.1):ages[f];
        ctx.fillStyle='#22313f';ctx.fillRect(x+2,y+2,192,172);
        pixelText(ctx,`${r+1}.${f+1}`,x+8,y+8,2);
        const actor={id:10,type:row.type==='player'?undefined:row.type,x:0,y:0,vx:row.motion==='walk'?155:0,vy:0,aimX:1,aimY:0,face:1,hp:110,maxHp:110,castAge:row.motion==='sweep'?t:999,shotAge:row.motion==='fire'?t:999,fireIn:1};
        const positions=row.type==='warden'?[[x+32,y+113,1],[x+128,y+153,2]]:[[x+42,y+113,1],[x+111,y+128,2]];
        for(const [px,py,scale]of positions){
          ctx.save();ctx.translate(px,py);ctx.scale(scale,scale);drawActor(ctx,actor,t);ctx.restore();
        }
      }
    });
    const footCanvas=document.createElement('canvas');footCanvas.width=82;footCanvas.height=92;
    const footCtx=footCanvas.getContext('2d'),footFrames={};
    for(const vx of [0,32]){
      const variants=new Set();
      for(let f=0;f<8;f++){
        footCtx.clearRect(0,0,82,92);
        drawActor(footCtx,{id:10,type:'warden',x:41,y:83,vx,vy:0,aimX:1,aimY:0,face:1,hp:110,maxHp:110,fireIn:1},f*.2);
        variants.add(Array.from(footCtx.getImageData(20,80,45,3).data).join(','));
      }
      footFrames[vx===0?'stationary':'moving']=variants.size;
    }
    if(footFrames.stationary!==1||footFrames.moving<3)throw Error('Clock foot contact does not follow movement state');
    return {rows:rows.map((r,i)=>`${i+1}: ${r.type} ${r.motion}`),walkTimes:'0 through .7s in .1s increments; clock: 0 through 1.4s in .2s increments',attackTimes:ages,footFrames};
  });
  await page.locator('#motion-review').screenshot({path:'.local/art-review/motion-current.png'});
  return result;
}
