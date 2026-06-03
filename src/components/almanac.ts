import { el } from "../util/dom";
import { getState } from "../state";
import { moonInfo } from "../util/moon";
import { holidayOn, nextHoliday } from "../util/orthodox";
import { fastInfo } from "../util/fasting";
import { nameDaysOn } from "../util/namedays";
import { t, moonName, wmoName, fastName, locale } from "../util/i18n";
import {
  getCoords,
  fetchAlmanac,
  getCachedAlmanac,
  setCachedAlmanac,
  type Almanac,
  type DayForecast,
} from "../util/weather";

function fmtTemp(c: number): string {
  return getState().tempUnit === "f" ? `${Math.round((c * 9) / 5 + 32)}°` : `${c}°`;
}

function row(cls = ""): HTMLElement {
  return el("div", { class: `alm-row ${cls}`.trim() });
}
function icon(glyph: string): HTMLElement {
  return el("span", { class: "alm-icon" }, [glyph]);
}
function text(s: string, cls = "alm-text"): HTMLElement {
  return el("span", { class: cls }, [s]);
}

/**
 * Home-screen almanac. Weather/sun load asynchronously (cached value first,
 * then a live fetch); moon, holiday, name day and fasting are computed
 * synchronously from the date. Each section can be toggled off in settings,
 * and all strings follow the language/units/time-format settings.
 */
export function renderAlmanac(): { node: HTMLElement; dispose: () => void } {
  let cancelled = false;
  const now = new Date();
  const s = getState();
  const timeFmt = new Intl.DateTimeFormat(locale(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: s.hour12 === "auto" ? undefined : s.hour12 === "12",
  });
  const dateFmt = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" });
  const dayFmt = new Intl.DateTimeFormat(locale(), { weekday: "short" });

  const node = el("section", { class: "almanac", "aria-label": "Almanac" });

  // ----- weather (async) + expandable forecast -----
  let weatherRow: HTMLElement | null = null;
  let forecastStrip: HTMLElement | null = null;
  let sunRow: HTMLElement | null = null;
  if (s.almWeather) {
    weatherRow = row("alm-tappable");
    weatherRow.append(icon("…"), text(t("loadingWeather"), "alm-text alm-dim"));
    forecastStrip = el("div", { class: "alm-forecast", hidden: true });
    let expanded = false;
    weatherRow.addEventListener("click", () => {
      if (!forecastStrip || forecastStrip.childElementCount === 0) return;
      expanded = !expanded;
      forecastStrip.hidden = !expanded;
    });
    node.append(weatherRow, forecastStrip);
  }
  if (s.almSun) {
    sunRow = row("alm-sun");
    node.append(sunRow);
  }

  // ----- moon (sync) -----
  if (s.almMoon) {
    const moon = moonInfo(now);
    const moonRow = row();
    moonRow.append(
      icon(moon.emoji),
      text(moonName(moon.index)),
      text(`${Math.round(moon.illumination * 100)}%`, "alm-sub"),
    );
    node.append(moonRow);
  }

  // ----- fasting (sync) -----
  if (s.almFasting) {
    const f = fastInfo(now);
    const fastRow = row();
    fastRow.append(
      icon(f.fasting ? "🌿" : "🍽️"),
      text(f.fasting ? t("fasting") : t("noFasting")),
      text(fastName(f.key), "alm-sub"),
    );
    node.append(fastRow);
  }

  // ----- name day (sync) -----
  if (s.almNameday) {
    const names = nameDaysOn(now);
    if (names.length) {
      const ndRow = row();
      ndRow.append(
        icon("🎉"),
        text(names.join(", ")),
        text(t("nameDay"), "alm-sub"),
      );
      node.append(ndRow);
    }
  }

  // ----- Orthodox holiday (sync) -----
  if (s.almHoliday) {
    const today = holidayOn(now);
    const feast = today ?? nextHoliday(now);
    const holidayRow = row("alm-holiday");
    holidayRow.append(
      icon("☦"),
      text(feast.name),
      text(today ? t("today") : dateFmt.format(feast.date), "alm-sub"),
    );
    node.append(holidayRow);
  }

  function paintForecast(days: DayForecast[]) {
    if (!forecastStrip) return;
    forecastStrip.replaceChildren(
      ...days.map((d) =>
        el("div", { class: "alm-fc-day" }, [
          el("span", { class: "alm-fc-dow" }, [dayFmt.format(d.date)]),
          el("span", { class: "alm-fc-emoji" }, [d.emoji]),
          el("span", { class: "alm-fc-temp" }, [`${fmtTemp(d.highC)}`]),
          el("span", { class: "alm-fc-low" }, [`${fmtTemp(d.lowC)}`]),
        ]),
      ),
    );
  }

  function paint(a: Almanac) {
    if (weatherRow) {
      const place = a.label ? `  ·  ${a.label}` : "";
      weatherRow.replaceChildren(
        icon(a.weather.emoji),
        text(`${fmtTemp(a.weather.tempC)}  ${wmoName(a.weather.key)}${place}`),
        text(`↑${fmtTemp(a.weather.highC)}  ↓${fmtTemp(a.weather.lowC)}`, "alm-sub"),
      );
    }
    if (sunRow) {
      sunRow.replaceChildren(
        icon("🌅"),
        text(timeFmt.format(a.sun.sunrise)),
        icon("🌇"),
        text(timeFmt.format(a.sun.sunset)),
      );
    }
    paintForecast(a.forecast);
  }

  const cached = getCachedAlmanac();
  if (cached) paint(cached);

  if (s.almWeather || s.almSun) {
    void (async () => {
      try {
        const coords = await getCoords();
        if (cancelled) return;
        const a = await fetchAlmanac(coords);
        if (cancelled) return;
        setCachedAlmanac(a);
        paint(a);
      } catch {
        if (!cancelled && !cached && weatherRow) {
          weatherRow.replaceChildren(icon("⚠"), text(t("weatherUnavailable"), "alm-text alm-dim"));
        }
      }
    })();
  }

  return {
    node,
    dispose() {
      cancelled = true;
    },
  };
}
