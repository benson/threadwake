import test from "node:test";
import assert from "node:assert/strict";
import { AudioGarden } from "../src/audio.js";

class Probe extends AudioGarden {
  constructor() {
    super();
    this.ctx = { currentTime: 0, state: "running" };
    this.played = [];
  }
  _music(mode) {
    this.mode = mode;
  }
  _play(name, options) {
    this.played.push({ name, ...options });
  }
  advance(state, time, options = {}) {
    this.ctx.currentTime = time;
    this.update({ ...state, time }, "local", { screen: "play", ...options });
  }
}
const state = () => ({
  time: 0,
  runNumber: 1,
  phase: "playing",
  wave: 1,
  level: 1,
  effects: [],
  players: [
    {
      id: "local",
      color: 0,
      x: 0,
      y: 0,
      hp: 100,
      dead: false,
      castCooldown: 5,
      shotAge: 1,
      lastWeapon: "slingshot",
    },
  ],
  enemies: [
    { id: 20, x: 200, y: 0, type: "moth", hit: 0, fireIn: 0.8, shotAge: 1 },
  ],
});

test("public snapshot cues distinguish weapons, telegraphs, impacts and character abilities without repeats", () => {
  const audio = new Probe(),
    s = state();
  audio.advance(s, 0);
  s.players[0].shotAge = 0;
  s.enemies[0].fireIn = 0.6;
  s.enemies[0].hit = 0.2;
  s.effects = [
    { id: 1, type: "sweep", ability: "restore", owner: "local", x: 0, y: 0 },
    { id: 2, type: "storm", owner: "local", x: 20, y: 0 },
    { id: 3, type: "storm", owner: "local", x: 25, y: 0 },
  ];
  audio.advance(s, 0.1);
  const names = audio.played.map((e) => e.name);
  for (const name of ["slingshot", "telegraph", "impact", "restore", "storm"])
    assert.ok(names.includes(name), name);
  assert.equal(
    names.filter((n) => n === "storm").length,
    1,
    "chain arcs share one launch sound",
  );
  const count = audio.played.length;
  audio.advance(s, 0.21);
  assert.equal(audio.played.length, count);
  s.players[0].shotAge = 0.4;
  audio.advance(s, 0.3);
  s.players[0].shotAge = 0;
  s.players[0].lastWeapon = "disc";
  s.enemies[0].shotAge = 0;
  s.effects = [
    { id: 4, type: "lantern", owner: "local" },
    { id: 5, type: "sweep", ability: "repel", owner: "local" },
  ];
  audio.advance(s, 0.4);
  for (const name of ["disc", "hostile", "lantern", "repel"])
    assert.ok(
      audio.played.some((e) => e.name === name),
      name,
    );
});

test("pause and mute consume events, avoiding a queued burst on return", () => {
  const audio = new Probe(),
    s = state();
  audio.advance(s, 0);
  s.effects = [{ id: 9, type: "death", x: 0, y: 0 }];
  audio.advance(s, 0.1, { paused: true });
  audio.advance(s, 0.2);
  assert.equal(audio.played.length, 0);
  audio.enabled = false;
  s.effects = [{ id: 10, type: "xp", owner: "local" }];
  audio.advance(s, 0.3);
  audio.enabled = true;
  audio.advance(s, 0.4);
  assert.equal(audio.played.length, 0);
  s.effects = [{ id: 11, type: "xp", owner: "local" }];
  audio.advance(s, 0.6);
  assert.equal(audio.played[0].name, "xp");
});

test("simultaneous weapons and companion shots each sound once without reconnect bursts", () => {
  const audio = new Probe(),
    s = state();
  s.shots = [
    { id: 100, owner: "local", weapon: "slingshot", age: 0.1, x: 0, y: 0 },
  ];
  audio.advance(s, 0);
  assert.equal(
    audio.played.length,
    0,
    "existing shots only establish baseline",
  );
  s.players[0].shotAge = 0;
  s.players[0].lastWeapon = "lantern";
  s.shots.push(
    {
      id: 101,
      owner: "local",
      weapon: "slingshot",
      age: 0.03,
      originX: 0,
      originY: 0,
    },
    {
      id: 102,
      owner: "local",
      weapon: "disc",
      age: 0.03,
      originX: 0,
      originY: 0,
    },
    {
      id: 103,
      owner: "local",
      weapon: "slingshot",
      age: 0.03,
      originX: 30,
      originY: 0,
    },
  );
  s.effects = [{ id: 104, type: "lantern", owner: "local" }];
  audio.advance(s, 0.1);
  assert.deepEqual(audio.played.map((e) => e.name).sort(), [
    "disc",
    "lantern",
    "slingshot",
  ]);
  audio.advance(s, 0.3);
  assert.equal(audio.played.length, 3, "same surviving shots are silent");
  audio.reset();
  audio.advance(s, 0.4);
  assert.equal(audio.played.length, 3);
});

