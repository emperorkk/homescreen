import { el } from "../util/dom";
import { renderClock } from "./clock-display";
import { acquireWakeLock, releaseWakeLock } from "../timer/wake-lock";

// "Nightstand" dim mode: a near-black full-screen overlay showing only a dimmed,
// slowly drifting clock (the drift avoids OLED burn-in). Holds a wake lock so
// the screen stays on. Tap anywhere to exit.

let active = false;

export function enterNightstand(): void {
  if (active) return;
  active = true;

  const clock = renderClock();
  const inner = el("div", { class: "dim-inner" }, [clock.node]);
  const overlay = el("div", { class: "dim-screen", role: "button", "aria-label": "Exit nightstand" }, [
    inner,
  ]);

  function exit() {
    if (!active) return;
    active = false;
    clock.dispose();
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    void releaseWakeLock();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") exit();
  }

  overlay.addEventListener("click", exit);
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  void acquireWakeLock();
}
