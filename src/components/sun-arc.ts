import { el, svg } from "../util/dom";
import type { WeatherReading } from "../data/weather";

export interface SunArc {
  node: HTMLElement;
  update: (r: WeatherReading | null) => void;
  dispose: () => void;
}

function fmtTime(epoch: number): string {
  if (!epoch) return "--:--";
  const d = new Date(epoch);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? "0" + h : h}:${m < 10 ? "0" + m : m}`;
}

// Sunrise/sunset arc rendered as a half-ellipse with a dot at the current
// daytime position. When the sun is below the horizon the dot dims and sits
// at the closer terminus.
export function renderSunArc(): SunArc {
  const W = 220;
  const H = 56;
  const path = svg("path", {
    d: `M 8 ${H - 6} Q ${W / 2} -${H * 0.6} ${W - 8} ${H - 6}`,
    class: "sun-arc-path",
    fill: "none",
  });
  const dot = svg("circle", { class: "sun-arc-dot", cx: "8", cy: String(H - 6), r: "5" });
  const baseline = svg("line", {
    class: "sun-arc-baseline",
    x1: "0",
    y1: String(H - 6),
    x2: String(W),
    y2: String(H - 6),
  });
  const svgNode = svg(
    "svg",
    {
      viewBox: `0 0 ${W} ${H}`,
      "aria-hidden": "true",
      class: "sun-arc-svg",
      preserveAspectRatio: "xMidYMid meet",
    },
    [baseline, path, dot],
  );

  const sunriseLabel = el("span", { class: "label sunrise" }, ["🌅 --:--"]);
  const sunsetLabel = el("span", { class: "label sunset" }, ["🌇 --:--"]);
  const node = el("div", { class: "sun-arc", "aria-label": "Ηλιοβασίλεμα" }, [
    sunriseLabel,
    svgNode,
    sunsetLabel,
  ]);

  function update(r: WeatherReading | null) {
    if (!r || !r.sunriseEpoch || !r.sunsetEpoch) {
      sunriseLabel.textContent = "🌅 --:--";
      sunsetLabel.textContent = "🌇 --:--";
      dot.setAttribute("cx", "8");
      dot.setAttribute("cy", String(H - 6));
      dot.classList.toggle("night", true);
      return;
    }
    sunriseLabel.textContent = `🌅 ${fmtTime(r.sunriseEpoch)}`;
    sunsetLabel.textContent = `🌇 ${fmtTime(r.sunsetEpoch)}`;
    const now = Date.now();
    let t: number;
    let isNight = false;
    if (now < r.sunriseEpoch || now > r.sunsetEpoch) {
      isNight = true;
      t = now < r.sunriseEpoch ? 0 : 1;
    } else {
      t = (now - r.sunriseEpoch) / (r.sunsetEpoch - r.sunriseEpoch);
    }
    // Sample the quadratic Bezier B(t) for the arc start/end (8, H-6) -> (W-8, H-6)
    // with control (W/2, -H*0.6).
    const x0 = 8;
    const x1 = W / 2;
    const x2 = W - 8;
    const y0 = H - 6;
    const y1 = -H * 0.6;
    const y2 = H - 6;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
    dot.classList.toggle("night", isNight);
  }

  const interval = window.setInterval(() => update(currentReading), 60_000);
  let currentReading: WeatherReading | null = null;
  const wrappedUpdate = (r: WeatherReading | null) => {
    currentReading = r;
    update(r);
  };
  update(null);

  return {
    node,
    update: wrappedUpdate,
    dispose() {
      clearInterval(interval);
    },
  };
}
