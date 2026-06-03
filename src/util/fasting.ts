// Greek Orthodox fasting status for a date — pure computation, no network.
// This is a practical approximation of the typical lay fasting calendar: the
// four major multi-day fasts, the year-round Wednesday/Friday rule, and the
// common fast-free windows. It is not a substitute for a parish typikon.

import { orthodoxPascha } from "./orthodox";

export type FastKey =
  | "greatLent"
  | "nativity"
  | "dormition"
  | "apostles"
  | "wedfri"
  | "free";

export interface FastInfo {
  fasting: boolean;
  key: FastKey;
}

function midnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function addDays(d: Date, n: number): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

function within(t: number, start: number, end: number): boolean {
  return t >= start && t <= end;
}

export function fastInfo(date: Date = new Date()): FastInfo {
  const t = midnight(date);
  const year = date.getFullYear();
  const pascha = orthodoxPascha(year);
  const dow = date.getDay(); // 0 Sun .. 6 Sat

  // Great Lent: Clean Monday (Pascha−48) through Holy Saturday (Pascha−1).
  if (within(t, addDays(pascha, -48), addDays(pascha, -1))) {
    return { fasting: true, key: "greatLent" };
  }
  // Dormition Fast: Aug 1–14.
  if (within(t, midnight(new Date(year, 7, 1)), midnight(new Date(year, 7, 14)))) {
    return { fasting: true, key: "dormition" };
  }
  // Nativity Fast: Nov 15 – Dec 24.
  if (within(t, midnight(new Date(year, 10, 15)), midnight(new Date(year, 11, 24)))) {
    return { fasting: true, key: "nativity" };
  }
  // Apostles' Fast: Monday after All Saints (Pascha+57) – Jun 28 (can be empty).
  const apStart = addDays(pascha, 57);
  const apEnd = midnight(new Date(year, 5, 28));
  if (apStart <= apEnd && within(t, apStart, apEnd)) {
    return { fasting: true, key: "apostles" };
  }

  // Fast-free windows (override the Wed/Fri rule):
  // Bright Week (Pascha..+6), week after Pentecost (Pascha+49..+55),
  // and the 12 days of Christmas (Dec 25 – Jan 4).
  const fastFree =
    within(t, midnight(pascha), addDays(pascha, 6)) ||
    within(t, addDays(pascha, 49), addDays(pascha, 55)) ||
    (date.getMonth() === 11 && date.getDate() >= 25) ||
    (date.getMonth() === 0 && date.getDate() <= 4);
  if (fastFree) return { fasting: false, key: "free" };

  // Year-round Wednesday & Friday fast.
  if (dow === 3 || dow === 5) return { fasting: true, key: "wedfri" };

  return { fasting: false, key: "free" };
}
