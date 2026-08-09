import { Game } from "./game.js";
import { WORLDS } from "./worlds.js";

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
  canvas: document.getElementById("game"),
};

let selectedWorld = 0;

const game = new Game(els.canvas, {
  onHud: (data) => {
    els.attempt.textContent = `Attempt ${data.attempt}`;
    els.progress.textContent = `${data.progress}%`;
    els.progressFill.style.width = `${data.progress}%`;
    els.worldLabel.textContent = data.worldName;
    if (els.quirk) els.quirk.textContent = data.quirk || "";
  },
  onPause: () => showOverlay("pause"),
  onComplete: (data) => {
    const unlockedNote =
      data.hasNext && data.unlocked >= data.worldId + 1
        ? ` Mondo ${data.worldId + 2} sbloccato.`
        : "";
    els.completeStats.textContent = `${data.worldName} completato in ${data.attempt} attempt${
      data.attempt === 1 ? "" : "s"
    }.${unlockedNote}`;
    els.btnNext.classList.toggle("hidden", !data.hasNext);
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

function stars(n) {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

function difficultyStars(worldId) {
  return Math.min(5, Math.ceil((worldId + 1) / 2));
}

function renderWorldGrid() {
  const unlocked = game.getUnlocked();
  els.worldGrid.innerHTML = "";

  WORLDS.forEach((world, i) => {
    const locked = i > unlocked;
    const best = Math.floor(game.loadBest(i) * 100);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "world-card";
    btn.role = "option";
    btn.setAttribute("aria-selected", String(i === selectedWorld));
    if (i === selectedWorld) btn.classList.add("selected");
    if (locked) btn.classList.add("locked");
    btn.disabled = locked;

    const accent = world.colors.player;
    btn.style.setProperty("--world-accent", accent);

    btn.innerHTML = `
      <span class="world-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="world-name">${world.name}</span>
      <span class="world-sub">${locked ? "Bloccato" : world.subtitle}</span>
      <span class="world-meta">
        <span class="world-stars" aria-label="Difficoltà ${difficultyStars(i)} su 5">${stars(
          difficultyStars(i)
        )}</span>
        <span class="world-bpm">${world.bpm} BPM</span>
        <span class="world-best">${locked ? "—" : best + "%"}</span>
      </span>
    `;

    btn.addEventListener("click", () => {
      if (locked) return;
      selectedWorld = i;
      renderWorldGrid();
    });

    els.worldGrid.appendChild(btn);
  });

  const selected = WORLDS[selectedWorld];
  if (els.selectedQuirk && selected) {
    els.selectedQuirk.textContent = selected.quirk;
  }
}

function play(worldId = selectedWorld) {
  selectedWorld = worldId;
  hideOverlays();
  els.hud.classList.remove("hidden");
  game.start(worldId);
}

document.getElementById("btn-play").addEventListener("click", () => play(selectedWorld));
document.getElementById("btn-resume").addEventListener("click", () => {
  hideOverlays();
  els.hud.classList.remove("hidden");
  game.resume();
});
document.getElementById("btn-restart").addEventListener("click", () => play(game.worldId));
document.getElementById("btn-menu").addEventListener("click", () => {
  game.goMenu();
  els.hud.classList.add("hidden");
  renderWorldGrid();
  showOverlay("menu");
});
document.getElementById("btn-again").addEventListener("click", () => play(game.worldId));
document.getElementById("btn-complete-menu").addEventListener("click", () => {
  game.goMenu();
  renderWorldGrid();
  showOverlay("menu");
});
els.btnNext.addEventListener("click", () => {
  const next = Math.min(WORLDS.length - 1, game.worldId + 1);
  selectedWorld = next;
  play(next);
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
      renderWorldGrid();
      return;
    }
    if (e.code === "ArrowRight" || e.code === "ArrowDown") {
      e.preventDefault();
      const max = game.getUnlocked();
      selectedWorld = Math.min(max, selectedWorld + 1);
      renderWorldGrid();
      return;
    }
  }

  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    if (game.state === "menu") {
      play(selectedWorld);
      return;
    }
    if (game.state === "complete") {
      play(game.worldId);
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

// Dev helper: ?unlock=9 unlocks all worlds for testing
const unlockParam = new URLSearchParams(location.search).get("unlock");
if (unlockParam != null) game.setUnlocked(unlockParam);

renderWorldGrid();
game.startAttract();
showOverlay("menu");
