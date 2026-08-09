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
    quirk: "Rimbalza sui pad (tap in caduta per un micro-boost). Terra = fuori.",
    bpm: 142,
    speed: 400,
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

/**
 * Hand-authored courses: long, but each stretch uses a different idea
 * instead of looping the same motif.
 */

/** 0 — Solo cubo */
function buildAurora(objects) {
  // A: open singles
  addSpike(objects, 1100);
  addSpike(objects, 1550);
  addSpike(objects, 2100);
  // B: low ledge then spike
  addBlock(objects, 2500, G - S, S * 4, S);
  addSpike(objects, 2500 + S * 4 + 100);
  // C: two-step stair
  addBlock(objects, 3100, G - S, S * 2, S);
  addBlock(objects, 3100 + S * 2, G - S * 2, S * 2, S * 2);
  addSpike(objects, 3100 + S * 4 + 80);
  // D: triple with widening gaps
  addSpike(objects, 3700);
  addSpike(objects, 3950);
  addSpike(objects, 4300);
  // E: wide plateau
  addBlock(objects, 4700, G - S, S * 7, S);
  addSpike(objects, 4700 + S * 7 + 90);
  // F: staggered doubles
  addSpike(objects, 5400);
  addSpike(objects, 5560);
  addSpike(objects, 6000);
  addSpike(objects, 6140);
  // G: tall stair climb
  addBlock(objects, 6600, G - S, S * 2, S);
  addBlock(objects, 6600 + S * 2, G - S * 2, S * 2, S * 2);
  addBlock(objects, 6600 + S * 4, G - S * 3, S * 2, S * 3);
  addSpike(objects, 6600 + S * 6 + 70);
  // H: late sparse then burst
  addSpike(objects, 7400);
  addSpike(objects, 7900);
  addSpike(objects, 8200);
  addSpike(objects, 8360);
  addSpike(objects, 8520);
  // I: finish runway
  addBlock(objects, 9000, G - S, S * 6, S);
  addSpike(objects, 9000 + S * 6 + 110);
  addBlock(objects, 9800, G - S, S * 8, S);
  return 10400;
}

/** 1 — Cubo mini */
function buildMicro(objects) {
  const s = S * CONFIG.MINI_SCALE;
  // A: tiny ledge intro
  addSpike(objects, 900);
  addBlock(objects, 1200, G - s, s * 2, s);
  addSpike(objects, 1200 + s * 2 + 50);
  // B: ascending hops
  addBlock(objects, 1600, G - s, s * 2, s);
  addBlock(objects, 1600 + s * 2 + 55, G - s * 2, s * 2, s);
  addBlock(objects, 1600 + s * 4 + 110, G - s * 3, s * 2, s);
  addSpike(objects, 1600 + s * 6 + 160);
  // C: needle pillars
  addBlock(objects, 2400, G - s, s, s);
  addBlock(objects, 2400 + s + 50, G - s * 2, s, s);
  addBlock(objects, 2400 + s * 2 + 100, G - s, s, s);
  addBlock(objects, 2400 + s * 3 + 160, G - s * 2, s, s);
  // D: gap island
  addSpike(objects, 3000);
  addBlock(objects, 3250, G - s * 2, s * 3, s);
  addSpike(objects, 3250 + s * 3 + 40);
  // E: descending terrace
  addBlock(objects, 3700, G - s * 3, s * 2, s);
  addBlock(objects, 3700 + s * 2 + 60, G - s * 2, s * 2, s);
  addBlock(objects, 3700 + s * 4 + 120, G - s, s * 3, s);
  // F: spike rhythm irregular
  addSpike(objects, 4300);
  addSpike(objects, 4480);
  addSpike(objects, 4800);
  addSpike(objects, 4920);
  addSpike(objects, 5200);
  // G: micro staircase + overhang feel
  addBlock(objects, 5550, G - s, s, s);
  addBlock(objects, 5550 + s + 40, G - s * 2, s, s);
  addBlock(objects, 5550 + s * 2 + 80, G - s * 3, s, s);
  addBlock(objects, 5550 + s * 3 + 130, G - s * 2, s * 2, s);
  // H: long thin bridge
  addBlock(objects, 6200, G - s * 2, s * 8, s);
  addSpike(objects, 6200 + s * 8 + 45);
  // I: finale clutter then pad of blocks
  addSpike(objects, 6900);
  addSpike(objects, 7050);
  addBlock(objects, 7300, G - s, s * 2, s);
  addBlock(objects, 7300 + s * 2 + 70, G - s * 2, s, s);
  addSpike(objects, 7700);
  addBlock(objects, 8000, G - s, s * 5, s);
  addSpike(objects, 8600);
  addBlock(objects, 8900, G - s, s * 6, s);
  return 9600;
}

