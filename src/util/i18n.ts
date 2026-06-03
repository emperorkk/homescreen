// Tiny i18n layer for the almanac. The default app language is Greek; the
// settings language toggle switches the weather / moon / sun / UI strings to
// English. Orthodox feast names and Greek name days stay in Greek (they are
// proper liturgical / Greek terms) regardless of this setting.

import { getState } from "../state";
import type { Lang } from "../state";

type Pair = { el: string; en: string };

export function lang(): Lang {
  return getState().lang;
}

const STR = {
  loadingWeather: { el: "Φόρτωση καιρού…", en: "Loading weather…" },
  weatherUnavailable: { el: "Ο καιρός δεν είναι διαθέσιμος", en: "Weather unavailable" },
  today: { el: "Σήμερα", en: "Today" },
  nameDay: { el: "Γιορτάζει", en: "Name day" },
  fasting: { el: "Νηστεία", en: "Fasting" },
  noFasting: { el: "Κατάλυση", en: "No fast" },
  forecast: { el: "Πρόγνωση", en: "Forecast" },
  sunrise: { el: "Ανατολή", en: "Sunrise" },
  sunset: { el: "Δύση", en: "Sunset" },
} satisfies Record<string, Pair>;

export function t(key: keyof typeof STR): string {
  return STR[key][lang()];
}

const MOON: Pair[] = [
  { el: "Νέα Σελήνη", en: "New Moon" },
  { el: "Αύξων Μηνίσκος", en: "Waxing Crescent" },
  { el: "Πρώτο Τέταρτο", en: "First Quarter" },
  { el: "Αύξουσα Αμφίκυρτος", en: "Waxing Gibbous" },
  { el: "Πανσέληνος", en: "Full Moon" },
  { el: "Φθίνουσα Αμφίκυρτος", en: "Waning Gibbous" },
  { el: "Τελευταίο Τέταρτο", en: "Last Quarter" },
  { el: "Φθίνων Μηνίσκος", en: "Waning Crescent" },
];

export function moonName(index: number): string {
  return MOON[((index % 8) + 8) % 8][lang()];
}

// WMO weather code group keys → localized descriptions.
const WMO: Record<string, Pair> = {
  clear: { el: "Αίθριος", en: "Clear" },
  mostlyClear: { el: "Σχεδόν αίθριος", en: "Mostly clear" },
  partlyCloudy: { el: "Λίγα σύννεφα", en: "Partly cloudy" },
  overcast: { el: "Συννεφιά", en: "Overcast" },
  fog: { el: "Ομίχλη", en: "Fog" },
  drizzle: { el: "Ψιλόβροχο", en: "Drizzle" },
  freezingDrizzle: { el: "Παγωμένο ψιλόβροχο", en: "Freezing drizzle" },
  rain: { el: "Βροχή", en: "Rain" },
  freezingRain: { el: "Παγωμένη βροχή", en: "Freezing rain" },
  snow: { el: "Χιόνι", en: "Snow" },
  snowGrains: { el: "Κόκκοι χιονιού", en: "Snow grains" },
  rainShowers: { el: "Μπόρες βροχής", en: "Rain showers" },
  snowShowers: { el: "Χιονοπτώσεις", en: "Snow showers" },
  thunder: { el: "Καταιγίδα", en: "Thunderstorm" },
  thunderHail: { el: "Καταιγίδα με χαλάζι", en: "Thunderstorm, hail" },
  unknown: { el: "—", en: "—" },
};

export function wmoName(key: string): string {
  return (WMO[key] ?? WMO.unknown)[lang()];
}

const FAST: Record<string, Pair> = {
  greatLent: { el: "Μεγάλη Σαρακοστή", en: "Great Lent" },
  nativity: { el: "Σαρανταήμερο", en: "Nativity Fast" },
  dormition: { el: "Δεκαπενταύγουστος", en: "Dormition Fast" },
  apostles: { el: "Νηστεία Αποστόλων", en: "Apostles' Fast" },
  wedfri: { el: "Τετάρτη / Παρασκευή", en: "Wednesday / Friday" },
  free: { el: "Κατάλυση εις πάντα", en: "Fast-free" },
};

export function fastName(key: string): string {
  return (FAST[key] ?? FAST.free)[lang()];
}

/** Intl locale tag for the current language. */
export function locale(): string {
  return lang() === "el" ? "el-GR" : "en-GB";
}
