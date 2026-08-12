/** Web Audio SFX + light looping music bed (no per-note scheduler). */
export class AudioBus {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.muted = false;
    this.musicMuted = localStorage.getItem("neon-dash-music") === "off";
    this._bedNodes = [];
    this._bedPlaying = false;
    this._wantBed = false;
    this._bpm = 128;
    this._worldId = 0;
    /** @type {Promise<void> | null} */
    this._resuming = null;
    /** @type {AudioBuffer | null} */
    this._loopBuf = null;
    this._loopKey = "";
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.ctx = new Ctx();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  /**
   * Call from a tap/click. Creates/resumes AudioContext inside the gesture
   * (required on Samsung/Android) and plays a short chirp so unlock is audible.
   */
  unlock() {
    const ctx = this.ensure();
    if (!ctx) return Promise.resolve();

    let p = Promise.resolve();
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      if (!this._resuming) {
        this._resuming = ctx
          .resume()
          .catch(() => {})
          .then(() => {
            this._resuming = null;
            this._chirp();
            if (this._wantBed && !this.musicMuted && !this._bedPlaying) {
              this.startBed();
            }
          });
      }
      p = this._resuming;
    }

    // Audible chirp doubles as unlock + confirmation (works even if music is off).
    this._chirp();

    if (ctx.state === "running" && this._wantBed && !this.musicMuted && !this._bedPlaying) {
      this.startBed();
    }
    return p;
  }

  _chirp() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      g.gain.value = 0.08;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      /* ignore */
    }
  }

  /** @param {{ bpm?: number, worldId?: number, forceRestart?: boolean }} opts */
  setTrack(opts = {}) {
    const bpmChanged = opts.bpm != null && opts.bpm !== this._bpm;
    const worldChanged = opts.worldId != null && opts.worldId !== this._worldId;
    if (opts.bpm) this._bpm = opts.bpm;
    if (opts.worldId != null) this._worldId = opts.worldId;

    if (bpmChanged || worldChanged) this._loopBuf = null;

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
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(Math.max(0.0001, gain), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      /* ignore */
    }
  }

  jump() {
    this.beep(420, 0.07, "square", 0.06);
    this.beep(640, 0.05, "square", 0.045);
  }

  orb() {
    this.beep(720, 0.06, "triangle", 0.07);
    this.beep(980, 0.08, "triangle", 0.055);
  }

  pad() {
    this.beep(280, 0.1, "sawtooth", 0.05);
  }

  die() {
    this.beep(180, 0.18, "sawtooth", 0.08);
    this.beep(90, 0.25, "square", 0.07);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.beep(f, 0.12, "triangle", 0.07), i * 90);
    });
  }

  portal() {
    this.beep(300, 0.12, "sine", 0.06);
    this.beep(500, 0.14, "sine", 0.05);
  }

  startBed() {
    this._wantBed = true;
    const ctx = this.ensure();
    if (!ctx || this.musicMuted || this._bedPlaying) return;
    if (ctx.state !== "running") return;

    this._bedPlaying = true;
    // Build/play asynchronously so the game loop never blocks on audio render.
    this._startLoopBed(ctx).catch(() => {
      this._bedPlaying = false;
    });
  }

  async _startLoopBed(ctx) {
    if (!this._bedPlaying || this.musicMuted) return;
    const key = `${this._worldId}:${this._bpm}`;
    if (!this._loopBuf || this._loopKey !== key) {
      this._loopBuf = this._renderLoop(this._bpm, this._worldId);
      this._loopKey = key;
    }
    if (!this._bedPlaying || this.musicMuted || !this._loopBuf) return;

    // Stop previous nodes if any
    for (const n of this._bedNodes) {
      try {
        if (typeof n.stop === "function") n.stop();
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this._bedNodes = [];

    const master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);

    const src = ctx.createBufferSource();
    src.buffer = this._loopBuf;
    src.loop = true;
    src.connect(master);
    src.start();

    this._bedNodes = [master, src];
  }

  /**
   * One short loop, rendered synchronously into a buffer — then played with a
   * single looping BufferSource (no setTimeout note scheduler = no mobile jank).
   */
  _renderLoop(bpm, worldId) {
    const ctx = this.ensure();
    if (!ctx) return null;
    // Must match AudioContext sampleRate on picky mobile browsers (Samsung).
    const sr = ctx.sampleRate || 44100;
    const beat = 60 / Math.max(80, Math.min(200, bpm || 128));
    const bars = 1; // short loop — cheap to build, one BufferSource forever
    const beats = bars * 4;
    const len = Math.max(1, Math.floor(sr * beat * beats));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const id = Math.max(0, Math.min(9, worldId | 0));
    const root = [98, 110, 116, 123, 130, 138, 146, 155, 164, 174][id];

    const writeTone = (startSec, freq, dur, amp, type) => {
      const n0 = Math.floor(startSec * sr);
      const n1 = Math.min(len, Math.floor((startSec + dur) * sr));
      for (let i = n0; i < n1; i++) {
        const t = (i - n0) / sr;
        const env = Math.exp(-t * (type === "kick" ? 18 : 12));
        let s;
        if (type === "kick") {
          const f = freq * Math.exp(-t * 10);
          s = Math.sin(2 * Math.PI * f * t);
        } else if (type === "hat") {
          s = (Math.random() * 2 - 1) * Math.exp(-t * 70);
        } else {
          s = Math.sin(2 * Math.PI * freq * t);
        }
        data[i] += s * amp * env;
      }
    };

    for (let b = 0; b < beats; b++) {
      const t = b * beat;
      writeTone(t, 140, 0.18, 0.95, "kick");
      if (b % 2 === 1) writeTone(t, 200, 0.12, 0.35, "bass");
      writeTone(t + beat * 0.5, 8000, 0.04, 0.22, "hat");
      if (b % 4 === 0) writeTone(t, root * 2, 0.16, 0.18, "lead");
    }

    // Soft clip
    for (let i = 0; i < len; i++) {
      const x = data[i];
      data[i] = Math.max(-1, Math.min(1, x * 0.7));
    }
    return buf;
  }

  stopBed() {
    this._wantBed = false;
    this._haltBed(true);
  }

  /** @param {boolean} clearWant */
  _haltBed(clearWant) {
    if (clearWant) this._wantBed = false;
    this._bedPlaying = false;
    for (const n of this._bedNodes) {
      try {
        if (typeof n.stop === "function") n.stop();
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this._bedNodes = [];
  }
}
