import { CONFIG } from "./config.js";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;

/**
 * Ten selectable worlds. Each entry is harder than the previous:
 * denser obstacles, faster speed, shorter reaction windows, more advanced mechanics.
 */
export const WORLDS = [
  {
    id: 0,
    name: "Aurora Run",
    subtitle: "Primi salti",
    bpm: 108,
    speed: 320,
    colors: theme("#071526", "#16385a", "#39f0c0", "#1c4d6e", "#7ee7ff"),
  },
  {
    id: 1,
    name: "Pulse Valley",
    subtitle: "Ritmo stretto",
    bpm: 116,
    speed: 350,
    colors: theme("#08182a", "#1a3f5c", "#4dffc2", "#1a5570", "#8ef0ff"),
  },
  {
    id: 2,
    name: "Sky Bridge",
    subtitle: "Piattaforme",
    bpm: 122,
    speed: 380,
    colors: theme("#0a1630", "#1e3a68", "#6ad0ff", "#234f86", "#9fd8ff"),
  },
  {
    id: 3,
    name: "Bounce Circuit",
    subtitle: "Pad e rimbalzi",
    bpm: 128,
    speed: 400,
    colors: theme("#12100a", "#3a2a12", "#ffd84a", "#5a4218", "#ffe08a"),
  },
  {
    id: 4,
    name: "Orb Garden",
    subtitle: "Salti in aria",
    bpm: 132,
    speed: 420,
    colors: theme("#140a22", "#2d1850", "#c77dff", "#3d2468", "#e0b0ff"),
  },
  {
    id: 5,
    name: "Ship Harbor",
    subtitle: "Modalità nave",
    bpm: 136,
    speed: 440,
    colors: theme("#061820", "#0f3640", "#39f0c0", "#14505a", "#7ee7ff"),
  },
  {
    id: 6,
    name: "Dual Drift",
    subtitle: "Cubo + nave",
    bpm: 142,
    speed: 470,
    colors: theme("#100818", "#2a1438", "#ff7ad9", "#4a2058", "#ffb0ec"),
  },
  {
    id: 7,
    name: "Spike Storm",
    subtitle: "Densità alta",
    bpm: 148,
    speed: 500,
    colors: theme("#1a080c", "#3a1420", "#ff4d6d", "#5a2030", "#ff8aa0"),
  },
  {
    id: 8,
    name: "Void Warp",
    subtitle: "Nave caotica",
    bpm: 154,
    speed: 530,
    colors: theme("#050510", "#12122a", "#7b5cff", "#2a2460", "#b8a0ff"),
  },
  {
    id: 9,
    name: "Neon Apex",
    subtitle: "Il più duro",
    bpm: 160,
    speed: 560,
    colors: theme("#0a0610", "#221028", "#ff3d8a", "#3a1838", "#ff8ec4"),
  },
];

function theme(skyTop, skyBottom, accent, block, blockEdge) {
  return {
    skyTop,
    skyBottom,
    ground: skyTop,
    groundLine: accent,
    player: accent,
    playerShip: "#ffd84a",
    block,
    blockEdge,
    spike: "#ff4d6d",
    pad: "#ffd84a",
    orb: "#ffd84a",
    portalShip: "#7b5cff",
    portalCube: accent,
    finish: "#ffffff",
    particle: accent,
  };
}

/**
 * @param {number} worldId
 * @returns {{ length: number, objects: LevelObject[], world: typeof WORLDS[0] }}
 */

/** @typedef {{ type: string, x: number, y: number, w?: number, h?: number, mode?: string }} LevelObject */
export function createWorldLevel(worldId) {
  const world = WORLDS[clampWorld(worldId)];
  const builders = [
    buildWorld0,
    buildWorld1,
    buildWorld2,
    buildWorld3,
    buildWorld4,
    buildWorld5,
    buildWorld6,
    buildWorld7,
    buildWorld8,
    buildWorld9,
  ];
  const objects = [];
  const finishX = builders[world.id](objects);
  add(objects, { type: "finish", x: finishX, y: 80, w: 18, h: G - 80 });
  return {
    length: finishX + 200,
    objects,
    world,
  };
}

