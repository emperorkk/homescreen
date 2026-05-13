import { el, svg, vibrate } from "../util/dom";
import { go } from "../router";
import { createWheelPicker } from "../components/wheel-picker";
import { TimerEngine, formatRemaining } from "../timer/engine";
import { acquireWakeLock, releaseWakeLock, reacquireOnVisible } from "../timer/wake-lock";
import { playSound, stopSound } from "../audio/library";
import { getState, setState } from "../state";
import { setTimerProgress } from "../webgl/renderer";

const PRESETS_SEC = [5, 15, 20, 30, 60, 90, 120];

function fmtPreset(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  let selectedSeconds = state.defaultPresetSeconds || 60;
  let activePickerDispose: (() => void) | null = null;

  // ---------- duration display (opens picker modal) ----------
  const durationValue = el("div", { class: "value" }, [fmtDuration(selectedSeconds)]);
  const durationDisplay = el(
    "button",
    {
      class: "duration-display",
      type: "button",
      "aria-label": "Set time",
      onclick: () => openPickerModal(),
    },
    [durationValue, el("div", { class: "hint" }, ["Tap to set time"])],
  );

  // ---------- presets ----------
  const presetEls: HTMLButtonElement[] = [];
  const presets = el("div", { class: "presets", role: "group" }, []);
  for (const s of PRESETS_SEC) {
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
        b.dataset.default = String(Number(b.dataset.seconds) === s);
    };
    btn.addEventListener("pointerdown", () => {
      longPressTimer = window.setTimeout(longPress, 550);
    });
    btn.addEventListener("pointerup", () => clearTimeout(longPressTimer));
    btn.addEventListener("pointerleave", () => clearTimeout(longPressTimer));
    btn.addEventListener("pointercancel", () => clearTimeout(longPressTimer));
    btn.addEventListener("click", () => {
      vibrate(10);
      setSelectedSeconds(s);
    });
    presetEls.push(btn);
    presets.append(btn);
  }

  function setSelectedSeconds(s: number) {
    selectedSeconds = s;
    durationValue.textContent = fmtDuration(s);
  }

  // ---------- buttons ----------
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
    durationDisplay,
    presets,
    el("div", { class: "btn-row" }, [backBtn, startBtn]),
  ]);

  // ---------- modal picker ----------
  function openPickerModal() {
    vibrate(8);
    if (activePickerDispose) return;

    const picker = createWheelPicker(selectedSeconds);

    const cancelBtn = el(
      "button",
      { class: "btn ghost", type: "button" },
      ["Cancel"],
    );
    const setBtn = el(
      "button",
      { class: "btn primary", type: "button" },
      ["Set"],
    );

    const modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true" }, [
      el("div", { class: "modal-grabber", "aria-hidden": "true" }),
      el("div", { class: "modal-title" }, ["Set time"]),
      picker.node,
      el("div", { class: "btn-row" }, [cancelBtn, setBtn]),
    ]);

    const backdrop = el("div", { class: "modal-backdrop" }, [modal]);

    function close() {
      backdrop.removeEventListener("click", onBackdrop);
      cancelBtn.removeEventListener("click", close);
      setBtn.removeEventListener("click", onSet);
      modal.removeEventListener("click", stopProp);
      document.removeEventListener("keydown", onKey);
      picker.dispose();
      backdrop.remove();
      activePickerDispose = null;
    }
    function onSet() {
      vibrate(10);
      setSelectedSeconds(picker.getSeconds());
      close();
    }
    function onBackdrop() {
      close();
    }
    function stopProp(e: Event) {
      e.stopPropagation();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    backdrop.addEventListener("click", onBackdrop);
    modal.addEventListener("click", stopProp);
    cancelBtn.addEventListener("click", close);
    setBtn.addEventListener("click", onSet);
    document.addEventListener("keydown", onKey);

    document.body.append(backdrop);
    activePickerDispose = close;
  }

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
    if (selectedSeconds <= 0) {
      vibrate([20, 40, 20]);
      return;
    }
    void startCountdown(selectedSeconds);
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
    if (activePickerDispose) activePickerDispose();
    setTimerProgress(0);
  };
}
