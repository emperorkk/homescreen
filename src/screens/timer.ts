import { el, svg, vibrate } from "../util/dom";
import { go } from "../router";
import { createWheelPicker } from "../components/wheel-picker";
import { TimerEngine, formatRemaining } from "../timer/engine";
import { acquireWakeLock, releaseWakeLock, reacquireOnVisible } from "../timer/wake-lock";
import { playSound, stopSound } from "../audio/library";
import { getState, setState } from "../state";
import { setTimerProgress } from "../webgl/renderer";

// Preset durations expressed in minutes; chips display as HH:MM.
const PRESET_MINUTES = [5, 15, 20, 30, 60, 90, 120];

function fmtPreset(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface NotifLike {
  requestPermission?: () => Promise<NotificationPermission>;
  permission?: NotificationPermission;
}

async function fireNotification(title: string, body: string) {
  const N = (window as unknown as { Notification?: NotifLike }).Notification;
  if (!N) return;
  if (N.permission === "default" && N.requestPermission) {
    try {
      await N.requestPermission();
    } catch {
      /* ignore */
    }
  }
  if (N.permission === "granted") {
    try {
      new (window as unknown as { Notification: new (t: string, o?: NotificationOptions) => Notification }).Notification(
        title,
        { body, silent: false },
      );
    } catch {
      /* ignore */
    }
  }
}

export function renderTimer(root: HTMLElement): () => void {
  const engine = new TimerEngine();
  const state = getState();

  // ---------- setup view ----------
  const picker = createWheelPicker(state.defaultPresetSeconds || 60);

  const presetEls: HTMLButtonElement[] = [];
  const presets = el("div", { class: "presets", role: "group" }, []);
  for (const min of PRESET_MINUTES) {
    const s = min * 60;
    const btn = el(
      "button",
      {
        class: "preset-chip",
        type: "button",
        "data-seconds": s,
        "data-default": String(s === getState().defaultPresetSeconds),
      },
      [fmtPreset(s)],
    );
    let longPressTimer = 0;
    const longPress = () => {
      vibrate([10, 30, 10]);
      setState({ defaultPresetSeconds: s });
      for (const b of presetEls)
        b.dataset.default = String(
          Number(b.dataset.seconds) === s,
        );
    };
    btn.addEventListener("pointerdown", () => {
      longPressTimer = window.setTimeout(longPress, 550);
    });
    btn.addEventListener("pointerup", () => clearTimeout(longPressTimer));
    btn.addEventListener("pointerleave", () => clearTimeout(longPressTimer));
    btn.addEventListener("pointercancel", () => clearTimeout(longPressTimer));
    btn.addEventListener("click", () => {
      vibrate(10);
      picker.setSeconds(s, true);
    });
    presetEls.push(btn);
    presets.append(btn);
  }

  const startBtn = el("button", { class: "btn primary", type: "button" }, ["Start"]);
  const backBtn = el(
    "button",
    {
      class: "btn ghost",
      type: "button",
      onclick: () => {
        vibrate(8);
        go("home");
      },
    },
    ["Back"],
  );

  const setupView = el("section", { class: "view view-setup" }, [
    presets,
    picker.node,
    el("div", { class: "btn-row" }, [backBtn, startBtn]),
  ]);

  // ---------- countdown view ----------
  const RING_R = 140;
  const C = 2 * Math.PI * RING_R;
  const ringTrack = svg("circle", {
    class: "ring-track",
    cx: "150",
    cy: "150",
    r: String(RING_R),
  });
  const ringProgress = svg("circle", {
    class: "ring-progress",
    cx: "150",
    cy: "150",
    r: String(RING_R),
    "stroke-dasharray": String(C),
    "stroke-dashoffset": "0",
  });
  const ringSvg = svg("svg", { viewBox: "0 0 300 300" }, [ringTrack, ringProgress]);
  const timeText = el("div", { class: "countdown-time" }, ["00:00"]);
  const countdownInner = el("div", { class: "countdown-ring" }, [ringSvg, timeText]);

  const pauseBtn = el("button", { class: "btn", type: "button" }, ["Pause"]);
  const stopBtn = el("button", { class: "btn danger", type: "button" }, ["Stop"]);
  const countdownButtons = el("div", { class: "btn-row" }, [pauseBtn, stopBtn]);

  const countdownView = el("section", { class: "view view-countdown countdown", hidden: true }, [
    countdownInner,
    countdownButtons,
  ]);

  // ---------- top bar ----------
  const topbar = el("header", { class: "topbar" }, [
    el("div", { class: "title" }, ["Timer"]),
  ]);

  root.append(topbar, setupView, countdownView);

  // ---------- behavior ----------
  let rafId = 0;
  let releaseVis: (() => void) | null = null;

  function showSetup() {
    setupView.hidden = false;
    countdownView.hidden = true;
    countdownView.classList.remove("is-done");
    setTimerProgress(0);
  }

  function showCountdown() {
    setupView.hidden = true;
    countdownView.hidden = false;
  }

  function tick() {
    const snap = engine.snapshot();
    timeText.textContent = formatRemaining(snap.remainingMs);
    const offset = C * snap.progress;
    ringProgress.setAttribute("stroke-dashoffset", String(offset));
    setTimerProgress(snap.progress);

    if (snap.status === "done") {
      onDone();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  async function startCountdown(durationSec: number) {
    if (durationSec <= 0) return;
    engine.start(durationSec * 1000);
    showCountdown();
    pauseBtn.textContent = "Pause";
    vibrate(15);
    await acquireWakeLock();
    if (!releaseVis) releaseVis = reacquireOnVisible();
    rafId = requestAnimationFrame(tick);
  }

  async function onDone() {
    countdownView.classList.add("is-done");
    timeText.textContent = "00:00";
    setTimerProgress(1);
    vibrate([200, 80, 200, 80, 400]);
    const id = getState().selectedSoundId;
    void playSound(id, true);
    void fireNotification("Time's up", "Your countdown has finished.");
    pauseBtn.textContent = "Dismiss";
  }

  function stopAll() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    stopSound();
    engine.stop();
    void releaseWakeLock();
    if (releaseVis) {
      releaseVis();
      releaseVis = null;
    }
    showSetup();
  }

  startBtn.addEventListener("click", () => {
    const seconds = picker.getSeconds();
    if (seconds <= 0) {
      vibrate([20, 40, 20]);
      return;
    }
    void startCountdown(seconds);
  });

  pauseBtn.addEventListener("click", () => {
    vibrate(8);
    const status = engine.getStatus();
    if (status === "running") {
      engine.pause();
      pauseBtn.textContent = "Resume";
      cancelAnimationFrame(rafId);
      void releaseWakeLock();
    } else if (status === "paused") {
      engine.resume();
      pauseBtn.textContent = "Pause";
      void acquireWakeLock();
      rafId = requestAnimationFrame(tick);
    } else if (status === "done") {
      stopAll();
    }
  });

  stopBtn.addEventListener("click", () => {
    vibrate(12);
    stopAll();
  });

  showSetup();

  return () => {
    cancelAnimationFrame(rafId);
    stopSound();
    void releaseWakeLock();
    if (releaseVis) releaseVis();
    picker.dispose();
    setTimerProgress(0);
  };
}