/** 2 — Solo pad */
function buildPads(objects) {
  // A: learn the pad
  addSpike(objects, 900);
  addPad(objects, 1200);
  addBlock(objects, 1550, G - S * 2, S * 4, S);
  // B: pad over spike field
  addSpike(objects, 2100);
  addPad(objects, 2350);
  addSpike(objects, 2700);
  addSpike(objects, 2860);
  // C: double pad chain into high shelf
  addPad(objects, 3200);
  addPad(objects, 3500);
  addBlock(objects, 3850, G - S * 3, S * 3, S);
  addSpike(objects, 3850 + S * 3 + 50);
  // D: pad, land, pad from a ledge
  addBlock(objects, 4400, G - S, S * 3, S);
  addPad(objects, 4400 + S * 3 + 40);
  addBlock(objects, 5000, G - S * 2, S * 2, S);
  // E: late bounce across gap spikes
  addSpike(objects, 5400);
  addPad(objects, 5650);
  addSpike(objects, 6000);
  addPad(objects, 6250);
  addBlock(objects, 6650, G - S, S * 3, S);
  // F: pad into stair landing
  addPad(objects, 7100);
  addBlock(objects, 7450, G - S, S * 2, S);
  addBlock(objects, 7450 + S * 2, G - S * 2, S * 2, S);
  // G: sparse pads then finish shelf
  addSpike(objects, 8100);
  addPad(objects, 8400);
  addSpike(objects, 8850);
  addPad(objects, 9150);
  addBlock(objects, 9600, G - S * 2, S * 5, S);
  addSpike(objects, 10200);
  addBlock(objects, 10500, G - S, S * 6, S);
  return 11100;
}

/** 3 — Orb chain */
function buildOrbs(objects) {
  // A: first orb over one spike
  addSpike(objects, 950);
  addOrb(objects, 1200, G - S * 2.3);
  addBlock(objects, 1550, G - S, S * 3, S);
  // B: two spikes, higher orb
  addSpike(objects, 2050);
  addSpike(objects, 2220);
  addOrb(objects, 2450, G - S * 2.8);
  // C: orb into mid platform
  addSpike(objects, 2850);
  addOrb(objects, 3100, G - S * 2.4);
  addBlock(objects, 3450, G - S * 2, S * 3, S);
  addSpike(objects, 3450 + S * 3 + 55);
  // D: paired orbs (second higher)
  addSpike(objects, 4000);
  addOrb(objects, 4250, G - S * 2.2);
  addOrb(objects, 4550, G - S * 3.1);
  addBlock(objects, 4950, G - S, S * 2, S);
  // E: long approach then late orb
  addSpike(objects, 5400);
  addSpike(objects, 5650);
  addSpike(objects, 5850);
  addOrb(objects, 6150, G - S * 2.6);
  addBlock(objects, 6550, G - S * 2, S * 4, S);
  // F: orb over stairs
  addSpike(objects, 7200);
  addOrb(objects, 7450, G - S * 2.5);
  addBlock(objects, 7800, G - S, S * 2, S);
  addBlock(objects, 7800 + S * 2, G - S * 2, S * 2, S);
  // G: climax triple orb arcade
  addSpike(objects, 8400);
  addOrb(objects, 8650, G - S * 2.3);
  addSpike(objects, 8950);
  addOrb(objects, 9200, G - S * 2.9);
  addSpike(objects, 9550);
  addOrb(objects, 9800, G - S * 2.4);
  addBlock(objects, 10200, G - S, S * 5, S);
  addSpike(objects, 10800);
  return 11200;
}

