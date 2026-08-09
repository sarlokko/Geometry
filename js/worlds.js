import { CONFIG } from "./config.js?v=20260809e";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;
const C = CONFIG.CEILING_Y;

/**
 * 6 single-power worlds + 4 multi-power worlds.
 */
export const WORLDS = [
  {
    id: 0,
    name: "Cubo Base",
    subtitle: "Solo cubo",
    quirk: "Salti classici: niente gadget, solo timing.",
    bpm: 108,
    speed: 320,
    startMode: "cube",
    colors: theme("#071526", "#16385a", "#39f0c0", "#1c4d6e", "#7ee7ff"),
  },
  {
    id: 1,
    name: "Astronave",
    subtitle: "Hold to fly",
    quirk: "Tieni premuto per salire, rilascia per scendere.",
    bpm: 128,
    speed: 420,
    startMode: "ship",
    colors: theme("#061820", "#0f3640", "#39f0c0", "#14505a", "#7ee7ff"),
  },
  {
    id: 2,
    name: "Sottosopra",
    subtitle: "Gravità",
    quirk: "I portali invertiti scambiano suolo e soffitto.",
    bpm: 136,
    speed: 400,
    startMode: "cube",
    colors: theme("#050510", "#12122a", "#7b5cff", "#2a2460", "#b8a0ff"),
  },
  {
    id: 3,
    name: "Zigzag",
    subtitle: "Onda",
    quirk: "Hold = su, rilascia = giù. Toccare qualcosa = morte.",
    bpm: 148,
    speed: 500,
    startMode: "wave",
    lethalGround: true,
    lethalCeiling: true,
    colors: theme("#100818", "#2a1438", "#ff7ad9", "#4a2058", "#ffb0ec"),
  },
  {
    id: 4,
    name: "Muri",
    subtitle: "Rimbalzo",
    quirk: "Pallina sui muri: tap per invertire la gravità tra suolo e soffitto.",
    bpm: 140,
    speed: 390,
    startMode: "ball",
    ballKind: "walls",
    colors: theme("#0a1a22", "#163040", "#6ad0ff", "#1a4a5a", "#9fd8ff"),
  },
  {
    id: 5,
    name: "Pallini",
    subtitle: "Orbs gialle",
    quirk: "Devi prendere i pallini gialli: senza di loro cadi.",
    bpm: 144,
    speed: 400,
    startMode: "ball",
    ballKind: "pads",
    lethalGround: true,
    colors: theme("#1a1008", "#3a2810", "#ffd84a", "#5a3a18", "#ffd08a"),
  },
  {
    id: 6,
    name: "Doppio Varco",
    subtitle: "Cubo · Nave · Flip",
    quirk: "Tre poteri nello stesso run: cubo, astronave e sottosopra.",
    bpm: 150,
    speed: 440,
    startMode: "cube",
    colors: theme("#0c1420", "#1a2840", "#4dffc2", "#243860", "#8ef0ff"),
  },
  {
    id: 7,
    name: "Rift Mix",
    subtitle: "Nave · Zigzag · Cubo",
    quirk: "Astronave e onda zigzag nello stesso livello.",
    bpm: 154,
    speed: 480,
    startMode: "ship",
    colors: theme("#12081a", "#2a1438", "#ff8ec4", "#3a2050", "#ffb0ec"),
  },
  {
    id: 8,
    name: "Rimbalzi",
    subtitle: "Muri · Pallini · Cubo",
    quirk: "Rimbalzo sui muri e poi i pallini gialli obbligatori.",
    bpm: 158,
    speed: 430,
    startMode: "ball",
    ballKind: "walls",
    colors: theme("#141008", "#2a2210", "#ffb347", "#4a3818", "#ffe08a"),
  },
  {
    id: 9,
    name: "Neon Apex",
    subtitle: "Tutti i poteri",
    quirk: "Cubo, nave, flip, zigzag, muri e pallini nello stesso run.",
    bpm: 164,
    speed: 520,
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

/** @typedef {{ type: string, x: number, y: number, w?: number, h?: number, mode?: string, dir?: number, ballKind?: string }} LevelObject */

/**
 * @param {number} worldId
 * @returns {{ length: number, objects: LevelObject[], world: typeof WORLDS[0] }}
 */
export function createWorldLevel(worldId) {
  const world = WORLDS[clampWorld(worldId)];
  const builders = [
    buildCube,
    buildShip,
    buildMirror,
    buildWave,
    buildWallBall,
    buildYellowOrbs,
    buildMixTriple,
    buildMixRift,
    buildMixBounce,
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

/** 0 — Cubo base */
function buildCube(objects) {
  addSpike(objects, 1100);
  addSpike(objects, 1550);
  addSpike(objects, 2100);
  addBlock(objects, 2500, G - S, S * 4, S);
  addSpike(objects, 2500 + S * 4 + 100);
  addBlock(objects, 3100, G - S, S * 2, S);
  addBlock(objects, 3100 + S * 2, G - S * 2, S * 2, S * 2);
  addSpike(objects, 3100 + S * 4 + 80);
  addSpike(objects, 3700);
  addSpike(objects, 3950);
  addSpike(objects, 4300);
  addBlock(objects, 4700, G - S, S * 7, S);
  addSpike(objects, 4700 + S * 7 + 90);
  addSpike(objects, 5400);
  addSpike(objects, 5560);
  addSpike(objects, 6000);
  addSpike(objects, 6140);
  addBlock(objects, 6600, G - S, S * 2, S);
  addBlock(objects, 6600 + S * 2, G - S * 2, S * 2, S * 2);
  addBlock(objects, 6600 + S * 4, G - S * 3, S * 2, S * 3);
  addSpike(objects, 6600 + S * 6 + 70);
  addSpike(objects, 7400);
  addSpike(objects, 7900);
  addSpike(objects, 8200);
  addSpike(objects, 8360);
  addSpike(objects, 8520);
  addBlock(objects, 9000, G - S, S * 6, S);
  addSpike(objects, 9000 + S * 6 + 110);
  addBlock(objects, 9800, G - S, S * 8, S);
  return 10400;
}

/** 1 — Astronave */
function buildShip(objects) {
  addBlock(objects, 1000, 90, S, 110);
  addBlock(objects, 1400, G - 120, S, 120);
  addBlock(objects, 1850, 70, S, 180);
  addBlock(objects, 2200, 70, S, 160);
  addBlock(objects, 2650, G - 160, S, 160);
  addBlock(objects, 2950, G - 130, S, 130);
  addBlock(objects, 3250, G - 170, S, 170);
  addBlock(objects, 3900, 100, S, 140);
  addBlock(objects, 3900, G - 100, S, 100);
  addBlock(objects, 4400, 80, S, 150);
  addBlock(objects, 4800, G - 150, S, 150);
  addBlock(objects, 5100, 90, S, 170);
  addBlock(objects, 5550, G - 120, S, 120);
  addBlock(objects, 6000, 80, S, 200);
  addBlock(objects, 6000, G - 90, S, 90);
  addBlock(objects, 6400, 100, S, 180);
  addBlock(objects, 6400, G - 110, S, 110);
  addBlock(objects, 6900, G - 140, S, 140);
  addBlock(objects, 7200, 85, S, 155);
  addBlock(objects, 7600, G - 165, S, 165);
  addBlock(objects, 8000, 75, S, 175);
  addBlock(objects, 8500, G - 130, S, 130);
  addBlock(objects, 8750, 90, S, 160);
  addBlock(objects, 9050, G - 150, S, 150);
  addBlock(objects, 9400, 100, S, 140);
  addBlock(objects, 9750, G - 170, S, 170);
  addBlock(objects, 10150, 80, S, 150);
  addBlock(objects, 10600, G - 100, S * 2, 100);
  addBlock(objects, 11000, 70, S, 210);
  addBlock(objects, 11350, G - 155, S, 155);
  addBlock(objects, 11700, 95, S, 145);
  return 12100;
}

/** 2 — Sottosopra */
function buildMirror(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1200);
  addBlock(objects, 1550, G - S, S * 3, S);
  addPortal(objects, 1950, "flip");
  addSpikeCeil(objects, 2350);
  addSpikeCeil(objects, 2700);
  addBlock(objects, 3100, C, S * 4, S);
  addPortal(objects, 3600, "flip");
  addSpike(objects, 4000);
  addBlock(objects, 4300, G - S, S * 2, S);
  addBlock(objects, 4300 + S * 2, G - S * 2, S * 2, S);
  addPortal(objects, 4800, "flip");
  addSpikeCeil(objects, 5150);
  addSpikeCeil(objects, 5320);
  addSpikeCeil(objects, 5490);
  addBlock(objects, 5800, C, S * 2, S);
  addSpikeCeil(objects, 5800 + S * 2 + 50);
  addPortal(objects, 6300, "flip");
  addSpike(objects, 6800);
  addSpike(objects, 7300);
  addSpike(objects, 7480);
  addPortal(objects, 7900, "flip");
  addBlock(objects, 8300, C, S * 6, S);
  addSpikeCeil(objects, 8300 + S * 6 + 80);
  addSpikeCeil(objects, 9000);
  addPortal(objects, 9400, "flip");
  addSpike(objects, 9800);
  addSpike(objects, 10000);
  addBlock(objects, 10350, G - S, S * 2, S);
  addSpike(objects, 10350 + S * 2 + 70);
  addPortal(objects, 10900, "flip");
  addSpikeCeil(objects, 11300);
  addBlock(objects, 11650, C, S * 3, S);
  addSpikeCeil(objects, 11650 + S * 3 + 60);
  addPortal(objects, 12200, "flip");
  addSpike(objects, 12600);
  addBlock(objects, 12950, G - S, S * 5, S);
  return 13500;
}

/** 3 — Zigzag onda */
function buildWave(objects) {
  let x = 850;
  addBlock(objects, x, C, S + 8, 120);
  addBlock(objects, x + 140, G - 100, S, 100);
  x = 1300;
  addBlock(objects, x, G - 200, S + 8, 200);
  addBlock(objects, x + 160, C, S, 90);
  x = 1750;
  addBlock(objects, x, C, S + 8, 210);
  addBlock(objects, x + 150, G - 80, S, 80);
  x = 2200;
  addBlock(objects, x, C, S, 170);
  addBlock(objects, x, G - 120, S, 120);
  x = 2600;
  addBlock(objects, x, C, S, 150);
  addBlock(objects, x, G - 140, S, 140);
  x = 3050;
  addBlock(objects, x, C, S + 8, 140);
  addBlock(objects, x + 200, G - 180, S + 8, 180);
  addBlock(objects, x + 420, C, S + 8, 190);
  x = 3800;
  addBlock(objects, x, G - 90, S, 90);
  addBlock(objects, x + 280, G - 220, S + 8, 220);
  addBlock(objects, x + 280, C, S, 80);
  x = 4500;
  addBlock(objects, x, C, S + 10, 130);
  addBlock(objects, x + 220, C, S + 10, 170);
  addBlock(objects, x + 440, C, S + 10, 210);
  addBlock(objects, x + 200, G - 70, S, 70);
  addBlock(objects, x + 420, G - 70, S, 70);
  x = 5300;
  addBlock(objects, x, G - 120, S + 10, 120);
  addBlock(objects, x + 230, G - 170, S + 10, 170);
  addBlock(objects, x + 460, G - 210, S + 10, 210);
  addBlock(objects, x + 100, C, S, 80);
  addBlock(objects, x + 340, C, S, 80);
  x = 6200;
  addBlock(objects, x, C, S, 160);
  addBlock(objects, x + 300, G - 150, S, 150);
  addBlock(objects, x + 520, C, S, 190);
  addBlock(objects, x + 820, G - 170, S, 170);
  addBlock(objects, x + 1100, C, S, 140);
  x = 7800;
  addBlock(objects, x, C, S, 200);
  addBlock(objects, x, G - 95, S, 95);
  addBlock(objects, x + 320, C, S, 100);
  addBlock(objects, x + 320, G - 200, S, 200);
  x = 8600;
  addBlock(objects, x, C, S + 8, 150);
  addBlock(objects, x + 250, G - 160, S + 8, 160);
  addBlock(objects, x + 520, C, S + 8, 180);
  addBlock(objects, x + 780, G - 140, S + 8, 140);
  addBlock(objects, x + 1050, C, S, 160);
  addBlock(objects, x + 1050, G - 120, S, 120);
  x = 10000;
  addBlock(objects, x, G - 80, S, 80);
  addBlock(objects, x + 350, C, S + 12, 230);
  addBlock(objects, x + 650, G - 190, S + 12, 190);
  addBlock(objects, x + 950, C, S, 120);
  addBlock(objects, x + 950, G - 150, S, 150);
  return 11400;
}

/** 4 — Rimbalzo sui muri (tap = flip gravità) */
function buildWallBall(objects) {
  // Floor stretch with spikes forcing ceiling flips
  addSpike(objects, 900);
  addSpike(objects, 1100);
  addSpike(objects, 1300);
  addBlock(objects, 1600, G - S, S * 3, S);
  addSpike(objects, 1600 + S * 3 + 60);
  // Force a flip stretch: long spike carpet
  for (let sx = 2200; sx < 3100; sx += 70) addSpike(objects, sx);
  addBlock(objects, 3200, C, S * 4, S);
  addSpikeCeil(objects, 3200 + S * 4 + 50);
  addSpikeCeil(objects, 3600);
  // Back to floor via flip
  for (let sx = 3900; sx < 4700; sx += 70) addSpikeCeil(objects, sx);
  addSpike(objects, 4900);
  addBlock(objects, 5200, G - S * 2, S * 2, S);
  addSpike(objects, 5200 + S * 2 + 70);
  // Mid platforms as wall surfaces
  addBlock(objects, 5700, G - S * 3, S * 3, S);
  addSpike(objects, 6100);
  addSpike(objects, 6300);
  for (let sx = 6600; sx < 7600; sx += 70) addSpike(objects, sx);
  addBlock(objects, 7700, C, S * 5, S);
  addSpikeCeil(objects, 7700 + S * 5 + 60);
  addSpikeCeil(objects, 8400);
  for (let sx = 8700; sx < 9600; sx += 70) addSpikeCeil(objects, sx);
  addSpike(objects, 9850);
  addSpike(objects, 10100);
  addBlock(objects, 10400, G - S, S * 4, S);
  addSpike(objects, 10400 + S * 4 + 80);
  addBlock(objects, 11000, G - S, S * 6, S);
  return 11600;
}

/**
 * 5 — Pallini gialli obbligatori
 * Hang ≈ 0.85s × 400 ≈ 340px; low yellow orbs are the only bounce points.
 */
function buildYellowOrbs(objects) {
  // First landing ≈ PLAYER_X + speed * 0.96 ≈ 660; then ~335px per bounce
  const gap = 335;
  const count = 28;
  const orbs = [630];
  let x = 630 + gap;
  for (let i = 0; i < count; i++) {
    orbs.push(x);
    x += gap;
  }
  const end = x + 200;

  const covers = orbs.map((ox) => [ox - 50, ox + 70]);
  for (let sx = 420; sx < end; sx += 52) {
    if (!covers.some(([a, b]) => sx > a && sx < b)) addSpike(objects, sx);
  }

  for (const ox of orbs) {
    // Sit just above the floor so the bounce arc must hit them
    addOrb(objects, ox, G - 44, 44);
  }

  // Decor only — above the bounce apex
  addBlock(objects, 2800, 90, S * 2, S);
  addBlock(objects, 5200, 100, S * 2, S);
  addBlock(objects, 7800, 85, S * 2, S);

  return end;
}

/** 6 — Cubo + nave + flip */
function buildMixTriple(objects) {
  addSpike(objects, 900);
  addSpike(objects, 1200);
  addBlock(objects, 1550, G - S, S * 3, S);
  addSpike(objects, 1550 + S * 3 + 80);
  addSpike(objects, 2100);

  addPortal(objects, 2500, "ship");
  addBlock(objects, 2850, 90, S, 130);
  addBlock(objects, 3200, G - 150, S, 150);
  addBlock(objects, 3600, 80, S, 180);
  addBlock(objects, 3600, G - 100, S, 100);
  addBlock(objects, 4100, G - 140, S, 140);
  addBlock(objects, 4500, 100, S, 160);

  addPortal(objects, 5000, "cube");
  addSpike(objects, 5350);
  addBlock(objects, 5650, G - S, S * 2, S);
  addPortal(objects, 6100, "flip");
  addSpikeCeil(objects, 6450);
  addSpikeCeil(objects, 6700);
  addBlock(objects, 7050, C, S * 3, S);
  addPortal(objects, 7500, "flip");
  addSpike(objects, 7850);
  addSpike(objects, 8100);

  addPortal(objects, 8500, "ship");
  addBlock(objects, 8850, G - 160, S, 160);
  addBlock(objects, 9200, 85, S, 170);
  addBlock(objects, 9600, G - 130, S, 130);
  addBlock(objects, 9600, 90, S, 120);

  addPortal(objects, 10100, "cube");
  addSpike(objects, 10450);
  addSpike(objects, 10700);
  addBlock(objects, 11100, G - S, S * 5, S);
  return 11700;
}

/** 7 — Nave + zigzag + cubo */
function buildMixRift(objects) {
  addBlock(objects, 1000, 90, S, 120);
  addBlock(objects, 1400, G - 140, S, 140);
  addBlock(objects, 1850, 80, S, 160);
  addBlock(objects, 2300, G - 160, S, 160);
  addBlock(objects, 2750, 100, S, 140);
  addBlock(objects, 2750, G - 110, S, 110);

  addPortal(objects, 3300, "wave");
  addBlock(objects, 3650, C, S, 160);
  addBlock(objects, 3650, G - 120, S, 120);
  addBlock(objects, 4100, C, S + 8, 200);
  addBlock(objects, 4100 + 160, G - 90, S, 90);
  addBlock(objects, 4600, G - 180, S + 8, 180);
  addBlock(objects, 4600, C, S, 100);
  addBlock(objects, 5100, C, S, 150);
  addBlock(objects, 5100, G - 130, S, 130);
  addBlock(objects, 5600, C, S + 8, 170);
  addBlock(objects, 5900, G - 150, S + 8, 150);

  addPortal(objects, 6400, "cube");
  addSpike(objects, 6750);
  addSpike(objects, 7000);
  addBlock(objects, 7350, G - S, S * 3, S);
  addSpike(objects, 7350 + S * 3 + 70);

  addPortal(objects, 7900, "ship");
  addBlock(objects, 8250, G - 150, S, 150);
  addBlock(objects, 8650, 85, S, 175);
  addBlock(objects, 9100, G - 170, S, 170);
  addBlock(objects, 9550, 95, S, 155);

  addPortal(objects, 10000, "wave");
  addBlock(objects, 10350, C, S, 180);
  addBlock(objects, 10350, G - 110, S, 110);
  addBlock(objects, 10800, G - 190, S + 8, 190);
  addBlock(objects, 10800, C, S, 90);
  addBlock(objects, 11300, C, S, 150);
  addBlock(objects, 11300, G - 140, S, 140);

  addPortal(objects, 11800, "cube");
  addSpike(objects, 12150);
  addBlock(objects, 12500, G - S, S * 5, S);
  return 13100;
}

/** 8 — Wall ball + yellow orbs + cube */
function buildMixBounce(objects) {
  // Wall-ball opener — dense flips early (was too sparse/easy)
  addSpike(objects, 700);
  addSpike(objects, 820);
  addSpike(objects, 940);
  for (let sx = 1100; sx < 1900; sx += 58) addSpike(objects, sx);
  addBlock(objects, 1980, C, S * 2, S);
  addSpikeCeil(objects, 1980 + S * 2 + 40);
  addSpikeCeil(objects, 2200);
  addSpikeCeil(objects, 2350);
  for (let sx = 2500; sx < 3300; sx += 58) addSpikeCeil(objects, sx);
  addSpike(objects, 3500);
  addSpike(objects, 3650);
  addBlock(objects, 3850, G - S * 2, S * 2, S);
  addSpike(objects, 3850 + S * 2 + 50);
  for (let sx = 4200; sx < 5000; sx += 58) addSpike(objects, sx);
  addBlock(objects, 5100, C, S * 3, S);
  addSpikeCeil(objects, 5100 + S * 3 + 40);
  for (let sx = 5400; sx < 6100; sx += 58) addSpikeCeil(objects, sx);
  addSpike(objects, 6300);
  addBlock(objects, 6500, G - S, S * 2, S);

  // Switch to yellow orbs — launch arc must hit the first orb (~speed*0.96)
  const portalX = 7000;
  addPortal(objects, portalX, "ball", "pads");
  const speed = 430;
  const gap = Math.round(speed * 0.84); // ~361 at this world's speed
  let x = portalX + Math.round(speed * 0.96);
  const orbs = [];
  for (let i = 0; i < 14; i++) {
    orbs.push(x);
    x += gap;
  }
  const covers = orbs.map((ox) => [ox - 48, ox + 68]);
  // Spikes right after the portal — no safe floor walk
  for (let sx = portalX + 50; sx < x; sx += 48) {
    if (!covers.some(([a, b]) => sx > a && sx < b)) addSpike(objects, sx);
  }
  for (const ox of orbs) addOrb(objects, ox, G - 44, 44);

  addPortal(objects, x + 80, "cube");
  addSpike(objects, x + 380);
  addSpike(objects, x + 520);
  addSpike(objects, x + 680);
  addBlock(objects, x + 900, G - S, S * 2, S);
  addSpike(objects, x + 900 + S * 2 + 60);
  addBlock(objects, x + 1200, G - S, S * 2, S);
  addBlock(objects, x + 1200 + S * 2, G - S * 2, S * 2, S);

  addPortal(objects, x + 1700, "ball", "walls");
  for (let sx = x + 1950; sx < x + 2750; sx += 58) addSpike(objects, sx);
  addBlock(objects, x + 2850, C, S * 3, S);
  addSpikeCeil(objects, x + 2850 + S * 3 + 40);
  for (let sx = x + 3100; sx < x + 3800; sx += 58) addSpikeCeil(objects, sx);
  addSpike(objects, x + 4000);
  addSpike(objects, x + 4180);

  addPortal(objects, x + 4400, "cube");
  addSpike(objects, x + 4700);
  addSpike(objects, x + 4900);
  addBlock(objects, x + 5200, G - S, S * 5, S);
  return x + 5800;
}

/** 9 — Tutti i poteri */
function buildApex(objects) {
  // Cube
  addSpike(objects, 850);
  addSpike(objects, 1150);
  addBlock(objects, 1500, G - S, S * 3, S);
  addSpike(objects, 1500 + S * 3 + 80);

  // Ship
  addPortal(objects, 2100, "ship");
  addBlock(objects, 2450, 90, S, 130);
  addBlock(objects, 2850, G - 150, S, 150);
  addBlock(objects, 3250, 80, S, 180);
  addBlock(objects, 3250, G - 100, S, 100);

  // Flip
  addPortal(objects, 3800, "cube");
  addSpike(objects, 4100);
  addPortal(objects, 4400, "flip");
  addSpikeCeil(objects, 4750);
  addSpikeCeil(objects, 5000);
  addBlock(objects, 5300, C, S * 3, S);
  addPortal(objects, 5750, "flip");

  // Wave zigzag
  addPortal(objects, 6200, "wave");
  addBlock(objects, 6550, C, S, 160);
  addBlock(objects, 6550, G - 120, S, 120);
  addBlock(objects, 7000, C, S + 8, 200);
  addBlock(objects, 7200, G - 90, S, 90);
  addBlock(objects, 7600, G - 180, S + 8, 180);
  addBlock(objects, 7600, C, S, 100);

  // Wall ball
  addPortal(objects, 8200, "ball", "walls");
  addSpike(objects, 8500);
  for (let sx = 8800; sx < 9600; sx += 70) addSpike(objects, sx);
  addBlock(objects, 9700, C, S * 3, S);
  addSpikeCeil(objects, 9700 + S * 3 + 50);

  // Yellow orbs
  addPortal(objects, 10300, "ball", "pads");
  const gap = 335;
  let x = 10800;
  const orbs = [];
  for (let i = 0; i < 8; i++) {
    orbs.push(x);
    x += gap;
  }
  const covers = orbs.map((ox) => [ox - 50, ox + 70]);
  for (let sx = 10400; sx < x; sx += 52) {
    if (!covers.some(([a, b]) => sx > a && sx < b)) addSpike(objects, sx);
  }
  for (const ox of orbs) addOrb(objects, ox, G - 44, 44);

  addPortal(objects, x + 80, "cube");
  addSpike(objects, x + 400);
  addSpike(objects, x + 650);
  addBlock(objects, x + 950, G - S, S * 6, S);
  return x + 1550;
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

function addOrb(objects, x, y, size = 40) {
  objects.push({ type: "orb", x, y, w: size, h: size });
}

function addPortal(objects, x, mode, ballKind) {
  const h = G - C;
  /** @type {LevelObject} */
  const portal = { type: "portal", x, y: C, w: 44, h, mode };
  if (ballKind) portal.ballKind = ballKind;
  objects.push(portal);
}
