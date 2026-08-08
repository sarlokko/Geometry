export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  GROUND_Y: 560,
  PLAYER_SIZE: 42,
  PLAYER_X: 280,
  // Base run speed — sections can scale this up
  SPEED: 360,
  GRAVITY: 2400,
  JUMP_VELOCITY: -980,
  // Yellow pad / orb — snappier, more readable arcs
  PAD_VELOCITY: -1220,
  ORB_VELOCITY: -1100,
  ORB_HIT_PAD: 18,
  PAD_TRIGGER_VY: -90,
  SHIP_THRUST: -2000,
  SHIP_GRAVITY: 1100,
  MAX_FALL: 1300,
  ROTATION_SPEED: 7.5,
  // Extra forgiveness (tightens slightly in later sections via level design)
  SPIKE_HITBOX_PAD: -10,
  COYOTE_TIME: 0.09,
  JUMP_BUFFER: 0.14,
  // Continuous run
  SECTION_COUNT: 10,
  CHECKPOINT_RESPAWN_OFFSET: 56,
};

export const COLORS = {
  skyTop: "#071526",
  skyBottom: "#16385a",
  ground: "#0d2238",
  groundLine: "#39f0c0",
  player: "#39f0c0",
  playerShip: "#ffd84a",
  block: "#1c4d6e",
  blockEdge: "#7ee7ff",
  spike: "#ff4d6d",
  pad: "#ffd84a",
  orb: "#ffd84a",
  portalShip: "#7b5cff",
  portalCube: "#39f0c0",
  finish: "#ffffff",
  particle: "#9dffe4",
  checkpoint: "#7ee7ff",
  checkpointActive: "#39f0c0",
};
