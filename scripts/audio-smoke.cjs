async (page) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(new URL("/", page.url()).href);
  await page.evaluate(async () => {
    const source = performance.getEntriesByType("resource").find(entry => new URL(entry.name).pathname === "/src/audio.js")?.name;
    if (!source) throw new Error("Production audio module was not loaded");
    const { AudioGarden } = await import(source);
    window.__audioQa = { cues: [], engine: null };
    const play = AudioGarden.prototype._play, music = AudioGarden.prototype._music;
    AudioGarden.prototype._play = function (name, options) {
      window.__audioQa.engine = this; window.__audioQa.cues.push(name); return play.call(this, name, options);
    };
    AudioGarden.prototype._music = function (...args) { window.__audioQa.engine = this; return music.apply(this, args); };
  });
  await page.getByRole("button", { name: "Start shift", exact: true }).hover();
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.__audioQa.engine?.ctx || null);
  if (before !== null) throw new Error("Hover created an AudioContext before an input gesture");
  await page.locator("#character-button").click();
  const guard = page.locator('[data-character="guard"]');
  await guard.focus(); await page.keyboard.press("Space");
  if (await guard.getAttribute("aria-pressed") !== "true") throw new Error("Space did not select character");
  await page.waitForTimeout(120);
  const custodian = page.locator('[data-character="custodian"]');
  await custodian.focus(); await page.keyboard.press("Space");
  await page.locator("#character-done").focus(); await page.keyboard.press("Space");
  if (await page.locator("#characters").evaluate(dialog => dialog.open)) throw new Error("Space did not close character dialog");
  await page.getByRole("button", { name: "Options", exact: true }).hover();
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "Options", exact: true }).click();
  const effects = page.getByRole("slider", { name: "Effects", exact: true });
  await effects.focus(); await page.keyboard.press("ArrowLeft");
  const effectsValue = Number(await effects.inputValue());
  const actualVolume = await page.evaluate(() => window.__audioQa.engine.effectsVolume);
  if (Math.abs(actualVolume - effectsValue / 100) > .001) throw new Error("Effects slider did not reach the mixer");
  await page.getByRole("checkbox", { name: "Sound", exact: true }).uncheck();
  await page.waitForTimeout(200);
  const mute = await page.evaluate(() => {
    const audio = window.__audioQa.engine;
    return { enabled: audio.enabled, voices: audio.diagnostics.voices, gain: audio.master.gain.value };
  });
  if (mute.enabled || mute.voices || mute.gain > .002) throw new Error(`Mute left audio active: ${JSON.stringify(mute)}`);
  await page.getByRole("checkbox", { name: "Sound", exact: true }).check();
  await page.locator("#resume").focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Start shift", exact: true }).click();
  await page.waitForTimeout(5200);
  await page.keyboard.press("Space");
  await page.waitForTimeout(220);
  const result = await page.evaluate(() => {
    const audio = window.__audioQa.engine;
    return { context: audio.ctx.state, cues: Object.fromEntries([...new Set(window.__audioQa.cues)].map(name => [name, window.__audioQa.cues.filter(value => value === name).length])),
      mix: { musicVolume: audio.musicVolume, effectsVolume: audio.effectsVolume }, diagnostics: audio.diagnostics };
  });
  for (const name of ["hover", "click", "select", "back", "slider", "confirm", "sweep"])
    if (!result.cues[name]) throw new Error(`Missing actual UI/game audio cue: ${name}`);
  if (result.context !== "running" || result.diagnostics.peakVoices > 40 || errors.length)
    throw new Error(`Audio browser failure: ${JSON.stringify({ result, errors })}`);
  await page.evaluate(() => { window.__audioQa.engine.enabled = false; });
  return { ...result, mute, errors, keyboardCharacterAndDone: true };
}
