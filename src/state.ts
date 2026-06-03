export type ThemeId =
  | "dark"
  | "light"
  | "marble"
  | "sandstone"
  | "cyberpunk"
  | "dos";

export type Lang = "el" | "en";
export type TempUnit = "c" | "f";
export type HourPref = "auto" | "12" | "24";

export interface AppState {
  theme: ThemeId;
  selectedSoundId: string;
  defaultPresetSeconds: number;
  vibrate: boolean;
  notifications: boolean;
  // Almanac / localization
  lang: Lang;
  tempUnit: TempUnit;
  hour12: HourPref;
  almWeather: boolean;
  almSun: boolean;
  almMoon: boolean;
  almHoliday: boolean;
  almNameday: boolean;
  almFasting: boolean;
  // Manual location override (null = use geolocation)
  locLat: number | null;
  locLon: number | null;
  locLabel: string;
}

const KEY = "homescreen.state.v1";

const defaults: AppState = {
  theme: "dark",
  selectedSoundId: "d1",
  defaultPresetSeconds: 300,
  vibrate: true,
  notifications: true,
  lang: "el",
  tempUnit: "c",
  hour12: "auto",
  almWeather: true,
  almSun: true,
  almMoon: true,
  almHoliday: true,
  almNameday: true,
  almFasting: true,
  locLat: null,
  locLon: null,
  locLabel: "",
};

function read(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

let cache = read();
const listeners = new Set<(s: AppState) => void>();

export function getState(): AppState {
  return cache;
}

export function setState(patch: Partial<AppState>): void {
  cache = { ...cache, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode — ignore */
  }
  for (const fn of listeners) fn(cache);
}

export function onState(fn: (s: AppState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
