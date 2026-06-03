import { describe, it, expect } from "vitest";
import { nameDaysOn } from "./namedays";

describe("nameDaysOn", () => {
  it("returns the names celebrating on a known date", () => {
    expect(nameDaysOn(new Date(2026, 11, 25))).toContain("Χρήστος");
  });

  it("returns an empty list on a date with no entry", () => {
    expect(nameDaysOn(new Date(2026, 1, 3))).toEqual([]);
  });
});
