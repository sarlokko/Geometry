import { CONFIG } from "./config.js";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;

/** @typedef {{ type: string, x: number, y: number, w?: number, h?: number, mode?: string, section?: number, label?: string, speed?: number }} LevelObject */

/**
 * Continuous course: many sections, each with a checkpoint and rising difficulty.
 * @returns {{ length: number, objects: LevelObject[], checkpoints: LevelObject[], sections: { index: number, name: string, startX: number, endX: number, speed: number }[] }}
 */
export function createLevel() {
  /** @type {LevelObject[]} */
  const objects = [];
  /** @type {LevelObject[]} */
  const checkpoints = [];
  /** @type {{ index: number, name: string, startX: number, endX: number, speed: number }[]} */
  const sections = [];

  const add = (obj) => objects.push(obj);
  const addBlock = (x, y, w, h) => add({ type: "block", x, y, w, h });
  const addSpike = (x, size = 34) => add({ type: "spike", x, y: G - size, w: size, h: size });
  const addPad = (x, w = S + 8) => add({ type: "pad", x, y: G - 12, w, h: 12 });
  const addOrb = (x, y = G - S * 2.4, size = 34) => add({ type: "orb", x, y, w: size, h: size });
  const addPortal = (x, mode) =>
    add({ type: "portal", x, y: G - S * 3, w: 40, h: S * 3, mode });

  let cursor = 900;

  const beginSection = (index, name, speed) => {
    const startX = cursor;
    // Soft runway into the section
    cursor += 420;
    const cp = {
      type: "checkpoint",
      x: cursor,
      y: G - 90,
      w: 22,
      h: 90,
      section: index,
      label: name,
      speed,
    };
    add(cp);
    checkpoints.push(cp);
    cursor += 380;
    return { index, name, startX, speed, markEnd: () => {} };
  };

  const endSection = (meta) => {
    const endX = cursor;
    sections.push({
      index: meta.index,
      name: meta.name,
      startX: meta.startX,
      endX,
      speed: meta.speed,
    });
    // Breather between sections
    cursor += 320;
  };

  // ─── 1. Warm-up ───────────────────────────────────────────────
  {
    const sec = beginSection(1, "Warm-up", 1);
    addSpike(cursor);
    cursor += 420;
    addSpike(cursor);
    cursor += 480;
    addBlock(cursor, G - S, S * 4, S);
    cursor += S * 4 + 100;
    addSpike(cursor);
    cursor += 360;
    addBlock(cursor, G - S, S * 4, S);
    cursor += S * 4 + 80;
    endSection(sec);
  }

  // ─── 2. Steps ─────────────────────────────────────────────────
  {
    const sec = beginSection(2, "Steps", 1.02);
    addBlock(cursor, G - S, S * 2, S);
    cursor += S * 2;
    addBlock(cursor, G - S * 2, S * 2, S * 2);
    cursor += S * 2 + 90;
    addSpike(cursor);
    cursor += 400;
    addBlock(cursor, G - S, S * 2, S);
    cursor += S * 2;
    addBlock(cursor, G - S * 2, S * 2, S * 2);
    cursor += S * 2;
    addBlock(cursor, G - S * 3, S * 2, S * 3);
    cursor += S * 2 + 110;
    addSpike(cursor);
    cursor += 360;
    endSection(sec);
  }

  // ─── 3. Bounce pads ───────────────────────────────────────────
  {
    const sec = beginSection(3, "Bounce", 1.05);
    addPad(cursor);
    cursor += 280;
    addBlock(cursor, G - S * 2, S * 5, S);
    cursor += S * 5 + 160;
    addSpike(cursor);
    cursor += 300;
    addPad(cursor);
    cursor += 260;
    addBlock(cursor, G - S * 2.5, S * 4, S);
    cursor += S * 4 + 140;
    addSpike(cursor);
    cursor += 280;
    addSpike(cursor);
    cursor += 340;
    endSection(sec);
  }

  // ─── 4. Orbs ──────────────────────────────────────────────────
  {
    const sec = beginSection(4, "Orbs", 1.08);
    addSpike(cursor);
    cursor += 180;
    addOrb(cursor, G - S * 2.4, 34);
    cursor += 280;
    addBlock(cursor, G - S, S * 4, S);
    cursor += S * 4 + 140;
    addSpike(cursor);
    cursor += 120;
    addSpike(cursor + 70);
    cursor += 200;
    addOrb(cursor, G - S * 2.6, 32);
    cursor += 300;
    addBlock(cursor, G - S, S * 3, S);
    cursor += S * 3 + 120;
    endSection(sec);
  }

  // ─── 5. Mixed cube ────────────────────────────────────────────
  {
    const sec = beginSection(5, "Mix", 1.12);
    addSpike(cursor);
    cursor += 280;
    addBlock(cursor, G - S, S * 3, S);
    cursor += S * 3 + 60;
    addSpike(cursor);
    cursor += 220;
    addPad(cursor, S + 4);
    cursor += 240;
    addBlock(cursor, G - S * 3, S * 2, S);
    cursor += S * 2 + 100;
    addSpike(cursor);
    cursor += 160;
    addOrb(cursor, G - S * 2.5, 30);
    cursor += 260;
    addBlock(cursor, G - S, S * 3, S);
    cursor += S * 3 + 80;
    addSpike(cursor);
    cursor += 70;
    addSpike(cursor + 70);
    cursor += 220;
    endSection(sec);
  }

  // ─── 6. First flight ──────────────────────────────────────────
  {
    const sec = beginSection(6, "Flight", 1.15);
    addPortal(cursor, "ship");
    cursor += 280;
    addBlock(cursor, 120, S, 120);
    cursor += 340;
    addBlock(cursor, G - 120, S, 120);
    cursor += 340;
    addBlock(cursor, 120, S, 140);
    cursor += 320;
    addBlock(cursor, G - 130, S, 130);
    cursor += 300;
    addBlock(cursor, 110, S, 150);
    cursor += 280;
    addPortal(cursor, "cube");
    cursor += 260;
    endSection(sec);
  }

  // ─── 7. Pressure ──────────────────────────────────────────────
  {
    const sec = beginSection(7, "Pressure", 1.2);
    addSpike(cursor, 32);
    cursor += 200;
    addSpike(cursor, 32);
    cursor += 240;
    addBlock(cursor, G - S, S * 2.5, S);
    cursor += S * 2.5 + 50;
    addSpike(cursor, 32);
    cursor += 180;
    addPad(cursor, S);
    cursor += 200;
    addBlock(cursor, G - S * 3.2, S * 2, S);
    cursor += S * 2 + 80;
    addSpike(cursor, 32);
    cursor += 100;
    addOrb(cursor, G - S * 2.7, 28);
    cursor += 220;
    addSpike(cursor, 32);
    cursor += 80;
    addSpike(cursor + 70, 32);
    cursor += 200;
    addBlock(cursor, G - S * 2, S * 3, S * 2);
    cursor += S * 3 + 100;
    endSection(sec);
  }

  // ─── 8. Turbulence (harder ship) ───────────────────────────────
  {
    const sec = beginSection(8, "Turbulence", 1.24);
    addPortal(cursor, "ship");
    cursor += 240;
    for (let i = 0; i < 7; i++) {
      const x = cursor;
      if (i % 2 === 0) {
        addBlock(x, 100, S * 1.1, 150 + (i % 3) * 24);
      } else {
        const h = 130 + (i % 3) * 28;
        addBlock(x, G - h, S * 1.1, h);
      }
      cursor += 250 - Math.min(i * 8, 40);
    }
    addPortal(cursor, "cube");
    cursor += 240;
    endSection(sec);
  }

  // ─── 9. Gauntlet ──────────────────────────────────────────────
  {
    const sec = beginSection(9, "Gauntlet", 1.28);
    addSpike(cursor, 30);
    cursor += 140;
    addSpike(cursor, 30);
    cursor += 140;
    addOrb(cursor, G - S * 2.5, 28);
    cursor += 200;
    addSpike(cursor, 30);
    cursor += 160;
    addPad(cursor, S);
    cursor += 180;
    addBlock(cursor, G - S * 2.8, S * 2, S);
    cursor += S * 2 + 70;
    addSpike(cursor, 30);
    cursor += 90;
    addSpike(cursor + 65, 30);
    cursor += 160;
    addBlock(cursor, G - S, S * 2, S);
    cursor += S * 2;
    addBlock(cursor, G - S * 2, S * 2, S * 2);
    cursor += S * 2 + 70;
    addOrb(cursor, G - S * 2.8, 28);
    cursor += 220;
    addSpike(cursor, 30);
    cursor += 120;
    addPad(cursor, S);
    cursor += 200;
    addBlock(cursor, G - S * 3.4, S * 2, S);
    cursor += S * 2 + 90;
    endSection(sec);
  }

  // ─── 10. Finale ───────────────────────────────────────────────
  {
    const sec = beginSection(10, "Finale", 1.32);
    addSpike(cursor, 30);
    cursor += 120;
    addSpike(cursor, 30);
    cursor += 120;
    addSpike(cursor, 30);
    cursor += 180;
    addPad(cursor, S);
    cursor += 170;
    addOrb(cursor, G - S * 2.6, 28);
    cursor += 180;
    addSpike(cursor, 30);
    cursor += 100;
    addBlock(cursor, G - S * 2, S * 2, S * 2);
    cursor += S * 2 + 80;
    addPortal(cursor, "ship");
    cursor += 220;
    addBlock(cursor, 110, S, 160);
    cursor += 240;
    addBlock(cursor, G - 150, S, 150);
    cursor += 240;
    addBlock(cursor, 100, S, 170);
    cursor += 220;
    addPortal(cursor, "cube");
    cursor += 200;
    addSpike(cursor, 30);
    cursor += 110;
    addSpike(cursor, 30);
    cursor += 160;
    addBlock(cursor, G - S, S * 5, S);
    cursor += S * 5 + 120;

    const finishX = cursor + 80;
    add({ type: "finish", x: finishX, y: 80, w: 18, h: G - 80 });
    cursor = finishX + 200;
    endSection(sec);
  }

  return {
    length: cursor,
    objects,
    checkpoints,
    sections,
  };
}