/** 4 — Astronave: varied altitudes / openings */
function buildShip(objects) {
  // A: gentle openers
  addBlock(objects, 1000, 90, S, 110);
  addBlock(objects, 1400, G - 120, S, 120);
  // B: high ceiling squeeze
  addBlock(objects, 1850, 70, S, 180);
  addBlock(objects, 2200, 70, S, 160);
  // C: floor teeth
  addBlock(objects, 2650, G - 160, S, 160);
  addBlock(objects, 2950, G - 130, S, 130);
  addBlock(objects, 3250, G - 170, S, 170);
  // D: wide open breath then tall gate
  addBlock(objects, 3900, 100, S, 140);
  addBlock(objects, 3900, G - 100, S, 100);
  // E: diagonal-ish zig with uneven spacing
  addBlock(objects, 4400, 80, S, 150);
  addBlock(objects, 4800, G - 150, S, 150);
  addBlock(objects, 5100, 90, S, 170);
  addBlock(objects, 5550, G - 120, S, 120);
  // F: narrow mid corridor
  addBlock(objects, 6000, 80, S, 200);
  addBlock(objects, 6000, G - 90, S, 90);
  addBlock(objects, 6400, 100, S, 180);
  addBlock(objects, 6400, G - 110, S, 110);
  // G: staggered pillars
  addBlock(objects, 6900, G - 140, S, 140);
  addBlock(objects, 7200, 85, S, 155);
  addBlock(objects, 7600, G - 165, S, 165);
  addBlock(objects, 8000, 75, S, 175);
  // H: finale slalom
  addBlock(objects, 8500, G - 130, S, 130);
  addBlock(objects, 8750, 90, S, 160);
  addBlock(objects, 9050, G - 150, S, 150);
  addBlock(objects, 9400, 100, S, 140);
  addBlock(objects, 9750, G - 170, S, 170);
  addBlock(objects, 10150, 80, S, 150);
  // I: last surprise — low floor then tall ceiling
  addBlock(objects, 10600, G - 100, S * 2, 100);
  addBlock(objects, 11000, 70, S, 210);
  addBlock(objects, 11350, G - 155, S, 155);
  addBlock(objects, 11700, 95, S, 145);
  return 12100;
}

/** 5 — Pallina: mixed bounce routes */
function buildBall(objects) {
  // Single floor-bounce chain. Hang ≈ 0.85s × 400 ≈ 340px; gap 335 matches travel.
  const gap = 335;
  const padW = 150;
  const introPad = { x: 500, w: 180 };
  const count = 30;
  let x = 1000;
  const floorPads = [];
  for (let i = 0; i < count; i++) {
    const w = i % 7 === 3 ? 190 : padW; // occasional wider safe pad
    floorPads.push({ x, w });
    x += gap;
  }
  // Long outro strip — finish is while airborne after this bounce
  floorPads.push({ x, w: 280 });
  const end = x + 220;

  const covers = [
    [introPad.x - 40, introPad.x + introPad.w + 40],
    ...floorPads.map((p) => [p.x - 50, p.x + p.w + 40]),
  ];
  for (let sx = 420; sx < end; sx += 56) {
    if (!covers.some(([a, b]) => sx > a && sx < b)) addSpike(objects, sx);
  }

  objects.push({ type: "pad", x: introPad.x, y: G - 12, w: introPad.w, h: 14, dir: 1 });
  for (const p of floorPads) {
    objects.push({ type: "pad", x: p.x, y: G - 12, w: p.w, h: 14, dir: 1 });
  }

  // Decor only — above the bounce apex so they never clip the ball
  addBlock(objects, 2800, 90, S * 2, S);
  addBlock(objects, 5200, 100, S * 2.5, S);
  addBlock(objects, 7600, 85, S * 2, S);

  return end;
}

/** 6 — UFO: altitude puzzles */
function buildUfo(objects) {
  // A: ground spikes
  addSpike(objects, 950);
  addSpike(objects, 1200);
  addSpike(objects, 1550);
  // B: low shelf
  addBlock(objects, 1900, G - S * 2, S * 3, S);
  addSpike(objects, 1900 + S * 3 + 60);
  // C: long ceiling bar — fly under
  addBlock(objects, 2500, 80, S * 8, 95);
  addSpike(objects, 2500 + S * 3);
  addSpike(objects, 2500 + S * 6);
  // D: rise over a tall block
  addSpike(objects, 3400);
  addBlock(objects, 3700, G - S * 3, S * 2, S * 2);
  // E: sandwich: ceiling + floor hazard
  addBlock(objects, 4200, 80, S * 5, 110);
  addSpike(objects, 4350);
  addSpike(objects, 4550);
  // F: floating mid platforms to weave
  addBlock(objects, 5100, G - S * 2.5, S * 2, S);
  addBlock(objects, 5450, 160, S * 3, S);
  addSpike(objects, 5800);
  // G: spike storm low
  addSpike(objects, 6200);
  addSpike(objects, 6360);
  addSpike(objects, 6520);
  addSpike(objects, 6800);
  // H: high ceiling cave then drop
  addBlock(objects, 7200, 70, S * 7, 130);
  addSpike(objects, 7500);
  // I: finale shelves
  addBlock(objects, 8100, G - S * 2, S * 2, S);
  addSpike(objects, 8450);
  addBlock(objects, 8750, 90, S * 4, 100);
  addSpike(objects, 9200);
  addSpike(objects, 9400);
  addBlock(objects, 9750, G - S * 2, S * 4, S);
  // J: last altitude switch — low spikes then tall mid shelf
  addSpike(objects, 10350);
  addSpike(objects, 10550);
  addBlock(objects, 10900, 140, S * 3, S);
  addSpike(objects, 11400);
  addBlock(objects, 11750, G - S * 3, S * 2, S);
  addBlock(objects, 12200, 80, S * 5, 110);
  return 12800;
}

