export type ThemeId =
  | "dark"
  | "light"
  | "marble"
  | "sandstone"
  | "cyberpunk"
  | "dos";

export interface AppState {
  theme: ThemeId;
  selectedSoundId: string;
  defaultPresetSeconds: number;
  vibrate: boolean;
  notifications: boolean;
}

const KEY = "homescreen.state.v1";

const defaults: AppState = {
  theme: "dark",
  selectedSoundId: "d1",
  defaultPresetSeconds: 300,
  vibrate: true,
  notifications: true,
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
