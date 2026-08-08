/** Lightweight Web Audio SFX + looping pulse bed. */
export class AudioBus {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.muted = false;
    this._bedNodes = [];
    this._bedPlaying = false;
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
    master.gain.value = 0.03;
    master.connect(ctx.destination);

    const tempo = 140;
    const interval = 60 / tempo;

    const schedule = () => {
      if (!this._bedPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const when = t + i * interval;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const isKick = i % 2 === 0;
        osc.type = isKick ? "sine" : "square";
        osc.frequency.value = isKick ? 90 : 220 + (i % 4) * 40;
        g.gain.value = isKick ? 0.9 : 0.35;
        g.gain.exponentialRampToValueAtTime(0.0001, when + (isKick ? 0.12 : 0.06));
        osc.connect(g);
        g.connect(master);
        osc.start(when);
        osc.stop(when + 0.15);
      }
      this._bedTimer = window.setTimeout(schedule, interval * 8 * 1000);
    };

    this._bedPlaying = true;
    this._bedNodes = [master];
    schedule();
  }

  stopBed() {
    this._wantBed = false;
    this._bedPlaying = false;
    if (this._bedTimer) {
      clearTimeout(this._bedTimer);
      this._bedTimer = null;
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
}
