// Weather + sun times from the device location, via the keyless Open-Meteo API.
// Temperatures are always fetched in Celsius and converted for display; WMO
// codes are mapped to an i18n key (+ emoji) so descriptions follow the language
// setting. City label comes from the keyless BigDataCloud reverse geocoder.
// Runs in the browser at runtime — requires network and, ideally, geolocation
// permission. Falls back to a manual location (if set) then Athens.

import { getState } from "../state";

export interface Coords {
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  tempC: number;
  code: number;
  key: string;
  emoji: string;
  highC: number;
  lowC: number;
}

export interface DayForecast {
  date: Date;
  code: number;
  key: string;
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
  forecast: DayForecast[];
  label: string;
}

const ATHENS: Coords = { lat: 37.9838, lon: 23.7275 };
const COORDS_KEY = "homescreen.coords.v1";
const CACHE_KEY = "homescreen.weather.v1";
const CACHE_MS = 15 * 60 * 1000;

// WMO weather interpretation codes → { i18n key, emoji }.
function wmo(code: number): { key: string; emoji: string } {
  if (code === 0) return { key: "clear", emoji: "☀️" };
  if (code === 1) return { key: "mostlyClear", emoji: "🌤️" };
  if (code === 2) return { key: "partlyCloudy", emoji: "⛅" };
  if (code === 3) return { key: "overcast", emoji: "☁️" };
  if (code === 45 || code === 48) return { key: "fog", emoji: "🌫️" };
  if (code >= 51 && code <= 55) return { key: "drizzle", emoji: "🌦️" };
  if (code === 56 || code === 57) return { key: "freezingDrizzle", emoji: "🌧️" };
  if (code >= 61 && code <= 65) return { key: "rain", emoji: "🌧️" };
  if (code === 66 || code === 67) return { key: "freezingRain", emoji: "🌧️" };
  if (code >= 71 && code <= 75) return { key: "snow", emoji: "🌨️" };
  if (code === 77) return { key: "snowGrains", emoji: "🌨️" };
  if (code >= 80 && code <= 82) return { key: "rainShowers", emoji: "🌦️" };
  if (code === 85 || code === 86) return { key: "snowShowers", emoji: "🌨️" };
  if (code === 95) return { key: "thunder", emoji: "⛈️" };
  if (code === 96 || code === 99) return { key: "thunderHail", emoji: "⛈️" };
  return { key: "unknown", emoji: "🌡️" };
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

/**
 * Resolve coordinates: a manual override from settings wins; otherwise
 * geolocation, falling back to the last known location / Athens.
 */
export function getCoords(): Promise<Coords> {
  const s = getState();
  if (s.locLat != null && s.locLon != null) {
    return Promise.resolve({ lat: s.locLat, lon: s.locLon });
  }
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

/** Reverse-geocode coordinates to a city/locality label (best effort). */
export async function reverseGeocode(coords: Coords): Promise<string> {
  const lng = getState().lang;
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=${lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const d = (await res.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
  };
  return d.city || d.locality || d.principalSubdivision || "";
}

/** Forward-geocode a place name to candidate locations (settings search). */
export async function searchPlaces(
  name: string,
): Promise<{ label: string; lat: number; lon: number }[]> {
  const lng = getState().lang;
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(name)}&count=6&language=${lng}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search ${res.status}`);
  const d = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (d.results ?? []).map((r) => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Fetch current weather, a 7-day forecast, sun times, and a city label. */
export async function fetchAlmanac(coords: Coords): Promise<Almanac> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const data = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      sunrise: string[];
      sunset: string[];
    };
  };

  const cur = wmo(data.current.weather_code);
  const forecast: DayForecast[] = data.daily.time.map((iso, i) => {
    const w = wmo(data.daily.weather_code[i]);
    return {
      date: new Date(iso),
      code: data.daily.weather_code[i],
      key: w.key,
      emoji: w.emoji,
      highC: Math.round(data.daily.temperature_2m_max[i]),
      lowC: Math.round(data.daily.temperature_2m_min[i]),
    };
  });

  let label = "";
  try {
    label = await reverseGeocode(coords);
  } catch {
    /* label is optional */
  }

  return {
    weather: {
      tempC: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      key: cur.key,
      emoji: cur.emoji,
      highC: forecast[0].highC,
      lowC: forecast[0].lowC,
    },
    sun: {
      sunrise: new Date(data.daily.sunrise[0]),
      sunset: new Date(data.daily.sunset[0]),
    },
    forecast,
    label,
  };
}

interface CachedAlmanac {
  ts: number;
  label: string;
  cur: { tempC: number; code: number };
  sunrise: string;
  sunset: string;
  forecast: { date: string; code: number; highC: number; lowC: number }[];
}

/** Last fetched almanac if still fresh (within CACHE_MS), else null. */
export function getCachedAlmanac(): Almanac | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedAlmanac;
    if (Date.now() - c.ts > CACHE_MS) return null;
    const forecast: DayForecast[] = c.forecast.map((f) => {
      const w = wmo(f.code);
      return { date: new Date(f.date), code: f.code, key: w.key, emoji: w.emoji, highC: f.highC, lowC: f.lowC };
    });
    const cur = wmo(c.cur.code);
    return {
      weather: {
        tempC: c.cur.tempC,
        code: c.cur.code,
        key: cur.key,
        emoji: cur.emoji,
        highC: forecast[0]?.highC ?? c.cur.tempC,
        lowC: forecast[0]?.lowC ?? c.cur.tempC,
      },
      sun: { sunrise: new Date(c.sunrise), sunset: new Date(c.sunset) },
      forecast,
      label: c.label,
    };
  } catch {
    return null;
  }
}

/** Drop the cached weather (e.g. after changing the location). */
export function clearAlmanacCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function setCachedAlmanac(a: Almanac): void {
  const c: CachedAlmanac = {
    ts: Date.now(),
    label: a.label,
    cur: { tempC: a.weather.tempC, code: a.weather.code },
    sunrise: a.sun.sunrise.toISOString(),
    sunset: a.sun.sunset.toISOString(),
    forecast: a.forecast.map((f) => ({
      date: f.date.toISOString(),
      code: f.code,
      highC: f.highC,
      lowC: f.lowC,
    })),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
