// Review current production illustrations at native and enlarged pixel scales.
async page => {
  const origin = new URL(page.url()).origin;
  await page.goto(origin);
  await page.setViewportSize({width:1536,height:832});
  const count = await page.evaluate(async () => {
    const {drawCurio} = await import('/src/curios.js');
    const {drawMenuArt} = await import('/src/menu-art.js');
    const {UPGRADES} = await import('/src/sim.js');
    const items = [...UPGRADES.map(u=>[u.id,u.name,drawCurio]),
      ...['keyring','staff','kit','gear','museum'].map(id=>[id,id,drawMenuArt])];
    document.body.replaceChildren();
    document.body.style.cssText='margin:0;display:block;background:#111b27;overflow:auto';
    const canvas=document.createElement('canvas');canvas.id='icon-fidelity';
    canvas.width=1536;canvas.height=832;document.body.append(canvas);
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#111b27';ctx.fillRect(0,0,1536,832);
    items.forEach(([id,name,draw],i)=>{
      const x=i%6*256,y=Math.floor(i/6)*208;
      ctx.fillStyle='#22313f';ctx.fillRect(x+3,y+3,250,202);
      draw(ctx,id,x+12,y+95,64);draw(ctx,id,x+108,y+50,128);
      ctx.fillStyle='#f3e5c5';ctx.font='12px monospace';ctx.fillText(name,x+10,y+20);
    });
    return items.length;
  });
  await page.locator('#icon-fidelity').screenshot({path:'.local/art-review/icon-fidelity.png'});
  await page.goto(origin);
  return {illustrations:count};
}
