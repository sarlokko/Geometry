import { Game } from "./game.js?v=20260809r";
import { WORLDS, STAGE_COUNT, STAGE_LABELS } from "./worlds.js?v=20260809r";

const els = {
  menu: document.getElementById("menu"),
  pause: document.getElementById("pause"),
  complete: document.getElementById("complete"),
  hud: document.getElementById("hud"),
  attempt: document.getElementById("attempt"),
  progress: document.getElementById("progress"),
  progressFill: document.getElementById("progress-fill"),
  worldLabel: document.getElementById("world-label"),
  completeStats: document.getElementById("complete-stats"),
  worldGrid: document.getElementById("world-grid"),
  btnNext: document.getElementById("btn-next"),
  quirk: document.getElementById("quirk"),
  selectedQuirk: document.getElementById("selected-quirk"),
  btnMusic: document.getElementById("btn-music"),
  canvas: document.getElementById("game"),
};

let selectedWorld = 0;
let selectedStage = 0;

let _hudCache = {};
const game = new Game(els.canvas, {
  onHud: (data) => {
    // Avoid rewriting identical DOM text every tick (jank on Samsung).
    if (_hudCache.attempt !== data.attempt) {
      _hudCache.attempt = data.attempt;
      els.attempt.textContent = `Attempt ${data.attempt}`;
    }
    if (_hudCache.progress !== data.progress) {
      _hudCache.progress = data.progress;
      els.progress.textContent = `${data.progress}%`;
      els.progressFill.style.width = `${data.progress}%`;
    }
    if (_hudCache.worldName !== data.worldName) {
      _hudCache.worldName = data.worldName;
      els.worldLabel.textContent = data.worldName;
    }
    if (els.quirk && _hudCache.quirk !== data.quirk) {
      _hudCache.quirk = data.quirk || "";
      els.quirk.textContent = data.quirk || "";
    }
  },
  onPause: () => showOverlay("pause"),
  onComplete: (data) => {
    els.completeStats.textContent = `${data.worldName} completato in ${data.attempt} attempt${
      data.attempt === 1 ? "" : "s"
    }.${data.unlockNote || ""}`;
    els.btnNext.classList.toggle("hidden", !data.hasNext);
    els.btnNext.dataset.nextWorld = String(data.nextWorld ?? data.worldId);
    els.btnNext.dataset.nextStage = String(data.nextStage ?? 0);
    const sameWorld = (data.nextWorld ?? data.worldId) === data.worldId;
    els.btnNext.textContent = sameWorld
      ? `Stage ${STAGE_LABELS[data.nextStage] || "II"}`
      : "Mondo successivo";
    showOverlay("complete");
    els.hud.classList.add("hidden");
    renderWorldGrid();
  },
});

function showOverlay(name) {
  els.menu.classList.toggle("hidden", name !== "menu");
  els.pause.classList.toggle("hidden", name !== "pause");
  els.complete.classList.toggle("hidden", name !== "complete");
}

function hideOverlays() {
  els.menu.classList.add("hidden");
  els.pause.classList.add("hidden");
  els.complete.classList.add("hidden");
}

function stageStars(stage) {
  return "★".repeat(stage + 1) + "☆".repeat(Math.max(0, 2 - stage));
}

function renderWorldGrid() {
  const unlocked = game.getUnlocked();
  els.worldGrid.innerHTML = "";

  WORLDS.forEach((world, i) => {
    const locked = i > unlocked;
    const maxStage = game.getStageUnlocked(i);
    const card = document.createElement("div");
    card.className = "world-card";
    card.role = "option";
    card.setAttribute("aria-selected", String(i === selectedWorld));
    if (i === selectedWorld) card.classList.add("selected");
    if (locked) card.classList.add("locked");

    const accent = world.colors.player;
    card.style.setProperty("--world-accent", accent);

    const stages = Array.from({ length: STAGE_COUNT }, (_, s) => {
      const stageLocked = locked || s > maxStage;
      const best = Math.floor(game.loadBest(i, s) * 100);
      const sel = i === selectedWorld && s === selectedStage;
      return `<button type="button" class="stage-btn${sel ? " selected" : ""}${
        stageLocked ? " locked" : ""
      }" data-world="${i}" data-stage="${s}" ${stageLocked ? "disabled" : ""} title="Stage ${
        STAGE_LABELS[s]
      }">
        <span class="stage-label">${STAGE_LABELS[s]}</span>
        <span class="stage-stars">${stageStars(s)}</span>
        <span class="stage-best">${stageLocked ? "—" : best >= 100 ? "OK" : best + "%"}</span>
      </button>`;
    }).join("");

    card.innerHTML = `
      <span class="world-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="world-name">${world.name}</span>
      <span class="world-sub">${locked ? "Bloccato" : world.subtitle}</span>
      <div class="stage-row" role="group" aria-label="Stage di ${world.name}">${stages}</div>
    `;

    card.querySelectorAll(".stage-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.disabled) return;
        selectedWorld = Number(btn.dataset.world);
        selectedStage = Number(btn.dataset.stage);
        play(selectedWorld, selectedStage);
      });
    });

    card.addEventListener("click", () => {
      if (locked) return;
      selectedWorld = i;
      selectedStage = Math.min(selectedStage, Math.max(0, maxStage));
      renderWorldGrid();
      if (els.selectedQuirk) els.selectedQuirk.textContent = world.quirk;
    });

    els.worldGrid.appendChild(card);
  });

  const selected = WORLDS[selectedWorld];
  if (els.selectedQuirk && selected) {
    const label = STAGE_LABELS[selectedStage] || "I";
    els.selectedQuirk.textContent = `${selected.quirk} · Stage ${label}`;
  }
}

