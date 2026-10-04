// Browser regression with a mocked Gamepad API; no physical controller claim.
async page => {
  await page.addInitScript(()=>{
    window.testPad={axes:[0,0],buttons:Array.from({length:10},()=>({pressed:false}))};
    navigator.getGamepads=()=>[window.testPad];
  });
  await page.goto('http://127.0.0.1:4319/');
  await page.getByRole('button',{name:'Enter the grove',exact:true}).click();
  const x=await page.evaluate(()=>window.__threadwake.state.players[0].x);
  await page.evaluate(()=>window.testPad.axes=[.1,.1]);
  await page.waitForTimeout(200);
  if(await page.evaluate(()=>window.__threadwake.state.players[0].x)!==x)throw Error('Controller dead zone drift');
  await page.evaluate(()=>window.testPad.axes=[.6,0]);
  await page.waitForTimeout(200);
  // Read observed coordinates; the fixture only supplies controller input.
  const after=await page.evaluate(()=>window.__threadwake.state.players[0].x);
  if(after<=x+8)throw Error('Controller movement did not respond');
  await page.evaluate(()=>{window.testPad.axes=[0,0];window.testPad.buttons[9].pressed=true;});
  await page.waitForFunction(()=>document.querySelector('#options').open);
  await page.evaluate(()=>window.testPad.buttons[9].pressed=false);
  await page.waitForTimeout(100);
  await page.evaluate(()=>window.testPad.buttons[9].pressed=true);
  await page.waitForFunction(()=>!document.querySelector('#options').open);
  await page.evaluate(()=>{window.testPad.buttons[9].pressed=false;window.testPad.buttons[0].pressed=true;});
  await page.waitForFunction(()=>window.__threadwake.state.echoes.length>0);
  await page.evaluate(()=>window.testPad.buttons[0].pressed=false);
  return {mockController:true,deadzone:true,movement:after-x,pauseAndResume:true,cast:true};
}
