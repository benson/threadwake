async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4320/?server=ws://127.0.0.1:8787");
  await page
    .getByRole("button", { name: "Play with friends", exact: true })
    .click();
  await page.waitForFunction(
    () => window.__threadwake.state.players.length === 1,
  );
  await page.getByLabel("Your name").fill("Fern");
  await page.getByLabel("Your name").press("Tab");
  await page.waitForFunction(
    () => window.__threadwake.state.players[0].name === "Fern",
  );
  const invite = page.url();
  const guest = await page.context().newPage();
  guest.on("pageerror", (e) => errors.push(e.message));
  try {
    await guest.goto(invite);
    await guest.waitForFunction(
      () => window.__threadwake.state.players.length === 2,
    );
    await guest.getByLabel("Your name").fill("Moss");
    await guest.getByLabel("Your name").press("Tab");
    await page.waitForFunction(() =>
      window.__threadwake.state.players.some((p) => p.name === "Moss"),
    );
    await page
      .getByRole("button", { name: "Enter the grove", exact: true })
      .click();
    await guest.waitForFunction(
      () => window.__threadwake.state.phase === "playing",
    );
    const gid = await guest.evaluate(() => window.__threadwake.identity);
    const before = await guest.evaluate(
      () =>
        window.__threadwake.state.players.find(
          (p) => p.id === window.__threadwake.identity,
        ).x,
    );
    await guest.keyboard.down("d");
    await guest.waitForTimeout(750);
    await guest.keyboard.up("d");
    await guest.keyboard.press("Space");
    await page.waitForFunction(
      (id) => window.__threadwake.state.echoes.some((e) => e.owner === id),
      gid,
    );
    const after = await page.evaluate(
      (id) => window.__threadwake.state.players.find((p) => p.id === id).x,
      gid,
    );
    if (after < before + 60) throw new Error("Guest movement not shared");
    await guest.reload();
    await guest.waitForFunction(
      (id) =>
        window.__threadwake.identity === id &&
        window.__threadwake.state.phase === "playing",
      gid,
    );
    const count = await page.evaluate(
      () => window.__threadwake.state.players.length,
    );
    if (count !== 2) throw new Error("Reconnect duplicated player");
    await guest.screenshot({ path: "output/playwright/multiplayer.png" });
    if (errors.length) throw new Error(errors.join("\n"));
    return { players: count, moved: after - before, reconnected: true, errors };
  } finally {
    await guest.close();
    await page.goto("http://127.0.0.1:4320/");
  }
};
