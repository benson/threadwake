// Original synthesized score and effects. No downloaded audio assets.
export class AudioGarden {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.lastBeat = -1;
    this.lastEffect = 0;
    this.seen = new Set();
    this.musicVolume = 0.65;
    this.effectsVolume = 0.8;
  }
  reset() {
    this.lastBeat = -1;
    this.lastEffect = 0;
    this.lastTime = 0;
    this.seen.clear();
    this.lastHp = null;
    this.lastCooldown = 0;
    this.lastWave = 0;
    this.bossSeen = false;
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
    } catch {}
  }
  tone(
    freq,
    duration = 0.15,
    type = "sine",
    volume = 0.05,
    slide = 1,
    bus = "effects",
  ) {
    if (!this.enabled || !this.ctx) return;
    volume *= bus === "music" ? this.musicVolume : this.effectsVolume;
    if (volume <= 0) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(20, freq * slide),
      c.currentTime + duration,
    );
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(volume, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration + 0.03);
  }
  click() {
    this.unlock();
    this.tone(660, 0.09, "triangle", 0.035, 1.25);
  }
  update(state, id) {
    if (state.time < (this.lastTime || 0)) this.reset();
    this.lastTime = state.time;
    if (!this.enabled || !this.ctx || state.phase !== "playing") return;
    const p = state.players.find((p) => p.id === id);
    if (p) {
      if (this.lastHp != null && p.hp < this.lastHp)
        this.tone(105, 0.16, "triangle", 0.055, 0.5);
      if (this.lastCooldown > 0 && p.castCooldown === 0)
        this.tone(740, 0.22, "sine", 0.025, 1.25);
      this.lastHp = p.hp;
      this.lastCooldown = p.castCooldown;
    }
    if (state.wave !== this.lastWave) {
      this.tone(330, 0.55, "triangle", 0.045, 1.5);
      this.lastWave = state.wave;
    }
    const boss = state.enemies.some((e) => e.type === "warden");
    if (boss && !this.bossSeen) this.tone(82, 0.9, "triangle", 0.065, 0.65);
    this.bossSeen = boss;
    const beat = Math.floor(state.time * 2);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      const notes = [220, 329.63, 440, 493.88, 392, 329.63, 293.66, 246.94];
      this.tone(notes[beat % 8], 0.7, "sine", 0.027, 1, "music");
      if (beat % 4 === 0)
        this.tone(
          notes[(Math.floor(beat / 8) * 2) % 8] / 2,
          1.8,
          "triangle",
          0.018,
          1,
          "music",
        );
    }
    for (const e of state.effects || []) {
      if (this.seen.has(e.id)) continue;
      this.seen.add(e.id);
      if (this.seen.size > 1500) this.seen.clear();
      if (e.type === "cast") this.tone(320, 0.45, "triangle", 0.055, 2);
      else if (e.type === "catch") this.tone(850, 0.2, "sine", 0.04, 1.6);
      else if (e.type === "bloom") this.tone(440, 0.6, "triangle", 0.045, 1.5);
      else if (e.type === "death" && state.time - this.lastEffect > 0.08) {
        this.lastEffect = state.time;
        this.tone(140, 0.1, "triangle", 0.022, 0.4);
      }
    }
  }
}
