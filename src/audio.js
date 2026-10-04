// Original music-box score and clockwork/ceramic effects; no audio assets.
// Preserve the established class name for saved settings and UI integration.
export class AudioGarden {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.lastBeat = -1;
    this.lastEffect = 0;
    this.seen = new Set();
    this.enemyHits = new Map();
    this.lastClink = -1;
    this.lastCatch = -1;
    this.noiseBuffer = null;
    this.musicVolume = 0.65;
    this.effectsVolume = 0.8;
  }
  reset() {
    this.lastBeat = -1;
    this.lastEffect = 0;
    this.lastTime = 0;
    this.seen.clear();
    this.enemyHits.clear();
    this.lastClink = -1;
    this.lastCatch = -1;
    this.lastHp = null;
    this.lastCooldown = 0;
    this.lastWave = 0;
    this.bossSeen = false;
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume().catch(() => {});
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
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  noise(duration = 0.16, volume = 0.05, frequency = 1500, bus = "effects") {
    if (!this.enabled || !this.ctx) return;
    volume *= bus === "music" ? this.musicVolume : this.effectsVolume;
    if (volume <= 0) return;
    const c = this.ctx;
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== c.sampleRate) {
      this.noiseBuffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * 0.3),
        c.sampleRate,
      );
      const samples = this.noiseBuffer.getChannelData(0);
      let seed = 417;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = (seed / 0xffffffff) * 2 - 1;
      }
    }
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.Q.value = 0.65;
    filter.frequency.setValueAtTime(frequency, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(100, frequency * 0.35),
      c.currentTime + duration,
    );
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    source.start();
    source.stop(c.currentTime + duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  bell(freq, volume = 0.025, bus = "effects") {
    this.tone(freq, 0.55, "sine", volume, 1, bus);
    this.tone(freq * 2.76, 0.095, "sine", volume * 0.28, 0.995, bus);
  }
  sweep(volume = 1) {
    this.noise(0.19, 0.12 * volume, 2200);
    this.tone(145, 0.13, "triangle", 0.025 * volume, 0.48);
    this.noise(0.075, 0.035 * volume, 650);
  }
  click() {
    this.unlock();
    this.tone(960, 0.065, "sine", 0.022, 0.96);
    this.tone(285, 0.045, "triangle", 0.018, 0.8);
  }
  update(state, id) {
    if (state.time < (this.lastTime || 0)) this.reset();
    this.lastTime = state.time;
    if (!this.enabled || !this.ctx || state.phase !== "playing") return;
    const p = state.players.find((p) => p.id === id);
    if (p) {
      if (this.lastHp != null && p.hp < this.lastHp)
        this.tone(118, 0.15, "triangle", 0.05, 0.5);
      if (this.lastCooldown > 0 && p.castCooldown === 0)
        this.bell(1174.66, 0.017);
      this.lastHp = p.hp;
      this.lastCooldown = p.castCooldown;
    }
    if (state.wave !== this.lastWave) {
      this.bell(523.25, 0.028);
      this.tone(261.63, 0.45, "triangle", 0.018);
      this.lastWave = state.wave;
    }
    const boss = state.enemies.some((e) => e.type === "warden");
    if (boss && !this.bossSeen) {
      this.bell(130.81, 0.055);
      this.tone(65.41, 0.9, "triangle", 0.04, 0.97);
    }
    this.bossSeen = boss;
    const beat = Math.floor(state.time * 2.4);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      // A sparse 12-step minor motif leaves room for combat and the clock tick.
      const notes = [
        523.25, 0, 783.99, 622.25, 0, 587.33, 523.25, 0, 466.16, 392, 0, 0,
      ];
      const note = notes[beat % notes.length];
      if (note) this.bell(note, 0.018, "music");
      this.noise(0.035, 0.016, beat % 2 ? 1600 : 2400, "music");
      if (beat % 12 === 0)
        this.tone(
          [130.81, 103.83, 116.54, 98][Math.floor(beat / 12) % 4],
          1.7,
          "sine",
          0.011,
          1,
          "music",
        );
    }
    // Public enemy hit pulses provide marble impacts without changing simulation.
    const currentHits = new Map();
    for (const enemy of state.enemies) {
      currentHits.set(enemy.id, enemy.hit || 0);
      if (
        enemy.hit > (this.enemyHits.get(enemy.id) || 0) &&
        state.time - this.lastClink > 0.075
      ) {
        this.lastClink = state.time;
        const note = [1046.5, 1174.66, 1318.51][Math.abs(enemy.id) % 3];
        this.tone(note, 0.085, "sine", 0.025, 0.78);
        this.tone(note * 1.49, 0.045, "sine", 0.01, 0.92);
      }
    }
    this.enemyHits = currentHits;
    for (const e of state.effects || []) {
      if (this.seen.has(e.id)) continue;
      this.seen.add(e.id);
      if (this.seen.size > 1500) this.seen.clear();
      if (e.type === "sweep") this.sweep(e.owner === id ? 1 : 0.55);
      else if (e.type === "catch" && state.time - this.lastCatch > 0.045) {
        this.lastCatch = state.time;
        this.tone(1568, 0.07, "sine", 0.022, 0.72);
      } else if (e.type === "bloom" || e.type === "supply") {
        this.bell(659.25, 0.024);
        this.bell(783.99, 0.017);
      } else if (e.type === "death" && state.time - this.lastEffect > 0.08) {
        this.lastEffect = state.time;
        this.noise(0.07, 0.03, 3200);
        this.tone(680, 0.11, "triangle", 0.017, 0.42);
      }
    }
  }
}
