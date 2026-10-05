// Four real character selections and long names; inspect the full HUD at three sizes.
async page => {
  const guests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:800});
  const origin=new URL(page.url()).origin;
  await page.goto(origin+'/?server=ws://127.0.0.1:8787');
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.waitForFunction(()=>window.__threadwake.state.players.length===1);
  const invite=page.url(),names=['AlexandriaNightly','BartholomewKeep','ConservatorCelia'].map(name=>name.slice(0,16)),characters=['Conservator','Guard','Custodian'];
  try {
    for(const [i,name] of names.entries()){
      const guest=await page.context().newPage();guests.push(guest);
      guest.on('pageerror',e=>errors.push(e.message));
      await guest.goto(invite);
      await guest.waitForFunction(n=>window.__threadwake.state.players.length===n,i+2);
      await guest.getByLabel('Your name').fill(name);await guest.getByLabel('Your name').press('Tab');
      await page.waitForFunction(name=>window.__threadwake.state.players.some(p=>p.name===name),name);
      await guest.locator('#lobby-character').click();
      await guest.locator('#character-choices button').filter({hasText:characters[i]}).click();
      await guest.getByRole('button',{name:'Done',exact:true}).click();
      await page.waitForFunction(({name,character})=>window.__threadwake.state.players.some(p=>p.name===name&&p.character===character),{name,character:characters[i].toLowerCase()});
    }
    await page.getByRole('button',{name:'Start shift',exact:true}).click();
    await page.waitForFunction(()=>window.__threadwake.state.phase==='playing');
    const results=[];
    for(const [width,height] of [[1280,800],[390,844],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(100);
      const layout=await page.evaluate(()=>{
        const range=document.createRange();range.selectNodeContents(document.querySelector('#wave'));
        const center=range.getBoundingClientRect(),field=document.querySelector('#world').getBoundingClientRect();
        const rows=[...document.querySelectorAll('#squad > span')].map(e=>{
          const r=e.getBoundingClientRect();
          return {text:e.textContent,overlap:r.left<center.right&&r.right>center.left&&r.top<center.bottom&&r.bottom>center.top,outside:r.left<field.left||r.right>field.right||r.top<field.top||r.bottom>field.bottom};
        });
        return {rows};
      });
      await page.screenshot({path:'.local/art-review/coop-hud-'+width+'x'+height+'.png'});
      results.push({width,height,...layout});
      if(layout.rows.some(r=>r.overlap||r.outside))throw Error('HUD overlaps: '+JSON.stringify(layout));
    }
    const roster=await page.evaluate(()=>window.__threadwake.state.players.map(p=>({name:p.name,character:p.character,weapons:p.weapons})));
    if(new Set(roster.map(p=>p.character)).size!==3)throw Error('Character selection did not survive start');
    if(errors.length)throw Error(errors.join('\n'));
    return {roster,results,errors};
  } finally {
    await Promise.all(guests.map(p=>p.close()));await page.goto(origin);
  }
}
