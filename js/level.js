import { CONFIG } from "./config.js";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;

/** @typedef {{ type: string, x: number, y: number, w?: number, h?: number, mode?: string }} LevelObject */

/**
 * Easy / beginner course — wide spacing, readable patterns.
 * @returns {{ length: number, objects: LevelObject[] }}
 */
export function createLevel() {
  /** @type {LevelObject[]} */
  const objects = [];

  // Long runway to learn the jump
  addSpike(objects, 1100);
  addSpike(objects, 1500);

  // Low platforms with room to land
  addBlock(objects, 1900, G - S, S * 4, S);
  addSpike(objects, 1900 + S * 4 + 80);
  addBlock(objects, 2300, G - S, S * 4, S);

  // Gentle stairs (2 steps only)
  addBlock(objects, 2750, G - S, S * 2, S);
  addBlock(objects, 2750 + S * 2, G - S * 2, S * 2, S * 2);
  addSpike(objects, 2750 + S * 4 + 70);

  // Single pad bounce onto a wide ledge
  add({ type: "pad", x: 3200, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 3500, G - S * 2, S * 5, S);

  // Orb intro — one spike, big orb, landing pad
  addSpike(objects, 4000);
  add({ type: "orb", x: 4180, y: G - S * 2.4, w: 34, h: 34 });
  addBlock(objects, 4450, G - S, S * 4, S);

  // Easy ship section — wide gaps, short obstacles
  add({ type: "portal", x: 4900, y: G - S * 3, w: 40, h: S * 3, mode: "ship" });

  addBlock(objects, 5200, 120, S, 120);
  addBlock(objects, 5550, G - 120, S, 120);
  addBlock(objects, 5900, 120, S, 140);
  addBlock(objects, 6250, G - 130, S, 130);

  add({ type: "portal", x: 6600, y: G - S * 3, w: 40, h: S * 3, mode: "cube" });

  // Soft outro — spaced singles, then finish
  addSpike(objects, 7000);
  addSpike(objects, 7400);
  add({ type: "pad", x: 7700, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 8000, G - S, S * 6, S);

  const finishX = 8400;
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
  objects.push({ type: "spike", x, y: G - 34, w: 34, h: 34 });
}
