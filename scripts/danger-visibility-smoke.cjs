// Controlled overlap fixture: threats must remain recognizable through friendly VFX.
async page => {
  await page.goto('http://127.0.0.1:4323/');
  return page.evaluate(async()=>{
    const {createRenderer}=await import('/src/render.js');
    const c=document.createElement('canvas'),renderer=createRenderer(c);
    const shot={id:1,x:600,y:388,vx:100,vy:0,r:3,hostile:true};
    const s={version:3,seed:42,mapId:'clock_gallery',wave:8,time:0,phase:'playing',players:[],enemies:[],companions:[],flowers:[],shots:[shot],effects:[]};
    const sample=()=>Array.from(c.getContext('2d').getImageData(316,164,9,9).data);
    renderer.draw(s,null,0,{reducedMotion:true,shake:false});const clear=sample();
    s.effects=[{id:2,type:'resonance',x:600,y:400,life:.35,maxLife:.35}];
    renderer.draw(s,null,0,{reducedMotion:true,shake:false});const covered=sample();
    const count=a=>a.reduce((n,v,i)=>n+(i%4===0&&v===229&&a[i+1]===141&&a[i+2]===126?1:0),0);
    const result={clearDangerPixels:count(clear),overlapDangerPixels:count(covered)};
    if(!result.clearDangerPixels)throw Error('Fixture did not locate hostile projectile');
    if(result.overlapDangerPixels<result.clearDangerPixels)throw Error('Friendly effect hides hostile projectile: '+JSON.stringify(result));
    s.shots=[];s.effects=[];
    s.players=[{id:'a',x:600,y:400,hp:110,maxHp:110,color:0,castAge:999}];
    renderer.draw(s,'a',0,{reducedMotion:true,shake:false});
    const body=Array.from(c.getContext('2d').getImageData(318,167,1,1).data);
    s.effects=[{id:3,type:'resonance',x:600,y:400,life:.35,maxLife:.35}];
    renderer.draw(s,'a',0,{reducedMotion:true,shake:false});
    const protectedBody=Array.from(c.getContext('2d').getImageData(318,167,1,1).data);
    if(body.join(',')!==protectedBody.join(','))throw Error('Protection shield fills over the custodian body');
    return {...result,protectionInteriorTransparent:true};
  });
}
