import { Game } from "./game.js?v=10sec";

const els = {
  menu: document.getElementById("menu"),
  pause: document.getElementById("pause"),
  complete: document.getElementById("complete"),
  hud: document.getElementById("hud"),
  attempt: document.getElementById("attempt"),
  progress: document.getElementById("progress"),
  progressFill: document.getElementById("progress-fill"),
  section: document.getElementById("section"),
  completeStats: document.getElementById("complete-stats"),
  canvas: document.getElementById("game"),
};

const game = new Game(els.canvas, {
  onHud: (data) => {
    els.attempt.textContent = `Attempt ${data.attempt}`;
    els.progress.textContent = `${data.progress}%`;
    els.progressFill.style.width = `${data.progress}%`;
    if (els.section) {
      els.section.textContent = `${data.sectionName} · ${data.section}/${data.sectionTotal}`;
    }
  },
  onPause: () => showOverlay("pause"),
  onComplete: (data) => {
    els.completeStats.textContent = `Corsa completata in ${data.attempt} attempt${
      data.attempt === 1 ? "" : "s"
    } · ${data.sections} sezioni.`;
    showOverlay("complete");
    els.hud.classList.add("hidden");
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

function play(practice = false) {
  hideOverlays();
  els.hud.classList.remove("hidden");
  game.start(practice);
}

document.getElementById("btn-play").addEventListener("click", () => play(false));
document.getElementById("btn-practice").addEventListener("click", () => play(true));
document.getElementById("btn-resume").addEventListener("click", () => {
  hideOverlays();
  els.hud.classList.remove("hidden");
  game.resume();
});
document.getElementById("btn-restart").addEventListener("click", () => play(game.practice));
document.getElementById("btn-menu").addEventListener("click", () => {
  game.goMenu();
  els.hud.classList.add("hidden");
  showOverlay("menu");
});
document.getElementById("btn-again").addEventListener("click", () => play(false));
document.getElementById("btn-complete-menu").addEventListener("click", () => {
  game.goMenu();
  showOverlay("menu");
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
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    e.preventDefault();
    if (game.state === "menu") {
      play(false);
      return;
    }
    if (game.state === "complete") {
      play(false);
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

game.startAttract();
showOverlay("menu");
