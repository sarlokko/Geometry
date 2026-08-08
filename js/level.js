import { CONFIG } from "./config.js";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;

/** @typedef {{ type: string, x: number, y: number, w?: number, h?: number }} LevelObject */

/**
 * Build a handcrafted intro-to-mid difficulty course.
 * Coordinates are world-space; player scrolls through them.
 * @returns {{ length: number, objects: LevelObject[] }}
 */
export function createLevel() {
  /** @type {LevelObject[]} */
  const objects = [];

  const add = (obj) => objects.push(obj);

  // Soft intro runway — learn the jump timing
  add({ type: "deco", x: 100, y: G - 180, w: 40, h: 40 });
  addSpike(objects, 980);
  addSpike(objects, 1280);

  // First elevated platform
  addBlock(objects, 1600, G - S, S * 3, S);
  addSpike(objects, 1600 + S * 3 + 50);
  addBlock(objects, 1920, G - S, S * 3, S);

  // Staircase
  for (let i = 0; i < 3; i++) {
    addBlock(objects, 2300 + i * S, G - S * (i + 1), S, S * (i + 1));
  }
  addSpike(objects, 2300 + 3 * S + 40);

  // Drop + pad bounce
  add({ type: "pad", x: 2550, y: G - 12, w: S, h: 12 });
  addBlock(objects, 2800, G - S * 3, S * 2, S);
  addSpike(objects, 2800 + S * 2 + 30);
  addBlock(objects, 3050, G - S * 2, S * 4, S * 2);

  // Orb section
  addSpike(objects, 3400);
  addSpike(objects, 3480);
  add({ type: "orb", x: 3560, y: G - S * 2.2, w: 28, h: 28 });
  addSpike(objects, 3720);
  add({ type: "orb", x: 3860, y: G - S * 2.6, w: 28, h: 28 });
  addBlock(objects, 4050, G - S, S * 3, S);

  // Ceiling hazard tunnel feel via tall spikes + blocks
  addBlock(objects, 4400, G - S * 4, S, S * 4);
  addSpike(objects, 4480);
  addBlock(objects, 4560, G - S, S * 2, S);
  addSpike(objects, 4560 + S * 2 + 16);
  add({ type: "pad", x: 4780, y: G - 12, w: S, h: 12 });
  addBlock(objects, 5000, G - S * 3.5, S * 2, S);

  // Ship portal
  add({ type: "portal", x: 5400, y: G - S * 3, w: 36, h: S * 3, mode: "ship" });

  // Ship corridor with hanging obstacles
  for (let i = 0; i < 8; i++) {
    const x = 5600 + i * 220;
    if (i % 2 === 0) {
      addBlock(objects, x, 120, S * 1.2, 160 + (i % 3) * 30);
    } else {
      addBlock(objects, x, G - (140 + (i % 3) * 40), S * 1.2, 140 + (i % 3) * 40);
    }
  }

  // Back to cube
  add({ type: "portal", x: 7400, y: G - S * 3, w: 36, h: S * 3, mode: "cube" });

  // Final gauntlet
  addSpike(objects, 7700);
  addSpike(objects, 7780);
  add({ type: "orb", x: 7900, y: G - S * 2.4, w: 28, h: 28 });
  addSpike(objects, 8050);
  addBlock(objects, 8200, G - S * 2, S * 2, S * 2);
  add({ type: "pad", x: 8450, y: G - 12, w: S, h: 12 });
  addSpike(objects, 8600);
  addSpike(objects, 8680);
  addSpike(objects, 8760);
  addBlock(objects, 8950, G - S, S * 5, S);

  // Finish line
  const finishX = 9400;
  add({ type: "finish", x: finishX, y: 80, w: 18, h: G - 80 });

  return {
    length: finishX + 200,
    objects,
  };
}

function addBlock(objects, x, y, w, h) {
  objects.push({ type: "block", x, y, w, h });
}

function addSpike(objects, x) {
  objects.push({ type: "spike", x, y: G - 36, w: 36, h: 36 });
}
