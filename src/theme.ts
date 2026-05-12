import type { ThemeId } from "./state";

interface ThemeMeta {
  themeColor: string;
  label: string;
  webgl: boolean;
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  dark: { themeColor: "#0b0c10", label: "Dark", webgl: true },
  light: { themeColor: "#fafaf7", label: "Light", webgl: true },
  marble: { themeColor: "#08070a", label: "Black & Gold Marble", webgl: true },
  sandstone: { themeColor: "#3a2418", label: "Sandstone & Ruby", webgl: true },
  cyberpunk: { themeColor: "#0a0420", label: "Cyberpunk", webgl: true },
  dos: { themeColor: "#0000aa", label: "DOS", webgl: false },
};

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  const meta = document.getElementById("meta-theme-color") as HTMLMetaElement | null;
  if (meta) meta.content = THEMES[id].themeColor;
}