/** 7 — Onda: changing tunnel shapes */
function buildWave(objects) {
  let x = 850;
  // A: soft intro teeth
  addBlock(objects, x, C, S + 8, 120);
  addBlock(objects, x + 140, G - 100, S, 100);
  x = 1300;
  // B: deep floor bite
  addBlock(objects, x, G - 200, S + 8, 200);
  addBlock(objects, x + 160, C, S, 90);
  x = 1750;
  // C: high ceiling hang
  addBlock(objects, x, C, S + 8, 210);
  addBlock(objects, x + 150, G - 80, S, 80);
  x = 2200;
  // D: double gate narrow
  addBlock(objects, x, C, S, 170);
  addBlock(objects, x, G - 120, S, 120);
  x = 2600;
  addBlock(objects, x, C, S, 150);
  addBlock(objects, x, G - 140, S, 140);
  x = 3050;
  // E: asymmetric zig
  addBlock(objects, x, C, S + 8, 140);
  addBlock(objects, x + 200, G - 180, S + 8, 180);
  addBlock(objects, x + 420, C, S + 8, 190);
  x = 3800;
  // F: open then sudden floor wall
  addBlock(objects, x, G - 90, S, 90);
  addBlock(objects, x + 280, G - 220, S + 8, 220);
  addBlock(objects, x + 280, C, S, 80);
  x = 4500;
  // G: descending ceiling steps
  addBlock(objects, x, C, S + 10, 130);
  addBlock(objects, x + 220, C, S + 10, 170);
  addBlock(objects, x + 440, C, S + 10, 210);
  addBlock(objects, x + 200, G - 70, S, 70);
  addBlock(objects, x + 420, G - 70, S, 70);
  x = 5300;
  // H: rising floor steps
  addBlock(objects, x, G - 120, S + 10, 120);
  addBlock(objects, x + 230, G - 170, S + 10, 170);
  addBlock(objects, x + 460, G - 210, S + 10, 210);
  addBlock(objects, x + 100, C, S, 80);
  addBlock(objects, x + 340, C, S, 80);
  x = 6200;
  // I: staggered pillars uneven gaps
  addBlock(objects, x, C, S, 160);
  addBlock(objects, x + 300, G - 150, S, 150);
  addBlock(objects, x + 520, C, S, 190);
  addBlock(objects, x + 820, G - 170, S, 170);
  addBlock(objects, x + 1100, C, S, 140);
  x = 7800;
  // J: choke points
  addBlock(objects, x, C, S, 200);
  addBlock(objects, x, G - 95, S, 95);
  addBlock(objects, x + 320, C, S, 100);
  addBlock(objects, x + 320, G - 200, S, 200);
  x = 8600;
  // K: finale wave of mixed heights
  addBlock(objects, x, C, S + 8, 150);
  addBlock(objects, x + 250, G - 160, S + 8, 160);
  addBlock(objects, x + 520, C, S + 8, 180);
  addBlock(objects, x + 780, G - 140, S + 8, 140);
  addBlock(objects, x + 1050, C, S, 160);
  addBlock(objects, x + 1050, G - 120, S, 120);
  x = 10000;
  // L: slow open then brutal close
  addBlock(objects, x, G - 80, S, 80);
  addBlock(objects, x + 350, C, S + 12, 230);
  addBlock(objects, x + 650, G - 190, S + 12, 190);
  addBlock(objects, x + 950, C, S, 120);
  addBlock(objects, x + 950, G - 150, S, 150);
  return 11400;
}

