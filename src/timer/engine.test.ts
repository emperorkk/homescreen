import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TimerEngine, formatRemaining } from "./engine";

describe("formatRemaining", () => {
  it("formats MM:SS under an hour", () => {
    expect(formatRemaining(65_000)).toBe("01:05");
  });
  it("formats H:MM:SS over an hour", () => {
    expect(formatRemaining(3_661_000)).toBe("1:01:01");
  });
  it("rounds partial seconds up", () => {
    expect(formatRemaining(500)).toBe("00:01");
  });
});

describe("TimerEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down by real elapsed time", () => {
    const e = new TimerEngine();
    e.start(10_000);
    expect(e.snapshot().remainingMs).toBe(10_000);
    vi.advanceTimersByTime(3_000);
    expect(e.snapshot().remainingMs).toBe(7_000);
  });

  it("pause freezes remaining and resume continues", () => {
    const e = new TimerEngine();
    e.start(10_000);
    vi.advanceTimersByTime(4_000);
    e.pause();
    vi.advanceTimersByTime(5_000);
    expect(e.snapshot().remainingMs).toBe(6_000);
    e.resume();
    vi.advanceTimersByTime(1_000);
    expect(e.snapshot().remainingMs).toBe(5_000);
  });

  it("transitions to done at zero", () => {
    const e = new TimerEngine();
    e.start(2_000);
    vi.advanceTimersByTime(2_500);
    const s = e.snapshot();
    expect(s.remainingMs).toBe(0);
    expect(s.status).toBe("done");
  });

  it("serialize/restore round-trips a running timer", () => {
    const e = new TimerEngine();
    e.start(10_000);
    vi.advanceTimersByTime(3_000);
    const restored = new TimerEngine();
    restored.restore(e.serialize());
    expect(restored.snapshot().remainingMs).toBe(7_000);
  });
});
