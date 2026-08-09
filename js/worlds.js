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

/** 0 — Solo cubo: spike e blocchi semplici (~35s) */
function buildAurora(objects) {
  let x = 1000;
  // Warm-up singles
  for (let i = 0; i < 6; i++) {
    addSpike(objects, x);
    x += 420 + (i % 3) * 40;
  }
  // Platform islands
  for (let i = 0; i < 4; i++) {
    addBlock(objects, x, G - S, S * (3 + (i % 2)), S);
    addSpike(objects, x + S * 3 + 90);
    x += S * 4 + 380;
    addSpike(objects, x);
    x += 350;
  }
  // Double spike packs
  for (let i = 0; i < 5; i++) {
    addSpike(objects, x);
    addSpike(objects, x + 160);
    x += 480;
  }
  // Stairs + landing
  addBlock(objects, x, G - S, S * 2, S);
  addBlock(objects, x + S * 2, G - S * 2, S * 2, S * 2);
  x += S * 4 + 100;
  addSpike(objects, x);
  x += 320;
  addSpike(objects, x);
  x += 280;
  addBlock(objects, x, G - S, S * 5, S);
  x += S * 5 + 200;
  for (let i = 0; i < 4; i++) {
    addSpike(objects, x);
    x += 300 + i * 20;
  }
  addBlock(objects, x, G - S, S * 6, S);
  return x + S * 6 + 350;
}

/** 1 — Cubo mini: piattaforme strette (~35s) */
function buildMicro(objects) {
  const s = S * CONFIG.MINI_SCALE;
  let x = 900;
  addSpike(objects, x);
  x += 280;
  for (let i = 0; i < 3; i++) {
    addBlock(objects, x, G - s, s * 2, s);
    addSpike(objects, x + s * 2 + 45);
    x += s * 2 + 280;
    addBlock(objects, x, G - s * 2, s * 2, s);
    addBlock(objects, x + s * 2 + 60, G - s * 3, s * 2, s);
    addBlock(objects, x + s * 4 + 120, G - s * 2, s * 2, s);
    x += s * 6 + 320;
    addSpike(objects, x);
    addSpike(objects, x + 140);
    x += 360;
  }
  for (let i = 0; i < 6; i++) {
    addBlock(objects, x, G - s * (1 + (i % 3)), s * (1 + (i % 2)), s);
    x += s * 2 + 70 + (i % 2) * 30;
  }
  x += 120;
  for (let i = 0; i < 5; i++) {
    addSpike(objects, x);
    x += 200 + (i % 2) * 40;
  }
  addBlock(objects, x, G - s * 2, s * 3, s);
  x += s * 3 + 80;
  addSpike(objects, x);
  x += 280;
  addBlock(objects, x, G - s, s * 4, s);
  return x + s * 4 + 400;
}

/** 2 — Solo pad (~35s) */
function buildPads(objects) {
  let x = 900;
  addSpike(objects, x);
  x += 250;
  for (let i = 0; i < 8; i++) {
    addPad(objects, x);
    x += 320;
    if (i % 2 === 0) {
      addBlock(objects, x, G - S * (2 + (i % 2)), S * (2 + (i % 2)), S);
      x += S * 3 + 120;
      addSpike(objects, x);
      x += 220;
    } else {
      addSpike(objects, x);
      x += 200;
      addPad(objects, x);
      x += 340;
    }
  }
  for (let i = 0; i < 4; i++) {
    addPad(objects, x);
    x += 280;
  }
  addBlock(objects, x, G - S, S * 5, S);
  x += S * 5 + 180;
  addSpike(objects, x);
  x += 300;
  addPad(objects, x);
  x += 360;
  addBlock(objects, x, G - S * 2, S * 4, S);
  return x + S * 4 + 400;
}

/** 3 — Orb chain (~35s) */
function buildOrbs(objects) {
  let x = 900;
  addSpike(objects, x);
  addSpike(objects, x + 180);
  x += 400;
  for (let i = 0; i < 7; i++) {
    addOrb(objects, x, G - S * (2.2 + (i % 3) * 0.35));
    x += 280;
    addSpike(objects, x);
    x += 200;
    if (i % 2 === 0) {
      addBlock(objects, x, G - S * (1 + (i % 2)), S * 2, S);
      x += S * 2 + 160;
    } else {
      addSpike(objects, x);
      x += 180;
      addOrb(objects, x, G - S * 2.7);
      x += 300;
    }
  }
  addBlock(objects, x, G - S * 2, S * 3, S);
  x += S * 3 + 140;
  addOrb(objects, x, G - S * 2.4);
  x += 320;
  addSpike(objects, x);
  addSpike(objects, x + 150);
  x += 400;
  addOrb(objects, x, G - S * 3);
  x += 340;
  addBlock(objects, x, G - S, S * 4, S);
  return x + S * 4 + 400;
}

/** 4 — Full ship corridor (~35s) */
function buildShip(objects) {
  let x = 900;
  for (let i = 0; i < 22; i++) {
    const top = i % 2 === 0;
    const h = 120 + (i % 4) * 18;
    if (top) addBlock(objects, x, 70 + (i % 3) * 10, S, h);
    else addBlock(objects, x, G - h, S, h);
    x += 300 + (i % 3) * 20;
  }
  // tighter finale
  for (let i = 0; i < 6; i++) {
    const top = i % 2 === 0;
    const h = 150 + (i % 2) * 20;
    if (top) addBlock(objects, x, 80, S, h);
    else addBlock(objects, x, G - h, S, h);
    x += 260;
  }
  return x + 350;
}

