// Ordered samples of production drawing functions. These are controlled fixtures.
async page => {
  const origin=new URL(page.url()).origin;await page.goto(origin);
  await page.setViewportSize({width:1568,height:1000});
  const result=await page.evaluate(async()=>{
    const {drawActor}=await import('/src/art.js'),{createRenderer}=await import('/src/render.js');
    const {pixelText}=await import('/src/pixel-ui.js'),{createGame}=await import('/src/sim.js');
    document.querySelector('#game').hidden=true;
    document.body.style.overflow='auto';document.body.style.height='auto';
    const sheet=(id,rows)=>{const c=document.createElement('canvas');c.id=id;c.width=1568;c.height=rows*144;document.body.append(c);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;return {c,ctx};};
    const cell=(ctx,r,f)=>{const x=f*196,y=r*144;ctx.fillStyle='#22313f';ctx.fillRect(x+2,y+2,192,140);pixelText(ctx,`${r+1}.${f+1}`,x+8,y+8,2);return {x,y};};
    const base={id:'a',x:0,y:0,hp:110,maxHp:110,aimX:1,aimY:0,face:1,color:0,castAge:999,shotAge:999,upgrades:[]};
    const draw=(ctx,actor,time,x,y)=>{for(const [dx,dy,scale]of[[45,98,1],[130,109,2]]){ctx.save();ctx.translate(x+dx,y+dy);ctx.scale(scale,scale);drawActor(ctx,actor,time);ctx.restore();}};
    const characters=[['custodian','slingshot'],['conservator','lantern'],['guard','disc']],ages=[0,.04,.08,.12,.18,.24,.30,.38];
    const motion=sheet('character-motion',6);
    characters.forEach(([character,weapon],i)=>{
      for(let f=0;f<8;f++)for(let action=0;action<2;action++){
        const {x,y}=cell(motion.ctx,i*2+action,f),t=action?ages[f]:f*.1;
        draw(motion.ctx,{...base,character,weapons:[weapon],lastWeapon:weapon,vx:action?0:155,vy:0,castAge:action?t:999},t,x,y);
      }
    });
    const arsenal=sheet('weapon-effects',5),weapons=['slingshot','lantern','disc','storm'];
    weapons.forEach((weapon,r)=>{for(let f=0;f<8;f++){
      const {x,y}=cell(arsenal.ctx,r,f),angle=f*Math.PI/4;
      draw(arsenal.ctx,{...base,character:weapon==='lantern'?'conservator':weapon==='disc'?'guard':'custodian',weapons:[weapon],lastWeapon:weapon,aimX:Math.cos(angle),aimY:Math.sin(angle),face:Math.cos(angle)<0?-1:1,shotAge:.04},.1,x,y);
    }});
    const viewport=document.createElement('canvas'),renderer=createRenderer(viewport),s=createGame(42);
    s.phase='playing';s.wave=1;
    const pickups=[{kind:'xp'},...weapons.map(weapon=>({kind:'weapon',weapon})),{kind:'heal'},{kind:'haste'}];
    const ratio=viewport.width/640;
    pickups.forEach((q,f)=>{const {x,y}=cell(arsenal.ctx,4,f);s.pickups=[{id:f+1,x:600,y:400,life:60,...q}];renderer.draw(s,null,.2,{shake:false,reducedMotion:true});arsenal.ctx.drawImage(viewport,300*ratio,147*ratio,40*ratio,40*ratio,x+23,y+57,40,40);arsenal.ctx.drawImage(viewport,300*ratio,147*ratio,40*ratio,40*ratio,x+97,y+40,80,80);});
    return {motionRows:characters.flatMap(([c])=>[c+' walk 0..0.7s',c+' special '+ages.join('/')]),weaponRows:weapons.map(w=>w+' firing in eight directions clockwise from east'),pickupOrder:pickups};
  });
  for(const id of ['character-motion','weapon-effects'])await page.locator('#'+id).screenshot({path:'.local/art-review/'+id+'.png'});
  await page.goto(origin);return result;
}