export function clampWorld(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(WORLDS.length - 1, Math.floor(n)));
}

function buildWorld0(objects) {
  // Gentle intro — very spaced singles
  addSpike(objects, 1100);
  addSpike(objects, 1600);
  addBlock(objects, 2100, G - S, S * 4, S);
  addSpike(objects, 2100 + S * 4 + 100);
  addBlock(objects, 2700, G - S, S * 3, S);
  addSpike(objects, 3200);
  addSpike(objects, 3650);
  addBlock(objects, 4100, G - S, S * 5, S);
  addSpike(objects, 4700);
  return 5100;
}

function buildWorld1(objects) {
  addSpike(objects, 1000);
  addSpike(objects, 1350);
  addSpike(objects, 1700);
  addBlock(objects, 2050, G - S, S * 3, S);
  addSpike(objects, 2050 + S * 3 + 70);
  addSpike(objects, 2500);
  addBlock(objects, 2800, G - S, S * 2, S);
  addBlock(objects, 2800 + S * 2, G - S * 2, S * 2, S * 2);
  addSpike(objects, 2800 + S * 4 + 60);
  addSpike(objects, 3400);
  addSpike(objects, 3650);
  addBlock(objects, 4000, G - S, S * 4, S);
  addSpike(objects, 4500);
  addSpike(objects, 4750);
  return 5200;
}

function buildWorld2(objects) {
  addSpike(objects, 950);
  addBlock(objects, 1300, G - S, S * 3, S);
  addSpike(objects, 1300 + S * 3 + 55);
  // Stairs
  addBlock(objects, 1750, G - S, S * 2, S);
  addBlock(objects, 1750 + S * 2, G - S * 2, S * 2, S * 2);
  addBlock(objects, 1750 + S * 4, G - S * 3, S * 2, S * 3);
  addSpike(objects, 1750 + S * 6 + 50);
  // Gap platforms
  addBlock(objects, 2400, G - S, S * 2, S);
  addBlock(objects, 2400 + S * 2 + 90, G - S * 2, S * 2, S);
  addBlock(objects, 2400 + S * 4 + 180, G - S, S * 3, S);
  addSpike(objects, 3100);
  addSpike(objects, 3320);
  addBlock(objects, 3600, G - S * 2, S * 4, S);
  addSpike(objects, 3600 + S * 4 + 45);
  addBlock(objects, 4200, G - S, S * 2, S);
  addBlock(objects, 4200 + S * 2 + 70, G - S * 2, S * 2, S);
  addSpike(objects, 4700);
  return 5100;
}

