export type Route = "home" | "timer" | "alarm" | "settings";

export type RouteHandler = (route: Route) => void;

const ROUTES: Record<string, Route> = {
  "": "home",
  "/": "home",
  "/timer": "timer",
  "/alarm": "alarm",
  "/settings": "settings",
};

function parse(hash: string): Route {
  const path = hash.replace(/^#/, "");
  return ROUTES[path] ?? "home";
}

export function startRouter(handler: RouteHandler): void {
  const fire = () => handler(parse(location.hash));
  window.addEventListener("hashchange", fire);
  fire();
}

export function go(route: Route): void {
  const target = route === "home" ? "/" : `/${route}`;
  if (location.hash !== `#${target}`) {
    location.hash = target;
  }
}
