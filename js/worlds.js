import { CONFIG } from "./config.js?v=20260811b";

const S = CONFIG.PLAYER_SIZE;
const G = CONFIG.GROUND_Y;
const C = CONFIG.CEILING_Y;

/** Each world has 3 stages (I / II / III) with rising difficulty. */
export const STAGE_COUNT = 3;
export const STAGE_LABELS = ["I", "II", "III"];

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
    quirk: "Tap per invertire la gravità: i tappeti di spike cambiano lato in fretta.",
    bpm: 146,
    speed: 420,
    startMode: "ball",
    ballKind: "walls",
    colors: theme("#0a1a22", "#163040", "#6ad0ff", "#1a4a5a", "#9fd8ff"),
  },
  {
    id: 5,
    name: "Pallini",
    subtitle: "Pad e orb gialle",
    quirk: "Pad giallo = rimbalzo automatico. Orb gialla = tap (anche il tap del salto conta finché sei in aria).",
    bpm: 144,
    speed: 380,
    startMode: "cube",
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
    quirk: "Flip sui muri a ritmo, poi tap su ogni pallino giallo per rimbalzare.",
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
 * @param {number} [stage]
 * @returns {{ length: number, objects: LevelObject[], world: typeof WORLDS[0] & { stage: number, stageLabel: string, displayName: string } }}
 */
export function createWorldLevel(worldId, stage = 0) {
  stage = clampStage(stage);
  const base = WORLDS[clampWorld(worldId)];
  const world = {
    ...base,
    colors: { ...base.colors },
    speed: Math.round(base.speed * (1 + stage * 0.14)),
    bpm: base.bpm + stage * 10,
    stage,
    stageLabel: STAGE_LABELS[stage],
    displayName: `${base.name} ${STAGE_LABELS[stage]}`,
  };
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
  const finishX = builders[world.id](objects, stage);
  densifyHazards(objects, stage, world.id);
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

export function clampStage(stage) {
  const n = Number(stage);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(n)));
}

/** Fill large spike gaps on higher stages. */
function densifyHazards(objects, stage, worldId = -1) {
  if (stage <= 0) return;
  // Pallini pad/orb spacing is hand-tuned — densify breaks landings.
  if (worldId === 5) return;
  // Keep densified spikes out of post-portal landing windows (fall/rise ~0.6s).
  const portalXs = objects.filter((o) => o.type === "portal").map((o) => o.x);
  const padXs = objects.filter((o) => o.type === "pad").map((o) => o.x);
  const orbXs = objects.filter((o) => o.type === "orb").map((o) => o.x);
  const nearPortal = (x) => portalXs.some((px) => x >= px - 40 && x <= px + 720);
  // Keep approach + pad flight clear (don't force a jump that sails over the pad).
  const nearPadFlight = (x) => padXs.some((px) => x >= px - 300 && x <= px + 560);
  const nearOrb = (x) => orbXs.some((ox) => Math.abs(ox - x) < 200);
  const minGap = stage === 1 ? 520 : 380;
  const floor = objects
    .filter((o) => o.type === "spike" && (o.dir || 1) === 1)
    .sort((a, b) => a.x - b.x);
  const ceil = objects
    .filter((o) => o.type === "spike" && o.dir === -1)
    .sort((a, b) => a.x - b.x);
  /** @type {LevelObject[]} */
  const extras = [];
  for (const list of [floor, ceil]) {
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i];
      const b = list[i + 1];
      const gap = b.x - a.x;
      if (gap <= minGap) continue;
      const n = stage >= 2 && gap > minGap * 1.7 ? 2 : 1;
      for (let k = 1; k <= n; k++) {
        const x = a.x + (gap * k) / (n + 1);
        if (nearPortal(x) || nearPadFlight(x) || nearOrb(x)) continue;
        if (a.dir === -1) extras.push({ type: "spike", x, y: C, w: 34, h: 34, dir: -1 });
        else extras.push({ type: "spike", x, y: G - 34, w: 34, h: 34, dir: 1 });
      }
    }
  }

  // Ship / wave / mix: squeeze corridors a bit on higher stages
  if (stage >= 1) {
    const blocks = objects.filter((o) => o.type === "block");
    for (let i = 0; i < blocks.length; i++) {
      const o = blocks[i];
      // Tall thin pillars → grow slightly toward the play tunnel
      if (o.w <= S + 12 && o.h >= 100) {
        if (o.y <= C + 20) o.h = Math.min(o.h + 18 * stage, G - C - 90);
        else if (o.y + o.h >= G - 20) {
          const grow = 16 * stage;
          o.y -= grow;
          o.h += grow;
        }
      }
    }
  }

  objects.push(...extras);
}

