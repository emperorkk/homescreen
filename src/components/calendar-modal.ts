import { el, vibrate } from "../util/dom";
import { lookupDay } from "../data/greek";

const GREEK_MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const GREEK_WEEKDAYS = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function openCalendarModal(): void {
  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  const title = el("div", { class: "modal-title cal-title" }, []);
  const grid = el("div", { class: "cal-grid" }, []);
  const dayInfo = el("div", { class: "cal-day-info" }, []);

  const prevBtn = el(
    "button",
    { class: "btn ghost cal-nav", type: "button" },
    ["◀"],
  );
  const nextBtn = el(
    "button",
    { class: "btn ghost cal-nav", type: "button" },
    ["▶"],
  );
  const todayBtn = el(
    "button",
    { class: "btn ghost", type: "button" },
    ["Σήμερα"],
  );
  const closeBtn = el(
    "button",
    { class: "btn primary", type: "button" },
    ["Κλείσιμο"],
  );

  function paint(selected: Date | null = today) {
    title.textContent = `${GREEK_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    grid.innerHTML = "";
    for (const w of GREEK_WEEKDAYS) {
      grid.append(el("div", { class: "cal-wd" }, [w]));
    }
    // JavaScript's getDay(): 0=Sun..6=Sat. Greek week starts Monday.
    const firstDow = (new Date(cursor).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
      grid.append(el("div", { class: "cal-cell empty" }));
    }
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= last; d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      const info = lookupDay(date);
      const cell = el(
        "button",
        {
          class: "cal-cell",
          type: "button",
          "aria-pressed": String(selected ? isSameDay(date, selected) : false),
          "data-today": String(isSameDay(date, today)),
          "data-holiday": String(info.holiday !== null),
          "data-nameday": String(info.nameday !== null),
          onclick: () => {
            vibrate(6);
            paint(date);
          },
        },
        [String(d)],
      );
      grid.append(cell);
    }
    // Day info: nameday and/or holiday for the selected date.
    dayInfo.innerHTML = "";
    if (selected) {
      const info = lookupDay(selected);
      const dateLine = el("div", { class: "cal-day-date" }, [
        `${selected.getDate()} ${GREEK_MONTHS[selected.getMonth()]} ${selected.getFullYear()}`,
      ]);
      dayInfo.append(dateLine);
      if (info.holiday) {
        dayInfo.append(el("div", { class: "cal-holiday" }, [info.holiday]));
      }
      if (info.nameday) {
        dayInfo.append(
          el("div", { class: "cal-nameday" }, ["Γιορτάζουν: ", info.nameday]),
        );
      }
      if (!info.holiday && !info.nameday) {
        dayInfo.append(el("div", { class: "cal-empty" }, ["—"]));
      }
    }
  }
  paint(today);

  const header = el("div", { class: "cal-header" }, [prevBtn, title, nextBtn]);
  const modal = el(
    "div",
    { class: "modal cal-modal", role: "dialog", "aria-modal": "true" },
    [
      el("div", { class: "modal-grabber", "aria-hidden": "true" }),
      header,
      grid,
      dayInfo,
      el("div", { class: "btn-row" }, [todayBtn, closeBtn]),
    ],
  );
  const backdrop = el("div", { class: "modal-backdrop" }, [modal]);

  function close() {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
  prevBtn.addEventListener("click", () => {
    vibrate(6);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    paint(null);
  });
  nextBtn.addEventListener("click", () => {
    vibrate(6);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    paint(null);
  });
  todayBtn.addEventListener("click", () => {
    vibrate(6);
    cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    paint(today);
  });
  closeBtn.addEventListener("click", () => {
    vibrate(8);
    close();
  });
  backdrop.addEventListener("click", close);
  modal.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("keydown", onKey);

  document.body.append(backdrop);
}