function buildWorld3(objects) {
  addSpike(objects, 900);
  add(objects, { type: "pad", x: 1200, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 1500, G - S * 2, S * 4, S);
  addSpike(objects, 1500 + S * 4 + 50);
  addSpike(objects, 1950);
  add(objects, { type: "pad", x: 2200, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 2500, G - S * 3, S * 3, S);
  addSpike(objects, 2900);
  addSpike(objects, 3100);
  add(objects, { type: "pad", x: 3400, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 3680, G - S * 2, S * 2, S);
  addBlock(objects, 3680 + S * 2 + 60, G - S, S * 3, S);
  addSpike(objects, 4200);
  add(objects, { type: "pad", x: 4450, y: G - 12, w: S + 8, h: 12 });
  addSpike(objects, 4800);
  addBlock(objects, 5050, G - S, S * 4, S);
  return 5500;
}

function buildWorld4(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1150);
  add(objects, { type: "orb", x: 1350, y: G - S * 2.2, w: 34, h: 34 });
  addBlock(objects, 1650, G - S, S * 3, S);
  addSpike(objects, 2100);
  add(objects, { type: "orb", x: 2300, y: G - S * 2.5, w: 34, h: 34 });
  addSpike(objects, 2550);
  addBlock(objects, 2800, G - S * 2, S * 3, S);
  add(objects, { type: "pad", x: 3200, y: G - 12, w: S + 8, h: 12 });
  add(objects, { type: "orb", x: 3450, y: G - S * 3.2, w: 34, h: 34 });
  addBlock(objects, 3750, G - S, S * 3, S);
  addSpike(objects, 4200);
  addSpike(objects, 4380);
  add(objects, { type: "orb", x: 4550, y: G - S * 2.3, w: 34, h: 34 });
  addBlock(objects, 4850, G - S * 2, S * 4, S);
  addSpike(objects, 5400);
  return 5800;
}

function buildWorld5(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1180);
  addBlock(objects, 1500, G - S, S * 3, S);
  add(objects, { type: "portal", x: 1900, y: G - S * 3, w: 40, h: S * 3, mode: "ship" });
  // Easy ship corridor
  addBlock(objects, 2200, 100, S, 110);
  addBlock(objects, 2550, G - 110, S, 110);
  addBlock(objects, 2900, 100, S, 130);
  addBlock(objects, 3250, G - 120, S, 120);
  addBlock(objects, 3600, 110, S, 140);
  add(objects, { type: "portal", x: 4000, y: G - S * 3, w: 40, h: S * 3, mode: "cube" });
  addSpike(objects, 4350);
  addSpike(objects, 4600);
  add(objects, { type: "pad", x: 4900, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 5200, G - S, S * 4, S);
  return 5600;
}

function buildWorld6(objects) {
  addSpike(objects, 850);
  addSpike(objects, 1050);
  addSpike(objects, 1250);
  addBlock(objects, 1500, G - S, S * 2, S);
  addBlock(objects, 1500 + S * 2, G - S * 2, S * 2, S * 2);
  add(objects, { type: "orb", x: 1950, y: G - S * 2.6, w: 34, h: 34 });
  addSpike(objects, 2200);
  add(objects, { type: "portal", x: 2450, y: G - S * 3, w: 40, h: S * 3, mode: "ship" });
  addBlock(objects, 2750, 90, S, 140);
  addBlock(objects, 3000, G - 150, S, 150);
  addBlock(objects, 3250, 90, S, 160);
  addBlock(objects, 3500, G - 140, S, 140);
  addBlock(objects, 3750, 100, S, 150);
  add(objects, { type: "portal", x: 4050, y: G - S * 3, w: 40, h: S * 3, mode: "cube" });
  addSpike(objects, 4350);
  add(objects, { type: "pad", x: 4550, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, 4800, G - S * 2, S * 3, S);
  addSpike(objects, 4800 + S * 3 + 40);
  addSpike(objects, 5300);
  addSpike(objects, 5450);
  return 5850;
}

function buildWorld7(objects) {
  // Dense spike gauntlet + tight platforms
  let x = 800;
  for (let i = 0; i < 6; i++) {
    addSpike(objects, x);
    x += 160 + (i % 2) * 30;
  }
  addBlock(objects, x + 40, G - S, S * 2, S);
  x += 40 + S * 2 + 55;
  addSpike(objects, x);
  addSpike(objects, x + 140);
  addSpike(objects, x + 260);
  x += 400;
  addBlock(objects, x, G - S, S, S);
  addBlock(objects, x + S + 70, G - S * 2, S, S);
  addBlock(objects, x + S * 2 + 140, G - S, S * 2, S);
  x += S * 4 + 220;
  add(objects, { type: "orb", x: x, y: G - S * 2.2, w: 34, h: 34 });
  addSpike(objects, x + 180);
  addSpike(objects, x + 300);
  x += 450;
  add(objects, { type: "pad", x: x, y: G - 12, w: S + 8, h: 12 });
  addSpike(objects, x + 280);
  addBlock(objects, x + 420, G - S * 2, S * 2, S);
  addSpike(objects, x + 420 + S * 2 + 35);
  x += 700;
  for (let i = 0; i < 5; i++) {
    addSpike(objects, x + i * 145);
  }
  return x + 5 * 145 + 350;
}

function buildWorld8(objects) {
  addSpike(objects, 800);
  addSpike(objects, 960);
  addSpike(objects, 1120);
  add(objects, { type: "portal", x: 1400, y: G - S * 3, w: 40, h: S * 3, mode: "ship" });
  // Chaotic ship zig-zag
  const shipStart = 1700;
  for (let i = 0; i < 8; i++) {
    const top = i % 2 === 0;
    const h = 130 + (i % 3) * 20;
    if (top) addBlock(objects, shipStart + i * 280, 70, S, h);
    else addBlock(objects, shipStart + i * 280, G - h, S, h);
  }
  add(objects, { type: "portal", x: shipStart + 8 * 280 + 80, y: G - S * 3, w: 40, h: S * 3, mode: "cube" });
  let x = shipStart + 8 * 280 + 400;
  addSpike(objects, x);
  addSpike(objects, x + 130);
  add(objects, { type: "orb", x: x + 280, y: G - S * 2.4, w: 34, h: 34 });
  addSpike(objects, x + 480);
  add(objects, { type: "pad", x: x + 650, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, x + 900, G - S, S * 3, S);
  return x + 1300;
}

function buildWorld9(objects) {
  // Apex: everything stacked tight and long
  let x = 750;
  for (let i = 0; i < 4; i++) {
    addSpike(objects, x);
    x += 130;
  }
  addBlock(objects, x + 20, G - S, S * 2, S);
  addBlock(objects, x + 20 + S * 2, G - S * 2, S * 2, S * 2);
  addBlock(objects, x + 20 + S * 4, G - S * 3, S * 2, S * 3);
  x += 20 + S * 6 + 40;
  addSpike(objects, x);
  add(objects, { type: "orb", x: x + 160, y: G - S * 2.5, w: 34, h: 34 });
  addSpike(objects, x + 320);
  add(objects, { type: "pad", x: x + 480, y: G - 12, w: S + 8, h: 12 });
  add(objects, { type: "orb", x: x + 700, y: G - S * 3.1, w: 34, h: 34 });
  addBlock(objects, x + 920, G - S, S * 2, S);
  x += 1200;
  add(objects, { type: "portal", x: x, y: G - S * 3, w: 40, h: S * 3, mode: "ship" });
  x += 280;
  for (let i = 0; i < 10; i++) {
    const top = i % 2 === 0;
    const h = 140 + (i % 4) * 15;
    const gap = 240;
    if (top) addBlock(objects, x + i * gap, 60, S - 4, h);
    else addBlock(objects, x + i * gap, G - h, S - 4, h);
  }
  x += 10 * 240 + 100;
  add(objects, { type: "portal", x: x, y: G - S * 3, w: 40, h: S * 3, mode: "cube" });
  x += 320;
  for (let i = 0; i < 7; i++) {
    addSpike(objects, x + i * 125);
  }
  x += 7 * 125 + 80;
  add(objects, { type: "pad", x: x, y: G - 12, w: S + 8, h: 12 });
  addBlock(objects, x + 260, G - S * 2, S * 2, S);
  addSpike(objects, x + 260 + S * 2 + 30);
  addSpike(objects, x + 520);
  addSpike(objects, x + 640);
  addBlock(objects, x + 800, G - S, S * 4, S);
  return x + 1200;
}

function add(objects, o) {
  objects.push(o);
}

function addBlock(objects, x, y, w, h) {
  objects.push({ type: "block", x, y, w, h });
}

function addSpike(objects, x) {
  objects.push({ type: "spike", x, y: G - 34, w: 34, h: 34 });
}
