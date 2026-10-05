// Eight chronological samples of the real effect renderer, including the floor bounce.
async page => {
  await page.goto(new URL('/',page.url()).href);
  await page.setViewportSize({width:1280,height:660});
  const stats=await page.evaluate(async()=>{
    const {createRenderer}=await import('/src/render.js');
    const {debrisFrame}=await import('/src/debris.js');
    const c=document.createElement('canvas'),renderer=createRenderer(c),sheet=document.createElement('canvas');
    sheet.id='debris-review';sheet.width=1280;sheet.height=640;
    const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
    const ages=[0,.1,.2,.35,.45,.55,.7,.9],stats=[];
    ages.forEach((age,i)=>{
      const effects=['death','chip'].map((type,j)=>({id:17+j,type,x:570+j*60,y:400,
        maxLife:type==='death'?1:.8,life:Math.max(0,(type==='death'?1:.8)-age)}));
      const state={seed:42,mapId:'antiquities',players:[],enemies:[],companions:[],flowers:[],pickups:[],shots:[],effects};
      renderer.draw(state,null,age,{shake:false,reducedMotion:true});
      ctx.drawImage(c,220*2,115*2,160*2,160*2,(i%4)*320,Math.floor(i/4)*320,320,320);
      stats.push({age,pieces:debrisFrame(effects[0],age).map(p=>({z:+p.z.toFixed(1),bounce:p.bounce,settled:p.settled}))});
    });
    document.querySelector('#game').hidden=true;document.body.append(sheet);document.body.style.cssText='margin:0;overflow:auto';
    return stats;
  });
  await page.locator('#debris-review').screenshot({path:'.local/art-review/debris-motion.png'});
  await page.goto(new URL('/',page.url()).href);
  return stats;
}
