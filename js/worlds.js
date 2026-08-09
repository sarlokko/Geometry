import { CONFIG } from "./config.js";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;
const C = CONFIG.CEILING_Y;

/**
 * Each world has one clear peculiarity (startMode / rules / layout).
 */
export const WORLDS = [
  {
    id: 0,
    name: "Aurora Run",
    subtitle: "Solo cubo",
    quirk: "Salti classici: niente gadget, solo timing.",
    bpm: 108,
    speed: 320,
    startMode: "cube",
    colors: theme("#071526", "#16385a", "#39f0c0", "#1c4d6e", "#7ee7ff"),
  },
  {
    id: 1,
    name: "Micro Mile",
    subtitle: "Cubo mini",
    quirk: "Hitbox ridotta: piattaforme strette e gap precisi.",
    bpm: 116,
    speed: 350,
    startMode: "cube",
    sizeScale: CONFIG.MINI_SCALE,
    colors: theme("#08182a", "#1a3f5c", "#4dffc2", "#1a5570", "#8ef0ff"),
  },
  {
    id: 2,
    name: "Pad Pulse",
    subtitle: "Solo pad",
    quirk: "I pad ti sparano in aria: usa i rimbalzi, non il salto lungo.",
    bpm: 124,
    speed: 380,
    startMode: "cube",
    colors: theme("#12100a", "#3a2a12", "#ffd84a", "#5a4218", "#ffe08a"),
  },
  {
    id: 3,
    name: "Orb Garden",
    subtitle: "Orb in aria",
    quirk: "Tieni premuto vicino alle orb per rilanciarti.",
    bpm: 130,
    speed: 400,
    startMode: "cube",
    colors: theme("#140a22", "#2d1850", "#c77dff", "#3d2468", "#e0b0ff"),
  },
  {
    id: 4,
    name: "Ship Harbor",
    subtitle: "Astronave",
    quirk: "Tieni premuto per salire, rilascia per scendere.",
    bpm: 136,
    speed: 430,
    startMode: "ship",
    colors: theme("#061820", "#0f3640", "#39f0c0", "#14505a", "#7ee7ff"),
  },
  {
    id: 5,
    name: "Neverland",
    subtitle: "Pallina",
    quirk: "Rimbalza sui pad: se tocchi terra sei fuori.",
    bpm: 142,
    speed: 450,
    startMode: "ball",
    lethalGround: true,
    colors: theme("#1a1008", "#3a2810", "#ffb347", "#5a3a18", "#ffd08a"),
  },
  {
    id: 6,
    name: "Flap Fields",
    subtitle: "UFO",
    quirk: "Ogni tap è un flap: regola l’altitudine a colpi.",
    bpm: 148,
    speed: 470,
    startMode: "ufo",
    colors: theme("#0a1828", "#163850", "#6ad0ff", "#234f86", "#9fd8ff"),
  },
  {
    id: 7,
    name: "Wave Rift",
    subtitle: "Onda",
    quirk: "Hold = su, rilascia = giù. Toccare qualcosa = morte.",
    bpm: 154,
    speed: 500,
    startMode: "wave",
    lethalGround: true,
    lethalCeiling: true,
    colors: theme("#100818", "#2a1438", "#ff7ad9", "#4a2058", "#ffb0ec"),
  },
  {
    id: 8,
    name: "Mirror Vault",
    subtitle: "Gravità",
    quirk: "I portali invertiti scambiano suolo e soffitto.",
    bpm: 158,
    speed: 520,
    startMode: "cube",
    colors: theme("#050510", "#12122a", "#7b5cff", "#2a2460", "#b8a0ff"),
  },
  {
    id: 9,
    name: "Neon Apex",
    subtitle: "Roulette",
    quirk: "Cubo, nave, pallina, UFO e onda nello stesso run.",
    bpm: 164,
    speed: 540,
    startMode: "cube",
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
    playerBall: "#ffb347",
    playerUfo: "#6ad0ff",
    playerWave: "#ff7ad9",
    block,
    blockEdge,
    spike: "#ff4d6d",
    pad: "#ffd84a",
    orb: "#ffd84a",
    portalShip: "#7b5cff",
    portalCube: accent,
    portalBall: "#ffb347",
    portalUfo: "#6ad0ff",
    portalWave: "#ff7ad9",
    portalFlip: "#c0b0ff",
    finish: "#ffffff",
    particle: accent,
  };
}

/** @typedef {{ type: string, x: number, y: number, w?: number, h?: number, mode?: string, dir?: number }} LevelObject */

/**
 * @param {number} worldId
 * @returns {{ length: number, objects: LevelObject[], world: typeof WORLDS[0] }}
 */
