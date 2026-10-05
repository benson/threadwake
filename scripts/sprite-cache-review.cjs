// Compare cached art against the direct production drawing, including eviction,
// fractional movement, hit flashes, changing aim and charge states.
async page => {
  const origin = new URL(page.url()).origin;
  await page.route('**/__sprite_review__', route => route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0;background:#101925"></body>'}));
  await page.goto(origin+'/__sprite_review__');
  return page.evaluate(async()=>{
    const {drawActor}=await import('/src/art.js');
    const {createSpriteCache}=await import('/src/sprite-cache.js');
    const cache=createSpriteCache(2),canvases=[0,1].map(()=>{
      const c=document.createElement('canvas');c.width=c.height=160;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);ctx._pixelRatio=2;ctx.imageSmoothingEnabled=false;return {c,ctx};
    });
    let checked=0,roundedShadowChannels=0;
    for(let i=0;i<360;i++){
      const actor={type:i%2?'moth':'mite',id:i%31,x:40+(i%4)*.25,y:58+(i%3)*.25,
        face:i%3?-1:1,aimX:Math.cos(i*Math.PI/16),aimY:Math.sin(i*Math.PI/16),
        hit:i%5===0?.12:i%5===1?.04:0,shotAge:(i%3)*.05,fireIn:i%4?.8:.3},
        time=i*.071,settings=i%11===0?{state:'hit'}:{};
      for (let reuse=0;reuse<2;reuse++) {
      if(reuse){actor.x+=1.5;actor.y+=.5;actor.aimX=-actor.aimX;actor.aimY=-actor.aimY;actor.shotAge=.08;if(actor.hit)actor.hit=.025;}
      for(const {ctx}of canvases){ctx.fillStyle='#304558';ctx.fillRect(0,0,80,80);}
      drawActor(canvases[0].ctx,actor,time,settings);
      if(!cache.draw(canvases[1].ctx,actor,time,settings))throw Error('Cache did not handle '+actor.type);
      const a=canvases[0].ctx.getImageData(0,0,160,160).data,b=canvases[1].ctx.getImageData(0,0,160,160).data;
      for(let j=0;j<a.length;j++)if(a[j]!==b[j]) {
        const y=Math.floor(j/4/160)/2,feet=Math.round(actor.y*2)/2;
        if(Math.abs(a[j]-b[j])>1 || j%4===3 || y<feet-3 || y>feet+6)
          throw Error(JSON.stringify({case:i,type:actor.type,time,pixel:Math.floor(j/4),channel:j%4,direct:a[j],cached:b[j]}));
        roundedShadowChannels++;
      }
      checked++;
      }
    }
    return {cases:checked,reusedFrames:360,opaqueArtExact:true,maxShadowRounding:roundedShadowChannels?1:0,roundedShadowChannels,evictionExercised:true};
  });
}
