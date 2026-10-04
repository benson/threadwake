// Run with playwright-cli run-code --filename scripts/lab-smoke.cjs.
// The Vite preview server must be serving the latest build on port 4320.
async page => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:800});
  await page.goto('http://127.0.0.1:4320/lab.html');
  await page.getByRole('button',{name:'Reset motion',exact:true}).click();
  await page.getByRole('combobox',{name:'Pose',exact:true}).selectOption('cast');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('slider',{name:'Follow · s',exact:true}).fill('0.5');
  await page.getByRole('button',{name:'impact',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#phase-name').textContent==='impact');
  const max=Number(await page.locator('#timeline').getAttribute('max'));
  const expected=await page.locator('#param-impact, #param-follow, #param-settle, #param-recover').evaluateAll(es=>es.reduce((n,e)=>n+Number(e.value),0));
  if(Math.abs(max-expected)>.001)throw new Error('Phase duration did not update timeline');
  await page.getByRole('combobox',{name:'Direction',exact:true}).selectOption('up');
  await page.getByRole('combobox',{name:'Speed',exact:true}).selectOption('.25');
  await page.screenshot({path:'output/playwright/lab-motion.png',fullPage:true});
  await page.getByRole('button',{name:'Reset motion',exact:true}).click();
  await page.getByRole('button',{name:'Encounter',exact:true}).click();
  await page.getByRole('combobox',{name:'Scenario',exact:true}).selectOption('garden');
  await page.getByRole('checkbox',{name:'Invincible',exact:true}).check();
  await page.getByRole('listbox',{name:'Upgrades',exact:true}).selectOption(['fork','mirror','orbit']);
  await page.getByRole('button',{name:'Start / reset',exact:true}).click();
  await page.keyboard.down('d');await page.waitForTimeout(600);await page.keyboard.up('d');
  await page.keyboard.down('Space');await page.waitForTimeout(180);await page.keyboard.up('Space');await page.waitForTimeout(200);
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const before=await page.locator('#encounter-status').textContent();
  const pixelsBefore=await page.locator('#encounter').evaluate(c=>c.toDataURL());
  await page.getByRole('button',{name:'Replay take',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#take-status').textContent.startsWith('Replay complete'));
  const after=await page.locator('#encounter-status').textContent();
  const pixelsAfter=await page.locator('#encounter').evaluate(c=>c.toDataURL());
  if(pixelsBefore!==pixelsAfter)throw new Error('Input replay produced different final pixels');
  if(before.replace('Live','Replay')!==after)throw new Error('Replay status differs');
  const downloadWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export take',exact:true}).click();
  const download=await downloadWait;
  const downloadPath=await download.path();
  await page.locator('#replay-import').setInputFiles(downloadPath);
  await page.waitForFunction(()=>document.querySelector('#take-status').textContent.startsWith('Replay complete'));
  const imported=await page.locator('#encounter').evaluate(c=>c.toDataURL());
  if(imported!==pixelsBefore)throw new Error('Exported/imported take diverged');
  await page.screenshot({path:'output/playwright/lab-encounter.png',fullPage:true});
  for(const scenario of ['thorns','resonance']) {
    await page.getByRole('combobox',{name:'Scenario',exact:true}).selectOption(scenario);
    await page.getByRole('button',{name:'Start / reset',exact:true}).click();
    await page.keyboard.down('a'); await page.keyboard.press('Space');
    await page.waitForTimeout(1200); await page.keyboard.up('a');
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    const pixels=await page.locator('#encounter').evaluate(c=>c.toDataURL());
    await page.getByRole('button',{name:'Replay take',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#take-status').textContent.startsWith('Replay complete'));
    if(pixels!==await page.locator('#encounter').evaluate(c=>c.toDataURL()))throw Error(scenario+' replay diverged');
  }
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw new Error('Mobile workshop overflows horizontally');
  if(errors.length)throw new Error(errors.join('\n'));
  return {motionDuration:max,before,after,replayPixelsMatch:true,importPixelsMatch:true,mobileOverflow:overflow,errors};
}
