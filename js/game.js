import { CONFIG } from "./config.js?v=20260809q";
import {
  WORLDS,
  createWorldLevel,
  clampWorld,
  clampStage,
  STAGE_COUNT,
} from "./worlds.js?v=20260809q";
import { AudioBus } from "./audio.js?v=20260809q";

const STORAGE_UNLOCK = "neon-dash-unlock";
const STORAGE_STAGE_PREFIX = "neon-dash-stage-w";
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
    this.stage = 0;
    this.attempt = 0;
    this.unlocked = Number(localStorage.getItem(STORAGE_UNLOCK) || 0);
    if (!Number.isFinite(this.unlocked)) this.unlocked = 0;
    this.unlocked = clampWorld(this.unlocked);

    // Fold / hi-DPI phones: full DPR canvas + frequent resize storms will lock the UI.
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    this._mobile = coarse || "ontouchstart" in window;
    this.dpr = Math.min(window.devicePixelRatio || 1, this._mobile ? 1.25 : 2);
    this.scale = 1;

    this.particles = [];
    this.cameraX = 0;
    this.held = false;
    this.orbBuffer = false;
    this._prevWorldY = 0;
    this._padLock = 0;

    this.colors = { ...WORLDS[0].colors };
    this.level = createWorldLevel(0, 0);
    this.best = this.loadBest(0, 0);
    this.resetPlayer(true);

    this._last = 0;
    this._raf = 0;
    this._shake = 0;
    this._flash = 0;
    this._bgPulse = 0;
    this._resizeTimer = 0;
    this._lastCssW = 0;
    this._lastCssH = 0;

    this._bindResize = () => {
      // Samsung Fold fires resize/visualViewport often — debounce & skip no-ops.
      clearTimeout(this._resizeTimer);
      this._resizeTimer = window.setTimeout(() => this.resize(), 120);
    };
    window.addEventListener("resize", this._bindResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this._bindResize);
    }
    this.resize();
  }

  storageBestKey(worldId, stage) {
    return `${STORAGE_BEST_PREFIX}${worldId}-s${stage}`;
  }

  loadBest(worldId, stage = 0) {
    const key = this.storageBestKey(worldId, stage);
    const v = Number(localStorage.getItem(key) || 0);
    if (v) return v;
    // Migrate legacy single-best keys onto stage I
    if (stage === 0) {
      const legacy = Number(localStorage.getItem(STORAGE_BEST_PREFIX + worldId) || 0);
      return legacy || 0;
    }
    return 0;
  }

  saveBest(worldId, stage, value) {
    localStorage.setItem(this.storageBestKey(worldId, stage), String(value));
  }

  getUnlocked() {
    return this.unlocked;
  }

  /** Highest playable stage index for a world (0–2), or -1 if world locked. */
  getStageUnlocked(worldId) {
    worldId = clampWorld(worldId);
    if (worldId > this.unlocked) return -1;
    const raw = Number(localStorage.getItem(STORAGE_STAGE_PREFIX + worldId) || 0);
    return clampStage(Number.isFinite(raw) ? raw : 0);
  }

  setStageUnlocked(worldId, stage) {
    worldId = clampWorld(worldId);
    stage = clampStage(stage);
    const cur = this.getStageUnlocked(worldId);
    if (stage > cur) {
      localStorage.setItem(STORAGE_STAGE_PREFIX + worldId, String(stage));
    }
  }

  setUnlocked(worldId) {
    this.unlocked = clampWorld(worldId);
    localStorage.setItem(STORAGE_UNLOCK, String(this.unlocked));
    // Dev unlock: open all stages on unlocked worlds
    for (let i = 0; i <= this.unlocked; i++) {
      localStorage.setItem(STORAGE_STAGE_PREFIX + i, String(STAGE_COUNT - 1));
    }
  }

  getWorldMeta(worldId = this.worldId) {
    return WORLDS[clampWorld(worldId)];
  }

  resize() {
    const { WIDTH, HEIGHT } = CONFIG;
    const vv = window.visualViewport;
    const vw = Math.round(vv?.width || window.innerWidth);
    const vh = Math.round(vv?.height || window.innerHeight);
    this.scale = Math.min(vw / WIDTH, vh / HEIGHT);
    const cssW = Math.round(WIDTH * this.scale);
    const cssH = Math.round(HEIGHT * this.scale);
    if (cssW !== this._lastCssW || cssH !== this._lastCssH) {
      this._lastCssW = cssW;
      this._lastCssH = cssH;
      this.canvas.style.width = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
      this.canvas.style.left = `${Math.round((vw - cssW) / 2)}px`;
      this.canvas.style.top = `${Math.round((vh - cssH) / 2)}px`;
    }
    const bufW = Math.floor(WIDTH * this.dpr);
    const bufH = Math.floor(HEIGHT * this.dpr);
    // Recreating the canvas buffer clears it and is expensive — only when needed.
    if (this.canvas.width !== bufW || this.canvas.height !== bufH) {
      this.canvas.width = bufW;
      this.canvas.height = bufH;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** @param {number} worldId @param {number} [stage] */
  start(worldId = this.worldId, stage = this.stage) {
    this.worldId = clampWorld(worldId);
    if (this.worldId > this.unlocked) this.worldId = this.unlocked;
    this.stage = clampStage(stage);
    const maxStage = Math.max(0, this.getStageUnlocked(this.worldId));
    if (this.stage > maxStage) this.stage = maxStage;

    // Fresh counter for every run / every level
    this.attempt = 1;
    this.level = createWorldLevel(this.worldId, this.stage);
    this.colors = { ...this.level.world.colors };
    this.best = this.loadBest(this.worldId, this.stage);
    this.resetPlayer(false);
    this.state = "playing";
    this.audio.ensure();
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
      if (world.ballKind === "walls") {
        y = CONFIG.GROUND_Y - size;
        vy = 0;
      } else {
        y = CONFIG.GROUND_Y - 160;
        vy = CONFIG.BALL_BOUNCE;
      }
    }

    this.player = {
      x: CONFIG.PLAYER_X,
      y,
      vx: world.speed ?? CONFIG.SPEED,
      vy,
      w: size,
      h: size,
      onGround: mode === "cube" || (mode === "ball" && world.ballKind === "walls"),
      mode,
      gravityDir: 1,
      rotation: 0,
      alive: true,
      worldX: CONFIG.PLAYER_X,
      sizeScale: scale,
      ballKind: world.ballKind || "pads",
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
      stage: this.stage,
      worldName: world.displayName || world.name,
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
      const kind = p.ballKind || this.level?.world?.ballKind || "pads";
      if (kind === "walls") {
        if (!this._ballTapLock || this._ballTapLock <= 0) {
          p.gravityDir *= -1;
          p.onGround = false;
          p.vy = CONFIG.JUMP_VELOCITY * 0.22 * p.gravityDir;
          this._ballTapLock = 0.16;
          this.jumpBuffer = 0;
          this.audio.jump();
          this.burst(p.x + p.w / 2, p.y + p.h / 2, 8, this.colors.playerBall);
          return true;
        }
        return false;
      }
      // Yellow-orb ball: same as cube — tap while overlapping for an impulse (no teleport).
      return this.tryOrbBoost();
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

    return this.tryOrbBoost();
  }

  /** Geometry Dash–style yellow orb: impulse from current position on tap. */
  tryOrbBoost() {
    const p = this.player;
    if (!p?.alive || !this.orbBuffer) return false;
    const orb = this.findTouching("orb");
    if (!orb) return false;
    p.vy = CONFIG.ORB_VELOCITY * (orb.dir || p.gravityDir || 1);
    p.onGround = false;
    orb._used = true;
    this.orbBuffer = false;
    this.jumpBuffer = 0;
    this._padLock = 0.08;
    this.audio.orb();
    this.burst(orb.x + orb.w / 2, orb.y + orb.h / 2, 14, this.colors.orb);
    return true;
  }

  findTouching(type) {
    const pbox = this.playerWorldBox();
    for (const o of this.level.objects) {
      if (o.type !== type || o._used) continue;
      // Same generous-but-local hitbox for cube and ball orbs
      if (aabb(inflate(pbox, type === "orb" ? 16 : 10), o)) {
        return o;
      }
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

    if (this.held && p.mode === "cube" && (p.onGround || this.coyote > 0)) {
      this.tryJump();
    }

    this.updateParticles(dt);

    this.progress = clamp(p.worldX / this.level.length, 0, 1);
    if (this.progress > this.best) {
      this.best = this.progress;
      // localStorage every frame freezes some Android browsers — throttle.
      this._bestDirty = true;
    }
    this._hudAcc = (this._hudAcc || 0) + dt;
    if (this._hudAcc >= 0.1) {
      this._hudAcc = 0;
      if (this._bestDirty) {
        this._bestDirty = false;
        this.saveBest(this.worldId, this.stage, this.best);
      }
      this.hooks.onHud?.(this.hudPayload());
    }

    if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 3);
    if (this._flash > 0) this._flash = Math.max(0, this._flash - dt * 3);

    const trailChance = this._mobile ? 0.2 : 0.55;
    if (Math.random() < trailChance) {
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

    p.vy += CONFIG.GRAVITY * gDir * dt;
    if (gDir === 1 && p.vy > CONFIG.MAX_FALL) p.vy = CONFIG.MAX_FALL;
    if (gDir === -1 && p.vy < -CONFIG.MAX_FALL) p.vy = -CONFIG.MAX_FALL;
  }

  resolveBounds(world, dt) {
    const p = this.player;
    const gDir = p.gravityDir;
    const ballKind = p.ballKind || world.ballKind || "pads";
    const wallBall = p.mode === "ball" && ballKind === "walls";
    const padBall = p.mode === "ball" && ballKind !== "walls";
    const lethalFloor = world.lethalGround || padBall || p.mode === "wave";
    const lethalCeil = world.lethalCeiling || p.mode === "wave";

    p.onGround = false;

    if (p.y + p.h >= CONFIG.GROUND_Y) {
      if (lethalFloor || (gDir === -1 && FLY_MODES.has(p.mode) && !wallBall)) {
        p.y = CONFIG.GROUND_Y - p.h;
        this.die();
        return;
      }
      if (
        gDir === 1 &&
        (p.mode === "cube" || p.mode === "ufo" || p.mode === "ship" || wallBall)
      ) {
        p.y = CONFIG.GROUND_Y - p.h;
        p.vy = 0;
        p.onGround = true;
        this.coyote = CONFIG.COYOTE_TIME;
        if (p.mode === "cube") {
          p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }
      } else if (gDir === -1 && (p.mode === "cube" || wallBall)) {
        p.y = CONFIG.GROUND_Y - p.h;
        if (p.vy > 0) p.vy = 0;
      } else {
        p.y = CONFIG.GROUND_Y - p.h;
        this.die();
        return;
      }
    } else if ((p.mode === "cube" || wallBall) && gDir === 1) {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    if (p.y <= CONFIG.CEILING_Y) {
      if (lethalCeil) {
        p.y = CONFIG.CEILING_Y;
        this.die();
        return;
      }
      if (gDir === -1 && (p.mode === "cube" || wallBall)) {
        p.y = CONFIG.CEILING_Y;
        p.vy = 0;
        p.onGround = true;
        this.coyote = CONFIG.COYOTE_TIME;
        if (p.mode === "cube") {
          p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }
      } else if (padBall) {
        p.y = CONFIG.CEILING_Y;
        if (p.vy < 0) p.vy *= -0.25;
      } else {
        p.y = CONFIG.CEILING_Y;
        if (p.vy < 0) p.vy = 0;
      }
    } else if ((p.mode === "cube" || wallBall) && gDir === -1 && !p.onGround) {
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

      if (o.type === "spike" && hitsSpike(box, o)) {
        this.die();
        return;
      }

      if (o.type === "block") {
        const blockBox = { x: box.x + 4, y: box.y, w: box.w - 8, h: box.h };
        if (!aabb(blockBox, o)) continue;

        if (p.mode === "ball") {
          const kind = p.ballKind || this.level?.world?.ballKind || "pads";
          if (kind === "walls") {
            if (gDir === 1) {
              const fromTop = this._prevWorldY + p.h <= o.y + 16 && p.vy >= -60;
              if (fromTop) {
                p.y = o.y - p.h;
                p.vy = 0;
                p.onGround = true;
                this.coyote = CONFIG.COYOTE_TIME;
              } else if (
                Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x) >
                12
              ) {
                this.die();
                return;
              }
            } else {
              const fromBottom = this._prevWorldY >= o.y + o.h - 16 && p.vy <= 60;
              if (fromBottom) {
                p.y = o.y + o.h;
                p.vy = 0;
                p.onGround = true;
                this.coyote = CONFIG.COYOTE_TIME;
              } else if (
                Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x) >
                12
              ) {
                this.die();
                return;
              }
            }
            continue;
          }
          this.die();
          return;
        }

        if (p.mode === "wave" || p.mode === "ship" || p.mode === "ufo") {
          this.die();
          return;
        }

        if (gDir === 1) {
          const fromTop = this._prevWorldY + p.h <= o.y + 16 && p.vy >= -60;
          if (fromTop) {
            p.y = o.y - p.h;
            p.vy = 0;
            p.onGround = true;
            this.coyote = CONFIG.COYOTE_TIME;
            p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
          } else {
            const overlapX =
              Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x);
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
            const overlapX =
              Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x);
            if (overlapX > 12) {
              this.die();
              return;
            }
          }
        }
      }

      if (o.type === "pad" && this._padLock <= 0) {
        if (aabb(box, o)) {
          const dir = o.dir || 1;
          const approaching = dir === 1 ? p.vy >= -20 : p.vy <= 20;
          if (approaching && p.mode === "cube") {
            p.vy = CONFIG.PAD_VELOCITY * dir;
            p.onGround = false;
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
        } else if (p.mode !== o.mode || (o.ballKind && p.ballKind !== o.ballKind)) {
          this.enterMode(o.mode, o.ballKind);
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

    if (this.orbBuffer && !p.onGround && (p.mode === "cube" || (p.mode === "ball" && p.ballKind !== "walls"))) {
      this.tryOrbBoost();
    }
  }

  enterMode(mode, ballKind) {
    const p = this.player;
    p.mode = mode;
    p.onGround = false;
    if (mode === "ball") {
      const size = CONFIG.BALL_SIZE;
      p.w = size;
      p.h = size;
      p.ballKind = ballKind || this.level?.world?.ballKind || "pads";
      p.gravityDir = 1;
      if (p.ballKind === "walls") {
        p.y = clamp(p.y, CONFIG.CEILING_Y + 8, CONFIG.GROUND_Y - size);
        if (p.y + size >= CONFIG.GROUND_Y - 2) {
          p.y = CONFIG.GROUND_Y - size;
          p.onGround = true;
          p.vy = 0;
        } else {
          p.vy = Math.min(p.vy, 0);
        }
      } else {
        p.y = CONFIG.GROUND_Y - 160;
        p.vy = CONFIG.BALL_BOUNCE;
        this._padLock = 0.08;
      }
    } else if (mode === "cube") {
      const scale = this.level.world.sizeScale || 1;
      const size = Math.round(CONFIG.PLAYER_SIZE * scale);
      const cy = clamp(p.y + p.h / 2, CONFIG.CEILING_Y + size / 2, CONFIG.GROUND_Y - size / 2);
      p.w = size;
      p.h = size;
      p.y = cy - size / 2;
      p.sizeScale = scale;
      p.ballKind = null;
      p.gravityDir = 1;
      if (p.y + size >= CONFIG.GROUND_Y - 2) {
        p.y = CONFIG.GROUND_Y - size;
        p.onGround = true;
        p.vy = 0;
      }
    } else {
      const size = CONFIG.PLAYER_SIZE;
      const cy = clamp(p.y + p.h / 2, CONFIG.CEILING_Y + size / 2, CONFIG.GROUND_Y - size / 2);
      p.w = size;
      p.h = size;
      p.y = cy - size / 2;
      p.ballKind = null;
    }
  }

  die() {
    if (this.state !== "playing") return;
    this.state = "dead";
    this.player.alive = false;
    if (this._bestDirty) {
      this._bestDirty = false;
      this.saveBest(this.worldId, this.stage, this.best);
    }
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
      this.level = createWorldLevel(this.worldId, this.stage);
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
    this._bestDirty = false;
    this.saveBest(this.worldId, this.stage, 1);

    let unlockNote = "";
    let hasNext = false;
    let nextWorld = this.worldId;
    let nextStage = this.stage;

    if (this.stage < STAGE_COUNT - 1) {
      nextStage = this.stage + 1;
      this.setStageUnlocked(this.worldId, nextStage);
      hasNext = true;
      unlockNote = ` Stage ${["I", "II", "III"][nextStage]} sbloccato.`;
    } else {
      const nextUnlock = Math.min(WORLDS.length - 1, this.worldId + 1);
      if (nextUnlock > this.unlocked) {
        this.unlocked = nextUnlock;
        localStorage.setItem(STORAGE_UNLOCK, String(this.unlocked));
        this.setStageUnlocked(nextUnlock, 0);
        unlockNote = ` Mondo ${nextUnlock + 1} sbloccato.`;
      }
      hasNext = this.worldId < WORLDS.length - 1;
      nextWorld = Math.min(WORLDS.length - 1, this.worldId + 1);
      nextStage = 0;
    }

    this.audio.win();
    this.audio.stopBed();
    this._flash = 0.6;
    this.hooks.onComplete?.({
      attempt: this.attempt,
      best: 100,
      worldId: this.worldId,
      stage: this.stage,
      worldName: this.level.world.displayName || this.level.world.name,
      unlocked: this.unlocked,
      hasNext,
      nextWorld,
      nextStage,
      unlockNote,
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

    const dangerFloor =
      world.lethalGround ||
      (this.player?.mode === "ball" && this.player?.ballKind !== "walls");
    ctx.fillStyle = dangerFloor ? "#2a0a12" : C.ground;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.strokeStyle = dangerFloor ? C.spike : C.groundLine;
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

    for (const o of this.level.objects) {
      if (!nearCamera(o, this.cameraX, 120)) continue;
      const sx = o.x - this.cameraX;
      this.drawObject(ctx, o, sx);
    }

    this.drawParticles(ctx);
    this.drawPlayer(ctx);

    if (this._flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this._flash * 0.35})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    ctx.restore();
  }

  drawParallax(ctx) {
    const { WIDTH, HEIGHT } = CONFIG;
    const t = this._bgPulse;
    const C = this.colors;
    const layers = [
      { parallax: 0.15, gap: 140, alpha: 0.05 },
      { parallax: 0.35, gap: 90, alpha: 0.07 },
    ];
    for (const layer of layers) {
      const off = -((this.cameraX * layer.parallax) % layer.gap);
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
    } else if (o.type === "spike") {
      ctx.fillStyle = C.spike;
      ctx.beginPath();
      if ((o.dir || 1) === 1) {
        ctx.moveTo(sx, o.y + o.h);
        ctx.lineTo(sx + o.w / 2, o.y);
        ctx.lineTo(sx + o.w, o.y + o.h);
      } else {
        ctx.moveTo(sx, o.y);
        ctx.lineTo(sx + o.w / 2, o.y + o.h);
        ctx.lineTo(sx + o.w, o.y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (o.type === "pad") {
      ctx.fillStyle = C.pad;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.fillStyle = "#fff6b0";
      ctx.fillRect(sx + 2, o.y + 2, o.w - 4, 3);
    } else if (o.type === "orb") {
      const cx = sx + o.w / 2;
      const cy = o.y + o.h / 2;
      const r = Math.min(o.w, o.h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = C.orb;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff6b0";
      ctx.stroke();
    } else if (o.type === "portal") {
      const color = portalColor(o.mode, C);
      const grad = ctx.createLinearGradient(sx, o.y, sx + o.w, o.y);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.35, color);
      grad.addColorStop(0.65, color);
      grad.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = grad;
      ctx.fillRect(sx, o.y, o.w, o.h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, o.y, o.w, o.h);
      ctx.fillStyle = color;
      ctx.font = "bold 12px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(modeGlyph(o.mode), sx + o.w / 2, o.y + o.h / 2);
      ctx.textBaseline = "alphabetic";
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
      ctx.moveTo(p.w / 2, 0);
      ctx.lineTo(-p.w / 2, -p.h / 2);
      ctx.lineTo(-p.w / 3, 0);
      ctx.lineTo(-p.w / 2, p.h / 2);
      ctx.closePath();
      ctx.fill();
    } else if (p.mode === "ball") {
      ctx.fillStyle = C.playerBall;
      ctx.beginPath();
      ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff6b0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-p.w / 3, 0);
      ctx.lineTo(p.w / 3, 0);
      ctx.stroke();
    } else if (p.mode === "ufo") {
      ctx.fillStyle = C.playerUfo;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.w / 2, p.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -p.h / 6, p.w / 3, Math.PI, 0);
      ctx.fill();
    } else if (p.mode === "wave") {
      ctx.fillStyle = C.playerWave;
      ctx.beginPath();
      ctx.moveTo(-p.w / 2, p.h / 3);
      ctx.lineTo(0, -p.h / 2);
      ctx.lineTo(p.w / 2, p.h / 3);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = C.player;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.strokeStyle = "#ffffffaa";
      ctx.lineWidth = 2;
      ctx.strokeRect(-p.w / 2 + 2, -p.h / 2 + 2, p.w - 4, p.h - 4);
    }

    if (p.gravityDir === -1 && p.mode === "cube") {
      ctx.strokeStyle = C.portalFlip;
      ctx.lineWidth = 2;
      ctx.strokeRect(-p.w / 2 - 2, -p.h / 2 - 2, p.w + 4, p.h + 4);
    }

    ctx.restore();
  }

  drawParticles(ctx) {
    for (const part of this.particles) {
      ctx.globalAlpha = clamp(part.life / part.max, 0, 1);
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.size, part.size);
    }
    ctx.globalAlpha = 1;
  }
}

function modeColor(mode, C) {
  if (mode === "ship") return C.playerShip;
  if (mode === "ball") return C.playerBall;
  if (mode === "ufo") return C.playerUfo;
  if (mode === "wave") return C.playerWave;
  return C.player;
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
  return { x: o.x + pad, y: o.y + pad, w: o.w - pad * 2, h: o.h - pad * 2 };
}

/** Triangle hitbox matching drawn spikes, with forgiveness inset. */
function hitsSpike(playerBox, spike) {
  const inset = CONFIG.SPIKE_INSET ?? 7;
  const playerPad = CONFIG.SPIKE_PLAYER_PAD ?? 5;
  const box = inflate(playerBox, playerPad);
  if (box.w <= 0 || box.h <= 0) return false;

  // Broad-phase: skip if not even near the spike bounds
  if (!aabb(box, spike)) return false;

  const x = spike.x;
  const y = spike.y;
  const w = spike.w;
  const h = spike.h;
  /** @type {{x:number,y:number}[]} */
  let tri;
  if ((spike.dir || 1) === 1) {
    // Floor spike — tip up
    tri = [
      { x: x + inset, y: y + h },
      { x: x + w * 0.5, y: y + inset },
      { x: x + w - inset, y: y + h },
    ];
  } else {
    // Ceiling spike — tip down
    tri = [
      { x: x + inset, y: y },
      { x: x + w * 0.5, y: y + h - inset },
      { x: x + w - inset, y: y },
    ];
  }
  return rectIntersectsTriangle(box, tri);
}

function pointInTriangle(p, a, b, c) {
  const v0x = c.x - a.x;
  const v0y = c.y - a.y;
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = p.x - a.x;
  const v2y = p.y - a.y;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const inv = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= 0 && v >= 0 && u + v <= 1;
}

function segmentsIntersect(a, b, c, d) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const cdx = d.x - c.x;
  const cdy = d.y - c.y;
  const den = abx * cdy - aby * cdx;
  if (Math.abs(den) < 1e-8) return false;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const t = (acx * cdy - acy * cdx) / den;
  const u = (acx * aby - acy * abx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function rectIntersectsTriangle(rect, tri) {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ];
  // Any player corner inside the spike triangle
  for (const p of corners) {
    if (pointInTriangle(p, tri[0], tri[1], tri[2])) return true;
  }
  // Any triangle tip inside the player
  for (const p of tri) {
    if (
      p.x >= rect.x &&
      p.x <= rect.x + rect.w &&
      p.y >= rect.y &&
      p.y <= rect.y + rect.h
    ) {
      return true;
    }
  }
  // Edge crossings (catches grazing along an edge)
  const edges = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ];
  const tEdges = [
    [tri[0], tri[1]],
    [tri[1], tri[2]],
    [tri[2], tri[0]],
  ];
  for (const [a, b] of edges) {
    for (const [c, d] of tEdges) {
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function nearCamera(o, cam, pad = 80) {
  return o.x + (o.w || 40) > cam - pad && o.x < cam + CONFIG.WIDTH + pad;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function hexAlpha(hex, a) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