/** 8 — Gravità: each flip section tells a different joke */
function buildMirror(objects) {
  // A: normal warm-up
  addSpike(objects, 900);
  addSpike(objects, 1200);
  addBlock(objects, 1550, G - S, S * 3, S);
  addPortal(objects, 1950, "flip");
  // B: inverted — ceiling singles
  addSpikeCeil(objects, 2350);
  addSpikeCeil(objects, 2700);
  addBlock(objects, 3100, C, S * 4, S);
  addPortal(objects, 3600, "flip");
  // C: normal — stair then flip mid-air vibe
  addSpike(objects, 4000);
  addBlock(objects, 4300, G - S, S * 2, S);
  addBlock(objects, 4300 + S * 2, G - S * 2, S * 2, S);
  addPortal(objects, 4800, "flip");
  // D: inverted — dense ceiling spikes + short ledge
  addSpikeCeil(objects, 5150);
  addSpikeCeil(objects, 5320);
  addSpikeCeil(objects, 5490);
  addBlock(objects, 5800, C, S * 2, S);
  addSpikeCeil(objects, 5800 + S * 2 + 50);
  addPortal(objects, 6300, "flip");
  // E: normal — long quiet then sudden pair
  addSpike(objects, 6800);
  addSpike(objects, 7300);
  addSpike(objects, 7480);
  addPortal(objects, 7900, "flip");
  // F: inverted — wide ceiling runway
  addBlock(objects, 8300, C, S * 6, S);
  addSpikeCeil(objects, 8300 + S * 6 + 80);
  addSpikeCeil(objects, 9000);
  addPortal(objects, 9400, "flip");
  // G: normal — platform hop
  addSpike(objects, 9800);
  addSpike(objects, 10000);
  addBlock(objects, 10350, G - S, S * 2, S);
  addSpike(objects, 10350 + S * 2 + 70);
  addPortal(objects, 10900, "flip");
  // H: inverted short burst then back
  addSpikeCeil(objects, 11300);
  addBlock(objects, 11650, C, S * 3, S);
  addSpikeCeil(objects, 11650 + S * 3 + 60);
  addPortal(objects, 12200, "flip");
  addSpike(objects, 12600);
  addBlock(objects, 12950, G - S, S * 5, S);
  return 13500;
}

/** 9 — Roulette: each mode segment is a short unique scene */
function buildApex(objects) {
  // Cube cold open
  addSpike(objects, 850);
  addSpike(objects, 1150);
  addBlock(objects, 1500, G - S, S * 3, S);
  addSpike(objects, 1500 + S * 3 + 80);
  addSpike(objects, 2050);
  addBlock(objects, 2350, G - S, S * 2, S);
  addBlock(objects, 2350 + S * 2, G - S * 2, S * 2, S);

  // Ship — open then squeeze
  addPortal(objects, 2900, "ship");
  addBlock(objects, 3250, 90, S, 130);
  addBlock(objects, 3600, G - 150, S, 150);
  addBlock(objects, 4000, 80, S, 180);
  addBlock(objects, 4000, G - 100, S, 100);
  addBlock(objects, 4450, G - 140, S, 140);
  addBlock(objects, 4800, 100, S, 160);

  // Ball — bounce path with one ceiling divert
  addPortal(objects, 5200, "ball");
  const pads = [5450, 5850, 6300, 6750, 7200];
  for (let sx = 5300; sx < 7500; sx += 80) {
    if (!pads.some((px) => sx > px - 30 && sx < px + S + 40)) addSpike(objects, sx);
  }
  for (const px of pads) addPad(objects, px);
  addCeilingPad(objects, 6550);
  addBlock(objects, 7000, G - S * 3.4, S * 1.3, S);

  // UFO — under bar then over shelf
  addPortal(objects, 7600, "ufo");
  addSpike(objects, 7900);
  addSpike(objects, 8100);
  addBlock(objects, 8400, 80, S * 6, 100);
  addSpike(objects, 8600);
  addBlock(objects, 9100, G - S * 2.5, S * 2, S);
  addSpike(objects, 9500);

  // Wave — three shape changes only
  addPortal(objects, 9850, "wave");
  addBlock(objects, 10150, C, S, 160);
  addBlock(objects, 10150, G - 110, S, 110);
  addBlock(objects, 10550, C, S + 8, 200);
  addBlock(objects, 10550 + 160, G - 90, S, 90);
  addBlock(objects, 11000, G - 180, S + 8, 180);
  addBlock(objects, 11000, C, S, 100);
  addBlock(objects, 11400, C, S, 150);
  addBlock(objects, 11400, G - 130, S, 130);

  // Cube landing strip
  addPortal(objects, 11850, "cube");
  addSpike(objects, 12200);
  addSpike(objects, 12450);
  addBlock(objects, 12800, G - S, S * 3, S);
  addSpike(objects, 12800 + S * 3 + 70);
  addSpike(objects, 13400);
  addBlock(objects, 13750, G - S, S * 6, S);
  return 14400;
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
