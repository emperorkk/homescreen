// Synodic-month moon phase (no API). Returns 0..1, 0 = new, 0.5 = full.

const SYNODIC = 29.530588853;
// Known new moon (UTC).
const REF = Date.UTC(2000, 0, 6, 18, 14);

export function moonPhase(date = new Date()): number {
  const days = (date.getTime() - REF) / 86_400_000;
  const phase = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  return phase / SYNODIC;
}

export interface MoonInfo {
  phase: number;
  glyph: string;
  label: string;
}

export function moonInfo(date = new Date()): MoonInfo {
  const p = moonPhase(date);
  // Eight phases, evenly spaced
  const idx = Math.round(p * 8) % 8;
  const glyphs = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const labels = [
    "Νέα Σελήνη",
    "Αύξων Μηνίσκος",
    "Πρώτο Τέταρτο",
    "Αύξουσα Σελήνη",
    "Πανσέληνος",
    "Φθίνουσα Σελήνη",
    "Τελευταίο Τέταρτο",
    "Φθίνων Μηνίσκος",
  ];
  return { phase: p, glyph: glyphs[idx], label: labels[idx] };
}
