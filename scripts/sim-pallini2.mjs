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
  const i = CONFIG.SPIKE_INSET;
  const s = { x: spike.x + i, y: spike.y + i, w: spike.w - i * 2, h: spike.h - i * 2 };
  const p = inflate(box, CONFIG.SPIKE_PLAYER_PAD);
  return p.w > 0 && p.h > 0 && aabb(p, s);
}

function sim(stage) {
  const level = createWorldLevel(5, stage);
  const objects = level.objects.map((o) => ({ ...o }));
  const speed = level.world.speed;
  const p = {
    worldX: 0,
    y: CONFIG.GROUND_Y - 42,
    w: 42,
    h: 42,
    vx: speed,
    vy: 0,
    onGround: true,
    alive: true,
  };
  let padLock = 0,
    coyote = 0,
    orbBuffer = false,
    jumpBuffer = 0,
    prevY = p.y,
    t = 0,
    death = null,
    orbsUsed = 0,
    padsHit = 0;
  const box = () => ({ x: p.worldX, y: p.y, w: p.w, h: p.h });
  function tryOrbBoost() {
    if (!orbBuffer) return false;
    for (const o of objects) {
      if (o.type !== "orb" || o._used) continue;
      const hb = inflate(box(), -18);
      if (hb.w > 0 && hb.h > 0 && aabb(hb, o)) {
        p.vy = CONFIG.ORB_VELOCITY;
        p.onGround = false;
        o._used = true;
        orbBuffer = true;
        jumpBuffer = 0;
        padLock = 0.08;
        orbsUsed++;
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
  while (p.alive && p.worldX < level.length && t < 260) {
    const padAhead = objects.some(
      (o) => o.type === "pad" && o.x > p.worldX - 20 && o.x < p.worldX + 110
    );
    const spikeAhead = objects.some(
      (o) => o.type === "spike" && o.x > p.worldX - 10 && o.x < p.worldX + p.w + 170
    );
    const nearOrb = objects.some((o) => {
      if (o.type !== "orb" || o._used) return false;
      const hb = inflate(box(), -18);
      return hb.w > 0 && aabb(hb, o);
    });
    if (nearOrb) {
      orbBuffer = true;
      tryOrbBoost();
    } else if (p.onGround && spikeAhead && !padAhead) {
      orbBuffer = true;
      jumpBuffer = CONFIG.JUMP_BUFFER;
      tryJump();
    }
    if (padLock > 0) padLock = Math.max(0, padLock - dt);
    p.worldX += p.vx * dt;
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
        if (!aabb(b, o) || p.vy < -20) continue;
        p.vy = CONFIG.PAD_VELOCITY;
        p.onGround = false;
        padLock = 0.14;
        orbBuffer = true;
        padLaunched = true;
        padsHit++;
        break;
      }
    }
    for (const o of objects) {
      if (o.type === "finish" && aabb(b, o))
        return { ok: true, progress: 1, orbsUsed, padsHit, len: level.length };
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
        } else if (
          Math.min(blockBox.x + blockBox.w, o.x + o.w) - Math.max(blockBox.x, o.x) >
          12
        ) {
          death = `block@${Math.round(o.x)}`;
          p.alive = false;
          break;
        }
      }
    }
    if (!p.alive) break;
    if (jumpBuffer > 0) {
      jumpBuffer = Math.max(0, jumpBuffer - dt);
      tryJump();
    }
    if (orbBuffer) tryOrbBoost();
    t += dt;
  }
  return {
    ok: false,
    progress: p.worldX / level.length,
    death,
    orbsUsed,
    padsHit,
    x: Math.round(p.worldX),
    len: level.length,
  };
}

for (const s of [0, 1, 2]) {
  const r = sim(s);
  console.log(
    `s${s}: ${(r.progress * 100).toFixed(1)}% ${r.ok ? "CLEAR" : r.death} pads=${r.padsHit} orbs=${r.orbsUsed} len=${r.len}`
  );
}