export function createWorldLevel(worldId) {
  const world = WORLDS[clampWorld(worldId)];
  const builders = [
    buildAurora,
    buildMicro,
    buildPads,
    buildOrbs,
    buildShip,
    buildBall,
    buildUfo,
    buildWave,
    buildMirror,
    buildApex,
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

/** 0 — Solo cubo: spike e blocchi semplici */
function buildAurora(objects) {
  addSpike(objects, 1100);
  addSpike(objects, 1600);
  addBlock(objects, 2100, G - S, S * 4, S);
  addSpike(objects, 2100 + S * 4 + 110);
  addSpike(objects, 2800);
  addBlock(objects, 3200, G - S, S * 3, S);
  addSpike(objects, 3700);
  addSpike(objects, 4100);
  addBlock(objects, 4500, G - S, S * 5, S);
  addSpike(objects, 5100);
  return 5500;
}

/** 1 — Cubo mini: piattaforme strette */
function buildMicro(objects) {
  const s = S * CONFIG.MINI_SCALE;
  addSpike(objects, 900);
  addBlock(objects, 1200, G - s, s * 2, s);
  addSpike(objects, 1200 + s * 2 + 50);
  addBlock(objects, 1550, G - s * 2, s * 2, s);
  addBlock(objects, 1550 + s * 2 + 70, G - s * 3, s * 2, s);
  addBlock(objects, 1550 + s * 4 + 140, G - s * 2, s * 2, s);
  addSpike(objects, 2200);
  addSpike(objects, 2380);
  addBlock(objects, 2600, G - s, s, s);
  addBlock(objects, 2600 + s + 60, G - s * 2, s, s);
  addBlock(objects, 2600 + s * 2 + 120, G - s, s * 2, s);
  addSpike(objects, 3200);
  addBlock(objects, 3450, G - s * 2, s * 3, s);
  addSpike(objects, 3450 + s * 3 + 40);
  addSpike(objects, 4000);
  addSpike(objects, 4150);
  addBlock(objects, 4400, G - s, s * 4, s);
  return 4900;
}

/** 2 — Solo pad */
function buildPads(objects) {
  addSpike(objects, 900);
  addPad(objects, 1150);
  addBlock(objects, 1450, G - S * 2, S * 3, S);
  addSpike(objects, 1450 + S * 3 + 45);
  addPad(objects, 1900);
  addBlock(objects, 2200, G - S * 3, S * 2, S);
  addSpike(objects, 2550);
  addPad(objects, 2800);
  addPad(objects, 3100);
  addBlock(objects, 3400, G - S * 2, S * 3, S);
  addSpike(objects, 3850);
  addPad(objects, 4100);
  addBlock(objects, 4450, G - S, S * 4, S);
  addSpike(objects, 5000);
  return 5400;
}

/** 3 — Orb chain */
function buildOrbs(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1100);
  addOrb(objects, 1300, G - S * 2.3);
  addBlock(objects, 1650, G - S, S * 2, S);
  addSpike(objects, 2000);
  addOrb(objects, 2200, G - S * 2.6);
  addSpike(objects, 2500);
  addOrb(objects, 2750, G - S * 3);
  addBlock(objects, 3100, G - S * 2, S * 3, S);
  addSpike(objects, 3550);
  addOrb(objects, 3750, G - S * 2.2);
  addOrb(objects, 4050, G - S * 2.8);
  addBlock(objects, 4400, G - S, S * 3, S);
  addSpike(objects, 4900);
  return 5300;
}

/** 4 — Full ship corridor */
function buildShip(objects) {
  // Open runway then obstacles
  addBlock(objects, 1000, 80, S, 130);
  addBlock(objects, 1350, G - 140, S, 140);
  addBlock(objects, 1700, 80, S, 150);
  addBlock(objects, 2050, G - 150, S, 150);
  addBlock(objects, 2400, 90, S, 160);
  addBlock(objects, 2750, G - 130, S, 130);
  addBlock(objects, 3100, 80, S, 140);
  addBlock(objects, 3450, G - 160, S, 160);
  addBlock(objects, 3800, 100, S, 150);
  addBlock(objects, 4150, G - 140, S, 140);
  addBlock(objects, 4500, 85, S, 170);
  return 5000;
}

/** 5 — Ball: bounce pads, never touch ground */
function buildBall(objects) {
  // Pads spaced for ~450 speed + bounce hang-time (~0.9–1.1s)
  const floorPads = [720, 1100, 1480, 1860, 2240, 2700, 3200, 3700, 4200, 4700];
  const ceilPads = [1300, 2050, 2950, 3450, 3950, 4450];

  // Spikes in the gaps — keep clear of pad footprints
  for (let x = 600; x < 5100; x += 70) {
    const onPad = floorPads.some((px) => x > px - 30 && x < px + S + 40);
    if (!onPad) addSpike(objects, x);
  }

  for (const x of floorPads) addPad(objects, x);
  for (const x of ceilPads) addCeilingPad(objects, x);

  // floating dodge block mid-air
  addBlock(objects, 2500, G - S * 3.4, S * 1.4, S);
  return 5200;
}

/** 6 — UFO flaps */
function buildUfo(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1150);
  addBlock(objects, 1450, G - S * 2, S * 2, S);
  addSpike(objects, 1800);
  addBlock(objects, 2100, 80, S * 6, 90);
  addSpike(objects, 2100 + S * 3);
  addSpike(objects, 2500);
  addSpike(objects, 2700);
  addBlock(objects, 3000, G - S * 3, S * 2, S);
  addBlock(objects, 3000 + S * 2 + 80, 80, S * 5, 100);
  addSpike(objects, 3600);
  addSpike(objects, 3800);
  addSpike(objects, 4000);
  addBlock(objects, 4300, G - S * 2, S * 3, S);
  addSpike(objects, 4800);
  return 5200;
}

