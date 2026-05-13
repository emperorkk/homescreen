import { el, vibrate } from "../util/dom";
import { renderClock } from "../components/clock-display";
import { renderNetworkBadge } from "../components/network-badge";
import { renderInstallChip } from "../components/install-button";
import { renderWeatherChip } from "../components/weather-chip";
import { renderSunArc } from "../components/sun-arc";
import { openCalendarModal } from "../components/calendar-modal";
import { go } from "../router";
import { getState } from "../state";
import { requestAutoStart } from "./timer";
import { greeting, lookupDay } from "../data/greek";
import { moonInfo } from "../data/moon";

function fmtQuick(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function renderHome(root: HTMLElement): () => void {
  const net = renderNetworkBadge();
  const clock = renderClock();
  const weather = renderWeatherChip();
  const sunArc = renderSunArc();
  const install = renderInstallChip();

  // ---------- top bar ----------
  const topbar = el("header", { class: "topbar" }, [
    el("div", { class: "title" }, ["Αρχική"]),
    el("div", { class: "topbar-end" }, [weather.node, install.node, net.node]),
  ]);

  // ---------- greeting ----------
  const greetingNode = el("div", { class: "greeting" }, [greeting()]);

  // ---------- date + nameday/holiday (tappable to open calendar) ----------
  const today = new Date();
  const dayInfo = lookupDay(today);
  const dateBlock = el(
    "button",
    {
      class: "date-block",
      type: "button",
      "aria-label": "Άνοιγμα ημερολογίου",
      onclick: () => {
        vibrate(8);
        openCalendarModal();
      },
    },
    [],
  );
  // We rely on renderClock's own date label, but build a richer block
  // beneath it for the nameday / holiday line. Insert clock first, then
  // overlay metadata.
  const metaRow = el("div", { class: "date-meta" }, []);
  if (dayInfo.holiday) {
    metaRow.append(el("span", { class: "meta holiday" }, [dayInfo.holiday]));
  }
  if (dayInfo.nameday) {
    metaRow.append(
      el("span", { class: "meta nameday" }, ["Γιορτάζουν: ", dayInfo.nameday]),
    );
  }
  if (!dayInfo.holiday && !dayInfo.nameday) {
    metaRow.append(
      el("span", { class: "meta hint" }, ["Πατήστε για ημερολόγιο"]),
    );
  }

  // Moon glyph small badge
  const moon = moonInfo(today);
  const moonBadge = el(
    "span",
    { class: "moon-badge", title: moon.label, "aria-label": moon.label },
    [moon.glyph],
  );

  dateBlock.append(metaRow, moonBadge);

  // ---------- quick-start chip ----------
  const quickSec = getState().defaultPresetSeconds;
  const quickChip = el(
    "button",
    {
      class: "chip quick-chip",
      type: "button",
      "aria-label": `Γρήγορη έναρξη ${fmtQuick(quickSec)}`,
      onclick: () => {
        vibrate(12);
        requestAutoStart(quickSec);
        go("timer");
      },
    },
    [el("span", { class: "icon" }, ["▶"]), el("span", {}, [fmtQuick(quickSec)])],
  );

  // ---------- buttons row ----------
  const timerBtn = el(
    "button",
    {
      class: "btn primary",
      type: "button",
      onclick: () => {
        vibrate(8);
        go("timer");
      },
    },
    ["Χρονόμετρο"],
  );
  const settingsBtn = el(
    "button",
    {
      class: "btn ghost",
      type: "button",
      onclick: () => {
        vibrate(8);
        go("settings");
      },
    },
    ["Ρυθμίσεις"],
  );
  const buttons = el("div", { class: "btn-row bottom" }, [timerBtn, settingsBtn]);

  // ---------- compose ----------
  const clockWrap = el("div", { class: "clock-wrap home-clock" }, [
    greetingNode,
    clock.node,
    dateBlock,
    el("div", { class: "quick-row" }, [quickChip]),
  ]);

  root.append(topbar, clockWrap, sunArc.node, buttons);

  // Push sun-arc data once weather lands.
  weather.onUpdate((r) => sunArc.update(r));

  return () => {
    net.dispose();
    clock.dispose();
    weather.dispose();
    sunArc.dispose();
    install.dispose();
  };
}
