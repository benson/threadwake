// Original score: "After Closing" — an eight-bar music-box miniature in E minor.
// Every voice is synthesized; gameplay and UI share the same wood, glass and air palette.
import { WATER_POOL, inWater } from "./ambience.js";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const MELODY = [
  [76, null, 79, 78, 74, 71],
  [74, 76, null, 83, 79, null],
  [76, null, 79, 83, 81, 79],
  [78, 76, null, 74, 71, null],
  [72, null, 76, 79, 78, 76],
  [74, 72, null, 71, 69, null],
  [71, null, 75, 78, 81, 78],
  [75, 74, null, 71, 75, null],
];
const CHORDS = [
  [40, 55, 59],
  [48, 55, 59],
  [45, 52, 60],
  [47, 54, 63],
];
const LIMIT = 40;
const PRIORITY = {
  hurt: 3,
  down: 4,
  revive: 4,
  won: 4,
  lost: 4,
  level: 3,
  weapon: 3,
  telegraph: 2,
  boss: 4,
};
const RATE = {
  footstep: 0.25,
  waterstep: 0.25,
  water: 0.65,
  creak: 8,
  clocktick: 0.7,
  roomchime: 20,
  animal: 12,
  hover: 0.07,
  click: 0.05,
  confirm: 0.12,
  back: 0.12,
  select: 0.1,
  slider: 0.065,
  slingshot: 0.085,
  disc: 0.16,
  lantern: 0.18,
  storm: 0.13,
  hostile: 0.17,
  telegraph: 0.3,
  impact: 0.095,
  death: 0.12,
  shatter: 0.15,
  catch: 0.1,
  xp: 0.13,
  heal: 0.3,
  haste: 0.35,
  weapon: 0.7,
  level: 0.4,
  ready: 0.6,
  wave: 1,
  boss: 2,
  sweep: 0.14,
  restore: 0.2,
  repel: 0.2,
  hurt: 0.3,
  down: 0.8,
  revive: 0.8,
  supply: 0.4,
  won: 2,
  lost: 2,
};

