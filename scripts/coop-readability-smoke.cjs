// Four real browser clients in a disposable local room; no world mutation.
async page => {
  const guests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:800});
  await page.goto('http://127.0.0.1:4323/?server=ws://127.0.0.1:8787');
  await page.getByRole('button',{name:'Play with friends',exact:true}).click();
  await page.waitForFunction(()=>window.__threadwake.state.players.length===1);
  const invite=page.url();
  try {
    for(let i=0;i<3;i++){
      const guest=await page.context().newPage();guests.push(guest);
      guest.on('pageerror',e=>errors.push(e.message));
      await guest.goto(invite);
      await guest.waitForFunction(n=>window.__threadwake.state.players.length===n,i+2);
    }
    await page.getByRole('button',{name:'Start shift',exact:true}).click();
    const clients=[page,...guests];
    await Promise.all(clients.map(p=>p.waitForFunction(()=>window.__threadwake.state.phase==='playing')));
    await page.waitForTimeout(7000);
    await Promise.all(clients.map(async p=>{await p.keyboard.down('Space');await p.waitForTimeout(180);await p.keyboard.up('Space');}));
    await page.waitForFunction(()=>window.__threadwake.state.players.every(p=>p.castAge<2));
    await page.screenshot({path:'.local/art-review/coop-live.png'});
    const result=await page.evaluate(()=>({players:window.__threadwake.state.players.length,colors:window.__threadwake.state.players.map(p=>p.color),sweeps:window.__threadwake.state.players.map(p=>p.castAge<2),hp:window.__threadwake.state.players.map(p=>p.hp)}));
    if(result.players!==4||new Set(result.colors).size!==4)throw Error('Co-op identities are not visually distinct');
    if(errors.length)throw Error(errors.join('\n'));
    return {...result,errors};
  } finally {
    await Promise.all(guests.map(p=>p.close()));
    await page.goto('http://127.0.0.1:4323/');
  }
}
