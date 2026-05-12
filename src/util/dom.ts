type AttrValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | EventListener;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class" && typeof v !== "function") node.className = String(v);
    else if (k === "html" && typeof v !== "function") node.innerHTML = String(v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (v === true) node.setAttribute(k, "");
    else if (typeof v !== "function") node.setAttribute(k, String(v));
  }
  for (const c of children) {
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function svg(
  tag: string,
  attrs: Record<string, string | number> = {},
  children: (Node | string)[] = [],
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  for (const c of children) {
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

import { getState } from "../state";

export function vibrate(ms: number | number[]): void {
  if (!getState().vibrate) return;
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* some browsers throw on pattern length */
    }
  }
}
