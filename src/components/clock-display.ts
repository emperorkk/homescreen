import { el } from "../util/dom";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function renderClock(): { node: HTMLElement; dispose: () => void } {
  const hh = el("span", { class: "hh" });
  const mm = el("span", { class: "mm" });
  const sep = el("span", { class: "sep" }, [":"]);
  const ampm = el("span", { class: "clock-ampm" });
  const date = el("div", { class: "clock-date" });
  const clock = el("div", { class: "clock" }, [
    hh,
    sep,
    mm,
    ampm,
  ]);
  const node = el("div", { class: "clock-wrap" }, [clock, date]);

  const fmtDate = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  function update() {
    const now = new Date();
    const use24 = !new Intl.DateTimeFormat(undefined, { hour: "numeric" })
      .resolvedOptions()
      .hour12;
    let h = now.getHours();
    let suffix = "";
    if (!use24) {
      suffix = h >= 12 ? "PM" : "AM";
      h = h % 12;
      if (h === 0) h = 12;
    }
    hh.textContent = use24 ? pad(h) : String(h);
    mm.textContent = pad(now.getMinutes());
    ampm.textContent = suffix;
    date.textContent = fmtDate.format(now);
  }
  update();

  let frame = 0;
  function loop() {
    update();
    const ms = 60_000 - (Date.now() % 60_000);
    frame = window.setTimeout(loop, Math.max(1000, ms));
  }
  frame = window.setTimeout(loop, 1000 - (Date.now() % 1000));

  return {
    node,
    dispose() {
      clearTimeout(frame);
    },
  };
}
