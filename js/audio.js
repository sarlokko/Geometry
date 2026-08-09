/** Web Audio SFX + rhythmic music bed synced to each world's BPM. */
export class AudioBus {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.muted = false; // SFX
    this.musicMuted = localStorage.getItem("neon-dash-music") === "off";
    this._bedNodes = [];
    this._bedPlaying = false;
    this._wantBed = false;
    this._bpm = 128;
    this._step = 0;
    this._nextNoteTime = 0;
    this._scheduler = null;
    this._worldId = 0;
    this._bar = 0;
    /** @type {Promise<void> | null} */
    this._resuming = null;
  }

  /** Create AudioContext if needed. Does not start music. */
  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    return this.ctx;
  }

  /**
   * Must be called from a tap/click handler. Unlocks Web Audio on mobile
   * (Samsung/Android often leave the context suspended until a gesture).
   */
  unlock() {
    const ctx = this.ensure();
    if (!ctx) return Promise.resolve();

    // Invoke resume inside the user-gesture stack (do not await first).
    let p = Promise.resolve();
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      if (!this._resuming) {
        this._resuming = ctx
          .resume()
          .catch(() => {})
          .then(() => {
            this._resuming = null;
            if (this._wantBed && !this.musicMuted && !this._bedPlaying) {
              this.startBed();
            }
          });
      }
      p = this._resuming;
    }

    // Silent one-shot helps some mobile browsers open the audio device.
    try {
      if (ctx.state === "running") {
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch {
      /* ignore */
    }

    if (ctx.state === "running" && this._wantBed && !this.musicMuted && !this._bedPlaying) {
      this.startBed();
    }
    return p;
  }

  /** @param {{ bpm?: number, worldId?: number, forceRestart?: boolean }} opts */
  setTrack(opts = {}) {
    const bpmChanged = opts.bpm != null && opts.bpm !== this._bpm;
    const worldChanged = opts.worldId != null && opts.worldId !== this._worldId;
    if (opts.bpm) this._bpm = opts.bpm;
    if (opts.worldId != null) this._worldId = opts.worldId;

    if (this._bedPlaying && (bpmChanged || worldChanged || opts.forceRestart)) {
      const want = this._wantBed;
      this._haltBed(false);
      this._wantBed = want;
      this.startBed();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Toggle only the rhythmic music bed (SFX stay on). */
  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem("neon-dash-music", this.musicMuted ? "off" : "on");
    if (this.musicMuted) {
      this._haltBed(false);
    } else if (this._wantBed) {
      this.startBed();
    }
    return this.musicMuted;
  }

  isMusicOn() {
    return !this.musicMuted;
  }

  beep(freq, dur = 0.08, type = "square", gain = 0.05) {
    const ctx = this.ensure();
    if (!ctx || this.muted || ctx.state !== "running") return;
    try {
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
    } catch {
      /* ignore */
    }
  }

  jump() {
    this.beep(420, 0.07, "square", 0.05);
    this.beep(640, 0.05, "square", 0.04);
  }

  orb() {
    this.beep(720, 0.06, "triangle", 0.06);
    this.beep(980, 0.08, "triangle", 0.05);
  }

  pad() {
    this.beep(280, 0.1, "sawtooth", 0.045);
  }

  die() {
    this.beep(180, 0.18, "sawtooth", 0.07);
    this.beep(90, 0.25, "square", 0.06);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.beep(f, 0.12, "triangle", 0.06), i * 90);
    });
  }

  portal() {
    this.beep(300, 0.12, "sine", 0.05);
    this.beep(500, 0.14, "sine", 0.045);
  }

  startBed() {
    this._wantBed = true;
    const ctx = this.ensure();
    if (!ctx || this.musicMuted || this._bedPlaying) return;
    if (ctx.state !== "running") {
      // Will start from unlock()/resume resolution.
      return;
    }

    this._bedPlaying = true;

    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 18;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.002;
    comp.release.value = 0.22;
    comp.connect(master);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 9000;
    filter.Q.value = 0.5;
    filter.connect(comp);

    this._bedNodes = [master, filter, comp];
    this._step = 0;
    this._bar = 0;
    this._nextNoteTime = ctx.currentTime + 0.05;
    this._schedule();
  }

  stopBed() {
    this._wantBed = false;
    this._haltBed(true);
  }

  /** @param {boolean} clearWant */
  _haltBed(clearWant) {
    if (clearWant) this._wantBed = false;
    this._bedPlaying = false;
    if (this._scheduler != null) {
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
    if (ctx.state !== "running") {
      // Don't busy-loop while suspended — retry gently.
      this._scheduler = window.setTimeout(() => this._schedule(), 200);
      return;
    }

    const scheduleAhead = 0.2;
    const secondsPerBeat = 60 / Math.max(60, this._bpm || 120);
    const stepDur = secondsPerBeat / 4;

    // If we fell far behind (tab throttle), skip ahead instead of spawning
    // hundreds of nodes on the main thread (freezes mobile).
    if (this._nextNoteTime < ctx.currentTime - 0.3) {
      this._nextNoteTime = ctx.currentTime + 0.05;
    }

    let guard = 0;
    while (this._nextNoteTime < ctx.currentTime + scheduleAhead && guard < 24) {
      this._playStep(this._step, this._nextNoteTime, this._bar);
      this._nextNoteTime += stepDur;
      this._step += 1;
      if (this._step >= 16) {
        this._step = 0;
        this._bar = (this._bar + 1) % 4;
      }
      guard += 1;
    }

    this._scheduler = window.setTimeout(() => this._schedule(), 50);
  }

  _playStep(step, when, bar) {
    const filter = this._bedNodes[1];
    if (!filter || !this.ctx) return;
    // Skip notes already in the past — scheduling them throws on some engines.
    if (when < this.ctx.currentTime - 0.02) return;

    const pattern = this._patternForWorld(this._worldId, bar);
    const isDownbeat = step % 4 === 0;
    const isBackbeat = step % 4 === 2;

    try {
      if (pattern.kick[step]) {
        this._kick(when, filter, isDownbeat ? 1.35 : 1.0);
      }
      if (pattern.snare[step]) {
        this._snare(when, filter, isBackbeat ? 1.15 : 0.85);
      }
      if (pattern.hat[step]) {
        const open = step === 15 || (pattern.openHat && pattern.openHat[step]);
        this._hat(when, filter, open ? 0.7 : step % 2 === 0 ? 0.5 : 0.35, open);
      }
      if (pattern.bass[step] != null) {
        this._bass(when, filter, pattern.bass[step], 0.9);
      }
      if (pattern.lead[step] != null) {
        this._lead(when, filter, pattern.lead[step], 0.55);
      }
      if (pattern.stab && pattern.stab[step] != null) {
        this._stab(when, filter, pattern.stab[step], 0.38);
      }
    } catch {
      /* ignore per-step audio errors */
    }
  }

  _patternForWorld(worldId, bar) {
    const id = Math.max(0, Math.min(9, worldId | 0));
    const roots = [98, 110, 116, 123, 130, 138, 146, 155, 164, 174];
    const root = roots[id];
    const third = root * (id % 2 === 0 ? 1.25 : 1.2);
    const fifth = root * 1.5;
    const sixth = root * 1.667;
    const octave = root * 2;
    const fill = bar === 3;

    const kits = [
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        bass: [root, null, null, null, fifth, null, null, null, root, null, null, third, null, null, fifth, null],
        lead: [null, null, octave, null, null, null, fifth, null, null, null, octave, null, null, third * 2, null, null],
      },
      {
        kick: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        bass: [root, null, root, null, null, third, null, null, fifth, null, null, root, null, null, third, null],
        lead: [octave, null, null, fifth, null, null, octave, null, null, fifth, null, null, third * 2, null, null, null],
      },
      {
        kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
        hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0],
        bass: [root, null, fifth, null, root, null, null, third, fifth, null, root, null, null, sixth, null, null],
        lead: [null, octave, null, octave, null, fifth, null, null, octave, null, null, fifth, null, null, third * 2, null],
      },
      {
        kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
        hat: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        bass: [root, null, null, third, null, null, fifth, null, null, root, null, fifth, null, third, null, null],
        lead: [null, null, fifth, null, octave, null, null, fifth, null, octave, null, null, third * 2, null, octave, null],
      },
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
        hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        openHat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        bass: [root, root, null, null, fifth, null, fifth, null, root, null, null, third, fifth, null, null, root],
        lead: [octave, null, fifth, null, octave, null, null, sixth * 2, null, fifth, null, octave, null, null, third * 2, null],
        stab: [root, null, null, null, null, null, null, null, fifth, null, null, null, null, null, null, null],
      },
      {
        kick: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        hat: [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        bass: [root, null, fifth, null, null, root, null, third, fifth, null, null, root, null, fifth, null, null],
        lead: [null, octave, null, null, fifth, null, octave, null, null, third * 2, null, octave, null, null, fifth, null],
      },
      {
        kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, fill ? 1 : 0],
        hat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        bass: [root, null, null, root, fifth, null, null, fifth, sixth, null, null, root, fifth, null, third, null],
        lead: [octave, octave, null, fifth, null, null, octave, null, fifth, null, octave, null, null, sixth * 2, null, fifth],
      },
      {
        kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, fill ? 1 : 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        openHat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        bass: [root, fifth, root, null, fifth, root, null, third, root, fifth, null, root, fifth, null, sixth, null],
        lead: [fifth, null, octave, null, fifth, null, octave, null, third * 2, null, octave, null, fifth, null, octave, null],
        stab: [null, null, null, null, root, null, null, null, null, null, null, null, fifth, null, null, null],
      },
      {
        kick: bar % 2 === 0
          ? [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
          : [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, fill ? 1 : 0],
        hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
        bass: [root, null, null, null, fifth, null, null, null, third, null, null, root, null, fifth, null, null],
        lead: [null, null, octave, null, null, null, fifth, null, null, octave, null, null, sixth * 2, null, null, fifth],
        stab: [root, null, null, null, null, null, null, null, null, null, null, null, fifth, null, null, null],
      },
      {
        kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, fill ? 1 : 0],
        hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        openHat: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        bass: [root, null, root, fifth, null, root, null, third, fifth, null, root, null, sixth, null, fifth, root],
        lead: [octave, fifth, octave, null, third * 2, null, octave, fifth, null, octave, sixth * 2, null, octave, fifth, null, octave],
        stab: [root, null, null, null, fifth, null, null, null, root, null, null, null, fifth, null, null, null],
      },
    ];

    return kits[id];
  }

  _kick(when, dest, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.14);
    g.gain.setValueAtTime(1.15 * vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.22);

    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.type = "square";
    click.frequency.value = 700;
    cg.gain.setValueAtTime(0.2 * vel, when);
    cg.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
    click.connect(cg);
    cg.connect(dest);
    click.start(when);
    click.stop(when + 0.04);
  }

  _snare(when, dest, vel) {
    const ctx = this.ctx;
    const noise = this._noiseBuffer();
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2000;
    g.gain.setValueAtTime(0.85 * vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + 0.16);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 200;
    og.gain.setValueAtTime(0.35 * vel, when);
    og.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    osc.connect(og);
    og.connect(dest);
    osc.start(when);
    osc.stop(when + 0.12);
  }

  _hat(when, dest, vel, open = false) {
    const ctx = this.ctx;
    const noise = this._noiseBuffer();
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = open ? 5000 : 7500;
    const g = ctx.createGain();
    const dur = open ? 0.12 : 0.045;
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  _bass(when, dest, freq, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    sub.type = "sine";
    osc.frequency.value = freq;
    sub.frequency.value = freq * 0.5;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, when);
    filter.frequency.exponentialRampToValueAtTime(220, when + 0.2);
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.26);
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(g);
    g.connect(dest);
    osc.start(when);
    sub.start(when);
    osc.stop(when + 0.28);
    sub.stop(when + 0.28);
  }

  _lead(when, dest, freq, vel) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.14);
  }

  _stab(when, dest, freq, vel) {
    const ctx = this.ctx;
    const freqs = [freq, freq * 1.25, freq * 1.5];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      g.gain.setValueAtTime(vel, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
      osc.connect(g);
      g.connect(dest);
      osc.start(when);
      osc.stop(when + 0.2);
    }
  }

  _noiseBuffer() {
    if (this._noise && this.ctx) return this._noise;
    const ctx = this.ensure();
    if (!ctx) return null;
    const len = ctx.sampleRate * 0.25;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }
}
