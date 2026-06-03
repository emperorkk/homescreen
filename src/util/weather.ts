// Weather + sun times from the device location, via the keyless Open-Meteo API.
// Descriptions are in Greek; temperatures in Celsius (Open-Meteo default).
// Runs in the browser at runtime — requires network and, ideally, geolocation
// permission. Falls back to Athens coordinates if location is denied/unavailable.

export interface Coords {
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  tempC: number;
  code: number;
  description: string;
  emoji: string;
  highC: number;
  lowC: number;
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export interface Almanac {
  weather: CurrentWeather;
  sun: SunTimes;
}

const ATHENS: Coords = { lat: 37.9838, lon: 23.7275 };
const COORDS_KEY = "homescreen.coords.v1";
const CACHE_KEY = "homescreen.weather.v1";
const CACHE_MS = 15 * 60 * 1000;

// WMO weather interpretation codes → Greek description + emoji.
function wmo(code: number): { description: string; emoji: string } {
  if (code === 0) return { description: "Αίθριος", emoji: "☀️" };
  if (code === 1) return { description: "Σχεδόν αίθριος", emoji: "🌤️" };
  if (code === 2) return { description: "Λίγα σύννεφα", emoji: "⛅" };
  if (code === 3) return { description: "Συννεφιά", emoji: "☁️" };
  if (code === 45 || code === 48) return { description: "Ομίχλη", emoji: "🌫️" };
  if (code >= 51 && code <= 55) return { description: "Ψιλόβροχο", emoji: "🌦️" };
  if (code === 56 || code === 57) return { description: "Παγωμένο ψιλόβροχο", emoji: "🌧️" };
  if (code >= 61 && code <= 65) return { description: "Βροχή", emoji: "🌧️" };
  if (code === 66 || code === 67) return { description: "Παγωμένη βροχή", emoji: "🌧️" };
  if (code >= 71 && code <= 75) return { description: "Χιόνι", emoji: "🌨️" };
  if (code === 77) return { description: "Κόκκοι χιονιού", emoji: "🌨️" };
  if (code >= 80 && code <= 82) return { description: "Μπόρες βροχής", emoji: "🌦️" };
  if (code === 85 || code === 86) return { description: "Χιονοπτώσεις", emoji: "🌨️" };
  if (code === 95) return { description: "Καταιγίδα", emoji: "⛈️" };
  if (code === 96 || code === 99) return { description: "Καταιγίδα με χαλάζι", emoji: "⛈️" };
  return { description: "—", emoji: "🌡️" };
}

function cachedCoords(): Coords {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (raw) return JSON.parse(raw) as Coords;
  } catch {
    /* ignore */
  }
  return ATHENS;
}

/** Resolve coordinates via geolocation, falling back to the last known / Athens. */
export function getCoords(): Promise<Coords> {
  return new Promise((resolve) => {
    const geo = navigator.geolocation;
    if (!geo) return resolve(cachedCoords());
    geo.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          localStorage.setItem(COORDS_KEY, JSON.stringify(c));
        } catch {
          /* ignore */
        }
        resolve(c);
      },
      () => resolve(cachedCoords()),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

/** Fetch current weather, today's high/low, and sun times for the coords. */
export async function fetchAlmanac(coords: Coords): Promise<Almanac> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "1",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const data = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number };
    daily: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      sunrise: string[];
      sunset: string[];
    };
  };
  const code = data.current.weather_code;
  const { description, emoji } = wmo(code);
  return {
    weather: {
      tempC: Math.round(data.current.temperature_2m),
      code,
      description,
      emoji,
      highC: Math.round(data.daily.temperature_2m_max[0]),
      lowC: Math.round(data.daily.temperature_2m_min[0]),
    },
    sun: {
      sunrise: new Date(data.daily.sunrise[0]),
      sunset: new Date(data.daily.sunset[0]),
    },
  };
}

interface CachedAlmanac {
  ts: number;
  tempC: number;
  code: number;
  highC: number;
  lowC: number;
  sunrise: string;
  sunset: string;
}

/** Last fetched almanac if still fresh (within CACHE_MS), else null. */
export function getCachedAlmanac(): Almanac | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedAlmanac;
    if (Date.now() - c.ts > CACHE_MS) return null;
    const { description, emoji } = wmo(c.code);
    return {
      weather: { tempC: c.tempC, code: c.code, description, emoji, highC: c.highC, lowC: c.lowC },
      sun: { sunrise: new Date(c.sunrise), sunset: new Date(c.sunset) },
    };
  } catch {
    return null;
  }
}

export function setCachedAlmanac(a: Almanac): void {
  const c: CachedAlmanac = {
    ts: Date.now(),
    tempC: a.weather.tempC,
    code: a.weather.code,
    highC: a.weather.highC,
    lowC: a.weather.lowC,
    sunrise: a.sun.sunrise.toISOString(),
    sunset: a.sun.sunset.toISOString(),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
