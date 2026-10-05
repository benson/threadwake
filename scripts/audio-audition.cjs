async (page) => {
  // Run with playwright-cli run-code --filename scripts/audio-audition.cjs.
  // Uses the already-open local development page; outputs only ignored QA audio.
  const download = page.waitForEvent("download");
  const report = await page.evaluate(async () => {
    const { AudioGarden } = await import("/src/audio.js");
    const duration = 56, rate = 44100;
    const context = new OfflineAudioContext(2, duration * rate, rate);
    const audio = new AudioGarden(); audio.attachContext(context);
    const cues = ["hover", "click", "select", "confirm", "back", "slider", "slingshot", "disc", "lantern", "storm",
      "sweep", "restore", "repel", "telegraph", "hostile", "impact", "death", "shatter", "catch", "hurt", "down",
      "revive", "heal", "haste", "xp", "supply", "weapon", "level", "ready", "wave", "boss", "won", "lost"];
    const events = [];
    for (let beat = 0, at = .05; at < duration - 2; beat++, at += 30 / 90)
      events.push({ at, run() { audio._score(beat, at, at < 16 ? "menu" : "play", .6); } });
    cues.forEach((name, index) => {
      const at = 17 + index * 1.05;
      events.push({ at, run() { audio.cue(name, { at, value: .6 }); } });
    });
    events.sort((a, b) => a.at - b.at).forEach(event => event.run());
    const result = await context.startRendering();
    const channels = [result.getChannelData(0), result.getChannelData(1)];
    const metrics = (from, to) => {
      let peak = 0, sum = 0, count = 0, clipped = 0, invalid = 0;
      for (let i = Math.floor(from * rate); i < Math.floor(to * rate); i++) for (const channel of channels) {
        const sample = channel[i]; if (!Number.isFinite(sample)) invalid++;
        peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; count++;
        if (Math.abs(sample) >= .99) clipped++;
      }
      const rms = Math.sqrt(sum / count);
      return { peak, rms, rmsDb: 20 * Math.log10(rms), clipped, invalid };
    };
    const bytes = new ArrayBuffer(44 + result.length * 4), view = new DataView(bytes);
    const string = (at, value) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
    string(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); string(8, "WAVE"); string(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
    string(36, "data"); view.setUint32(40, result.length * 4, true);
    for (let i = 0; i < result.length; i++) for (let channel = 0; channel < 2; channel++)
      view.setInt16(44 + i * 4 + channel * 2, Math.round(Math.max(-1, Math.min(1, channels[channel][i])) * 32767), true);
    const link = document.createElement("a"), url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    link.href = url; link.download = "after-hours-audio-audition.wav"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { duration, sampleRate: rate, music: metrics(1, 16), mixed: metrics(17, 53), voices: audio.stats, cueOrder: cues };
  });
  await (await download).saveAs("C:/Users/benso/Projects/threadwake/output/after-hours-audio-audition.wav");
  if (report.music.invalid || report.mixed.invalid || report.mixed.clipped || report.music.rms < .0005)
    throw new Error(`Invalid audio render: ${JSON.stringify(report)}`);
  return report;
}
