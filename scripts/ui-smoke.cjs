async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://127.0.0.1:4320/");
  await page
    .getByRole("button", { name: "Enter the grove", exact: true })
    .click();
  await page.waitForFunction(
    () => window.__threadwake.state.phase === "playing",
  );
  const before = await page.evaluate(() => ({
    x: window.__threadwake.state.players[0].x,
    t: window.__threadwake.state.time,
  }));
  await page.keyboard.down("d");
  await page.waitForTimeout(900);
  await page.keyboard.up("d");
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  const moved = await page.evaluate(() => ({
    x: window.__threadwake.state.players[0].x,
    echoes: window.__threadwake.state.echoes.length,
  }));
  if (moved.x < before.x + 70 || moved.echoes !== 1)
    throw new Error(
      "Movement or keyboard cast failed: " + JSON.stringify(moved),
    );
  await page.keyboard.press("Escape");
  const pauseTime = await page.evaluate(() => window.__threadwake.state.time);
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => window.__threadwake.state.time)) !== pauseTime)
    throw new Error("Solo pause failed");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Exercise real movement controls through the first ranged enemies.
  for (let i = 0; i < 8; i++) {
    const key = ["s", "a", "w", "d"][i % 4];
    await page.keyboard.down(key);
    await page.waitForTimeout(2100);
    await page.keyboard.press("Space");
    await page.keyboard.up(key);
  }
  await page.screenshot({ path: "output/playwright/combat.png" });
  const combat = await page.evaluate(() => ({
    time: window.__threadwake.state.time,
    phase: window.__threadwake.state.phase,
    hp: window.__threadwake.state.players[0].hp,
    kills: window.__threadwake.state.kills,
    enemies: window.__threadwake.state.enemies.length,
    shots: window.__threadwake.state.shots.length,
  }));
  if (combat.time < 15 || combat.phase !== "playing" || combat.kills < 1)
    throw new Error("Combat did not progress: " + JSON.stringify(combat));
  if (errors.length) throw new Error(errors.join("\n"));
  return { moved, combat, errors };
};
