import { el, vibrate } from "../util/dom";

export interface WheelPicker {
  node: HTMLElement;
  getSeconds: () => number;
  setSeconds: (s: number, animate?: boolean) => void;
  onChange: (fn: (seconds: number) => void) => void;
  dispose: () => void;
}

interface ColumnSpec {
  max: number;
  label: string;
}

const COLUMNS: ColumnSpec[] = [
  { max: 24, label: "h" },
  { max: 60, label: "m" },
  { max: 60, label: "s" },
];

const ITEM = 56;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function buildColumn(
  spec: ColumnSpec,
  onSelect: (value: number) => void,
): { col: HTMLElement; setValue: (v: number, animate?: boolean) => void; getValue: () => number; dispose: () => void } {
  const ul = el("ul");
  for (let i = 0; i < spec.max; i++) {
    ul.append(el("li", { "data-value": i }, [pad(i)]));
  }
  const col = el(
    "div",
    {
      class: "picker-col",
      role: "spinbutton",
      "aria-label": spec.label,
      tabindex: 0,
    },
    [ul],
  );

  let lastValue = 0;
  let scrollEndTimer = 0;

  function readValue(): number {
    const idx = Math.round(col.scrollTop / ITEM);
    return Math.max(0, Math.min(spec.max - 1, idx));
  }

  function refreshSelected() {
    const v = readValue();
    const items = ul.children;
    for (let i = 0; i < items.length; i++) {
      const li = items[i] as HTMLElement;
      const isSel = i === v;
      if (li.getAttribute("aria-selected") !== String(isSel)) {
        li.setAttribute("aria-selected", String(isSel));
      }
    }
    if (v !== lastValue) {
      lastValue = v;
      vibrate(8);
      onSelect(v);
    }
  }

  function onScroll() {
    refreshSelected();
    clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(refreshSelected, 80);
  }
  col.addEventListener("scroll", onScroll, { passive: true });

  function setValue(v: number, animate = false) {
    const target = Math.max(0, Math.min(spec.max - 1, v)) * ITEM;
    col.scrollTo({ top: target, behavior: animate ? "smooth" : "auto" });
    lastValue = v;
    // refresh after scroll settles
    setTimeout(refreshSelected, animate ? 280 : 0);
  }

  function dispose() {
    col.removeEventListener("scroll", onScroll);
    clearTimeout(scrollEndTimer);
  }

  // initial selection
  setTimeout(refreshSelected, 0);

  return { col, setValue, getValue: readValue, dispose };
}

export function createWheelPicker(initialSeconds = 60): WheelPicker {
  let listeners: ((s: number) => void)[] = [];
  const cols: ReturnType<typeof buildColumn>[] = [];

  function fire() {
    const total =
      cols[0].getValue() * 3600 + cols[1].getValue() * 60 + cols[2].getValue();
    for (const fn of listeners) fn(total);
  }

  for (const spec of COLUMNS) {
    cols.push(buildColumn(spec, fire));
  }

  const frame = el("div", { class: "picker-frame", "aria-hidden": "true" });
  const labels = el("div", { class: "picker-labels" }, [
    el("div", { class: "picker-label" }, ["hours"]),
    el("div", { class: "picker-label" }, ["minutes"]),
    el("div", { class: "picker-label" }, ["seconds"]),
  ]);

  const node = el("div", {}, [
    el(
      "div",
      { class: "picker", role: "group", "aria-label": "Time picker" },
      [...cols.map((c) => c.col), frame],
    ),
    labels,
  ]);

  function setSeconds(total: number, animate = false) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    cols[0].setValue(h, animate);
    cols[1].setValue(m, animate);
    cols[2].setValue(s, animate);
  }

  setSeconds(initialSeconds);

  return {
    node,
    getSeconds: () =>
      cols[0].getValue() * 3600 + cols[1].getValue() * 60 + cols[2].getValue(),
    setSeconds,
    onChange: (fn) => {
      listeners.push(fn);
    },
    dispose: () => {
      for (const c of cols) c.dispose();
      listeners = [];
    },
  };
}
