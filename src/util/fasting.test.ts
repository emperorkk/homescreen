import { describe, it, expect } from "vitest";
import { fastInfo } from "./fasting";
import { orthodoxPascha } from "./orthodox";

// July 2026 sits between the Apostles' fast (ends Jun 28) and the Dormition
// fast (Aug 1), so weekdays are fast-free and only Wed/Fri fast.
function dayInJuly2026(dow: number): Date {
  for (let d = 1; d <= 31; d++) {
    const x = new Date(2026, 6, d);
    if (x.getDay() === dow) return x;
  }
  throw new Error("not found");
}

describe("fastInfo", () => {
  it("detects the Nativity fast in early December", () => {
    expect(fastInfo(new Date(2026, 11, 1)).key).toBe("nativity");
  });

  it("detects the Dormition fast (mid-August)", () => {
    expect(fastInfo(new Date(2026, 7, 10)).key).toBe("dormition");
  });

  it("detects Great Lent", () => {
    const p = orthodoxPascha(2026);
    const d = new Date(p.getFullYear(), p.getMonth(), p.getDate() - 40);
    expect(fastInfo(d)).toMatchObject({ fasting: true, key: "greatLent" });
  });

  it("flags a plain Wednesday as a Wed/Fri fast", () => {
    expect(fastInfo(dayInJuly2026(3))).toMatchObject({ fasting: true, key: "wedfri" });
  });

  it("leaves a plain Monday fast-free", () => {
    expect(fastInfo(dayInJuly2026(1)).fasting).toBe(false);
  });
});
