import { el } from "../util/dom";
import { moonInfo } from "../util/moon";
import { holidayOn, nextHoliday } from "../util/orthodox";
import {
  getCoords,
  fetchAlmanac,
  getCachedAlmanac,
  setCachedAlmanac,
  type Almanac,
} from "../util/weather";

const timeFmt = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short" });

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
 * Home-screen almanac: weather + sunrise/sunset + moon phase + the current or
 * next Greek Orthodox holiday. Weather/sun load asynchronously; moon and
 * holiday are computed synchronously from the date.
 */
export function renderAlmanac(): { node: HTMLElement; dispose: () => void } {
  let cancelled = false;
  const now = new Date();

  const weatherRow = row();
  weatherRow.append(icon("…"), text("Φόρτωση καιρού…", "alm-text alm-dim"));

  const sunRow = row("alm-sun");

  const moon = moonInfo(now);
  const moonRow = row();
  moonRow.append(
    icon(moon.emoji),
    text(moon.name),
    text(`${Math.round(moon.illumination * 100)}%`, "alm-sub"),
  );

  const today = holidayOn(now);
  const feast = today ?? nextHoliday(now);
  const holidayRow = row("alm-holiday");
  holidayRow.append(
    icon("☦"),
    text(feast.name),
    text(today ? "Σήμερα" : dateFmt.format(feast.date), "alm-sub"),
  );

  const node = el("section", { class: "almanac", "aria-label": "Καιρός και εορτολόγιο" }, [
    weatherRow,
    sunRow,
    moonRow,
    holidayRow,
  ]);

  function paint(a: Almanac) {
    weatherRow.replaceChildren(
      icon(a.weather.emoji),
      text(`${a.weather.tempC}°  ${a.weather.description}`),
      text(`↑${a.weather.highC}°  ↓${a.weather.lowC}°`, "alm-sub"),
    );
    sunRow.replaceChildren(
      icon("🌅"),
      text(timeFmt.format(a.sun.sunrise)),
      icon("🌇"),
      text(timeFmt.format(a.sun.sunset)),
    );
  }

  const cached = getCachedAlmanac();
  if (cached) paint(cached);

  void (async () => {
    try {
      const coords = await getCoords();
      if (cancelled) return;
      const a = await fetchAlmanac(coords);
      if (cancelled) return;
      setCachedAlmanac(a);
      paint(a);
    } catch {
      if (!cancelled && !cached) {
        weatherRow.replaceChildren(icon("⚠"), text("Ο καιρός δεν είναι διαθέσιμος", "alm-text alm-dim"));
      }
    }
  })();

  return {
    node,
    dispose() {
      cancelled = true;
    },
  };
}
