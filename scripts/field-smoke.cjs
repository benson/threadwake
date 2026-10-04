// Real UI containment across letterboxed browser shapes; no gameplay mutation.
async page => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4320/');
  const results=[];
  const check = async selector => page.evaluate(selector=>{
    const field=document.querySelector('#world').getBoundingClientRect();
    const e=document.querySelector(selector).getBoundingClientRect();
    if(e.left<field.left-1 || e.right>field.right+1 || e.top<field.top-1 || e.bottom>field.bottom+1)
      throw Error(selector+' escapes game field: '+JSON.stringify({field:field.toJSON(),element:e.toJSON()}));
    return {x:e.x-field.x,y:e.y-field.y,width:e.width,height:e.height};
  },selector);
  for(const [width,height] of [[1280,720],[1000,900],[1800,700],[390,844],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(80);
    await check('#solo'); await check('#options-button'); await check('.staff-record');
    if(await page.locator('#menu').evaluate(e=>e.scrollHeight>e.clientHeight+1))throw Error('Start screen needs scrolling');
    await page.getByRole('button',{name:'Options',exact:true}).click();
    await check('#options');
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.locator('#memories-button').click();
    await check('#memories'); await check('#close-memories');
    await page.getByRole('button',{name:'Back',exact:true}).click();
    results.push({width,height,contained:true});
  }
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  for(const selector of ['#health','#wave','#clock','#ability','#pause-button','#hud-memories']) await check(selector);
  await page.getByRole('button',{name:'Open staff kit',exact:true}).click();
  await check('#memories');
  const before=await page.evaluate(()=>window.__threadwake.state.time);
  await page.waitForTimeout(200);
  if(before!==await page.evaluate(()=>window.__threadwake.state.time))throw Error('Memories did not pause solo');
  await page.screenshot({path:'output/playwright/field-memories.png'});
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Pause or open menu',exact:true}).click();
  await page.locator('#pause-memories').click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  if(!await page.locator('#options').evaluate(e=>e.open))throw Error('Memories Back did not return to Pause');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.screenshot({path:'output/playwright/field-hud.png'});
  if(errors.length)throw Error(errors.join('\n'));
  return {viewports:results,inRunMemories:true,soloPaused:true,errors};
}
