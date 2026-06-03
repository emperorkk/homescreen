import { el } from "../util/dom";
import { renderClock } from "../components/clock-display";
import { renderNetworkBadge } from "../components/network-badge";
import { renderBattery } from "../components/battery";
import { renderAlmanac } from "../components/almanac";
import { enterNightstand } from "../components/nightstand";
import { go } from "../router";
import { vibrate } from "../util/dom";

export function renderHome(root: HTMLElement): () => void {
  const net = renderNetworkBadge();
  const battery = renderBattery();
  const clock = renderClock();
  const almanac = renderAlmanac();

  const topbar = el("header", { class: "topbar" }, [
    el("div", { class: "title" }, ["Homescreen"]),
    el("div", { class: "topbar-status" }, [battery.node, net.node]),
  ]);

  // Tap the clock to enter the dimmed nightstand mode.
  clock.node.classList.add("clock-tappable");
  clock.node.addEventListener("click", () => {
    vibrate(8);
    enterNightstand();
  });

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
    ["Timer"],
  );
  const alarmBtn = el(
    "button",
    {
      class: "btn",
      type: "button",
      onclick: () => {
        vibrate(8);
        go("alarm");
      },
    },
    ["Alarm"],
  );
  const settingsBtn = el(
    "button",
    {
      class: "btn ghost btn-wide",
      type: "button",
      onclick: () => {
        vibrate(8);
        go("settings");
      },
    },
    ["Settings"],
  );
  const buttons = el("div", { class: "btn-stack" }, [
    el("div", { class: "btn-row" }, [timerBtn, alarmBtn]),
    settingsBtn,
  ]);

  root.append(topbar, clock.node, almanac.node, buttons);

  return () => {
    net.dispose();
    battery.dispose();
    clock.dispose();
    almanac.dispose();
  };
}
