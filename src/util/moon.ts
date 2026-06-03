// Moon phase from date — pure astronomical approximation, no network.
// Reference: a known new moon at 2000-01-06 18:14 UTC, mean synodic month.
// Phase *names* are resolved by the i18n layer from `index`.

export interface MoonInfo {
  /** 0..1 position in the lunar cycle (0 = new, 0.5 = full). */
  phase: number;
  /** Days since the last new moon. */
  age: number;
  /** 0..1 fraction of the disc illuminated. */
  illumination: number;
  /** 0..7 index into the eight named phases. */
  index: number;
  /** Emoji glyph for the phase (language-neutral). */
  emoji: string;
}

const SYNODIC = 29.530588853; // mean synodic month, days
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

const EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

export function moonInfo(date: Date = new Date()): MoonInfo {
  const days = (date.getTime() - REF_NEW_MOON) / 86_400_000;
  let age = days % SYNODIC;
  if (age < 0) age += SYNODIC;
  const phase = age / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const index = Math.round(phase * 8) % 8;
  return { phase, age, illumination, index, emoji: EMOJI[index] };
}
