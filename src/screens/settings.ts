import { el, vibrate } from "../util/dom";
import { go } from "../router";
import { getState, setState } from "../state";
import { THEMES } from "../theme";
import type { ThemeId } from "../state";
import {
  listAllSounds,
  playSound,
  stopSound,
  type SoundEntry,
} from "../audio/library";
import { addSound, deleteSound } from "../audio/idb";
import { searchPlaces, clearAlmanacCache } from "../util/weather";

const THEME_PREVIEWS: Record<ThemeId, string> = {
  dark: "linear-gradient(135deg,#0b0c10,#1c1f2a 60%,#58c2ff)",
  light: "linear-gradient(135deg,#fafaf7,#e8e8ea 60%,#4c5bff)",
  marble: "linear-gradient(135deg,#08070a,#1a1209 50%,#d4af37)",
  sandstone: "linear-gradient(135deg,#3a2418,#7a4a2c 55%,#9b111e)",
  cyberpunk: "linear-gradient(135deg,#0a0420,#ff2ec4 65%,#00f0ff)",
  dos: "repeating-linear-gradient(0deg,#0000aa 0 2px,#000088 2px 4px)",
};

export function renderSettings(root: HTMLElement): () => void {
  const state = getState();
  let entries: SoundEntry[] = [];

  // ---------- top bar ----------
  const topbar = el("header", { class: "topbar" }, [
    el("div", { class: "title" }, ["Settings"]),
    el(
      "button",
      {
        class: "btn ghost",
        type: "button",
        onclick: () => {
          stopSound();
          vibrate(8);
          go("home");
        },
      },
      ["Done"],
    ),
  ]);

  // ---------- theme grid ----------
  const themeGrid = el("div", { class: "theme-grid" });

  function paintThemeTiles() {
    themeGrid.innerHTML = "";
    for (const id of Object.keys(THEMES) as ThemeId[]) {
      const meta = THEMES[id];
      const swatch = el("div", { class: "swatch" });
      swatch.style.background = THEME_PREVIEWS[id];
      const tile = el(
        "button",
        {
          class: "theme-tile",
          type: "button",
          "aria-pressed": String(getState().theme === id),
          onclick: () => {
            vibrate(8);
            setState({ theme: id });
            paintThemeTiles();
          },
        },
        [swatch, el("span", {}, [meta.label])],
      );
      themeGrid.append(tile);
    }
  }
  paintThemeTiles();

  const themeSection = el("section", { class: "section" }, [
    el("h2", {}, ["Theme"]),
    themeGrid,
  ]);

  // ---------- sound list ----------
  const soundList = el("div", { class: "sound-list" });
  const uploadInput = el("input", {
    type: "file",
    accept: "audio/*",
    style: "display:none",
  }) as HTMLInputElement;
  const uploadTile = el(
    "button",
    {
      class: "upload-tile",
      type: "button",
      onclick: () => {
        vibrate(8);
        uploadInput.click();
      },
    },
    ["+ Add your own (saved on this device)"],
  );

  uploadInput.addEventListener("change", async () => {
    const file = uploadInput.files?.[0];
    uploadInput.value = "";
    if (!file) return;
    const rec = await addSound(file);
    await refreshSounds();
    setState({ selectedSoundId: rec.id });
    paintSounds();
  });

  function paintSounds() {
    soundList.innerHTML = "";
    const selectedId = getState().selectedSoundId;
    for (const s of entries) {
      const playBtn = el(
        "button",
        {
          class: "play",
          type: "button",
          "aria-label": "Preview sound",
          onclick: (e: Event) => {
            e.stopPropagation();
            vibrate(6);
            void playSound(s.id);
          },
        },
        ["▶"],
      );
      const children: (HTMLElement | string)[] = [
        el("span", { class: "name" }, [s.label]),
        el("span", { class: "meta" }, [s.source === "user" ? "YOURS" : `#${s.id.replace("d", "")}`]),
        playBtn,
      ];
      if (s.source === "user") {
        children.push(
          el(
            "button",
            {
              class: "delete",
              type: "button",
              "aria-label": "Delete sound",
              onclick: async (e: Event) => {
                e.stopPropagation();
                vibrate(10);
                stopSound();
                await deleteSound(s.id);
                if (getState().selectedSoundId === s.id) {
                  setState({ selectedSoundId: "d1" });
                }
                await refreshSounds();
                paintSounds();
              },
            },
            ["✕"],
          ),
        );
      }
      const row = el(
        "div",
        {
          class: "sound-row",
          role: "button",
          tabindex: 0,
          "aria-pressed": String(s.id === selectedId),
          onclick: () => {
            vibrate(8);
            setState({ selectedSoundId: s.id });
            paintSounds();
          },
        },
        children,
      );
      soundList.append(row);
    }
  }

  async function refreshSounds() {
    entries = await listAllSounds();
  }

  const soundSection = el("section", { class: "section" }, [
    el("h2", {}, ["Alarm sound"]),
    soundList,
    uploadTile,
    uploadInput,
  ]);

  // ---------- toggles ----------
  function toggleRow(
    label: string,
    desc: string,
    checked: boolean,
    onChange: (v: boolean) => void,
  ): HTMLElement {
    const input = el("input", { type: "checkbox" }) as HTMLInputElement;
    input.checked = checked;
    input.addEventListener("change", () => {
      vibrate(6);
      onChange(input.checked);
    });
    const slider = el("span", { class: "slider" });
    const sw = el("label", { class: "switch" }, [input, slider]);
    return el("div", { class: "toggle-row" }, [
      el("div", {}, [
        el("div", { class: "label" }, [label]),
        el("div", { class: "desc" }, [desc]),
      ]),
      sw,
    ]);
  }

  const togglesSection = el("section", { class: "section" }, [
    el("h2", {}, ["Preferences"]),
    toggleRow(
      "Haptic feedback",
      "Vibrate on taps and timer events",
      state.vibrate,
      (v) => setState({ vibrate: v }),
    ),
    toggleRow(
      "Notifications",
      "Fire a system notification at zero",
      state.notifications,
      (v) => {
        setState({ notifications: v });
        if (v && "Notification" in window && Notification.permission === "default") {
          void Notification.requestPermission();
        }
      },
    ),
  ]);

  // ---------- segmented control + control row helpers ----------
  function segmented<T extends string>(
    read: () => T,
    options: { value: T; label: string }[],
    onChange: (v: T) => void,
  ): HTMLElement {
    const wrap = el("div", { class: "segmented", role: "group" });
    function paint() {
      wrap.innerHTML = "";
      const cur = read();
      for (const o of options) {
        wrap.append(
          el(
            "button",
            {
              class: "seg",
              type: "button",
              "aria-pressed": String(o.value === cur),
              onclick: () => {
                vibrate(8);
                onChange(o.value);
                paint();
              },
            },
            [o.label],
          ),
        );
      }
    }
    paint();
    return wrap;
  }

  function controlRow(label: string, control: HTMLElement): HTMLElement {
    return el("div", { class: "toggle-row" }, [
      el("div", {}, [el("div", { class: "label" }, [label])]),
      control,
    ]);
  }

  // ---------- language ----------
  const languageSection = el("section", { class: "section" }, [
    el("h2", {}, ["Γλώσσα / Language"]),
    segmented(
      () => getState().lang,
      [
        { value: "el", label: "Ελληνικά" },
        { value: "en", label: "English" },
      ],
      (v) => setState({ lang: v }),
    ),
  ]);

  // ---------- units & clock ----------
  const formatSection = el("section", { class: "section" }, [
    el("h2", {}, ["Units & clock"]),
    controlRow(
      "Temperature",
      segmented(
        () => getState().tempUnit,
        [
          { value: "c", label: "°C" },
          { value: "f", label: "°F" },
        ],
        (v) => setState({ tempUnit: v }),
      ),
    ),
    controlRow(
      "Clock format",
      segmented(
        () => getState().hour12,
        [
          { value: "auto", label: "Auto" },
          { value: "24", label: "24h" },
          { value: "12", label: "12h" },
        ],
        (v) => setState({ hour12: v }),
      ),
    ),
  ]);

  // ---------- almanac sections ----------
  const almanacSection = el("section", { class: "section" }, [
    el("h2", {}, ["Almanac"]),
    toggleRow("Weather", "Current conditions + forecast", state.almWeather, (v) =>
      setState({ almWeather: v }),
    ),
    toggleRow("Sunrise / sunset", "Daily sun times", state.almSun, (v) =>
      setState({ almSun: v }),
    ),
    toggleRow("Moon phase", "Lunar phase + illumination", state.almMoon, (v) =>
      setState({ almMoon: v }),
    ),
    toggleRow("Fasting", "Orthodox fasting status", state.almFasting, (v) =>
      setState({ almFasting: v }),
    ),
    toggleRow("Name days", "Greek name days (γιορτές)", state.almNameday, (v) =>
      setState({ almNameday: v }),
    ),
    toggleRow("Orthodox holidays", "Today's or next feast", state.almHoliday, (v) =>
      setState({ almHoliday: v }),
    ),
  ]);

  // ---------- location ----------
  function currentLocLabel(): string {
    const st = getState();
    if (st.locLat != null && st.locLon != null) {
      return `📍 ${st.locLabel || `${st.locLat.toFixed(2)}, ${st.locLon.toFixed(2)}`}`;
    }
    return "📍 Using device location";
  }
  const locCurrent = el("div", { class: "desc" }, [currentLocLabel()]);
  const locInput = el("input", {
    type: "search",
    class: "loc-input",
    placeholder: "Search city…",
    enterkeyhint: "search",
  }) as HTMLInputElement;
  const locResults = el("div", { class: "loc-results" });

  async function doSearch() {
    const q = locInput.value.trim();
    if (!q) return;
    locResults.textContent = "…";
    try {
      const results = await searchPlaces(q);
      locResults.innerHTML = "";
      if (!results.length) {
        locResults.textContent = "No matches";
        return;
      }
      for (const r of results) {
        locResults.append(
          el(
            "button",
            {
              class: "loc-result",
              type: "button",
              onclick: () => {
                vibrate(8);
                setState({ locLat: r.lat, locLon: r.lon, locLabel: r.label });
                clearAlmanacCache();
                locResults.innerHTML = "";
                locInput.value = "";
                locCurrent.textContent = currentLocLabel();
              },
            },
            [r.label],
          ),
        );
      }
    } catch {
      locResults.textContent = "Search failed";
    }
  }
  locInput.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      void doSearch();
    }
  });

  const locationSection = el("section", { class: "section" }, [
    el("h2", {}, ["Location"]),
    locCurrent,
    el("div", { class: "loc-search" }, [
      locInput,
      el(
        "button",
        { class: "btn ghost", type: "button", onclick: () => void doSearch() },
        ["Search"],
      ),
    ]),
    locResults,
    el(
      "button",
      {
        class: "btn ghost loc-reset",
        type: "button",
        onclick: () => {
          vibrate(8);
          setState({ locLat: null, locLon: null, locLabel: "" });
          clearAlmanacCache();
          locCurrent.textContent = currentLocLabel();
        },
      },
      ["Use my location"],
    ),
  ]);

  root.append(
    topbar,
    themeSection,
    languageSection,
    formatSection,
    almanacSection,
    locationSection,
    soundSection,
    togglesSection,
  );

  void refreshSounds().then(paintSounds);

  return () => {
    stopSound();
  };
}
