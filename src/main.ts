import "./styles/base.css";
import "./styles/tokens.css";
import "./styles/themes/dark.css";
import "./styles/themes/light.css";
import "./styles/themes/marble.css";
import "./styles/themes/sandstone.css";
import "./styles/themes/cyberpunk.css";
import "./styles/themes/dos.css";

import { startRouter, type Route } from "./router";
import { getState, onState } from "./state";
import { applyTheme, THEMES } from "./theme";
import { renderHome } from "./screens/home";
import { renderTimer } from "./screens/timer";
import { renderAlarm } from "./screens/alarm";
import { renderSettings } from "./screens/settings";
import { startAlarmScheduler } from "./alarm/scheduler";
import { startRenderer, stopRenderer, setRendererTheme } from "./webgl/renderer";

const app = document.getElementById("app") as HTMLElement;
const canvas = document.getElementById("bg") as HTMLCanvasElement;

applyTheme(getState().theme);

onState((s) => {
  applyTheme(s.theme);
  setRendererTheme(s.theme);
  if (THEMES[s.theme].webgl) startRenderer(canvas);
  else stopRenderer();
});

if (THEMES[getState().theme].webgl) {
  startRenderer(canvas);
  setRendererTheme(getState().theme);
}

let cleanup: (() => void) | void;
function mount(route: Route) {
  if (typeof cleanup === "function") cleanup();
  app.innerHTML = "";
  app.dataset.route = route;
  if (route === "home") cleanup = renderHome(app);
  else if (route === "timer") cleanup = renderTimer(app);
  else if (route === "alarm") cleanup = renderAlarm(app);
  else cleanup = renderSettings(app);
}

startRouter(mount);
startAlarmScheduler();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline-only feature; ignore registration errors in dev */
    });
  });
}
