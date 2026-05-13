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

  const heartbeatSection = el("section", { class: "section" }, [
    el("h2", {}, ["Heartbeat — every 3 s while counting"]),
    toggleRow(
      "Visual pulse",
      "Ring + digits softly throb on each beat",
      state.heartbeatVisual,
      (v) => setState({ heartbeatVisual: v }),
    ),
    toggleRow(
      "Audio click",
      "Synth lub-dub through the speakers",
      state.heartbeatAudio,
      (v) => setState({ heartbeatAudio: v }),
    ),
    toggleRow(
      "Vibration",
      "Two short buzzes per beat",
      state.heartbeatHaptic,
      (v) => setState({ heartbeatHaptic: v }),
    ),
  ]);

  root.append(topbar, themeSection, soundSection, togglesSection, heartbeatSection);

  void refreshSounds().then(paintSounds);

  return () => {
    stopSound();
  };
}
