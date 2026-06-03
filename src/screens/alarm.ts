import { el, vibrate } from "../util/dom";
import { go } from "../router";
import { getState, setState } from "../state";
import type { Alarm } from "../state";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function byTime(a: Alarm, b: Alarm): number {
  return a.time.localeCompare(b.time);
}

function repeatLabel(days: number[]): string {
  if (days.length === 0 || days.length === 7) return "Every day";
  return [...days].sort((x, y) => x - y).map((d) => DOW[d]).join(" ");
}

function update(id: string, patch: Partial<Alarm>): void {
  setState({
    alarms: getState().alarms.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  });
}

export function renderAlarm(root: HTMLElement): () => void {
  const topbar = el("header", { class: "topbar" }, [
    el("div", { class: "title" }, ["Alarm"]),
    el(
      "button",
      {
        class: "btn ghost",
        type: "button",
        onclick: () => {
          vibrate(8);
          go("home");
        },
      },
      ["Back"],
    ),
  ]);

  // ---------- add form ----------
  const timeInput = el("input", { type: "time", class: "alarm-time-input" }) as HTMLInputElement;
  const labelInput = el("input", {
    type: "text",
    class: "loc-input",
    placeholder: "Label (optional)",
    maxlength: "40",
  }) as HTMLInputElement;

  const selectedDays = new Set<number>();
  const dayChips = el("div", { class: "day-chips" });
  for (let d = 0; d < 7; d++) {
    const chip = el(
      "button",
      {
        class: "day-chip",
        type: "button",
        "aria-pressed": "false",
        onclick: () => {
          vibrate(6);
          if (selectedDays.has(d)) selectedDays.delete(d);
          else selectedDays.add(d);
          chip.setAttribute("aria-pressed", String(selectedDays.has(d)));
        },
      },
      [DOW[d]],
    );
    dayChips.append(chip);
  }

  const addBtn = el(
    "button",
    {
      class: "btn primary",
      type: "button",
      onclick: () => {
        if (!timeInput.value) {
          vibrate([20, 40, 20]);
          return;
        }
        vibrate(10);
        const alarm: Alarm = {
          id: `a_${Date.now().toString(36)}`,
          time: timeInput.value,
          label: labelInput.value.trim(),
          enabled: true,
          days: [...selectedDays],
        };
        setState({ alarms: [...getState().alarms, alarm].sort(byTime) });
        timeInput.value = "";
        labelInput.value = "";
        selectedDays.clear();
        for (const c of dayChips.children) c.setAttribute("aria-pressed", "false");
        paintList();
      },
    },
    ["Add alarm"],
  );

  const addSection = el("section", { class: "section" }, [
    el("h2", {}, ["New alarm"]),
    el("div", { class: "alarm-form" }, [timeInput, labelInput]),
    el("div", { class: "desc" }, ["Repeat (none = every day)"]),
    dayChips,
    addBtn,
  ]);

  // ---------- list ----------
  const list = el("div", { class: "alarm-list" });
  const listSection = el("section", { class: "section" }, [el("h2", {}, ["Alarms"]), list]);

  function paintList() {
    list.innerHTML = "";
    const alarms = getState().alarms;
    if (!alarms.length) {
      list.append(el("div", { class: "desc" }, ["No alarms yet."]));
      return;
    }
    for (const a of alarms) {
      const toggle = el("input", { type: "checkbox" }) as HTMLInputElement;
      toggle.checked = a.enabled;
      toggle.addEventListener("change", () => {
        vibrate(6);
        update(a.id, { enabled: toggle.checked });
      });
      const sw = el("label", { class: "switch" }, [toggle, el("span", { class: "slider" })]);

      const del = el(
        "button",
        {
          class: "delete",
          type: "button",
          "aria-label": "Delete alarm",
          onclick: () => {
            vibrate(10);
            setState({ alarms: getState().alarms.filter((x) => x.id !== a.id) });
            paintList();
          },
        },
        ["✕"],
      );

      list.append(
        el("div", { class: "alarm-item", "data-enabled": String(a.enabled) }, [
          el("div", { class: "alarm-meta" }, [
            el("div", { class: "alarm-time" }, [a.time]),
            el("div", { class: "alarm-sub" }, [
              a.label ? `${a.label} · ${repeatLabel(a.days)}` : repeatLabel(a.days),
            ]),
          ]),
          sw,
          del,
        ]),
      );
    }
  }
  paintList();

  const note = el("div", { class: "desc alarm-note" }, [
    "Alarms ring while the app is open. Keep it open or installed for reliable alerts.",
  ]);

  root.append(topbar, addSection, listSection, note);

  return () => {
    /* nothing to dispose — scheduler runs globally */
  };
}