test("swarm effects are throttled and critical down/revive and result events remain audible once", () => {
  const audio = new Probe(),
    s = state();
  audio.advance(s, 0);
  s.effects = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    type: "death",
    x: i,
    y: 0,
  }));
  s.players[0].hp = 0;
  s.players[0].dead = true;
  audio.advance(s, 0.1);
  assert.equal(audio.played.filter((e) => e.name === "death").length, 1);
  assert.equal(audio.played.filter((e) => e.name === "down").length, 1);
  s.effects = [];
  s.players[0].dead = false;
  s.players[0].hp = 60;
  audio.advance(s, 1);
  assert.equal(audio.played.filter((e) => e.name === "revive").length, 1);
  s.level = 2;
  s.phase = "draft";
  audio.advance(s, 1.3);
  audio.advance(s, 1.5);
  assert.equal(audio.played.filter((e) => e.name === "level").length, 1);
  s.phase = "won";
  audio.advance(s, 2);
  audio.advance(s, 3);
  assert.equal(audio.played.filter((e) => e.name === "won").length, 1);
  assert.equal(audio.seen.size, 0, "expired event IDs do not accumulate");
});

function fakeContext() {
  const sources = [];
  const param = () => ({
    value: 0,
    setValueAtTime(n) {
      this.value = n;
    },
    setTargetAtTime(n) {
      this.value = n;
    },
    linearRampToValueAtTime(n) {
      this.value = n;
    },
    exponentialRampToValueAtTime(n) {
      this.value = n;
    },
    cancelScheduledValues() {},
  });
  const node = () => ({
    connect() {},
    disconnect() {},
    gain: param(),
    frequency: param(),
    pan: param(),
    Q: param(),
  });
  const source = () => {
    const s = {
      ...node(),
      start() {},
      stop(at) {
        this.stopAt = at;
      },
    };
    sources.push(s);
    return s;
  };
  return {
    currentTime: 0,
    sampleRate: 8000,
    state: "running",
    destination: {},
    sources,
    createGain: node,
    createStereoPanner: node,
    createBiquadFilter: node,
    createConvolver: node,
    createOscillator: source,
    createBufferSource: source,
    createBuffer(ch, length, rate) {
      const channels = Array.from(
        { length: ch },
        () => new Float32Array(length),
      );
      return { sampleRate: rate, getChannelData: (i) => channels[i] };
    },
    createDynamicsCompressor() {
      return {
        ...node(),
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
      };
    },
  };
}

test("real mixer setters change buses, mute stops scheduled sources, voice load remains bounded", () => {
  const audio = new AudioGarden(),
    ctx = fakeContext();
  audio.attachContext(ctx);
  for (let i = 0; i < 100; i++) audio._voice({ duration: 2, priority: 1 });
  assert.equal(audio.voices.length, 40);
  assert.equal(audio.stats.peakVoices, 40);
  assert.equal(audio.stats.dropped, 60);
  audio.effectsVolume = 0;
  assert.equal(audio.effectsBus.gain.value, 0);
  audio.musicVolume = 0.3;
  assert.equal(audio.musicBus.gain.value, 0.3);
  audio.enabled = false;
  assert.equal(audio.master.gain.value, 0);
  assert.equal(audio.voices.length, 0);
  assert.ok(ctx.sources.every((source) => source.stopAt <= 0.035));
  audio.enabled = true;
  assert.equal(audio.voices.length, 0);
  audio.mode = "paused";
  audio._mix();
  assert.ok(audio.musicBus.gain.value < 0.1);
});

test("menu hover never creates a context; hover and sliders are gentle and throttled", () => {
  const silent = new AudioGarden();
  silent.hover();
  assert.equal(silent.ctx, null);
  const audio = new Probe();
  for (let i = 0; i < 20; i++) audio.hover();
  assert.equal(audio.played.length, 1);
  audio.ctx.currentTime = 0.2;
  audio.slider(0.5);
  audio.slider(0.501);
  assert.equal(audio.played.filter((e) => e.name === "slider").length, 1);
});
