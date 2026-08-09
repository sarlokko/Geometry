import { CONFIG } from "./config.js?v=20260809c";
import { WORLDS, createWorldLevel, clampWorld } from "./worlds.js?v=20260809c";
import { AudioBus } from "./audio.js?v=20260809c";

const STORAGE_UNLOCK = "neon-dash-unlock";
const STORAGE_BEST_PREFIX = "neon-dash-best-w";

const FLY_MODES = new Set(["ship", "ufo", "wave", "ball"]);

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onHud?: Function, onDeath?: Function, onComplete?: Function, onPause?: Function }} hooks
   */
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hooks = hooks;
    this.audio = new AudioBus();

    this.state = "menu";
    this.worldId = 0;
    this.attempt = 0;
    this.unlocked = Number(localStorage.getItem(STORAGE_UNLOCK) || 0);
    if (!Number.isFinite(this.unlocked)) this.unlocked = 0;
    this.unlocked = clampWorld(this.unlocked);

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = 1;

    this.particles = [];
    this.cameraX = 0;
    this.held = false;
    this.orbBuffer = false;
    this._prevWorldY = 0;
    this._padLock = 0;

    this.colors = { ...WORLDS[0].colors };
    this.level = createWorldLevel(0);
    this.best = this.loadBest(0);
    this.resetPlayer(true);

    this._last = 0;
    this._raf = 0;
    this._shake = 0;
    this._flash = 0;
    this._bgPulse = 0;

    this._bindResize = () => this.resize();
    window.addEventListener("resize", this._bindResize);
    this.resize();
  }

  loadBest(worldId) {
    return Number(localStorage.getItem(STORAGE_BEST_PREFIX + worldId) || 0);
  }

  saveBest(worldId, value) {
    localStorage.setItem(STORAGE_BEST_PREFIX + worldId, String(value));
  }

  getUnlocked() {
    return this.unlocked;
  }

  setUnlocked(worldId) {
    this.unlocked = clampWorld(worldId);
    localStorage.setItem(STORAGE_UNLOCK, String(this.unlocked));
  }

  getWorldMeta(worldId = this.worldId) {
    return WORLDS[clampWorld(worldId)];
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

  /** @param {number} worldId */
  start(worldId = this.worldId) {
    this.worldId = clampWorld(worldId);
    if (this.worldId > this.unlocked) this.worldId = this.unlocked;

    // Fresh counter for every run / every level
    this.attempt = 1;
    this.level = createWorldLevel(this.worldId);
    this.colors = { ...this.level.world.colors };
    this.best = this.loadBest(this.worldId);
    this.resetPlayer(false);
    this.state = "playing";
    this.audio.ensure();
    // Restart bed every run so groove starts on beat 1 with this world's BPM
    this.audio.setTrack({
      bpm: this.level.world.bpm,
      worldId: this.worldId,
      forceRestart: true,
    });
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

  resetPlayer(soft) {
    const world = this.level?.world ?? WORLDS[0];
    const scale = world.sizeScale || 1;
    const mode = world.startMode || "cube";
    const size =
      mode === "ball" ? CONFIG.BALL_SIZE : Math.round(CONFIG.PLAYER_SIZE * scale);

    let y = CONFIG.GROUND_Y - size;
    let vy = 0;
    if (mode === "ship" || mode === "ufo" || mode === "wave") {
      y = CONFIG.GROUND_Y * 0.45;
    } else if (mode === "ball") {
      // Start above the first pad with a clean arc (must not smack the ceiling)
      y = CONFIG.GROUND_Y - 170;
      vy = CONFIG.BALL_BOUNCE;
    }

    this.player = {
      x: CONFIG.PLAYER_X,
      y,
      vx: world.speed ?? CONFIG.SPEED,
      vy,
      w: size,
      h: size,
      onGround: mode === "cube",
      mode,
      gravityDir: 1,
      rotation: 0,
      alive: true,
      worldX: CONFIG.PLAYER_X,
      sizeScale: scale,
    };
    this.cameraX = 0;
    this.particles = [];
    this.held = false;
    this.orbBuffer = false;
    this.coyote = CONFIG.COYOTE_TIME;
    this.jumpBuffer = 0;
    this._padLock = 0;
    this._ballTapLock = 0;
    this._shake = 0;
    this._flash = 0;
    this.progress = 0;
    this._prevWorldY = this.player.y;
    if (!soft) this.hooks.onHud?.(this.hudPayload());
  }

  hudPayload() {
    const world = this.level?.world ?? WORLDS[this.worldId];
    return {
      attempt: this.attempt,
      progress: Math.floor(this.progress * 100),
      best: Math.floor(this.best * 100),
      worldId: this.worldId,
      worldName: world.name,
      quirk: world.quirk,
      mode: this.player?.mode,
      bpm: world.bpm,
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

    if (p.mode === "ship" || p.mode === "wave") return;

    if (p.mode === "ufo") {
      p.vy = CONFIG.UFO_FLAP * p.gravityDir;
      p.onGround = false;
      this.jumpBuffer = 0;
      this.audio.jump();
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 6, this.colors.playerUfo);
      return true;
    }

    if (p.mode === "ball") {
      // Small tap boost (recovery) + orb launches
      if (this.orbBuffer) {
        const orb = this.findTouching("orb");
        if (orb) {
          p.vy = CONFIG.ORB_VELOCITY * p.gravityDir;
          this.orbBuffer = false;
          this.jumpBuffer = 0;
          orb._used = true;
          this.audio.orb();
          this.burst(orb.x + orb.w / 2, orb.y + orb.h / 2, 14, this.colors.orb);
          return true;
        }
      }
      if (!this._ballTapLock || this._ballTapLock <= 0) {
        // Only help while falling — keeps pad rhythm as the main mechanic
        if (p.vy > 80) {
          p.vy = Math.min(p.vy, 0) + CONFIG.BALL_TAP_BOOST;
          this._ballTapLock = 0.35;
          this.jumpBuffer = 0;
          this.audio.jump();
          this.burst(p.x + p.w / 2, p.y + p.h / 2, 5, this.colors.playerBall);
          return true;
        }
      }
      return false;
    }

    // cube
    if (p.onGround || this.coyote > 0) {
      p.vy = CONFIG.JUMP_VELOCITY * p.gravityDir;
      p.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.audio.jump();
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 8, this.colors.player);
      return true;
    }

    if (this.orbBuffer) {
      const orb = this.findTouching("orb");
      if (orb) {
        p.vy = CONFIG.ORB_VELOCITY * p.gravityDir;
        p.onGround = false;
        this.orbBuffer = false;
        this.jumpBuffer = 0;
        orb._used = true;
        this.audio.orb();
        this.burst(orb.x + orb.w / 2, orb.y + orb.h / 2, 14, this.colors.orb);
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
    const world = this.level.world;
    this._bgPulse += dt;
    if (this._padLock > 0) this._padLock = Math.max(0, this._padLock - dt);
    if (this._ballTapLock > 0) this._ballTapLock = Math.max(0, this._ballTapLock - dt);

    p.worldX += p.vx * dt;
    this.cameraX = p.worldX - CONFIG.PLAYER_X;
    p.x = CONFIG.PLAYER_X;

    this.applyPhysics(dt);

    this._prevWorldY = p.y;
    p.y += p.vy * dt;

    this.resolveBounds(world, dt);

    // Rotation / tilt
    if (p.mode === "cube" && !p.onGround) {
      p.rotation += CONFIG.ROTATION_SPEED * dt * p.gravityDir;
    } else if (p.mode === "ship" || p.mode === "ufo") {
      p.rotation = clamp(p.vy / 1400, -0.7, 0.7);
    } else if (p.mode === "wave") {
      p.rotation = this.held ? -0.7 * p.gravityDir : 0.7 * p.gravityDir;
    } else if (p.mode === "ball") {
      p.rotation += (p.vx / 80) * dt;
    }

    this.resolveObjects();

    if (this.jumpBuffer > 0) {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if ((p.mode === "cube" || p.mode === "ufo" || p.mode === "ball") && this.tryJump()) {
        /* consumed */
      }
    }

    this.updateParticles(dt);

    this.progress = clamp(p.worldX / this.level.length, 0, 1);
    if (this.progress > this.best) {
      this.best = this.progress;
      this.saveBest(this.worldId, this.best);
    }
    this.hooks.onHud?.(this.hudPayload());

    if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 3);
    if (this._flash > 0) this._flash = Math.max(0, this._flash - dt * 3);

    if (Math.random() < 0.55) {
      this.particles.push({
        x: p.x + 4,
        y: p.y + p.h * (0.3 + Math.random() * 0.4),
        vx: -80 - Math.random() * 60,
        vy: (Math.random() - 0.5) * 40,
        life: 0.35 + Math.random() * 0.2,
        max: 0.55,
        size: 3 + Math.random() * 3,
        color: modeColor(p.mode, this.colors),
      });
    }
  }

  applyPhysics(dt) {
    const p = this.player;
    const gDir = p.gravityDir;

    if (p.mode === "ship") {
      p.vy += CONFIG.SHIP_GRAVITY * gDir * dt;
      if (this.held) p.vy += CONFIG.SHIP_THRUST * gDir * dt;
      p.vy = clamp(p.vy, -CONFIG.MAX_FALL, CONFIG.MAX_FALL);
      return;
    }

    if (p.mode === "ufo") {
      p.vy += CONFIG.UFO_GRAVITY * gDir * dt;
      p.vy = clamp(p.vy, -CONFIG.MAX_FALL, CONFIG.MAX_FALL);
      return;
    }

    if (p.mode === "wave") {
      const dir = this.held ? -1 : 1;
      p.vy = CONFIG.WAVE_VY * dir * gDir;
      return;
    }

    // cube + ball
    p.vy += CONFIG.GRAVITY * gDir * dt;
    if (gDir === 1 && p.vy > CONFIG.MAX_FALL) p.vy = CONFIG.MAX_FALL;
    if (gDir === -1 && p.vy < -CONFIG.MAX_FALL) p.vy = -CONFIG.MAX_FALL;
  }

  resolveBounds(world, dt) {
    const p = this.player;
    const gDir = p.gravityDir;
    const lethalFloor = world.lethalGround || p.mode === "ball" || p.mode === "wave";
    const lethalCeil = world.lethalCeiling || p.mode === "wave";

    p.onGround = false;

    // Floor
    if (p.y + p.h >= CONFIG.GROUND_Y) {
      if (lethalFloor || (gDir === -1 && FLY_MODES.has(p.mode))) {
        p.y = CONFIG.GROUND_Y - p.h;
        this.die();
        return;
      }
      if (gDir === 1 && (p.mode === "cube" || p.mode === "ufo" || p.mode === "ship")) {
        p.y = CONFIG.GROUND_Y - p.h;
        p.vy = 0;
        p.onGround = true;
        this.coyote = CONFIG.COYOTE_TIME;
        if (p.mode === "cube") {
          p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }
      } else if (gDir === -1 && p.mode === "cube") {
        // Inverted: floor acts as ceiling clamp
        p.y = CONFIG.GROUND_Y - p.h;
        if (p.vy > 0) p.vy = 0;
      } else {
        p.y = CONFIG.GROUND_Y - p.h;
        this.die();
        return;
      }
    } else if (p.mode === "cube" && gDir === 1) {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    // Ceiling
    if (p.y <= CONFIG.CEILING_Y) {
      if (lethalCeil) {
        p.y = CONFIG.CEILING_Y;
        this.die();
        return;
      }
      if (gDir === -1 && p.mode === "cube") {
        p.y = CONFIG.CEILING_Y;
        p.vy = 0;
        p.onGround = true;
        this.coyote = CONFIG.COYOTE_TIME;
        p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
      } else if (p.mode === "ball") {
        // Soft ceiling clamp — only ceiling pads should reverse the bounce
        p.y = CONFIG.CEILING_Y;
        if (p.vy < 0) p.vy *= -0.25;
      } else {
        p.y = CONFIG.CEILING_Y;
        if (p.vy < 0) p.vy = 0;
      }
    } else if (p.mode === "cube" && gDir === -1 && !p.onGround) {
      this.coyote = Math.max(0, this.coyote - dt);
    }
  }

  resolveObjects() {
    if (this.state !== "playing") return;
    const p = this.player;
    const box = this.playerWorldBox();
    const C = this.colors;
    const gDir = p.gravityDir;

    for (const o of this.level.objects) {
      if (o._used) continue;
      if (!nearCamera(o, this.cameraX)) continue;

      if (o.type === "spike" && aabb(box, inflate(o, CONFIG.SPIKE_HITBOX_PAD))) {
        this.die();
        return;
      }

      if (o.type === "block") {
        const blockBox = { x: box.x + 4, y: box.y, w: box.w - 8, h: box.h };
        if (!aabb(blockBox, o)) continue;

        // Ball treats solid blocks as bounce surfaces (not instant death)
        if (p.mode === "ball") {
          const fromTop = this._prevWorldY + p.h <= o.y + 14 && p.vy >= 0;
          const fromBottom = this._prevWorldY >= o.y + o.h - 14 && p.vy <= 0;
          if (fromTop) {
            p.y = o.y - p.h;
            p.vy = CONFIG.BALL_BOUNCE;
            this._padLock = 0.1;
            this.audio.pad();
            this.burst(o.x + o.w / 2, o.y, 8, C.pad);
          } else if (fromBottom) {
            p.y = o.y + o.h;
            p.vy = -CONFIG.BALL_BOUNCE * 0.85;
            this._padLock = 0.1;
            this.audio.pad();
            this.burst(o.x + o.w / 2, o.y + o.h, 8, C.pad);
          } else {
            this.die();
            return;
          }
          continue;
        }

        if (p.mode === "wave") {
          this.die();
          return;
        }

        if (p.mode === "ship" || p.mode === "ufo") {
          this.die();
          return;
        }

        // cube landing relative to gravity
        if (gDir === 1) {
          const fromTop = this._prevWorldY + p.h <= o.y + 16 && p.vy >= -60;
          if (fromTop) {
            p.y = o.y - p.h;
            p.vy = 0;
            p.onGround = true;
            this.coyote = CONFIG.COYOTE_TIME;
            p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
          } else {
            const overlapX = Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x);
            if (overlapX > 12) {
              this.die();
              return;
            }
          }
        } else {
          const fromBottom = this._prevWorldY >= o.y + o.h - 16 && p.vy <= 60;
          if (fromBottom) {
            p.y = o.y + o.h;
            p.vy = 0;
            p.onGround = true;
            this.coyote = CONFIG.COYOTE_TIME;
            p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
          } else {
            const overlapX = Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x);
            if (overlapX > 12) {
              this.die();
              return;
            }
          }
        }
      }

      if (o.type === "pad" && this._padLock <= 0) {
        // Ball gets a slightly taller/wider pad catch window for fair bounces
        const padHit =
          p.mode === "ball" ? inflate(o, 14) : o;
        if (!aabb(box, padHit)) {
          /* miss */
        } else {
          const dir = o.dir || 1;
          // Only bounce when approaching the pad from the correct side
          const approaching = dir === 1 ? p.vy >= -20 : p.vy <= 20;
          if (approaching) {
            const strength = p.mode === "ball" ? CONFIG.BALL_BOUNCE : CONFIG.PAD_VELOCITY;
            p.vy = strength * dir;
            p.onGround = false;
            // Nudge off the pad so we don't immediately re-collide
            if (p.mode === "ball") {
              if (dir === 1) p.y = Math.min(p.y, o.y - p.h - 1);
              else p.y = Math.max(p.y, o.y + o.h + 1);
            }
            this._padLock = 0.14;
            this.audio.pad();
            this.burst(o.x + o.w / 2, o.y + o.h / 2, 12, C.pad);
          }
        }
      }

      if (o.type === "portal" && aabb(box, o)) {
        if (o.mode === "flip") {
          if (!o._used) {
            o._used = true;
            p.gravityDir *= -1;
            p.vy *= -0.35;
            p.onGround = false;
            this.audio.portal();
            this._flash = 0.35;
            this.burst(o.x + o.w / 2, o.y + o.h / 2, 20, C.portalFlip);
          }
        } else if (p.mode !== o.mode) {
          this.enterMode(o.mode);
          this.audio.portal();
          this._flash = 0.35;
          this.burst(o.x + o.w / 2, o.y + o.h / 2, 20, portalColor(o.mode, C));
        }
      }

      if (o.type === "finish" && box.x + box.w >= o.x) {
        this.complete();
        return;
      }
    }

    if (this.orbBuffer && (p.mode === "cube" || p.mode === "ball") && !p.onGround) {
      const orb = this.findTouching("orb");
      if (orb) {
        p.vy = CONFIG.ORB_VELOCITY * p.gravityDir;
        this.orbBuffer = false;
        orb._used = true;
        this.audio.orb();
        this.burst(orb.x + orb.w / 2, orb.y + orb.h / 2, 14, C.orb);
      }
    }
  }

  enterMode(mode) {
    const p = this.player;
    p.mode = mode;
    p.onGround = false;
    if (mode === "ball") {
      const size = CONFIG.BALL_SIZE;
      const cy = p.y + p.h / 2;
      p.w = size;
      p.h = size;
      p.y = cy - size / 2;
      if (p.vy > -200) p.vy = CONFIG.BALL_BOUNCE;
    } else if (mode === "cube") {
      const scale = this.level.world.sizeScale || 1;
      const size = Math.round(CONFIG.PLAYER_SIZE * scale);
      const cy = p.y + p.h / 2;
      p.w = size;
      p.h = size;
      p.y = cy - size / 2;
      p.sizeScale = scale;
    } else {
      const size = CONFIG.PLAYER_SIZE;
      const cy = p.y + p.h / 2;
      p.w = size;
      p.h = size;
      p.y = cy - size / 2;
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
    this.burst(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      28,
      this.colors.spike
    );

    setTimeout(() => {
      if (this.state !== "dead") return;
      this.attempt += 1;
      this.level = createWorldLevel(this.worldId);
      this.colors = { ...this.level.world.colors };
      this.resetPlayer(false);
      this.state = "playing";
      this.audio.setTrack({
        bpm: this.level.world.bpm,
        worldId: this.worldId,
        forceRestart: true,
      });
      this.audio.startBed();
      this.hooks.onDeath?.(this.hudPayload());
    }, 700);
  }

  complete() {
    if (this.state !== "playing") return;
    this.state = "complete";
    this.progress = 1;
    this.best = 1;
    this.saveBest(this.worldId, 1);

    const nextUnlock = Math.min(WORLDS.length - 1, this.worldId + 1);
    if (nextUnlock > this.unlocked) {
      this.unlocked = nextUnlock;
      localStorage.setItem(STORAGE_UNLOCK, String(this.unlocked));
    }

    this.audio.win();
    this.audio.stopBed();
    this._flash = 0.6;
    this.hooks.onComplete?.({
      attempt: this.attempt,
      best: 100,
      worldId: this.worldId,
      worldName: this.level.world.name,
      unlocked: this.unlocked,
      hasNext: this.worldId < WORLDS.length - 1,
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
    const C = this.colors;
    const world = this.level.world;
    const shakeX = (Math.random() - 0.5) * this._shake * 24;
    const shakeY = (Math.random() - 0.5) * this._shake * 18;

    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.translate(shakeX, shakeY);

    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(1, C.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    this.drawParallax(ctx);

    // Ground — danger tint when lethal
    ctx.fillStyle = world.lethalGround ? "#2a0a12" : C.ground;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.strokeStyle = world.lethalGround ? C.spike : C.groundLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(WIDTH, GROUND_Y);
    ctx.stroke();

    if (world.lethalCeiling) {
      ctx.fillStyle = "#2a0a12";
      ctx.fillRect(0, 0, WIDTH, CONFIG.CEILING_Y);
      ctx.strokeStyle = C.spike;
      ctx.beginPath();
      ctx.moveTo(0, CONFIG.CEILING_Y);
      ctx.lineTo(WIDTH, CONFIG.CEILING_Y);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.clip();
    ctx.strokeStyle = hexAlpha(world.lethalGround ? C.spike : C.groundLine, 0.1);
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
      this.drawObject(ctx, o, o.x - this.cameraX);
    }

    for (const part of this.particles) {
      ctx.globalAlpha = clamp(part.life / part.max, 0, 1);
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.size, part.size);
    }
    ctx.globalAlpha = 1;

    if (this.player.alive || this.state === "dead") {
      this.drawPlayer(ctx);
    }

    if (this._flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this._flash * 0.35})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
    const C = this.colors;
    const layers = [
      { speed: 0.15, alpha: 0.08, gap: 90 },
      { speed: 0.35, alpha: 0.12, gap: 70 },
    ];
    for (const layer of layers) {
      const off = -((this.cameraX * layer.speed) % layer.gap);
      ctx.strokeStyle = hexAlpha(C.blockEdge, layer.alpha);
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
      ctx.strokeStyle = hexAlpha(C.player, 0.15);
      ctx.strokeRect(x, y, 28, 28);
    }
    ctx.restore();
  }

  drawObject(ctx, o, sx) {
    const C = this.colors;
    if (o.type === "block") {
      ctx.fillStyle = C.block;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.strokeStyle = C.blockEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, o.y + 1, o.w - 2, o.h - 2);
      ctx.fillStyle = hexAlpha(C.blockEdge, 0.12);
      ctx.fillRect(sx + 4, o.y + 4, o.w * 0.35, 6);
    } else if (o.type === "spike") {
      ctx.fillStyle = C.spike;
      ctx.beginPath();
      if (o.dir === -1) {
        ctx.moveTo(sx, o.y);
        ctx.lineTo(sx + o.w / 2, o.y + o.h);
        ctx.lineTo(sx + o.w, o.y);
      } else {
        ctx.moveTo(sx, o.y + o.h);
        ctx.lineTo(sx + o.w / 2, o.y);
        ctx.lineTo(sx + o.w, o.y + o.h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.stroke();
    } else if (o.type === "pad") {
      ctx.fillStyle = C.pad;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      const ly = o.dir === -1 ? o.y + o.h - 5 : o.y + 2;
      ctx.fillRect(sx + 4, ly, o.w - 8, 3);
    } else if (o.type === "orb") {
      const pulse = 1 + Math.sin(performance.now() / 120) * 0.08;
      const r = (o.w / 2) * pulse;
      const cx = sx + o.w / 2;
      const cy = o.y + o.h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = C.orb;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff6b0";
      ctx.stroke();
    } else if (o.type === "portal") {
      const color = portalColor(o.mode, C);
      const grad = ctx.createLinearGradient(sx, o.y, sx + o.w, o.y + o.h);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, o.y, o.w, o.h);
      // mode glyph
      ctx.fillStyle = color;
      ctx.font = "bold 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(modeGlyph(o.mode), sx + o.w / 2, o.y - 6);
    } else if (o.type === "finish") {
      const stripe = 14;
      for (let i = 0; i < o.h; i += stripe) {
        ctx.fillStyle = i % (stripe * 2) === 0 ? "#fff" : "#111";
        ctx.fillRect(sx, o.y + i, o.w, stripe);
      }
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    const C = this.colors;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rotation);

    if (p.mode === "ship") {
      ctx.fillStyle = C.playerShip;
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.45, p.h * 0.35);
      ctx.lineTo(p.w * 0.5, 0);
      ctx.lineTo(-p.w * 0.45, -p.h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-p.w * 0.2, -6, 12, 12);
    } else if (p.mode === "ball") {
      ctx.fillStyle = C.playerBall;
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(p.w * 0.35, 0);
      ctx.strokeStyle = "rgba(20,10,0,0.35)";
      ctx.stroke();
    } else if (p.mode === "ufo") {
      ctx.fillStyle = C.playerUfo;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.w * 0.5, p.h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -p.h * 0.12, p.w * 0.22, Math.PI, 0);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
    } else if (p.mode === "wave") {
      ctx.fillStyle = C.playerWave;
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.45, p.h * 0.35);
      ctx.lineTo(p.w * 0.45, 0);
      ctx.lineTo(-p.w * 0.45, -p.h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.stroke();
    } else {
      // cube (possibly mini / inverted)
      ctx.fillStyle = C.player;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(2, 3 * (p.sizeScale || 1));
      ctx.strokeRect(-p.w / 2 + 2, -p.h / 2 + 2, p.w - 4, p.h - 4);
      ctx.fillStyle = "rgba(4,16,24,0.35)";
      const eye = Math.max(4, 12 * (p.sizeScale || 1));
      ctx.fillRect(-eye / 2, -eye / 2, eye, eye);
      if (p.gravityDir === -1) {
        ctx.strokeStyle = C.portalFlip;
        ctx.strokeRect(-p.w / 2 - 2, -p.h / 2 - 2, p.w + 4, p.h + 4);
      }
    }
    ctx.restore();
  }
}

function modeColor(mode, C) {
  if (mode === "ship") return C.playerShip;
  if (mode === "ball") return C.playerBall;
  if (mode === "ufo") return C.playerUfo;
  if (mode === "wave") return C.playerWave;
  return C.particle;
}

function portalColor(mode, C) {
  if (mode === "ship") return C.portalShip;
  if (mode === "ball") return C.portalBall;
  if (mode === "ufo") return C.portalUfo;
  if (mode === "wave") return C.portalWave;
  if (mode === "flip") return C.portalFlip;
  return C.portalCube;
}

function modeGlyph(mode) {
  if (mode === "ship") return "SHIP";
  if (mode === "ball") return "BALL";
  if (mode === "ufo") return "UFO";
  if (mode === "wave") return "WAVE";
  if (mode === "flip") return "FLIP";
  return "CUBE";
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

function hexAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(126,231,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
