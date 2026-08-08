import { CONFIG, COLORS } from "./config.js";
import { createLevel } from "./level.js";
import { AudioBus } from "./audio.js";

const STORAGE_ATTEMPTS = "neon-dash-attempts";
const STORAGE_BEST = "neon-dash-best";
const STORAGE_BEST_SECTION = "neon-dash-best-section";

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onHud?: Function, onDeath?: Function, onComplete?: Function, onPause?: Function, onCheckpoint?: Function }} hooks
   */
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hooks = hooks;
    this.audio = new AudioBus();

    this.state = "menu"; // menu | playing | paused | dead | complete
    this.practice = false;
    this.attempt = Number(localStorage.getItem(STORAGE_ATTEMPTS) || 0);
    this.best = Number(localStorage.getItem(STORAGE_BEST) || 0);
    this.bestSection = Number(localStorage.getItem(STORAGE_BEST_SECTION) || 0);

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = 1;
    this.offsetY = 0;

    this.particles = [];
    this.cameraX = 0;
    this.held = false;
    this.orbBuffer = false;
    this._prevWorldY = 0;

    this.level = createLevel();
    this.checkpointIndex = -1;
    this.activeCheckpoint = null;
    this.sectionIndex = 0;
    this.sectionName = this.level.sections[0]?.name || "Warm-up";
    this.speedMul = 1;

    this.resetPlayer(true);

    this._last = 0;
    this._raf = 0;
    this._shake = 0;
    this._flash = 0;
    this._bgPulse = 0;
    this._checkpointFlash = 0;

    this._bindResize = () => this.resize();
    window.addEventListener("resize", this._bindResize);
    this.resize();
  }

  resize() {
    const { WIDTH, HEIGHT } = CONFIG;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.scale = Math.min(vw / WIDTH, vh / HEIGHT);
    const cssW = WIDTH * this.scale;
    const cssH = HEIGHT * this.scale;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.style.left = `${(vw - cssW) / 2}px`;
    this.canvas.style.top = `${(vh - cssH) / 2}px`;
    this.canvas.width = Math.floor(WIDTH * this.dpr);
    this.canvas.height = Math.floor(HEIGHT * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start(practice = false) {
    this.practice = practice;
    this.attempt += 1;
    localStorage.setItem(STORAGE_ATTEMPTS, String(this.attempt));
    this.level = createLevel();
    this.checkpointIndex = -1;
    this.activeCheckpoint = null;
    this.sectionIndex = 0;
    this.sectionName = this.level.sections[0]?.name || "Warm-up";
    this.speedMul = this.level.sections[0]?.speed || 1;
    this.clearObjectFlags();
    this.resetPlayer(false);
    this.state = "playing";
    this.audio.ensure();
    this.audio.startBed();
    this.hooks.onHud?.(this.hudPayload());
    this._kickLoop();
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.audio.startBed();
    this._kickLoop();
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.audio.stopBed();
    this.hooks.onPause?.();
  }

  goMenu() {
    this.state = "menu";
    this.audio.stopBed();
    this.resetPlayer(true);
  }

  clearObjectFlags() {
    for (const o of this.level.objects) {
      o._used = false;
      o._activated = false;
    }
  }

  resetObjectFlagsAfter(worldX) {
    for (const o of this.level.objects) {
      if (o.x >= worldX - 10) {
        o._used = false;
      }
    }
  }

  resetPlayer(soft, atCheckpoint = null) {
    const spawnWorldX = atCheckpoint
      ? atCheckpoint.x + CONFIG.CHECKPOINT_RESPAWN_OFFSET
      : CONFIG.PLAYER_X;

    this.speedMul = atCheckpoint?.speed || this.level.sections[0]?.speed || 1;
    if (atCheckpoint) {
      this.sectionIndex = atCheckpoint.section;
      this.sectionName = atCheckpoint.label || `Sezione ${atCheckpoint.section}`;
    } else if (!soft) {
      this.sectionIndex = this.level.sections[0]?.index || 1;
      this.sectionName = this.level.sections[0]?.name || "Warm-up";
    }

    this.player = {
      x: CONFIG.PLAYER_X,
      y: CONFIG.GROUND_Y - CONFIG.PLAYER_SIZE,
      vx: CONFIG.SPEED * this.speedMul,
      vy: 0,
      w: CONFIG.PLAYER_SIZE,
      h: CONFIG.PLAYER_SIZE,
      onGround: true,
      mode: "cube",
      rotation: 0,
      alive: true,
      worldX: spawnWorldX,
    };
    this.cameraX = Math.max(0, spawnWorldX - CONFIG.PLAYER_X);
    this.particles = [];
    this.held = false;
    this.orbBuffer = false;
    this.coyote = CONFIG.COYOTE_TIME;
    this.jumpBuffer = 0;
    this._shake = 0;
    this._flash = 0;
    this.progress = clamp(spawnWorldX / this.level.length, 0, 1);
    this._prevWorldY = this.player.y;
    if (!soft) this.hooks.onHud?.(this.hudPayload());
  }

  hudPayload() {
    return {
      attempt: this.attempt,
      progress: Math.floor(this.progress * 100),
      best: Math.floor(this.best * 100),
      practice: this.practice,
      section: this.sectionIndex,
      sectionName: this.sectionName,
      sectionTotal: this.level.sections.length,
      checkpoint: Math.max(0, this.checkpointIndex + 1),
      bestSection: this.bestSection,
    };
  }

  press() {
    if (this.state !== "playing") return;
    this.held = true;
    this.orbBuffer = true;
    this.jumpBuffer = CONFIG.JUMP_BUFFER;
    this.tryJump();
  }

  release() {
    this.held = false;
  }

  tryJump() {
    const p = this.player;
    if (!p.alive) return;

    if (p.mode === "ship") {
      return;
    }

    if (p.onGround || this.coyote > 0) {
      p.vy = CONFIG.JUMP_VELOCITY;
      p.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.audio.jump();
      this.burst(p.x + p.w / 2, p.y + p.h, 8, COLORS.player);
      return true;
    }

    if (this.orbBuffer) {
      const orb = this.findTouching("orb");
      if (orb) {
        p.vy = CONFIG.ORB_VELOCITY;
        p.onGround = false;
        this.orbBuffer = false;
        this.jumpBuffer = 0;
        orb._used = true;
        this.audio.orb();
        this.burst(orb.x + orb.w / 2, orb.y + orb.h / 2, 14, COLORS.orb);
        return true;
      }
    }
    return false;
  }

  findTouching(type) {
    const box = inflate(this.playerWorldBox(), 10);
    for (const o of this.level.objects) {
      if (o.type !== type || o._used) continue;
      if (aabb(box, o)) return o;
    }
    return null;
  }

  playerWorldBox() {
    const p = this.player;
    return { x: p.worldX, y: p.y, w: p.w, h: p.h };
  }

  _kickLoop() {
    cancelAnimationFrame(this._raf);
    this._last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - this._last) / 1000);
      this._last = now;
      if (this.state === "playing") this.update(dt);
      this.draw();
      if (
        this.state === "playing" ||
        this.state === "dead" ||
        this.state === "complete" ||
        this.state === "paused" ||
        this.state === "menu"
      ) {
        this._raf = requestAnimationFrame(tick);
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  startAttract() {
    this.state = "menu";
    this._kickLoop();
  }

  update(dt) {
    const p = this.player;
    this._bgPulse += dt;

    p.vx = CONFIG.SPEED * this.speedMul;
    p.worldX += p.vx * dt;
    this.cameraX = p.worldX - CONFIG.PLAYER_X;
    p.x = CONFIG.PLAYER_X;

    if (p.mode === "ship") {
      const gravity = CONFIG.SHIP_GRAVITY;
      p.vy += gravity * dt;
      if (this.held) p.vy += CONFIG.SHIP_THRUST * dt;
      p.vy = clamp(p.vy, -CONFIG.MAX_FALL, CONFIG.MAX_FALL);
    } else {
      p.vy += CONFIG.GRAVITY * dt;
      if (p.vy > CONFIG.MAX_FALL) p.vy = CONFIG.MAX_FALL;
    }

    this._prevWorldY = p.y;
    p.y += p.vy * dt;

    p.onGround = false;
    if (p.y + p.h >= CONFIG.GROUND_Y) {
      p.y = CONFIG.GROUND_Y - p.h;
      p.vy = 0;
      p.onGround = true;
      this.coyote = CONFIG.COYOTE_TIME;
      if (p.mode === "cube") {
        p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
      }
    } else if (p.mode === "cube") {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    if (p.y < 40) {
      p.y = 40;
      if (p.vy < 0) p.vy = 0;
    }

    if (p.mode === "cube" && !p.onGround) {
      p.rotation += CONFIG.ROTATION_SPEED * dt;
    } else if (p.mode === "ship") {
      p.rotation = clamp(p.vy / 1400, -0.7, 0.7);
    }

    this.resolveObjects();

    if (this.jumpBuffer > 0) {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (p.mode === "cube" && this.tryJump()) {
        /* consumed */
      }
    }

    this.updateParticles(dt);

    this.progress = clamp(p.worldX / this.level.length, 0, 1);
    if (this.progress > this.best) {
      this.best = this.progress;
      localStorage.setItem(STORAGE_BEST, String(this.best));
    }
    this.hooks.onHud?.(this.hudPayload());

    if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 3);
    if (this._flash > 0) this._flash = Math.max(0, this._flash - dt * 3);
    if (this._checkpointFlash > 0) this._checkpointFlash = Math.max(0, this._checkpointFlash - dt);

    if (Math.random() < 0.6) {
      this.particles.push({
        x: p.x + 4,
        y: p.y + p.h * (0.3 + Math.random() * 0.4),
        vx: -80 - Math.random() * 60,
        vy: (Math.random() - 0.5) * 40,
        life: 0.35 + Math.random() * 0.2,
        max: 0.55,
        size: 3 + Math.random() * 3,
        color: p.mode === "ship" ? COLORS.playerShip : COLORS.particle,
      });
    }
  }

  activateCheckpoint(cp, index) {
    if (index <= this.checkpointIndex) return;
    this.checkpointIndex = index;
    this.activeCheckpoint = cp;
    cp._activated = true;
    this.sectionIndex = cp.section;
    this.sectionName = cp.label || `Sezione ${cp.section}`;
    this.speedMul = cp.speed || this.speedMul;
    this.player.vx = CONFIG.SPEED * this.speedMul;
    this._checkpointFlash = 0.7;
    this.audio.portal();
    this.burst(cp.x - this.cameraX + cp.w / 2, cp.y + cp.h / 2, 16, COLORS.checkpointActive);

    if (cp.section > this.bestSection) {
      this.bestSection = cp.section;
      localStorage.setItem(STORAGE_BEST_SECTION, String(this.bestSection));
    }
    this.hooks.onCheckpoint?.(this.hudPayload());
    this.hooks.onHud?.(this.hudPayload());
  }

  resolveObjects() {
    const p = this.player;
    const box = this.playerWorldBox();

    for (const o of this.level.objects) {
      if (o._used) continue;
      if (!nearCamera(o, this.cameraX)) continue;

      if (o.type === "checkpoint" && aabb(box, o)) {
        const idx = this.level.checkpoints.indexOf(o);
        if (idx >= 0) this.activateCheckpoint(o, idx);
        continue;
      }

      if (o.type === "spike" && aabb(box, inflate(o, CONFIG.SPIKE_HITBOX_PAD))) {
        this.die();
        return;
      }

      if (o.type === "block") {
        const blockBox = { x: box.x + 4, y: box.y, w: box.w - 8, h: box.h };
        if (!aabb(blockBox, o)) continue;
        const fromTop = this._prevWorldY + p.h <= o.y + 16 && p.vy >= -60;
        if (fromTop) {
          p.y = o.y - p.h;
          p.vy = 0;
          p.onGround = true;
          this.coyote = CONFIG.COYOTE_TIME;
          if (p.mode === "cube") {
            p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
          }
        } else if (p.mode === "ship") {
          this.die();
          return;
        } else {
          const overlapX = Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x);
          if (overlapX > 12) {
            this.die();
            return;
          }
        }
      }

      if (o.type === "pad" && aabb(box, o) && p.vy >= -20) {
        p.vy = CONFIG.PAD_VELOCITY;
        p.onGround = false;
        this.audio.pad();
        this.burst(o.x + o.w / 2, o.y, 12, COLORS.pad);
      }

      if (o.type === "portal" && aabb(box, o) && p.mode !== o.mode) {
        p.mode = o.mode;
        this.audio.portal();
        this._flash = 0.35;
        this.burst(
          o.x + o.w / 2,
          o.y + o.h / 2,
          20,
          o.mode === "ship" ? COLORS.portalShip : COLORS.portalCube
        );
      }

      if (o.type === "finish" && box.x + box.w >= o.x) {
        this.complete();
        return;
      }
    }

    if (this.orbBuffer && p.mode === "cube" && !p.onGround) {
      const orb = this.findTouching("orb");
      if (orb) {
        p.vy = CONFIG.ORB_VELOCITY;
        this.orbBuffer = false;
        orb._used = true;
        this.audio.orb();
        this.burst(orb.x + orb.w / 2, orb.y + orb.h / 2, 14, COLORS.orb);
      }
    }
  }

  die() {
    if (this.state !== "playing") return;
    this.state = "dead";
    this.player.alive = false;
    this.audio.die();
    this.audio.stopBed();
    this._shake = 0.45;
    this._flash = 0.5;
    this.burst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 28, COLORS.spike);

    const delay = this.practice ? 350 : 650;
    setTimeout(() => {
      if (this.state !== "dead") return;
      this.attempt += 1;
      localStorage.setItem(STORAGE_ATTEMPTS, String(this.attempt));
      // Respawn at last checkpoint — keep the continuous course
      const cp = this.activeCheckpoint;
      if (cp) {
        this.resetObjectFlagsAfter(cp.x);
        this.resetPlayer(false, cp);
      } else {
        this.clearObjectFlags();
        this.checkpointIndex = -1;
        this.activeCheckpoint = null;
        this.resetPlayer(false);
      }
      this.state = "playing";
      this.audio.startBed();
      this.hooks.onDeath?.(this.hudPayload());
    }, delay);
  }

  complete() {
    if (this.state !== "playing") return;
    this.state = "complete";
    this.progress = 1;
    this.best = 1;
    this.bestSection = this.level.sections.length;
    localStorage.setItem(STORAGE_BEST, "1");
    localStorage.setItem(STORAGE_BEST_SECTION, String(this.bestSection));
    this.audio.win();
    this.audio.stopBed();
    this._flash = 0.6;
    this.hooks.onComplete?.({
      attempt: this.attempt,
      best: 100,
      sections: this.level.sections.length,
    });
    this.hooks.onHud?.(this.hudPayload());
  }

  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 280;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.45,
        max: 0.85,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw() {
    const ctx = this.ctx;
    const { WIDTH, HEIGHT, GROUND_Y } = CONFIG;
    const shakeX = (Math.random() - 0.5) * this._shake * 24;
    const shakeY = (Math.random() - 0.5) * this._shake * 18;

    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.translate(shakeX, shakeY);

    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, COLORS.skyTop);
    g.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    this.drawParallax(ctx);

    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.strokeStyle = COLORS.groundLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.clip();
    ctx.strokeStyle = "rgba(57,240,192,0.08)";
    ctx.lineWidth = 1;
    const scroll = -((this.cameraX * 0.8) % 48);
    for (let x = scroll; x < WIDTH + 48; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x - 40, HEIGHT);
      ctx.stroke();
    }
    ctx.restore();

    for (const o of this.level.objects) {
      if (!nearCamera(o, this.cameraX, 80)) continue;
      const sx = o.x - this.cameraX;
      this.drawObject(ctx, o, sx);
    }

    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (this.player.alive || this.state === "dead") {
      this.drawPlayer(ctx);
    }

    if (this._flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this._flash * 0.35})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (this._checkpointFlash > 0) {
      ctx.fillStyle = `rgba(57,240,192,${this._checkpointFlash * 0.18})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.font = "700 28px Orbitron, sans-serif";
      ctx.fillStyle = `rgba(232,244,255,${clamp(this._checkpointFlash * 1.4, 0, 1)})`;
      ctx.textAlign = "center";
      ctx.fillText(`${this.sectionName.toUpperCase()}`, WIDTH / 2, 120);
      ctx.font = "600 16px Rajdhani, sans-serif";
      ctx.fillStyle = `rgba(126,231,255,${clamp(this._checkpointFlash * 1.2, 0, 1)})`;
      ctx.fillText(`CHECKPOINT ${this.sectionIndex}/${this.level.sections.length}`, WIDTH / 2, 150);
    }

    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let y = 0; y < HEIGHT; y += 4) {
      ctx.fillRect(0, y, WIDTH, 1);
    }

    ctx.restore();
  }

  drawParallax(ctx) {
    const { WIDTH, HEIGHT } = CONFIG;
    const t = this._bgPulse;
    const layers = [
      { speed: 0.15, alpha: 0.08, gap: 90 },
      { speed: 0.35, alpha: 0.12, gap: 70 },
    ];
    for (const layer of layers) {
      const off = -((this.cameraX * layer.speed) % layer.gap);
      ctx.strokeStyle = `rgba(126, 231, 255, ${layer.alpha})`;
      ctx.lineWidth = 1;
      for (let x = off; x < WIDTH; x += layer.gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }
      for (let y = 40; y < CONFIG.GROUND_Y; y += layer.gap) {
        const wave = Math.sin(t * 1.5 + y * 0.02) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y + wave);
        ctx.lineTo(WIDTH, y + wave);
        ctx.stroke();
      }
    }

    ctx.save();
    for (let i = 0; i < 6; i++) {
      const x = ((i * 210 - this.cameraX * 0.2) % (WIDTH + 100) + WIDTH + 100) % (WIDTH + 100) - 50;
      const y = 100 + (i % 3) * 70 + Math.sin(t + i) * 8;
      ctx.strokeStyle = "rgba(57,240,192,0.15)";
      ctx.strokeRect(x, y, 28, 28);
    }
    ctx.restore();
  }

  drawObject(ctx, o, sx) {
    if (o.type === "block") {
      ctx.fillStyle = COLORS.block;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.strokeStyle = COLORS.blockEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, o.y + 1, o.w - 2, o.h - 2);
      ctx.fillStyle = "rgba(126,231,255,0.12)";
      ctx.fillRect(sx + 4, o.y + 4, o.w * 0.35, 6);
    } else if (o.type === "spike") {
      ctx.fillStyle = COLORS.spike;
      ctx.beginPath();
      ctx.moveTo(sx, o.y + o.h);
      ctx.lineTo(sx + o.w / 2, o.y);
      ctx.lineTo(sx + o.w, o.y + o.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.stroke();
    } else if (o.type === "pad") {
      ctx.fillStyle = COLORS.pad;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(sx + 4, o.y + 2, o.w - 8, 3);
    } else if (o.type === "orb") {
      const pulse = 1 + Math.sin(performance.now() / 120) * 0.08;
      const r = (o.w / 2) * pulse;
      const cx = sx + o.w / 2;
      const cy = o.y + o.h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.orb;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff6b0";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(20,20,20,0.35)";
      ctx.stroke();
    } else if (o.type === "portal") {
      const color = o.mode === "ship" ? COLORS.portalShip : COLORS.portalCube;
      const grad = ctx.createLinearGradient(sx, o.y, sx + o.w, o.y + o.h);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, o.y, o.w, o.h);
    } else if (o.type === "checkpoint") {
      const active = o._activated;
      const color = active ? COLORS.checkpointActive : COLORS.checkpoint;
      const pulse = active ? 1 : 1 + Math.sin(performance.now() / 200) * 0.06;
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(sx + o.w * 0.35, o.y, o.w * 0.3, o.h);
      ctx.beginPath();
      ctx.moveTo(sx + o.w * 0.55, o.y + 8);
      ctx.lineTo(sx + o.w * 0.55 + 34 * pulse, o.y + 22);
      ctx.lineTo(sx + o.w * 0.55, o.y + 36);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(sx + o.w / 2, o.y + 18, 16 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (o.type === "finish") {
      const stripe = 14;
      for (let i = 0; i < o.h; i += stripe) {
        ctx.fillStyle = i % (stripe * 2) === 0 ? "#fff" : "#111";
        ctx.fillRect(sx, o.y + i, o.w, stripe);
      }
    } else if (o.type === "deco") {
      ctx.strokeStyle = "rgba(255,216,74,0.25)";
      ctx.strokeRect(sx, o.y, o.w, o.h);
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rotation);
    if (p.mode === "ship") {
      ctx.fillStyle = COLORS.playerShip;
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.45, p.h * 0.35);
      ctx.lineTo(p.w * 0.5, 0);
      ctx.lineTo(-p.w * 0.45, -p.h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-p.w * 0.2, -6, 12, 12);
    } else {
      ctx.fillStyle = COLORS.player;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 3;
      ctx.strokeRect(-p.w / 2 + 2, -p.h / 2 + 2, p.w - 4, p.h - 4);
      ctx.fillStyle = "rgba(4,16,24,0.35)";
      ctx.fillRect(-6, -6, 12, 12);
    }
    ctx.restore();
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inflate(o, pad) {
  return { x: o.x - pad, y: o.y - pad, w: o.w + pad * 2, h: o.h + pad * 2 };
}

function nearCamera(o, cameraX, margin = 40) {
  const sx = o.x - cameraX;
  return sx + (o.w || 40) > -margin && sx < CONFIG.WIDTH + margin;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
