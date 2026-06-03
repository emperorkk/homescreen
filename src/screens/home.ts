import { el } from "../util/dom";
import { renderClock } from "../components/clock-display";
import { renderNetworkBadge } from "../components/network-badge";
import { renderAlmanac } from "../components/almanac";
import { go } from "../router";
import { vibrate } from "../util/dom";

export function renderHome(root: HTMLElement): () => void {
  const net = renderNetworkBadge();
  const clock = renderClock();
  const almanac = renderAlmanac();

  const topbar = el("header", { class: "topbar" }, [
    el("div", { class: "title" }, ["Homescreen"]),
    net.node,
  ]);

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
    ["Settings"],
  );
  const buttons = el("div", { class: "btn-row" }, [timerBtn, settingsBtn]);

  root.append(topbar, clock.node, almanac.node, buttons);

  return () => {
    net.dispose();
    clock.dispose();
    almanac.dispose();
  };
}