/** 7 — Wave zigzag tunnel */
function buildWave(objects) {
  let x = 800;
  for (let i = 0; i < 12; i++) {
    const top = i % 2 === 0;
    const h = 150 + (i % 3) * 25;
    if (top) addBlock(objects, x, C, S + 8, h);
    else addBlock(objects, x, G - h, S + 8, h);
    // opposite soft hazard
    if (top) addBlock(objects, x + 120, G - 90, S, 90);
    else addBlock(objects, x + 120, C, S, 90);
    x += 280;
  }
  return x + 200;
}

/** 8 — Gravity flip cube */
function buildMirror(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1150);
  addBlock(objects, 1450, G - S, S * 3, S);
  addPortal(objects, 1850, "flip");
  // while inverted: ceiling is floor — put spikes on ceiling
  addSpikeCeil(objects, 2200);
  addSpikeCeil(objects, 2450);
  addBlock(objects, 2750, C, S * 3, S);
  addSpikeCeil(objects, 2750 + S * 3 + 50);
  addPortal(objects, 3300, "flip");
  addSpike(objects, 3650);
  addSpike(objects, 3850);
  addBlock(objects, 4150, G - S * 2, S * 3, S);
  addPortal(objects, 4600, "flip");
  addSpikeCeil(objects, 4950);
  addBlock(objects, 5200, C, S * 4, S);
  addPortal(objects, 5600, "flip");
  addSpike(objects, 5950);
  return 6400;
}

/** 9 — Mode roulette */
function buildApex(objects) {
  // cube intro
  addSpike(objects, 800);
  addSpike(objects, 1000);
  addBlock(objects, 1250, G - S, S * 2, S);
  addPortal(objects, 1600, "ship");
  addBlock(objects, 1900, 80, S, 140);
  addBlock(objects, 2200, G - 140, S, 140);
  addBlock(objects, 2500, 90, S, 150);
  addPortal(objects, 2850, "ball");
  // ball segment — pads + floor spikes (clear of pads)
  const apexPads = [3050, 3350, 3850];
  for (let x = 3000; x < 3900; x += 80) {
    if (!apexPads.some((px) => x > px - 30 && x < px + S + 40)) addSpike(objects, x);
  }
  for (const x of apexPads) addPad(objects, x);
  addCeilingPad(objects, 3600);
  addPortal(objects, 4150, "ufo");
  addSpike(objects, 4450);
  addSpike(objects, 4650);
  addBlock(objects, 4900, 80, S * 5, 100);
  addPortal(objects, 5300, "wave");
  addBlock(objects, 5600, C, S, 160);
  addBlock(objects, 5880, G - 160, S, 160);
  addBlock(objects, 6160, C, S, 180);
  addBlock(objects, 6440, G - 150, S, 150);
  addPortal(objects, 6750, "cube");
  addSpike(objects, 7050);
  addSpike(objects, 7200);
  addBlock(objects, 7450, G - S, S * 4, S);
  return 7900;
}

function add(objects, o) {
  objects.push(o);
}

function addBlock(objects, x, y, w, h) {
  objects.push({ type: "block", x, y, w, h });
}

function addSpike(objects, x) {
  objects.push({ type: "spike", x, y: G - 34, w: 34, h: 34, dir: 1 });
}

function addSpikeCeil(objects, x) {
  objects.push({ type: "spike", x, y: C, w: 34, h: 34, dir: -1 });
}

function addPad(objects, x) {
  objects.push({ type: "pad", x, y: G - 12, w: S + 8, h: 12, dir: 1 });
}

function addCeilingPad(objects, x) {
  objects.push({ type: "pad", x, y: C + 4, w: S + 8, h: 12, dir: -1 });
}

function addOrb(objects, x, y) {
  objects.push({ type: "orb", x, y, w: 34, h: 34 });
}

function addPortal(objects, x, mode) {
  objects.push({ type: "portal", x, y: G - S * 3, w: 40, h: S * 3, mode });
}
