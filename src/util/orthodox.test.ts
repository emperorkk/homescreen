import { describe, it, expect } from "vitest";
import { orthodoxPascha, holidayOn, nextHoliday, orthodoxHolidays } from "./orthodox";

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("orthodoxPascha", () => {
  it("matches known Gregorian Orthodox Easter dates", () => {
    expect(fmt(orthodoxPascha(2024))).toBe("2024-05-05");
    expect(fmt(orthodoxPascha(2025))).toBe("2025-04-20");
    expect(fmt(orthodoxPascha(2026))).toBe("2026-04-12");
    expect(fmt(orthodoxPascha(2027))).toBe("2027-05-02");
  });
});

describe("holidayOn / nextHoliday", () => {
  it("identifies a fixed feast (Christmas)", () => {
    expect(holidayOn(new Date(2026, 11, 25))?.name).toContain("Χριστούγεννα");
  });

  it("returns null on a non-feast day", () => {
    expect(holidayOn(new Date(2026, 6, 3))).toBeNull();
  });

  it("nextHoliday is today-or-later", () => {
    const base = new Date(2026, 6, 3);
    expect(nextHoliday(base).date.getTime()).toBeGreaterThanOrEqual(
      new Date(2026, 6, 3).getTime(),
    );
  });

  it("includes the movable Pascha feast in the year list", () => {
    expect(orthodoxHolidays(2026).some((h) => h.name.includes("Πάσχα"))).toBe(true);
  });
});
