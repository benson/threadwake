// Deliberately seed a legacy save in an isolated QA browser, then use real controls.
async page => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4320/');
  await page.evaluate(()=>localStorage.setItem('threadwake.memories',JSON.stringify({
    version:2,balance:12,traits:{vitality:1,haste:1,echo:1},runs:4,best:3,
    milestones:['first-catch'],records:[],awards:[]
  })));
  await page.reload();
  if(!await page.locator('#title-credits').textContent().then(s=>s.includes('12 credits')))throw Error('Legacy credits not visible on start');
  if(await page.locator('#title-equipment').textContent()!=='3 / 9 permanent upgrades')throw Error('Legacy equipment ranks lost');
  await page.locator('#memories-button').click();
  const coat=page.locator('[data-trait="vitality"]');
  if(!(await coat.innerText()).includes('120') || !(await coat.innerText()).includes('130'))throw Error('Health preview does not include purchased rank');
  await coat.click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  const before=await page.evaluate(()=>{
    const p=window.__threadwake.state.players[0];
    return {hp:p.maxHp,speed:p.speed,cooldown:p.cooldownDuration,traits:p.traits};
  });
  if(before.hp!==130 || Math.abs(before.speed-161.2)>.001 || before.cooldown!==4.75)throw Error('Purchased equipment not applied: '+JSON.stringify(before));
  await page.getByRole('button',{name:'Open staff kit',exact:true}).click();
  await page.locator('[data-trait="haste"]').click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  const currentSpeed=await page.evaluate(()=>window.__threadwake.state.players[0].speed);
  if(Math.abs(currentSpeed-before.speed)>.001)throw Error('Mid-shift purchase changed active character');
  await page.getByRole('button',{name:'Pause or open menu',exact:true}).click();
  await page.getByRole('button',{name:'Leave run',exact:true}).click();
  await page.getByRole('button',{name:'Start shift',exact:true}).click();
  const nextSpeed=await page.evaluate(()=>window.__threadwake.state.players[0].speed);
  if(Math.abs(nextSpeed-167.4)>.001)throw Error('Next shift did not receive purchase');
  await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('threadwake.memories')));
  if(saved.balance!==8 || saved.traits.vitality!==2 || saved.traits.haste!==2 || !saved.milestones.includes('first-catch'))throw Error('Persistent save changed incorrectly: '+JSON.stringify(saved));
  if(errors.length)throw Error(errors.join('\n'));
  return {legacySavePreserved:true,before,currentSpeed,nextSpeed,balance:saved.balance,errors};
}
