import { getState } from "../state";

const INTERVAL_MS = 3000;

export interface Heartbeat {
  start(): void;
  stop(): void;
  setVisualHandler(fn: (() => void) | null): void;
  dispose(): void;
}

interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext;
}

export function createHeartbeat(): Heartbeat {
  let timer = 0;
  let visualFn: (() => void) | null = null;
  let audioCtx: AudioContext | null = null;

  function ensureCtx(): AudioContext | null {
    if (audioCtx) return audioCtx;
    const Ctor =
      window.AudioContext ||
      (window as unknown as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
    return audioCtx;
  }

  function pulse(
    ctx: AudioContext,
    when: number,
    freq: number,
    gain: number,
    dur: number,
  ): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(ctx.destination);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  function click(): void {
    const ctx = ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    pulse(ctx, t0, 110, 0.22, 0.09);
    pulse(ctx, t0 + 0.14, 88, 0.16, 0.10);
  }

  function fire(): void {
    const s = getState();
    if (s.heartbeatVisual && visualFn) {
      try {
        visualFn();
      } catch {
        /* noop */
      }
    }
    if (s.heartbeatHaptic && "vibrate" in navigator) {
      try {
        navigator.vibrate([35, 60, 50]);
      } catch {
        /* some browsers throw on pattern length */
      }
    }
    if (s.heartbeatAudio) {
      click();
    }
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
  }

  function start(): void {
    stop();
    timer = window.setInterval(fire, INTERVAL_MS);
  }

  function dispose(): void {
    stop();
    if (audioCtx && audioCtx.state !== "closed") {
      void audioCtx.close().catch(() => {
        /* noop */
      });
    }
    audioCtx = null;
    visualFn = null;
  }

  return {
    start,
    stop,
    setVisualHandler(fn) {
      visualFn = fn;
    },
    dispose,
  };
}
