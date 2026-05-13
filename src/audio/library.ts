import { getAllSounds, getSound, type StoredSound } from "./idb";

export interface SoundEntry {
  id: string;
  label: string;
  source: "bundled" | "user";
  url?: string;
}

const BUNDLED_LABELS = [
  "Alarm 1",
  "Alarm 2",
  "Alarm 3",
  "Alarm 4",
  "Alarm 5",
  "Alarm 6",
  "Alarm 7",
  "Alarm 8",
  "Alarm 9",
];

export const BUNDLED: SoundEntry[] = BUNDLED_LABELS.map((label, i) => ({
  id: `d${i + 1}`,
  label,
  source: "bundled",
  url: `/sounds/d${i + 1}.mp3`,
}));

export async function listAllSounds(): Promise<SoundEntry[]> {
  const userSounds = await getAllSounds().catch(() => [] as StoredSound[]);
  const mapped: SoundEntry[] = userSounds.map((s) => ({
    id: s.id,
    label: s.name,
    source: "user",
  }));
  return [...BUNDLED, ...mapped];
}

export async function resolveUrl(id: string): Promise<string | undefined> {
  const bundled = BUNDLED.find((b) => b.id === id);
  if (bundled) return bundled.url;
  const stored = await getSound(id);
  if (!stored) return undefined;
  return URL.createObjectURL(stored.blob);
}

let currentAudio: HTMLAudioElement | null = null;

export async function playSound(id: string, loop = false): Promise<void> {
  stopSound();
  const url = await resolveUrl(id);
  if (!url) return;
  const a = new Audio(url);
  a.loop = loop;
  a.preload = "auto";
  currentAudio = a;
  try {
    await a.play();
  } catch {
    /* user gesture required; the caller is responsible for invoking under one */
  }
}

export function stopSound(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentAudio.src.startsWith("blob:")) {
      URL.revokeObjectURL(currentAudio.src);
    }
    currentAudio = null;
  }
}
