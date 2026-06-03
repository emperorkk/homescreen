import { describe, it, expect } from "vitest";
import { moonInfo } from "./moon";

const REF = Date.UTC(2000, 0, 6, 18, 14);
const DAY = 86_400_000;

describe("moonInfo", () => {
  it("is a new moon at the reference epoch", () => {
    const m = moonInfo(new Date(REF));
    expect(m.index).toBe(0);
    expect(m.illumination).toBeLessThan(0.02);
  });

  it("is roughly full half a synodic month later", () => {
    const m = moonInfo(new Date(REF + 14.765 * DAY));
    expect(m.index).toBe(4);
    expect(m.illumination).toBeGreaterThan(0.98);
  });

  it("always yields a valid index and illumination", () => {
    for (let i = 0; i < 60; i++) {
      const m = moonInfo(new Date(Date.UTC(2020, 0, 1) + i * DAY));
      expect(m.index).toBeGreaterThanOrEqual(0);
      expect(m.index).toBeLessThanOrEqual(7);
      expect(m.illumination).toBeGreaterThanOrEqual(0);
      expect(m.illumination).toBeLessThanOrEqual(1);
    }
  });
});
