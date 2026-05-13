import { el } from "../util/dom";
import { fetchWeather, weatherIcon, type WeatherReading } from "../data/weather";

export interface WeatherChip {
  node: HTMLElement;
  dispose: () => void;
  getReading: () => WeatherReading | null;
  onUpdate: (fn: (r: WeatherReading | null) => void) => void;
}

export function renderWeatherChip(): WeatherChip {
  const icon = el("span", { class: "icon", "aria-hidden": "true" }, ["·"]);
  const temp = el("span", { class: "temp" }, ["—"]);
  const node = el(
    "div",
    { class: "chip weather-chip", "aria-label": "Καιρός" },
    [icon, temp],
  );

  let reading: WeatherReading | null = null;
  let updateTimer = 0;
  const listeners = new Set<(r: WeatherReading | null) => void>();

  function paint() {
    if (!reading) {
      icon.textContent = "·";
      temp.textContent = "—";
      return;
    }
    icon.textContent = weatherIcon(reading.code, reading.isDay);
    temp.textContent = `${Math.round(reading.tempC)}°`;
  }

  async function refresh() {
    reading = await fetchWeather();
    paint();
    for (const fn of listeners) fn(reading);
  }

  void refresh();
  updateTimer = window.setInterval(() => void refresh(), 30 * 60 * 1000);

  return {
    node,
    dispose() {
      clearInterval(updateTimer);
      listeners.clear();
    },
    getReading: () => reading,
    onUpdate(fn) {
      listeners.add(fn);
      if (reading) fn(reading);
    },
  };
}
