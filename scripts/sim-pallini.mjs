/**
 * Headless Pallini (world 5) simulator — mirrors game.js cube/pad/orb physics.
 */
import { CONFIG } from "../js/config.js";
import { createWorldLevel } from "../js/worlds.js";

const dt = 1 / 60;

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function inflate(o, pad) {
  return { x: o.x + pad, y: o.y + pad, w: o.w - pad * 2, h: o.h - pad * 2 };
}
function hitsSpike(box, spike) {
  const inset = CONFIG.SPIKE_INSET;
  const pad = CONFIG.SPIKE_PLAYER_PAD;
  const s = {
    x: spike.x + inset,
    y: spike.y + inset,
    w: spike.w - inset * 2,
    h: spike.h - inset * 2,
  };
  const p = inflate(box, pad);
  return p.w > 0 && p.h > 0 && aabb(p, s);
}

function sim(stage, { hold = true, taps = [] } = {}) {
  const level = createWorldLevel(5, stage);
  const objects = level.objects.map((o) => ({ ...o }));
  const speed = level.world.speed;
  const p = {
    worldX: 0,
    y: CONFIG.GROUND_Y - CONFIG.PLAYER_SIZE,
    w: CONFIG.PLAYER_SIZE,
    h: CONFIG.PLAYER_SIZE,
    vx: speed,
    vy: 0,
    onGround: true,
    alive: true,
    mode: "cube",
    gravityDir: 1,
  };
  let cameraX = 0;
  let padLock = 0;
  let coyote = 0;
  let orbBuffer = hold;
  let held = hold;
  let jumpBuffer = 0;
  let prevY = p.y;
  let t = 0;
  let death = null;
  const tapSet = new Set(taps);

  const box = () => ({ x: p.worldX, y: p.y, w: p.w, h: p.h });

  function tryOrbBoost() {
    if (!orbBuffer) return false;
    const pbox = box();
    for (const o of objects) {
      if (o.type !== "orb" || o._used) continue;
      const hb = inflate(pbox, -18);
      if (hb.w > 0 && hb.h > 0 && aabb(hb, o)) {
        p.vy = CONFIG.ORB_VELOCITY;
        p.onGround = false;
        o._used = true;
        orbBuffer = held ? true : false;
        jumpBuffer = 0;
        padLock = 0.08;
        return true;
      }
    }
    return false;
  }

  function tryJump() {
    if (p.onGround || coyote > 0) {
      p.vy = CONFIG.JUMP_VELOCITY;
      p.onGround = false;
      coyote = 0;
      jumpBuffer = 0;
      return true;
    }
    return tryOrbBoost();
  }

  function press() {
    held = true;
    orbBuffer = true;
    jumpBuffer = CONFIG.JUMP_BUFFER;
    tryJump();
  }

  while (p.alive && p.worldX < level.length && t < 120) {
    const frame = Math.floor(t * 60);
    if (tapSet.has(frame)) press();

    if (padLock > 0) padLock = Math.max(0, padLock - dt);
    p.worldX += p.vx * dt;
    cameraX = p.worldX - CONFIG.PLAYER_X;

    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    prevY = p.y;
    p.y += p.vy * dt;

    if (p.y + p.h >= CONFIG.GROUND_Y) {
      p.y = CONFIG.GROUND_Y - p.h;
      p.vy = 0;
      p.onGround = true;
      coyote = CONFIG.COYOTE_TIME;
    } else {
      p.onGround = false;
      coyote = Math.max(0, coyote - dt);
    }

    const b = box();
    let padLaunched = false;
    if (padLock <= 0) {
      for (const o of objects) {
        if (o.type !== "pad" || o._used) continue;
        if (!aabb(b, o)) continue;
        if (p.vy < -20) continue;
        p.vy = CONFIG.PAD_VELOCITY;
        p.onGround = false;
        padLock = 0.14;
        orbBuffer = true;
        padLaunched = true;
        break;
      }
    }

    for (const o of objects) {
      if (o.type === "finish" && aabb(b, o)) {
        return { ok: true, progress: 1, t, death: null };
      }
      if (o.type === "spike" && hitsSpike(b, o)) {
        if (padLaunched) continue;
        death = `spike@${Math.round(o.x)}`;
        p.alive = false;
        break;
      }
      if (o.type === "block") {
        if (padLaunched) continue;
        const blockBox = { x: b.x + 4, y: b.y, w: b.w - 8, h: b.h };
        if (!aabb(blockBox, o)) continue;
        const fromTop = prevY + p.h <= o.y + 16 && p.vy >= -60;
        if (fromTop) {
          p.y = o.y - p.h;
          p.vy = 0;
          p.onGround = true;
          coyote = CONFIG.COYOTE_TIME;
        } else {
          const overlapX =
            Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x);
          if (overlapX > 12) {
            death = `block@${Math.round(o.x)}`;
            p.alive = false;
            break;
          }
        }
      }
    }

    if (!p.alive) break;

    if (jumpBuffer > 0) {
      jumpBuffer = Math.max(0, jumpBuffer - dt);
      tryJump();
    }
    if (orbBuffer) tryOrbBoost();
    if (held && (p.onGround || coyote > 0)) tryJump();

    t += dt;
  }

  return {
    ok: false,
    progress: p.worldX / level.length,
    t,
    death,
    x: p.worldX,
  };
}

for (const stage of [0, 1, 2]) {
  const hold = sim(stage, { hold: true });
  const walk = sim(stage, { hold: false });
  console.log(
    `stage ${stage} HOLD: ${(hold.progress * 100).toFixed(1)}% ${hold.ok ? "CLEAR" : hold.death} | WALK: ${(walk.progress * 100).toFixed(1)}% ${walk.ok ? "CLEAR" : walk.death}`
  );
}