function play(worldId = selectedWorld, stage = selectedStage) {
  selectedWorld = worldId;
  selectedStage = stage;
  // Unlock Web Audio in the same user-gesture stack (needed on Samsung/Android).
  game.audio.unlock();
  hideOverlays();
  els.hud.classList.remove("hidden");
  game.start(worldId, stage);
}

function syncMusicButton() {
  const on = game.audio.isMusicOn();
  els.btnMusic.textContent = on ? "Musica: ON" : "Musica: OFF";
  els.btnMusic.setAttribute("aria-pressed", on ? "true" : "false");
  els.btnMusic.title = on ? "Disattiva musica" : "Attiva musica";
}

els.btnMusic.addEventListener("click", (e) => {
  e.stopPropagation();
  game.audio.unlock();
  game.audio.toggleMusic();
  syncMusicButton();
});

document.getElementById("btn-play").addEventListener("click", () => play(selectedWorld, selectedStage));
document.getElementById("btn-resume").addEventListener("click", () => {
  game.audio.unlock();
  hideOverlays();
  els.hud.classList.remove("hidden");
  game.resume();
});
document.getElementById("btn-restart").addEventListener("click", () => play(game.worldId, game.stage));
document.getElementById("btn-menu").addEventListener("click", () => {
  game.goMenu();
  els.hud.classList.add("hidden");
  renderWorldGrid();
  showOverlay("menu");
});
document.getElementById("btn-again").addEventListener("click", () => play(game.worldId, game.stage));
document.getElementById("btn-complete-menu").addEventListener("click", () => {
  game.goMenu();
  renderWorldGrid();
  showOverlay("menu");
});
els.btnNext.addEventListener("click", () => {
  const nw = Number(els.btnNext.dataset.nextWorld ?? game.worldId);
  const ns = Number(els.btnNext.dataset.nextStage ?? 0);
  selectedWorld = nw;
  selectedStage = ns;
  play(nw, ns);
});

function isTypingTarget(el) {
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

window.addEventListener("keydown", (e) => {
  if (isTypingTarget(e.target)) return;
  if (e.code === "Escape") {
    if (game.state === "playing") {
      game.pause();
    } else if (game.state === "paused") {
      hideOverlays();
      els.hud.classList.remove("hidden");
      game.resume();
    }
    return;
  }

  if (game.state === "menu") {
    if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
      e.preventDefault();
      selectedWorld = Math.max(0, selectedWorld - 1);
      selectedStage = Math.min(selectedStage, Math.max(0, game.getStageUnlocked(selectedWorld)));
      renderWorldGrid();
      return;
    }
    if (e.code === "ArrowRight" || e.code === "ArrowDown") {
      e.preventDefault();
      const max = game.getUnlocked();
      selectedWorld = Math.min(max, selectedWorld + 1);
      selectedStage = Math.min(selectedStage, Math.max(0, game.getStageUnlocked(selectedWorld)));
      renderWorldGrid();
      return;
    }
    if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
      const s = Number(e.code.replace("Digit", "")) - 1;
      if (s <= game.getStageUnlocked(selectedWorld)) {
        selectedStage = s;
        renderWorldGrid();
      }
      return;
    }
  }

  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    if (game.state === "menu") {
      play(selectedWorld, selectedStage);
      return;
    }
    if (game.state === "complete") {
      play(game.worldId, game.stage);
      return;
    }
    game.press();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    game.release();
  }
});

const press = (e) => {
  if (e.target.closest("button")) return;
  if (game.state === "menu" || game.state === "complete" || game.state === "paused") return;
  e.preventDefault();
  game.press();
};
const release = (e) => {
  if (e.target.closest("button")) return;
  game.release();
};

els.canvas.addEventListener("mousedown", press);
window.addEventListener("mouseup", release);
els.canvas.addEventListener(
  "touchstart",
  (e) => {
    if (game.state === "menu") return;
    press(e);
  },
  { passive: false }
);
window.addEventListener("touchend", release);

// Dev helper: ?unlock=9 unlocks all worlds + all stages
const unlockParam = new URLSearchParams(location.search).get("unlock");
if (unlockParam != null) game.setUnlocked(unlockParam);

syncMusicButton();
renderWorldGrid();
game.startAttract();
showOverlay("menu");
