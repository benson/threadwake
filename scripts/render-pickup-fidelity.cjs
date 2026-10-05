// Production pickup/projectile/effect artwork at game scale and 3x world scale.
async page => {
  const origin = new URL(page.url()).origin;
  await page.goto(origin);
  await page.setViewportSize({width: 1360, height: 820});
  const result = await page.evaluate(async () => {
    const {createRenderer} = await import('/src/render.js');
    const canvas = document.createElement('canvas'), renderer = createRenderer(canvas);
    const sheet = document.createElement('canvas'); sheet.id = 'pickup-fidelity';
    sheet.width = 1360; sheet.height = 800;
    const ctx = sheet.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101925'; ctx.fillRect(0, 0, 1360, 800);
    const kinds = ['xp', 'heal', 'haste', 'slingshot', 'lantern', 'disc', 'storm'];
    const state = {seed:42, mapId:'antiquities', players:[], enemies:[], companions:[], flowers:[],
      pickups:kinds.map((kind, i) => ({id:i, x:450+i*46, y:355,
        kind:i<3?kind:'weapon', weapon:kind})),
      shots:[{x:510,y:420,vx:1,vy:0}, {x:555,y:420,vx:1,vy:0,weapon:'disc'},
        {x:600,y:420,vx:-1,vy:0,weapon:'disc',returning:true}, {x:645,y:420,vx:1,vy:0,hostile:true,r:3}], effects:[]};
    for (const [index, age] of [0, .08, .16, .24].entries()) {
      state.shots.forEach(s => s.age = age);
      state.effects = ['hit', 'death', 'chip', 'shatter'].map((type,i) =>
        ({id:i,type,x:500+i*65,y:480,life:.35-age,maxLife:.35}));
      renderer.draw(state,null,age,{shake:false,reducedMotion:true});
      const ratio = canvas.width / 640;
      ctx.drawImage(canvas,140*ratio,105*ratio,340*ratio,200*ratio,index*340,0,340,200);
      if (!index) ctx.drawImage(canvas,140*ratio,105*ratio,340*ratio,200*ratio,130,200,1020,600);
    }
    document.querySelector('#game').hidden=true; document.body.append(sheet);
    document.body.style.cssText='margin:0;overflow:auto';
    return {kinds, samples:[0,.08,.16,.24], source:'production renderer'};
  });
  await page.locator('#pickup-fidelity').screenshot({path:'.local/art-review/pickup-fidelity.png'});
  await page.goto(origin);
  return result;
}
