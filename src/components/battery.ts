import { el } from "../util/dom";

// Battery status badge for the home top bar. Uses the Battery Status API
// (Chromium/Android); renders nothing if the API is unavailable.

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

interface NavWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryLike>;
}

export function renderBattery(): { node: HTMLElement; dispose: () => void } {
  const node = el("div", { class: "battery-badge", role: "status", hidden: true });
  let battery: BatteryLike | null = null;
  let update: (() => void) | null = null;

  const nav = navigator as NavWithBattery;
  if (nav.getBattery) {
    void nav.getBattery().then((b) => {
      battery = b;
      update = () => {
        const pct = Math.round(b.level * 100);
        node.textContent = `${b.charging ? "⚡" : "🔋"} ${pct}%`;
        node.dataset.low = String(!b.charging && pct <= 20);
      };
      update();
      node.hidden = false;
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    }).catch(() => {
      /* unsupported — stays hidden */
    });
  }

  return {
    node,
    dispose() {
      if (battery && update) {
        battery.removeEventListener("levelchange", update);
        battery.removeEventListener("chargingchange", update);
      }
    },
  };
}
