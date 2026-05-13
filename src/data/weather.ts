// Open-Meteo client. Free, no API key. Falls back to Athens if geolocation
// isn't available or denied. Caches the latest reading in localStorage for
// up to 30 min so the home screen still has something to show offline.

export interface WeatherReading {
  tempC: number;
  code: number;
  isDay: boolean;
  sunriseEpoch: number;
  sunsetEpoch: number;
  lat: number;
  lon: number;
  fetchedAt: number;
}

const CACHE_KEY = "homescreen.weather.v1";
const CACHE_TTL = 30 * 60 * 1000;
const FALLBACK = { lat: 37.9838, lon: 23.7275 }; // Athens

function readCache(): WeatherReading | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherReading;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(r: WeatherReading): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(r));
  } catch {
    /* quota — ignore */
  }
}

function getCoords(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(FALLBACK);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(FALLBACK),
      { maximumAge: 60 * 60 * 1000, timeout: 6000 },
    );
  });
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
}

export async function fetchWeather(): Promise<WeatherReading | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached;
  }
  const { lat, lon } = await getCoords();
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return cached;
    const data = (await res.json()) as OpenMeteoResponse;
    const reading: WeatherReading = {
      tempC: data.current?.temperature_2m ?? 0,
      code: data.current?.weather_code ?? 0,
      isDay: (data.current?.is_day ?? 1) === 1,
      sunriseEpoch: data.daily?.sunrise?.[0]
        ? new Date(data.daily.sunrise[0]).getTime()
        : 0,
      sunsetEpoch: data.daily?.sunset?.[0]
        ? new Date(data.daily.sunset[0]).getTime()
        : 0,
      lat,
      lon,
      fetchedAt: Date.now(),
    };
    writeCache(reading);
    return reading;
  } catch {
    return cached;
  }
}

export function weatherIcon(code: number, isDay = true): string {
  if (code === 0) return isDay ? "☀" : "🌙";
  if (code <= 3) return isDay ? "🌤" : "☁";
  if (code <= 48) return "🌫";
  if (code <= 57) return "🌦";
  if (code <= 67) return "🌧";
  if (code <= 77) return "❄";
  if (code <= 82) return "🌧";
  if (code <= 86) return "🌨";
  if (code >= 95) return "⛈";
  return "·";
}
