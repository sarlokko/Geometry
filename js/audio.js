/** Web Audio SFX + looping rhythmic music bed synced to BPM. */
export class AudioBus {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.muted = false;
    this._bedNodes = [];
    this._bedPlaying = false;
    this._wantBed = false;
    this._bpm = 128;
    this._step = 0;
    this._nextNoteTime = 0;
    this._scheduler = null;
    this._worldId = 0;
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** @param {{ bpm?: number, worldId?: number }} opts */
  setTrack(opts = {}) {
    if (opts.bpm) this._bpm = opts.bpm;
    if (opts.worldId != null) this._worldId = opts.worldId;
    if (this._bedPlaying) {
      this.stopBed();
      this.startBed();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopBed();
    else if (this._wantBed) this.startBed();
    return this.muted;
  }

  beep(freq, dur = 0.08, type = "square", gain = 0.05) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  jump() {
    this.beep(420, 0.07, "square", 0.04);
    this.beep(640, 0.05, "square", 0.03);
  }

  orb() {
    this.beep(720, 0.06, "triangle", 0.05);
    this.beep(980, 0.08, "triangle", 0.04);
  }

  pad() {
    this.beep(280, 0.1, "sawtooth", 0.035);
  }

  die() {
    this.beep(180, 0.18, "sawtooth", 0.06);
    this.beep(90, 0.25, "square", 0.05);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.beep(f, 0.12, "triangle", 0.05), i * 90);
    });
  }

  portal() {
    this.beep(300, 0.12, "sine", 0.04);
    this.beep(500, 0.14, "sine", 0.035);
  }

  startBed() {
    this._wantBed = true;
    const ctx = this.ensure();
    if (!ctx || this.muted || this._bedPlaying) return;

    const master = ctx.createGain();
    master.gain.value = 0.045;
    master.connect(ctx.destination);

    // Soft low-pass so the bed sits under SFX
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2200;
    filter.Q.value = 0.7;
    filter.connect(master);

    this._bedNodes = [master, filter];
    this._bedPlaying = true;
    this._step = 0;
    this._nextNoteTime = ctx.currentTime + 0.05;
    this._schedule();
  }

  stopBed() {
    this._wantBed = false;
    this._bedPlaying = false;
    if (this._scheduler) {
      clearTimeout(this._scheduler);
      this._scheduler = null;
    }
    for (const n of this._bedNodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this._bedNodes = [];
  }

  _schedule() {
    if (!this._bedPlaying || !this.ctx) return;
    const ctx = this.ctx;
    const scheduleAhead = 0.2;
    const secondsPerBeat = 60 / this._bpm;
    // 16th notes
    const stepDur = secondsPerBeat / 4;

    while (this._nextNoteTime < ctx.currentTime + scheduleAhead) {
      this._playStep(this._step, this._nextNoteTime);
      this._nextNoteTime += stepDur;
      this._step = (this._step + 1) % 16;
    }

    this._scheduler = window.setTimeout(() => this._schedule(), 25);
  }

  _playStep(step, when) {
    const filter = this._bedNodes[1];
    if (!filter || !this.ctx) return;

    const pattern = this._patternForWorld(this._worldId);
    const isDownbeat = step % 4 === 0;
    const isBackbeat = step % 4 === 2;
    const isEighth = step % 2 === 0;

    // Kick
    if (pattern.kick[step]) {
      this._kick(when, filter, isDownbeat ? 1 : 0.75);
    }

    // Snare / clap
    if (pattern.snare[step]) {
      this._snare(when, filter, isBackbeat ? 0.7 : 0.45);
    }

    // Hi-hat
    if (pattern.hat[step]) {
      this._hat(when, filter, isEighth ? 0.22 : 0.12);
    }

    // Bass note
    if (pattern.bass[step] != null) {
      this._bass(when, filter, pattern.bass[step], 0.35);
    }

    // Lead arpeggio accents
    if (pattern.lead[step] != null) {
      this._lead(when, filter, pattern.lead[step], 0.16);
    }
  }

  _patternForWorld(worldId) {
    // Scale roots climb slightly with world intensity
    const roots = [98, 110, 117, 123, 131, 147, 156, 165, 175, 185];
    const root = roots[Math.max(0, Math.min(9, worldId))] || 110;
    const third = root * 1.25;
    const fifth = root * 1.5;
    const octave = root * 2;

    // denser hats / leads on harder worlds
    const dense = worldId >= 5;
    const kick = [
      1, 0, 0, 0,
      1, 0, dense ? 1 : 0, 0,
      1, 0, 0, dense ? 1 : 0,
      1, 0, dense ? 1 : 0, 0,
    ];
    const snare = [
      0, 0, 0, 0,
      1, 0, 0, dense ? 1 : 0,
      0, 0, 0, 0,
      1, 0, dense ? 1 : 0, 0,
    ];
    const hat = dense
      ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
      : [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, worldId >= 2 ? 1 : 0];

    const bass = [
      root, null, null, root,
      null, null, third, null,
      fifth, null, null, root,
      null, third, null, dense ? fifth : null,
    ];

    const lead = worldId >= 2
      ? [
          null, octave, null, dense ? fifth : null,
          null, null, third * 2, null,
          null, fifth, null, octave,
          null, null, dense ? third * 2 : null, null,
        ]
      : [
          null, null, null, null,
          null, octave, null, null,
          null, null, null, null,
          null, fifth, null, null,
        ];

    return { kick, snare, hat, bass, lead };
  }

  _kick(when, dest, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    g.gain.setValueAtTime(0.9 * vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.18);
  }

  _snare(when, dest, vel) {
    const ctx = this.ctx;
    const noise = this._noiseBuffer();
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    g.gain.setValueAtTime(0.55 * vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + 0.14);

    // body tone
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 180;
    og.gain.setValueAtTime(0.2 * vel, when);
    og.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
    osc.connect(og);
    og.connect(dest);
    osc.start(when);
    osc.stop(when + 0.1);
  }

  _hat(when, dest, vel) {
    const ctx = this.ctx;
    const noise = this._noiseBuffer();
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + 0.05);
  }

  _bass(when, dest, freq, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, when);
    filter.frequency.exponentialRampToValueAtTime(180, when + 0.18);
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    osc.connect(filter);
    filter.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.24);
  }

  _lead(when, dest, freq, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.12);
  }

  _noiseBuffer() {
    if (this._noise && this.ctx) return this._noise;
    const ctx = this.ensure();
    if (!ctx) return null;
    const len = ctx.sampleRate * 0.2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }
}