/** 0 — Cubo base */
function buildCube(objects, stage = 0) {
  addSpike(objects, 1100);
  addSpike(objects, 1550);
  if (stage >= 1) addSpike(objects, 1780);
  addSpike(objects, 2100);
  if (stage >= 2) {
    addSpike(objects, 2220);
    addSpike(objects, 2340);
  }
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
function buildShip(objects, stage = 0) {
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
function buildMirror(objects, stage = 0) {
  // After each flip portal the cube falls/rises for ~0.6s — keep ~650px clear
  // before the next same-side hazard so stage II/III remain fair.
  addSpike(objects, 900);
  addSpike(objects, 1200);
  addBlock(objects, 1550, G - S, S * 3, S);
  addPortal(objects, 1950, "flip");
  addSpikeCeil(objects, 2480);
  addSpikeCeil(objects, 2920);
  addBlock(objects, 3350, C, S * 4, S);
  addPortal(objects, 3900, "flip");
  // Land ~4150–4220 then hop; spike sits mid-arc, stairs after the landing.
  addSpike(objects, 4400);
  addBlock(objects, 4950, G - S, S * 2, S);
  addBlock(objects, 4950 + S * 2, G - S * 2, S * 2, S);
  addPortal(objects, 5500, "flip");
  addSpikeCeil(objects, 6020);
  addSpikeCeil(objects, 6350);
  addSpikeCeil(objects, 6580);
  addBlock(objects, 6850, C, S * 2, S);
  addSpikeCeil(objects, 6850 + S * 2 + 50);
  addPortal(objects, 7400, "flip");
  addSpike(objects, 7920);
  addSpike(objects, 8450);
  addSpike(objects, 8680);
  addPortal(objects, 9200, "flip");
  addBlock(objects, 9850, C, S * 6, S);
  addSpikeCeil(objects, 9850 + S * 6 + 80);
  addSpikeCeil(objects, 10550);
  addPortal(objects, 11000, "flip");
  addSpike(objects, 11520);
  addSpike(objects, 11900);
  addBlock(objects, 12300, G - S, S * 2, S);
  addSpike(objects, 12300 + S * 2 + 70);
  addPortal(objects, 12850, "flip");
  addSpikeCeil(objects, 13500);
  addBlock(objects, 13850, C, S * 3, S);
  addSpikeCeil(objects, 13850 + S * 3 + 60);
  addPortal(objects, 14400, "flip");
  addSpike(objects, 14920);
  addBlock(objects, 15350, G - S, S * 5, S);
  return 15950;
}

/** 3 — Zigzag onda */
function buildWave(objects, stage = 0) {
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
function buildWallBall(objects, stage = 0) {
  // Alternating lethal carpets — short flip windows, almost no safe cruise
  addSpike(objects, 480);
  addSpike(objects, 580);
  let x = 680;
  const segs = [
    { side: "floor", len: 360 },
    { side: "ceil", len: 280 },
    { side: "floor", len: 240 },
    { side: "ceil", len: 320 },
    { side: "floor", len: 200 },
    { side: "ceil", len: 260 },
    { side: "floor", len: 300 },
    { side: "ceil", len: 220 },
    { side: "floor", len: 180 },
    { side: "ceil", len: 280 },
    { side: "floor", len: 240 },
    { side: "ceil", len: 200 },
    { side: "floor", len: 320 },
    { side: "ceil", len: 260 },
    { side: "floor", len: 220 },
    { side: "ceil", len: 300 },
    { side: "floor", len: 250 },
    { side: "ceil", len: 240 },
    { side: "floor", len: 200 },
    { side: "ceil", len: 280 },
  ];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const len = Math.round(seg.len * (1 - stage * 0.07));
    const gap = Math.max(20, (i < 4 ? 48 : 36) - stage * 10);
    const step = Math.max(40, 50 - stage * 4);
    if (seg.side === "floor") {
      for (let sx = x; sx < x + len; sx += step) addSpike(objects, sx);
      // Mid blockers punish floating between flips
      if (i % 3 === 1 || (stage >= 1 && i % 2 === 0))
        addBlock(objects, x + len * 0.4, 200, S, 140);
      if (i % 4 === 2 || stage >= 2) addBlock(objects, x + len * 0.7, 260, S, 100);
    } else {
      for (let sx = x; sx < x + len; sx += step) addSpikeCeil(objects, sx);
      if (i % 3 === 2 || (stage >= 1 && i % 2 === 1))
        addBlock(objects, x + len * 0.35, 300, S, 120);
      if (i % 5 === 0 || stage >= 2) addBlock(objects, x + len * 0.65, 240, S, 110);
    }
    x += len + gap;
  }
  // Fake calm then sudden double switch
  addSpike(objects, x + 40);
  addSpike(objects, x + 140);
  for (let sx = x + 280; sx < x + 560; sx += 48) addSpike(objects, sx);
  for (let sx = x + 620; sx < x + 900; sx += 48) addSpikeCeil(objects, sx);
  for (let sx = x + 960; sx < x + 1240; sx += 48) addSpike(objects, sx);
  addBlock(objects, x + 1320, G - S, S * 3, S);
  addSpike(objects, x + 1320 + S * 3 + 60);
  addBlock(objects, x + 1600, G - S, S * 5, S);
  return x + 2100;
}

/**
 * 5 — Pallini: yellow pads (auto) + yellow orbs (tap while overlapping).
 * Stage I teaches pad → jump → pad+orb before any orb-gated pits.
 */
function buildYellowOrbs(objects, stage = 0) {
  const tight = stage;
  const speed = Math.round(380 * (1 + stage * 0.14));
  const land = Math.round(speed * 0.55);
  // Jump peak player.y ≈ 318; pad peak ≈ 257.
  const yJump = G - 185; // ≈375 — upper-mid cube jump
  const yPad = G - 255; // ≈305 — mid yellow-pad arc
  const yHigh = G - 275; // ≈285 — upper pad / chain
  let x = 480;

  // 1) Intro pad — walk on, auto bounce (no jump needed)
  addPad(objects, x);
  addSpike(objects, x + 150);
  addSpike(objects, x + 210);
  x += Math.round(speed * 1.25) + land;

  // 2) Plain jump over a short spike — no orb required
  addSpike(objects, x);
  addSpike(objects, x + 55);
  x += Math.round(speed * 0.85) + land;

  // 3) Pad → orb (pad arms the buffer; spikes only under the high arc)
  addPad(objects, x);
  addOrb(objects, x + 180, yPad, 48);
  addSpike(objects, x + 300);
  addSpike(objects, x + 360);
  x += 360 + Math.round(speed * 0.7);

  // 4) Jump → orb (tap/hold from the jump; forgiving spacing)
  addSpike(objects, x);
  addOrb(objects, x + 160, yJump, 52);
  if (tight === 0) {
    // Stage I: one spike after the orb — jump alone almost clears; orb is safety
    addSpike(objects, x + 340);
  } else {
    addSpike(objects, x + 300);
    addSpike(objects, x + 360);
  }
  x += 360 + land;

  // 5) Pad → orb → runway
  addPad(objects, x);
  addOrb(objects, x + 180, yPad, 48);
  addSpike(objects, x + 280);
  addSpike(objects, x + 340);
  x += 340 + Math.round(speed * (0.75 + tight * 0.1));

  // 6) Jump → orb pit (harder on II/III)
  addSpike(objects, x);
  addOrb(objects, x + 160, yJump, 48);
  addSpike(objects, x + 300);
  addSpike(objects, x + 360);
  if (tight >= 1) addSpike(objects, x + 420);
  x += (tight >= 1 ? 420 : 360) + land;

  // 7) Pad rhythm
  addPad(objects, x);
  addSpike(objects, x + 150);
  addSpike(objects, x + 210);
  addOrb(objects, x + 190, yPad, 48);
  x += Math.round(speed * 1.0);
  addPad(objects, x);
  addOrb(objects, x + 180, yPad, 48);
  addSpike(objects, x + 280);
  addSpike(objects, x + 340);
  x += 340 + land;

  // 8) Spike carpet + orb chain
  const carpet = 6 + tight * 2;
  for (let i = 0; i < carpet; i++) addSpike(objects, x + i * 52);
  addOrb(objects, x + 20, yJump, 52);
  // One well-timed orb clears ~380px; extra orbs on II/III for chains
  if (tight >= 1) {
    addOrb(objects, x + 200, yHigh, 48);
    addOrb(objects, x + 380, yJump, 48);
  }
  if (tight >= 2) addOrb(objects, x + 540, yPad, 44);
  x += carpet * 52 + land;

  // 9) Pad → orb finish approach (spikes only after pad arc is high)
  addPad(objects, x);
  addOrb(objects, x + 200, yPad, 52);
  addSpike(objects, x + 320);
  addSpike(objects, x + 380);
  x += 380 + Math.round(land * 1.2);

  addPad(objects, x);
  addOrb(objects, x + 180, yPad, 52);
  addSpike(objects, x + 300);
  addSpike(objects, x + 360);
  if (tight >= 1) {
    x += 340 + Math.round(speed * 1.05);
    addSpike(objects, x);
    addOrb(objects, x + 170, yJump, 44);
    addSpike(objects, x + 300);
    addSpike(objects, x + 360);
    x += 360 + Math.round(land * 1.5);
  } else {
    x += 340 + land;
  }

  if (tight >= 2) {
    x += Math.round(speed * 0.45);
    for (let i = 0; i < 9; i++) addSpike(objects, x + i * 52);
    addOrb(objects, x + 20, yJump, 44);
    addOrb(objects, x + 200, yPad, 44);
    addOrb(objects, x + 380, yHigh, 44);
    x += 9 * 52 + land;
  }

  return x + Math.round(speed * 1.2);
}

/** 6 — Cubo + nave + flip */
function buildMixTriple(objects, stage = 0) {
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
function buildMixRift(objects, stage = 0) {
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

/** 8 — Wall ball + yellow orbs + cube (active inputs throughout) */
function buildMixBounce(objects, stage = 0) {
  const speed = Math.round(430 * (1 + stage * 0.14));

  // --- Wall-ball: alternating lethal floors/ceilings, short flip windows ---
  // Start: tiny calm then immediate floor death carpet
  addSpike(objects, 520);
  addSpike(objects, 620);
  let wx = 720;
  const wallSegs = [
    { side: "floor", len: 380 },
    { side: "ceil", len: 300 },
    { side: "floor", len: 260 },
    { side: "ceil", len: 340 },
    { side: "floor", len: 220 },
    { side: "ceil", len: 280 },
    { side: "floor", len: 320 },
    { side: "ceil", len: 240 },
    { side: "floor", len: 300 },
    { side: "ceil", len: 360 },
    { side: "floor", len: 250 },
    { side: "ceil", len: 300 },
  ];
  for (let i = 0; i < wallSegs.length; i++) {
    const seg = wallSegs[i];
    const gap = 44; // brief flip window between carpets
    if (seg.side === "floor") {
      for (let sx = wx; sx < wx + seg.len; sx += 52) addSpike(objects, sx);
      // Mid hazard — punish lazy mid-height floats
      if (i % 3 === 1) addBlock(objects, wx + seg.len * 0.45, 220, S, 120);
    } else {
      for (let sx = wx; sx < wx + seg.len; sx += 52) addSpikeCeil(objects, sx);
      if (i % 3 === 2) addBlock(objects, wx + seg.len * 0.4, 280, S, 110);
    }
    wx += seg.len + gap;
  }
  // Landing shelf before portal
  addBlock(objects, wx + 40, G - S, S * 2, S);
  wx += 200;

  // --- Yellow pads/orbs as cube ---
  addPortal(objects, wx + 80, "cube");
  let x = wx + 200;
  const yJump = G - 185;
  const yPad = G - 255;
  addPad(objects, x);
  addSpike(objects, x + 140);
  addSpike(objects, x + 200);
  addOrb(objects, x + 180, yPad, 48);
  addPad(objects, x + 380);
  addOrb(objects, x + 560, yPad, 48);
  addSpike(objects, x + 640);
  addSpike(objects, x + 700);
  addOrb(objects, x + 780, yJump, 48);
  for (let i = 0; i < 6 + stage; i++) addSpike(objects, x + 860 + i * 52);
  addOrb(objects, x + 1000, yPad, 48);
  addOrb(objects, x + 1160, yJump, 48);
  addBlock(objects, x + 1320, G - S, S * 3, S);
  x += 1320 + S * 3;

  // --- Cube burst ---
  addSpike(objects, x + 120);
  addSpike(objects, x + 450);
  addSpike(objects, x + 560);
  addBlock(objects, x + 780, G - S, S * 2, S);
  addSpike(objects, x + 780 + S * 2 + 55);
  addSpike(objects, x + 1100);
  addBlock(objects, x + 1280, G - S, S * 2, S);
  addBlock(objects, x + 1280 + S * 2, G - S * 2, S * 2, S);

  // --- Wall-ball reprise: faster flip cadence ---
  addPortal(objects, x + 1750, "ball", "walls");
  let wx2 = x + 2000;
  const reprise = [
    { side: "floor", len: 280 },
    { side: "ceil", len: 240 },
    { side: "floor", len: 200 },
    { side: "ceil", len: 260 },
    { side: "floor", len: 220 },
    { side: "ceil", len: 300 },
  ];
  for (const seg of reprise) {
    if (seg.side === "floor") {
      for (let sx = wx2; sx < wx2 + seg.len; sx += 50) addSpike(objects, sx);
    } else {
      for (let sx = wx2; sx < wx2 + seg.len; sx += 50) addSpikeCeil(objects, sx);
    }
    wx2 += seg.len + 40;
  }

  addPortal(objects, wx2 + 80, "cube");
  addSpike(objects, wx2 + 360);
  addSpike(objects, wx2 + 500);
  addSpike(objects, wx2 + 620);
  addBlock(objects, wx2 + 860, G - S, S * 5, S);
  return wx2 + 1400;
}

/** 9 — Tutti i poteri */
function buildApex(objects, stage = 0) {
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

  // Wall ball — short flip cadence
  addPortal(objects, 8200, "ball", "walls");
  let ax = 8500;
  for (const seg of [
    { side: "floor", len: 280 },
    { side: "ceil", len: 240 },
    { side: "floor", len: 220 },
    { side: "ceil", len: 260 },
  ]) {
    if (seg.side === "floor") {
      for (let sx = ax; sx < ax + seg.len; sx += 52) addSpike(objects, sx);
    } else {
      for (let sx = ax; sx < ax + seg.len; sx += 52) addSpikeCeil(objects, sx);
    }
    ax += seg.len + 40;
  }

  // Yellow pads/orbs as cube
  addPortal(objects, ax + 80, "cube");
  let x = ax + 200;
  const yJump = G - 185;
  const yPad = G - 255;
  addPad(objects, x);
  addOrb(objects, x + 180, yPad, 48);
  addSpike(objects, x + 280);
  addSpike(objects, x + 340);
  addOrb(objects, x + 400, yPad, 48);
  addPad(objects, x + 580);
  addOrb(objects, x + 760, yJump, 48);
  for (let i = 0; i < 5; i++) addSpike(objects, x + 820 + i * 52);
  addOrb(objects, x + 960, yPad, 48);
  addBlock(objects, x + 1140, G - S, S * 4, S);

  addSpike(objects, x + 1140 + S * 4 + 80);
  addSpike(objects, x + 1140 + S * 4 + 200);
  addBlock(objects, x + 1140 + S * 4 + 400, G - S, S * 6, S);
  return x + 1140 + S * 4 + 700;
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
  objects.push({ type: "pad", x, y: G - 14, w: S + 20, h: 14, dir: 1 });
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