/** 5 — Ball: bounce pads, never touch ground (~35s) */
function buildBall(objects) {
  const floorPads = [];
  const ceilPads = [];
  let x = 700;
  for (let i = 0; i < 18; i++) {
    floorPads.push(x);
    x += 360 + (i % 3) * 20;
    if (i % 2 === 0) {
      ceilPads.push(x - 160);
    }
  }
  const end = x + 200;

  for (let sx = 600; sx < end; sx += 70) {
    const onPad = floorPads.some((px) => sx > px - 30 && sx < px + S + 40);
    if (!onPad) addSpike(objects, sx);
  }

  for (const px of floorPads) addPad(objects, px);
  for (const px of ceilPads) addCeilingPad(objects, px);

  // mid-air dodge blocks
  addBlock(objects, 2500, G - S * 3.4, S * 1.4, S);
  addBlock(objects, 4200, G - S * 3.6, S * 1.2, S);
  addBlock(objects, 6100, G - S * 3.2, S * 1.4, S);
  return end;
}

/** 6 — UFO flaps (~35s) */
function buildUfo(objects) {
  let x = 900;
  for (let i = 0; i < 5; i++) {
    addSpike(objects, x);
    addSpike(objects, x + 180);
    x += 400;
    addBlock(objects, x, G - S * (2 + (i % 2)), S * 2, S);
    x += S * 2 + 200;
    // ceiling overhang
    addBlock(objects, x, 80, S * (4 + (i % 2)), 90 + (i % 3) * 10);
    addSpike(objects, x + S * 2);
    x += S * 5 + 220;
    addSpike(objects, x);
    addSpike(objects, x + 160);
    addSpike(objects, x + 320);
    x += 500;
  }
  addBlock(objects, x, G - S * 2, S * 3, S);
  x += S * 3 + 160;
  addSpike(objects, x);
  x += 280;
  addBlock(objects, x, 80, S * 6, 100);
  return x + S * 6 + 400;
}

/** 7 — Wave zigzag tunnel (~35s) */
function buildWave(objects) {
  let x = 800;
  for (let i = 0; i < 28; i++) {
    const top = i % 2 === 0;
    const h = 140 + (i % 4) * 22;
    if (top) addBlock(objects, x, C, S + 8, h);
    else addBlock(objects, x, G - h, S + 8, h);
    if (top) addBlock(objects, x + 120, G - 90 - (i % 3) * 10, S, 90 + (i % 3) * 10);
    else addBlock(objects, x + 120, C, S, 90 + (i % 3) * 10);
    x += 270 + (i % 3) * 15;
  }
  return x + 250;
}

/** 8 — Gravity flip cube (~38s) */
function buildMirror(objects) {
  let x = 900;
  for (let cycle = 0; cycle < 4; cycle++) {
    addSpike(objects, x);
    addSpike(objects, x + 180);
    x += 400;
    addBlock(objects, x, G - S * (1 + (cycle % 2)), S * 3, S);
    x += S * 3 + 160;
    addPortal(objects, x, "flip");
    x += 320;
    // inverted section
    addSpikeCeil(objects, x);
    addSpikeCeil(objects, x + 180);
    x += 400;
    addBlock(objects, x, C, S * 3, S);
    addSpikeCeil(objects, x + S * 3 + 50);
    x += S * 4 + 200;
    addPortal(objects, x, "flip");
    x += 300;
  }
  addSpike(objects, x);
  addSpike(objects, x + 160);
  x += 380;
  addBlock(objects, x, G - S, S * 5, S);
  return x + S * 5 + 400;
}

/** 9 — Mode roulette (~40s) */
function buildApex(objects) {
  let x = 800;
  // cube intro
  for (let i = 0; i < 4; i++) {
    addSpike(objects, x);
    x += 200;
  }
  addBlock(objects, x, G - S, S * 2, S);
  x += S * 2 + 180;

  addPortal(objects, x, "ship");
  x += 280;
  for (let i = 0; i < 8; i++) {
    const top = i % 2 === 0;
    const h = 130 + (i % 3) * 15;
    if (top) addBlock(objects, x, 80, S, h);
    else addBlock(objects, x, G - h, S, h);
    x += 280;
  }

  addPortal(objects, x, "ball");
  x += 200;
  const ballStart = x;
  const apexPads = [];
  for (let i = 0; i < 6; i++) {
    apexPads.push(x);
    x += 340;
  }
  for (let sx = ballStart - 40; sx < x; sx += 80) {
    if (!apexPads.some((px) => sx > px - 30 && sx < px + S + 40)) addSpike(objects, sx);
  }
  for (const px of apexPads) addPad(objects, px);
  addCeilingPad(objects, apexPads[2] + 160);
  addCeilingPad(objects, apexPads[4] + 160);

  addPortal(objects, x, "ufo");
  x += 280;
  for (let i = 0; i < 5; i++) {
    addSpike(objects, x);
    addSpike(objects, x + 170);
    x += 360;
    if (i % 2 === 0) {
      addBlock(objects, x, 80, S * 5, 100);
      x += S * 5 + 160;
    }
  }

  addPortal(objects, x, "wave");
  x += 260;
  for (let i = 0; i < 10; i++) {
    const top = i % 2 === 0;
    const h = 150 + (i % 3) * 18;
    if (top) addBlock(objects, x, C, S, h);
    else addBlock(objects, x, G - h, S, h);
    x += 260;
  }

  addPortal(objects, x, "cube");
  x += 280;
  for (let i = 0; i < 6; i++) {
    addSpike(objects, x);
    x += 180 + (i % 2) * 30;
  }
  addBlock(objects, x, G - S, S * 5, S);
  return x + S * 5 + 400;
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
