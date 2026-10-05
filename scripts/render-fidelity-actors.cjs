// Fine-raster production sprites at actual backing scale and 2x enlargement.
async page => {
  await page.setViewportSize({width:2048,height:1900});
  const result = await page.evaluate(async () => {
    const {drawActor, drawFlower, drawFern} = await import('/src/art.js');
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;inset:0;overflow:auto;background:#101925;z-index:9999';
    document.body.append(root);
    const types = ['custodian','conservator','guard','soldier','mite','moth','thorn','warden'];
    const canvas = document.createElement('canvas');
    canvas.id = 'fidelity-actors';canvas.width = 2048;canvas.height = 1900;root.append(canvas);
    const ctx = canvas.getContext('2d');ctx.imageSmoothingEnabled = false;ctx._pixelRatio=2;
    for (let r = 0; r < types.length; r++) for (let col = 0; col < 8; col++) {
      const x = col * 256, y = r * 210, a = col * Math.PI / 4;
      ctx.fillStyle = '#263441';ctx.fillRect(x+2,y+2,252,206);
      ctx.fillStyle = '#a4b0ae';ctx.font = '11px monospace';ctx.fillText(types[r]+' '+col,x+8,y+15);
      const actor = {id:2,x:0,y:0,type:r<3?'player':types[r],character:types[r],face:Math.cos(a)<0?-1:1,aimX:Math.cos(a),aimY:Math.sin(a),vx:100,vy:0,castAge:col===1?.08:999,shotAge:col===2?.04:999,fireIn:col===2?.3:2,stage:1,color:0,hp:100,upgrades:[]};
      for (const [dx,dy,scale] of [[40,193,2],[164,195,r===7?2:4]]) {
        ctx.save();ctx.translate(x+dx,y+dy);ctx.scale(scale,scale);drawActor(ctx,actor,col*.1);ctx.restore();
      }
    }
    for (let col=0;col<8;col++) {
      const x=col*256,y=1680;ctx.fillStyle='#263441';ctx.fillRect(x+2,y+2,252,216);
      for(const [dx,dy,scale] of [[40,160,2],[164,160,4]]) {
        ctx.save();ctx.translate(x+dx,y+dy);ctx.scale(scale,scale);
        if(col<4)drawFlower(ctx,{x:0,y:0,id:1,charge:col/3},.3);
        else drawFern(ctx,0,0,col%2);
        ctx.restore();
      }
    }
    return {directions:8,actors:types,nativeScale:true,poses:'walk, cast, firing, rear',supplies:[0,1/3,2/3,1],plants:2};
  });
  await page.locator('#fidelity-actors').screenshot({path:'output/fidelity-actors/contact-2x.png'});
  return result;
}
