// Numbered, unlabeled visual inventory for independent image review.
// Controlled rendering fixtures, not evidence of an actual playthrough.
async page => {
  await page.goto('http://127.0.0.1:4323/');
  await page.setViewportSize({width:1300,height:1000});
  const manifest=await page.evaluate(async()=>{
    const {drawActor,drawFlower}=await import('/src/art.js');
    const {drawCurio}=await import('/src/curios.js');
    const {drawMenuArt}=await import('/src/menu-art.js');
    const {pixelIcon,pixelText}=await import('/src/pixel-ui.js');
    const {createRenderer}=await import('/src/render.js');
    const {MAPS}=await import('/src/maps.js');
    document.querySelector('#game').hidden=true;
    document.body.style.overflow='auto';
    document.body.style.height='auto';
    document.querySelector('#review-root')?.remove();
    const root=document.createElement('div');root.id='review-root';document.body.append(root);
    const manifest={};
    let number=0;
    const sheet=(id,cols,rows,w,h)=>{
      const c=document.createElement('canvas');c.id=id;c.width=cols*w;c.height=rows*h;
      c.style.cssText=`display:block;width:${c.width}px;height:${c.height}px;image-rendering:pixelated;margin:0 0 20px`;
      root.append(c);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#111722';ctx.fillRect(0,0,c.width,c.height);
      return {c,ctx,w,h,cols};
    };
    const tile=(s,index,name)=>{
      const x=index%s.cols*s.w,y=Math.floor(index/s.cols)*s.h,id=++number;
      manifest[id]=name;s.ctx.fillStyle='#22313f';s.ctx.fillRect(x+3,y+3,s.w-6,s.h-6);
      pixelText(s.ctx,String(id).padStart(2,'0'),x+10,y+10,2);return {id,x,y};
    };
    const curios=['fork','pierce','quick','heavy','orbit','echo','recall','thread','bloom','heal','speed','vitality','frost','mirror','thorns','magnet'];
    const menus=['keyring','staff','kit','gear','museum'];
    const ui=['credit','empty','heart','cross','pause','arrow','chevron','down','museum'];
    const icons=sheet('review-icons',5,6,192,136);
    [...curios.map(id=>({id,group:'curio'})),...menus.map(id=>({id,group:'menu'})),...ui.map(id=>({id,group:'ui'}))].forEach((item,i)=>{
      const {x,y}=tile(icons,i,`${item.group}:${item.id}`),ctx=icons.ctx;
      if(item.group==='ui'){
        const c=pixelIcon(item.id);ctx.drawImage(c,x+22,y+65,18,18);ctx.drawImage(c,x+83,y+42,63,63);
      }else{
        const draw=item.group==='curio'?drawCurio:drawMenuArt;
        draw(ctx,item.id,x+12,y+64,32);draw(ctx,item.id,x+73,y+31,88);
      }
    });
    const bodies=['player','mite','moth','thorn','warden','soldier'];
    const poses=['idle','run','fire','sweep'];
    const actors=sheet('review-actors',6,4,192,194);
    poses.forEach((state,row)=>bodies.forEach((type,col)=>{
      const {x,y}=tile(actors,row*6+col,`${type}:${state}`),ctx=actors.ctx;
      const actor={id:10,type:type==='player'?undefined:type,x:0,y:0,hp:100,maxHp:100,color:0,face:1,aimX:1,aimY:0,vx:state==='run'?155:0,vy:0,castAge:state==='sweep'?.05:999,shotAge:state==='fire'?.04:999,fireIn:state==='fire'?.05:1,phase:.2,stage:2,hit:0,upgrades:[]};
      for(const [px,py,scale]of[[x+25,y+130,1],[x+120,y+173,2]]){
        ctx.save();ctx.translate(px,py);ctx.scale(scale,scale);drawActor(ctx,actor,.31,{state:state==='sweep'?'cast':state,actionTime:state==='sweep'?.05:undefined});ctx.restore();
      }
    }));
    const supplies=sheet('review-supplies',3,1,192,136);
    [0,.5,.9].forEach((charge,i)=>{
      const {x,y}=tile(supplies,i,`supply:${charge}`),ctx=supplies.ctx;
      for(const [px,py,scale]of[[x+25,y+96,1],[x+120,y+110,3]]){
        ctx.save();ctx.translate(px,py);ctx.scale(scale,scale);drawFlower(ctx,{id:1,x:0,y:0,charge,kind:'supply'},.3);ctx.restore();
      }
    });
    const viewport=document.createElement('canvas'),renderer=createRenderer(viewport);
    const ratio=viewport.width/640;
    const base={version:3,seed:42,mapId:'antiquities',wave:1,time:0,phase:'playing',players:[],enemies:[],companions:[],flowers:[],shots:[],effects:[]};
    const variants=[
      {name:'friendly marble',shots:[{id:1,x:600,y:400,vx:200,vy:0,r:3,hostile:false}]},
      {name:'hostile shot',shots:[{id:1,x:600,y:400,vx:200,vy:0,r:3,hostile:true}]},
      ...['sweep','supply','heal','catch','resonance','shatter','hit','death','chip'].map(type=>({name:`effect:${type}`,effects:[{id:1,type,x:600,y:400,life:.22,maxLife:.35,radius:type==='supply'?118:96}]})),
      {name:'orbiting planet',players:[{id:'a',x:600,y:400,color:0,hp:110,maxHp:110,upgrades:['orbit'],orbitPhase:1,castAge:999,shotAge:999,aimX:1,aimY:0}]},
      ...['moth','thorn','warden'].map(type=>({name:`warning:${type}`,enemies:[{id:2,type,x:600,y:400,hp:100,maxHp:100,fireIn:.15,aimX:1,aimY:0,shotAge:999,phase:1,stage:2}]}))
    ];
    const effects=sheet('review-effects',4,4,256,264);
    variants.forEach((v,i)=>{
      const {x,y}=tile(effects,i,v.name);renderer.draw({...base,...v},null,0,{reducedMotion:true,shake:false});
      effects.ctx.drawImage(viewport,200*ratio,60*ratio,240*ratio,240*ratio,x+8,y+22,240,240);
    });
    const maps=sheet('review-maps',2,2,600,420);
    MAPS.forEach((map,i)=>{
      const {x,y}=tile(maps,i,`map:${map.id}`),full=document.createElement('canvas');full.width=1200;full.height=800;const fc=full.getContext('2d');fc.imageSmoothingEnabled=false;
      const s={...base,mapId:map.id};renderer.draw(s,null,0,{reducedMotion:true,shake:false});
      for(const top of [0,360,440])for(const left of [0,560]){
        renderer.camera.x=left+320;renderer.camera.y=top+180;renderer.draw(s,null,0,{reducedMotion:true,shake:false});fc.drawImage(viewport,left,top,640,360);
      }
      maps.ctx.drawImage(full,x,y+20,600,400);
    });
    return manifest;
  });
  for(const name of ['icons','actors','supplies','effects','maps'])await page.locator(`#review-${name}`).screenshot({path:`.local/art-review/${name}-v1.png`});
  return {images:5,manifest};
}
