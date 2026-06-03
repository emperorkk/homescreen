// Global alarm scheduler. While the app/tab is open it checks every few
// seconds and rings any due alarm with sound + vibration + notification and a
// full-screen overlay (Dismiss / Snooze). Background firing while the app is
// fully closed is not possible for a PWA without push, so this is a
// foreground/awake-tab scheduler — the notification helps surface it.

import { el } from "../util/dom";
import { vibrate } from "../util/dom";
import { getState } from "../state";
import type { Alarm } from "../state";
import { playSound, stopSound } from "../audio/library";

let intervalId = 0;
let overlayOpen = false;
const fired = new Set<string>();

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function startAlarmScheduler(): void {
  if (intervalId) return;
  intervalId = window.setInterval(check, 10_000);
  check();
}

function check(): void {
  if (overlayOpen) return;
  const now = new Date();
  const hm = hhmm(now);
  const dow = now.getDay();
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  for (const a of getState().alarms) {
    if (!a.enabled || a.time !== hm) continue;
    if (a.days.length && !a.days.includes(dow)) continue;
    const key = `${a.id}@${dayKey}@${hm}`;
    if (fired.has(key)) continue;
    fired.add(key);
    ring(a);
    break;
  }
}

function notify(a: Alarm): void {
  if (!getState().notifications) return;
  try {
    const N = window.Notification;
    if (!N) return;
    if (N.permission === "granted") {
      new N(a.label || "Alarm", { body: a.time, silent: false });
    } else if (N.permission === "default") {
      void N.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

function ring(a: Alarm): void {
  overlayOpen = true;
  const soundId = a.soundId || getState().selectedSoundId;
  void playSound(soundId, true);
  const buzz = () => vibrate([400, 200, 400, 200, 600]);
  buzz();
  const vib = window.setInterval(buzz, 2500);
  notify(a);

  const close = () => {
    clearInterval(vib);
    stopSound();
    overlay.remove();
    overlayOpen = false;
  };

  const overlay = el("div", { class: "alarm-ring", role: "dialog", "aria-label": "Alarm" }, [
    el("div", { class: "alarm-ring-time" }, [a.time]),
    el("div", { class: "alarm-ring-label" }, [a.label || "Alarm"]),
    el("div", { class: "alarm-ring-actions" }, [
      el(
        "button",
        {
          class: "btn",
          type: "button",
          onclick: () => {
            vibrate(8);
            close();
            window.setTimeout(() => ring(a), 9 * 60_000); // snooze 9'
          },
        },
        ["Snooze 9'"],
      ),
      el(
        "button",
        {
          class: "btn primary",
          type: "button",
          onclick: () => {
            vibrate(8);
            close();
          },
        },
        ["Dismiss"],
      ),
    ]),
  ]);
  document.body.append(overlay);
}
