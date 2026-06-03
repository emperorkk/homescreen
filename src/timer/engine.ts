export type TimerStatus = "idle" | "running" | "paused" | "done";

export interface TimerSnapshot {
  status: TimerStatus;
  durationMs: number;
  remainingMs: number;
  progress: number; // 0..1, 0 = just started, 1 = finished
}

export interface TimerPersist {
  status: TimerStatus;
  durationMs: number;
  startEpoch: number;
  pausedAt: number;
  accumulatedPause: number;
}

export class TimerEngine {
  private status: TimerStatus = "idle";
  private durationMs = 0;
  private startEpoch = 0;
  private pausedAt = 0;
  private accumulatedPause = 0;
  private doneEpoch = 0;

  start(durationMs: number) {
    if (durationMs <= 0) return;
    this.durationMs = durationMs;
    this.startEpoch = Date.now();
    this.pausedAt = 0;
    this.accumulatedPause = 0;
    this.doneEpoch = 0;
    this.status = "running";
  }

  pause() {
    if (this.status !== "running") return;
    this.pausedAt = Date.now();
    this.status = "paused";
  }

  resume() {
    if (this.status !== "paused") return;
    this.accumulatedPause += Date.now() - this.pausedAt;
    this.pausedAt = 0;
    this.status = "running";
  }

  stop() {
    this.status = "idle";
    this.durationMs = 0;
    this.startEpoch = 0;
    this.pausedAt = 0;
    this.accumulatedPause = 0;
    this.doneEpoch = 0;
  }

  snapshot(): TimerSnapshot {
    const now = Date.now();
    if (this.status === "idle") {
      return { status: "idle", durationMs: 0, remainingMs: 0, progress: 0 };
    }
    const effectiveNow =
      this.status === "paused" ? this.pausedAt : now;
    const elapsed = effectiveNow - this.startEpoch - this.accumulatedPause;
    const remaining = Math.max(0, this.durationMs - elapsed);
    if (remaining === 0 && this.status === "running") {
      this.status = "done";
      this.doneEpoch = this.startEpoch + this.durationMs + this.accumulatedPause;
    }
    return {
      status: this.status,
      durationMs: this.durationMs,
      remainingMs: remaining,
      progress: this.durationMs ? 1 - remaining / this.durationMs : 0,
    };
  }

  getStatus() {
    return this.status;
  }

  getDoneEpoch() {
    return this.doneEpoch;
  }

  /** Serialize the running/paused state so it survives a reload. */
  serialize(): TimerPersist {
    return {
      status: this.status,
      durationMs: this.durationMs,
      startEpoch: this.startEpoch,
      pausedAt: this.pausedAt,
      accumulatedPause: this.accumulatedPause,
    };
  }

  /** Restore from a previously serialized state. */
  restore(s: TimerPersist): void {
    this.status = s.status;
    this.durationMs = s.durationMs;
    this.startEpoch = s.startEpoch;
    this.pausedAt = s.pausedAt;
    this.accumulatedPause = s.accumulatedPause;
    this.doneEpoch = 0;
  }
}

export function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