export class AudioGarden {
  constructor() {
    this.ctx = null;
    this._enabled = true;
    this._musicVolume = 0.65;
    this._effectsVolume = 0.8;
    this.voices = [];
    this.throttles = new Map();
    this.stats = { peakVoices: 0, dropped: 0, cues: 0 };
    this.nextBeat = 0;
    this.beat = 0;
    this.mode = "menu";
    this.duckUntil = 0;
    this.reset();
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    this._enabled = !!value;
    this._mix();
    // Stop queued notes as well as fading the bus: unmuting never replays a queue.
    if (!this._enabled && this.ctx) {
      for (const voice of this.voices)
        this._release(voice, this.ctx.currentTime);
      this.voices = [];
      this.nextBeat = this.ctx.currentTime + 0.03;
    }
  }
  get musicVolume() {
    return this._musicVolume;
  }
  set musicVolume(value) {
    this._musicVolume = Number.isFinite(value) ? clamp(value, 0, 1) : 0;
    this._mix();
  }
  get effectsVolume() {
    return this._effectsVolume;
  }
  set effectsVolume(value) {
    this._effectsVolume = Number.isFinite(value) ? clamp(value, 0, 1) : 0;
    this._mix();
  }
  get diagnostics() {
    const now = this.ctx?.currentTime || 0;
    return {
      ...this.stats,
      voices: this.voices.filter((v) => v.start <= now && v.end > now).length,
    };
  }
  reset() {
    this.lastTime = null;
    this.lastRun = null;
    this.lastPhase = null;
    this.lastWave = 0;
    this.lastLevel = 1;
    this.players = new Map();
    this.enemies = new Map();
    this.seen = new Set();
    this.shotIds = new Set();
    this.primed = false;
    this.xpNote = 0;
    this.sliderStep = null;
    this.ambientBuckets = new Map();
  }
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx)
        this.attachContext(
          new (window.AudioContext || window.webkitAudioContext)(),
        );
      if (this.ctx.state === "suspended" && this.ctx.resume)
        this.ctx.resume().catch(() => {});
    } catch {}
  }
  // Also accepts OfflineAudioContext so the exact production mix can be rendered in QA.
  attachContext(context) {
    this.ctx = context;
    const c = this.ctx;
    this.master = c.createGain();
    this.musicBus = c.createGain();
    this.effectsBus = c.createGain();
    this.musicBus.connect(this.master);
    this.effectsBus.connect(this.master);
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -15;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    const output = c.createGain();
    output.gain.value = 0.82;
    this.master.connect(compressor);
    compressor.connect(output);
    output.connect(c.destination);
    // Small museum-room reflection. It is downstream of the volume buses, including mute.
    const room = c.createConvolver(),
      send = c.createGain(),
      returnGain = c.createGain();
    const impulse = c.createBuffer(
      2,
      Math.ceil(c.sampleRate * 0.68),
      c.sampleRate,
    );
    let seed = 2117;
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const t = i / c.sampleRate;
        data[i] =
          t < 0.025
            ? 0
            : ((seed / 4294967296) * 2 - 1) * Math.exp(-t * 10) * 0.13;
      }
    }
    room.buffer = impulse;
    room.normalize = false;
    send.gain.value = 0.16;
    returnGain.gain.value = 0.55;
    this.musicBus.connect(send);
    this.effectsBus.connect(send);
    send.connect(room);
    room.connect(returnGain);
    returnGain.connect(this.master);
    const noise = c.createBuffer(1, Math.ceil(c.sampleRate * 2), c.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = (seed / 4294967296) * 2 - 1;
    }
    this.noiseBuffer = noise;
    this.nextBeat = c.currentTime + 0.03;
    this._mix(true);
  }
  _mix(immediate = false) {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    const set = (param, value) =>
      immediate
        ? param.setValueAtTime(value, now)
        : param.setTargetAtTime(value, now, 0.025);
    set(this.master.gain, this.enabled ? 2.6 : 0);
    const quiet =
      this.mode === "paused" ? 0.24 : this.mode === "draft" ? 0.68 : 1;
    set(
      this.musicBus.gain,
      this.musicVolume * quiet * (now < this.duckUntil ? 0.5 : 1),
    );
    set(this.effectsBus.gain, this.effectsVolume);
  }
  _release(voice, now) {
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.008);
      voice.source.stop(now + 0.035);
    } catch {}
    voice.end = now + 0.035;
  }
  _voice({
    frequency = 440,
    duration = 0.15,
    volume = 0.025,
    wave = "sine",
    slide = 1,
    at = this.ctx?.currentTime || 0,
    bus = "effects",
    pan = 0,
    noise = false,
    attack = 0.005,
    priority = 1,
    cutoff = 0,
    q = 0.65,
  } = {}) {
    if (
      !this.enabled ||
      !this.ctx ||
      volume <= 0 ||
      (bus === "music" ? this.musicVolume : this.effectsVolume) <= 0
    )
      return;
    const c = this.ctx,
      start = Math.max(c.currentTime, at),
      end = start + duration + 0.025;
    this.voices = this.voices.filter((v) => v.end > c.currentTime);
    const overlapping = this.voices.filter(
      (v) => v.start < end && v.end > start,
    );
    if (overlapping.length >= LIMIT) {
      const disposable = overlapping.find((v) => v.priority < priority);
      if (!disposable) {
        this.stats.dropped++;
        return;
      }
      this._release(disposable, start);
      this.voices.splice(this.voices.indexOf(disposable), 1);
    }
    const source = noise ? c.createBufferSource() : c.createOscillator();
    if (noise) {
      source.buffer = this.noiseBuffer;
      source.loop = true;
    } else {
      source.type = wave;
      source.frequency.setValueAtTime(Math.max(20, frequency), start);
      source.frequency.exponentialRampToValueAtTime(
        Math.max(20, frequency * slide),
        start + duration,
      );
    }
    const gain = c.createGain(),
      panner = c.createStereoPanner(),
      nodes = [source, gain, panner];
    panner.pan.setValueAtTime(clamp(pan, -0.8, 0.8), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(
      Math.min(volume, 0.24),
      start + Math.min(attack, duration * 0.3),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (noise || cutoff) {
      const filter = c.createBiquadFilter();
      nodes.push(filter);
      filter.type = noise ? "bandpass" : "lowpass";
      filter.Q.value = q;
      filter.frequency.setValueAtTime(noise ? frequency : cutoff, start);
      if (noise)
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(80, frequency * slide),
          start + duration,
        );
      source.connect(filter);
      filter.connect(gain);
    } else source.connect(gain);
    gain.connect(panner);
    panner.connect(bus === "music" ? this.musicBus : this.effectsBus);
    const voice = { source, gain, start, end, priority };
    this.voices.push(voice);
    this.stats.peakVoices = Math.max(
      this.stats.peakVoices,
      Math.min(LIMIT, overlapping.length + 1),
    );
    source.onended = () => {
      for (const node of nodes) node.disconnect();
      this.voices = this.voices.filter((v) => v !== voice);
    };
    source.start(start);
    source.stop(end);
  }
  _bell(
    note,
    at,
    volume,
    bus = "effects",
    pan = 0,
    priority = 1,
    length = 0.48,
  ) {
    const f = midi(note);
    this._voice({
      frequency: f,
      at,
      duration: length,
      volume,
      bus,
      pan,
      priority,
      attack: 0.004,
    });
    this._voice({
      frequency: f * 2.01,
      at,
      duration: 0.095,
      volume: volume * 0.18,
      bus,
      pan,
      priority,
    });
  }
  _allow(name, key, priority, at) {
    if (at - (this.throttles.get(key) ?? -Infinity) < (RATE[name] || 0.12))
      return false;
    if (at - (this.burstAt ?? -Infinity) >= 0.1) {
      this.burstAt = at;
      this.burst = 0;
    }
    if (priority < 3 && this.burst >= 9) {
      this.stats.dropped++;
      return false;
    }
    this.burst++;
    this.throttles.set(key, at);
    if (this.throttles.size > 256)
      for (const [id, time] of this.throttles)
        if (at - time > 2) this.throttles.delete(id);
    return true;
  }
  cue(name, options = {}) {
    if (!this.enabled || !this.ctx) return false;
    const at = options.at ?? this.ctx.currentTime,
      priority = PRIORITY[name] || 1;
    if (!this._allow(name, options.key || name, priority, at)) return false;
    this.stats.cues++;
    if (priority >= 3) {
      if (at <= this.ctx.currentTime + 0.01) {
        this.duckUntil = at + 0.45;
        this._mix();
      } else if (this.musicBus) {
        const base =
          this.musicVolume *
          (this.mode === "paused" ? 0.24 : this.mode === "draft" ? 0.68 : 1);
        this.musicBus.gain.setTargetAtTime(base * 0.5, at, 0.025);
        this.musicBus.gain.setTargetAtTime(base, at + 0.45, 0.12);
      }
    }
    this._play(name, { ...options, at, priority });
    return true;
  }
  _play(name, { at, gain = 1, pan = 0, priority = 1, value = 0 } = {}) {
    const tone = (
      frequency,
      duration,
      volume,
      wave = "sine",
      slide = 1,
      delay = 0,
    ) =>
      this._voice({
        frequency,
        duration,
        volume: volume * gain,
        wave,
        slide,
        at: at + delay,
        pan,
        priority,
      });
    const air = (frequency, duration, volume, slide = 0.55, delay = 0) =>
      this._voice({
        frequency,
        duration,
        volume: volume * gain,
        noise: true,
        slide,
        at: at + delay,
        pan,
        priority,
      });
    const bell = (note, volume = 0.034, delay = 0, length = 0.48) =>
      this._bell(
        note,
        at + delay,
        volume * gain,
        "effects",
        pan,
        priority,
        length,
      );
    const phrase = (notes, gap = 0.08, volume = 0.028) =>
      notes.forEach((note, i) => bell(note, volume, i * gap));
    switch (name) {
      case "hover":
        tone(midi(88), 0.036, 0.011, "sine", 0.99);
        break;
      case "click":
        tone(310, 0.047, 0.023, "triangle", 0.75);
        tone(midi(83), 0.06, 0.015);
        break;
      case "select":
        phrase([76, 83], 0.055, 0.02);
        break;
      case "confirm":
        phrase([76, 79, 83], 0.06, 0.028);
        air(900, 0.045, 0.017);
        break;
      case "back":
        phrase([79, 76], 0.07, 0.019);
        break;
      case "slider":
        tone(
          midi(64 + Math.round(clamp(value, 0, 1) * 12)),
          0.05,
          0.018,
          "triangle",
        );
        break;
      case "slingshot":
        tone(390, 0.055, 0.048, "triangle", 0.48);
        air(1900, 0.032, 0.035);
        tone(1100, 0.026, 0.012);
        break;
      case "disc":
        air(1900, 0.19, 0.044, 1.6);
        tone(220, 0.13, 0.028, "triangle", 1.9);
        tone(660, 0.12, 0.012, "sine", 0.7);
        break;
      case "lantern":
        bell(64, 0.033, 0, 0.34);
        bell(71, 0.018, 0.025, 0.28);
        air(800, 0.18, 0.025, 1.25);
        break;
      case "storm":
        air(4300, 0.075, 0.078, 0.25);
        tone(83, 0.18, 0.05, "triangle", 0.7);
        tone(1500, 0.036, 0.018, "sine", 0.42);
        break;
      case "sweep":
        air(1800, 0.25, 0.105, 0.34);
        air(520, 0.09, 0.04);
        tone(145, 0.15, 0.035, "triangle", 0.48);
        break;
      case "restore":
        phrase([76, 83, 79, 88], 0.065, 0.03);
        air(1900, 0.36, 0.035, 1.6);
        break;
      case "repel":
        tone(105, 0.28, 0.09, "sine", 0.5);
        tone(230, 0.12, 0.046, "triangle", 0.42);
        air(850, 0.2, 0.082, 0.22);
        break;
      case "telegraph":
        tone(294, 0.17, 0.027, "sine", 1.12);
        tone(588, 0.1, 0.009, "sine", 1.07, 0.1);
        break;
      case "footstep":
        air(value ? 420 : 820, 0.055, 0.017, 0.45);
        tone(value ? 100 : 180, 0.075, 0.012, "triangle", 0.48);
        break;
      case "waterstep":
        air(1700, 0.18, 0.032, 0.3);
        tone(560, 0.11, 0.013, "sine", 1.7, 0.025);
        tone(930, 0.07, 0.008, "sine", 0.6, 0.075);
        break;
      case "water":
        air(1100, 0.65, 0.018, 0.7);
        tone(680 + value * 180, 0.16, 0.009, "sine", 1.8, 0.2);
        tone(1280, 0.095, 0.006, "sine", 0.55, 0.38);
        break;
      case "creak":
        // Staggered bowed-wood partials, quiet enough to remain environmental.
        tone(146 + value * 33, 0.6, 0.016, "triangle", 0.68);
        tone(227, 0.28, 0.009, "sawtooth", 0.78, 0.16);
        air(750, 0.5, 0.013, 0.52, 0.04);
        break;
      case "clocktick":
        tone(value ? 1220 : 960, 0.026, 0.017, "triangle", 0.45);
        air(2200, 0.021, 0.011, 0.5);
        break;
      case "roomchime":
        bell(71, 0.009, 0, 1.1);
        bell(78, 0.005, 0.13, 0.9);
        break;
      case "animal":
        tone(1850, 0.055, 0.006, "sine", 1.25);
        tone(2200, 0.05, 0.004, "sine", 0.78, 0.09);
        break;
      case "hostile":
        tone(180, 0.095, 0.027, "triangle", 0.65);
        air(1350, 0.052, 0.03, 0.6);
        break;
      case "impact":
        tone(1020 + (value % 3) * 118, 0.064, 0.027, "sine", 0.79);
        air(2900, 0.032, 0.017);
        break;
      case "death":
        air(2700, 0.13, 0.043, 0.34);
        tone(530, 0.12, 0.019, "triangle", 0.43);
        break;
      case "shatter":
        bell(90, 0.023, 0, 0.22);
        bell(95, 0.013, 0.027, 0.2);
        air(4200, 0.095, 0.04);
        break;
      case "catch":
        tone(1440, 0.07, 0.02, "sine", 0.7);
        break;
      case "hurt":
        tone(145, 0.2, 0.075, "triangle", 0.42);
        air(530, 0.12, 0.072, 0.45);
        break;
      case "down":
        phrase([64, 59, 54], 0.11, 0.04);
        tone(65, 0.45, 0.045);
        break;
      case "revive":
        phrase([64, 67, 71, 76], 0.085, 0.041);
        break;
      case "heal":
        phrase([76, 79], 0.07, 0.023);
        break;
      case "haste":
        phrase([71, 76, 83], 0.045, 0.025);
        air(1800, 0.09, 0.024, 1.4);
        break;
      case "xp":
        tone(
          midi([76, 79, 83, 86, 88][this.xpNote++ % 5]),
          0.09,
          0.019,
          "sine",
          1.014,
        );
        break;
      case "supply":
        phrase([64, 71, 76], 0.07, 0.026);
        break;
      case "weapon":
        phrase([64, 71, 76, 83], 0.095, 0.037);
        tone(164, 0.18, 0.03, "triangle");
        break;
      case "level":
        phrase([76, 79, 83, 88], 0.085, 0.042);
        bell(90, 0.017, 0.38, 0.7);
        break;
      case "ready":
        bell(83, 0.014, 0, 0.2);
        break;
      case "wave":
        phrase([64, 71, 76], 0.13, 0.03);
        air(1100, 0.08, 0.02);
        break;
      case "boss":
        bell(40, 0.07, 0, 1.1);
        bell(47, 0.038, 0.18, 0.9);
        tone(41, 0.7, 0.06, "triangle", 0.97);
        break;
      case "won":
        phrase([64, 68, 71, 76, 83], 0.12, 0.045);
        bell(80, 0.023, 0.58, 1);
        break;
      case "lost":
        phrase([71, 66, 64, 59], 0.16, 0.036);
        tone(82, 0.65, 0.031, "sine", 0.98);
        break;
    }
  }
  hover() {
    this.cue("hover");
  }
  click() {
    this.unlock();
    this.cue("click");
  }
  confirm() {
    this.unlock();
    this.cue("confirm");
  }
  back() {
    this.unlock();
    this.cue("back");
  }
  select() {
    this.unlock();
    this.cue("select");
  }
  slider(value) {
    const step = Math.round(clamp(value, 0, 1) * 12);
    if (step === this.sliderStep) return;
    this.sliderStep = step;
    this.cue("slider", { value });
  }
  _score(step, at, mode = this.mode, intensity = 0) {
    const beat = step % 6,
      bar = Math.floor(step / 6) % 8,
      variation = Math.floor(step / 48) % 3;
    const chord = CHORDS[Math.floor(bar / 2)],
      quiet = mode === "paused",
      play = mode === "play";
    const note = MELODY[bar][beat];
    if (
      note &&
      (!quiet || beat === 0) &&
      (mode !== "draft" || beat % 2 === 0)
    ) {
      const octave = variation === 2 && bar >= 4 && beat === 0 ? 12 : 0;
      this._bell(
        note + octave,
        at,
        play ? 0.032 : 0.037,
        "music",
        beat % 2 ? 0.18 : -0.18,
        0,
        0.68,
      );
    }
    if (beat === 0) {
      this._voice({
        frequency: midi(chord[0]),
        duration: 1.45,
        volume: 0.023,
        wave: "triangle",
        cutoff: 650,
        at,
        bus: "music",
        priority: 0,
      });
      for (const [i, n] of chord.slice(1).entries())
        this._voice({
          frequency: midi(n),
          duration: 1.9,
          volume: 0.013,
          at: at + i * 0.055,
          attack: 0.12,
          bus: "music",
          pan: i ? 0.35 : -0.35,
          priority: 0,
        });
      if (bar % 2 === 0)
        this._voice({
          frequency: 450,
          noise: true,
          duration: 1.8,
          volume: 0.008,
          at,
          attack: 0.2,
          bus: "music",
          pan: -0.15,
          priority: 0,
          slide: 1.2,
        });
    }
    if (!quiet && (beat % 2 === 0 || (play && intensity > 0.55))) {
      this._voice({
        frequency: beat % 2 ? 1550 : 2300,
        noise: true,
        duration: 0.032,
        volume: play ? 0.013 : 0.008,
        at,
        bus: "music",
        pan: beat % 2 ? 0.25 : -0.25,
        priority: 0,
      });
    }
    if (play && intensity > 0.3 && beat === 3)
      this._voice({
        frequency: midi(chord[0] + 12),
        wave: "triangle",
        duration: 0.2,
        volume: 0.018,
        at,
        bus: "music",
        priority: 0,
      });
    if (variation === 1 && !quiet && beat === 5)
      this._bell(chord[2] + 12, at, 0.012, "music", -0.3, 0, 0.3);
  }
  _music(mode, intensity) {
    if (!this.ctx || this.ctx.state === "suspended") return;
    const now = this.ctx.currentTime;
    this.mode = mode;
    this._mix();
    if (!this.enabled || this.musicVolume <= 0) {
      this.nextBeat = now + 0.03;
      return;
    }
    // No catch-up bursts after backgrounding, a debugger pause, or network stalls.
    if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.02;
    const bpm = mode === "play" ? (intensity > 0.7 ? 100 : 90) : 76;
    for (let count = 0; this.nextBeat < now + 0.2 && count < 3; count++) {
      this._score(this.beat++, this.nextBeat, mode, intensity);
      this.nextBeat += 30 / bpm;
    }
  }
  _ambience(state, me, active, audible) {
    const t = state.time || 0,
      gallery = state.mapId;
    const emit = (name, period, source, gain, condition = true, offset = 0) => {
      const bucket = Math.floor((t + offset) / period),
        previous = this.ambientBuckets.get(name);
      this.ambientBuckets.set(name, bucket);
      if (
        previous === undefined ||
        previous === bucket ||
        !active ||
        !audible ||
        !condition
      )
        return;
      const distance = me ? Math.hypot(source.x - me.x, source.y - me.y) : 0;
      if (distance > 650) return;
      this.cue(name, {
        gain: gain / (1 + distance / 240),
        pan: me ? clamp((source.x - me.x) / 450, -0.7, 0.7) : 0,
        value: bucket % 2,
      });
    };
    const moving = me && !me.dead && Math.hypot(me.vx || 0, me.vy || 0) > 18;
    const wet = me && inWater(gallery, me.x, me.y);
    emit(
      wet ? "waterstep" : "footstep",
      0.34,
      me || { x: 600, y: 400 },
      0.5,
      moving,
    );
    // Advance both step clocks while dry/stationary, avoiding a delayed splash.
    this.ambientBuckets.set(
      wet ? "footstep" : "waterstep",
      Math.floor(t / 0.34),
    );
    emit("water", 0.88, WATER_POOL, 0.8, gallery === "sculpture_court", 0.19);
    emit(
      "clocktick",
      0.92,
      { x: 490, y: 290 },
      0.6,
      gallery === "clock_gallery",
    );
    emit(
      "roomchime",
      27,
      { x: 600, y: 80 },
      0.65,
      gallery === "clock_gallery",
      11,
    );
    emit(
      "creak",
      13.7,
      { x: 270, y: 240 },
      gallery === "clock_gallery" ? 0.8 : 0.5,
      true,
      3.4,
    );
    emit(
      "animal",
      23.1,
      { x: 393, y: 501 },
      0.5,
      gallery === "natural_history",
      5.5,
    );
  }
  update(state, id, { screen, paused = false } = {}) {
    if (!state) return;
    if (
      (this.lastTime !== null && state.time < this.lastTime) ||
      (this.lastRun !== null && state.runNumber !== this.lastRun)
    )
      this.reset();
    const me = state.players?.find((p) => p.id === id);
    const active =
      state.phase === "playing" && (!screen || screen === "play") && !paused;
    const mode = paused
      ? "paused"
      : active
        ? "play"
        : state.phase === "draft"
          ? "draft"
          : "menu";
    const intensity = Math.min(
      1,
      (state.enemies?.length || 0) / 65 +
        (state.enemies?.some((e) => e.type === "warden") ? 0.5 : 0),
    );
    this._music(mode, intensity);
    const audible = !!(
      this.ctx &&
      this.enabled &&
      this.ctx.state !== "suspended" &&
      !paused
    );
    const spatial = (entity, own = false) => {
      const distance = me
        ? Math.hypot((entity.x || 0) - me.x, (entity.y || 0) - me.y)
        : 0;
      return {
        pan: me ? clamp(((entity.x || 0) - me.x) / 500, -0.75, 0.75) : 0,
        gain: own ? 1 : distance > 850 ? 0 : 0.65 / (1 + distance / 340),
      };
    };
    const play = (name, options = {}) => audible && this.cue(name, options);
    this._ambience(state, me, active, audible);
    if (this.primed && audible) {
      if (
        state.phase !== this.lastPhase &&
        ["won", "lost"].includes(state.phase)
      )
        play(state.phase);
      if ((state.level || 1) > this.lastLevel) play("level");
      if (active && state.wave > this.lastWave)
        play(state.enemies?.some((e) => e.type === "warden") ? "boss" : "wave");
    }
    const currentShots = new Set(),
      launches = new Set();
    for (const shot of state.shots || []) {
      currentShots.add(shot.id);
      if (
        !this.primed ||
        !active ||
        this.shotIds.has(shot.id) ||
        shot.hostile ||
        shot.age > 0.25
      )
        continue;
      const weapon = shot.weapon || "slingshot",
        key = `${weapon}:${shot.owner}`;
      if (!["slingshot", "disc"].includes(weapon) || launches.has(key))
        continue;
      launches.add(key);
      play(weapon, {
        ...spatial(
          { x: shot.originX ?? shot.x, y: shot.originY ?? shot.y },
          shot.owner === id,
        ),
        key,
      });
    }
    const players = new Map();
    for (const player of state.players || []) {
      const previous = this.players.get(player.id),
        own = player.id === id,
        mix = spatial(player, own);
      if (this.primed && active && previous) {
        if (player.dead && !previous.dead) play("down", mix);
        else if (!player.dead && previous.dead) play("revive", mix);
        else if (own && player.hp < previous.hp) play("hurt", mix);
        if (own && previous.cooldown > 0.03 && player.castCooldown <= 0.001)
          play("ready");
        if (
          player.shotAge <= 0.16 &&
          player.shotAge < previous.shotAge &&
          ["slingshot", "disc"].includes(player.lastWeapon) &&
          !launches.has(`${player.lastWeapon}:${player.id}`)
        )
          play(player.lastWeapon, {
            ...mix,
            key: `${player.lastWeapon}:${player.id}`,
          });
      }
      players.set(player.id, {
        hp: player.hp,
        dead: player.dead,
        cooldown: player.castCooldown,
        shotAge: player.shotAge,
      });
    }
    const enemies = new Map();
    for (const enemy of state.enemies || []) {
      const previous = this.enemies.get(enemy.id),
        mix = spatial(enemy);
      if (this.primed && active && previous) {
        if (enemy.hit > previous.hit)
          play("impact", { ...mix, value: Number(enemy.id) || 0 });
        if (
          enemy.type !== "mite" &&
          enemy.fireIn <= 0.65 &&
          enemy.fireIn > 0.05 &&
          previous.fireIn > 0.65
        )
          play("telegraph", {
            ...mix,
            gain: mix.gain * (enemy.type === "warden" ? 1.4 : 0.85),
          });
        if (enemy.shotAge <= 0.16 && enemy.shotAge < previous.shotAge)
          play("hostile", mix);
      }
      enemies.set(enemy.id, {
        hit: enemy.hit || 0,
        fireIn: enemy.fireIn,
        shotAge: enemy.shotAge,
      });
    }
    const currentEffects = new Set();
    for (const effect of state.effects || []) {
      currentEffects.add(effect.id);
      if (!this.primed || this.seen.has(effect.id) || !active) continue;
      const own =
        effect.owner === id ||
        (effect.owner == null && effect.color === me?.color);
      const mix = spatial(effect, own);
      if (effect.type === "sweep") play(effect.ability || "sweep", mix);
      else if (["lantern", "storm"].includes(effect.type))
        play(effect.type, { ...mix, key: `${effect.type}:${effect.owner}` });
      else if (
        [
          "xp",
          "weapon",
          "haste",
          "heal",
          "supply",
          "death",
          "shatter",
          "catch",
        ].includes(effect.type)
      )
        play(effect.type, mix);
      else if (effect.type === "resonance")
        play("supply", { ...mix, gain: mix.gain * 0.65 });
    }
    // Only living snapshot IDs are needed. Old IDs cannot build up over a long run.
    this.seen = currentEffects;
    this.shotIds = currentShots;
    this.players = players;
    this.enemies = enemies;
    this.lastTime = state.time;
    this.lastRun = state.runNumber;
    this.lastPhase = state.phase;
    this.lastWave = state.wave || 0;
    this.lastLevel = state.level || 1;
    this.primed = true;
  }
}
