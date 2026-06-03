// Greek Orthodox holidays — pure computation, no network.
// Movable feasts are derived from Orthodox Pascha (Easter); fixed feasts are
// calendar dates. Names are in Greek. Valid for the 1900–2099 range.

export interface Holiday {
  /** Greek name of the feast. */
  name: string;
  /** Local date at midnight. */
  date: Date;
  /** True for Pascha-relative (movable) feasts. */
  movable: boolean;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return startOfDay(r);
}

/**
 * Orthodox Pascha as a Gregorian-calendar date. Uses the Meeus Julian
 * algorithm, then adds the 13-day Julian→Gregorian offset (valid 1900–2099).
 */
export function orthodoxPascha(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April
  const day = ((d + e + 114) % 31) + 1;
  return addDays(new Date(year, month - 1, day), 13);
}

const FIXED: { m: number; d: number; name: string }[] = [
  { m: 1, d: 1, name: "Πρωτοχρονιά – Μ. Βασιλείου" },
  { m: 1, d: 6, name: "Θεοφάνεια (Φώτα)" },
  { m: 2, d: 2, name: "Υπαπαντή του Κυρίου" },
  { m: 3, d: 25, name: "Ευαγγελισμός της Θεοτόκου" },
  { m: 5, d: 21, name: "Αγ. Κωνσταντίνου & Ελένης" },
  { m: 6, d: 24, name: "Γενέθλιον Ιωάννου Προδρόμου" },
  { m: 6, d: 29, name: "Αγ. Αποστόλων Πέτρου & Παύλου" },
  { m: 7, d: 20, name: "Προφήτη Ηλία" },
  { m: 8, d: 6, name: "Μεταμόρφωση του Σωτήρος" },
  { m: 8, d: 15, name: "Κοίμηση της Θεοτόκου" },
  { m: 8, d: 29, name: "Αποτομή Κεφαλής Προδρόμου" },
  { m: 9, d: 8, name: "Γενέθλιο της Θεοτόκου" },
  { m: 9, d: 14, name: "Ύψωση του Τιμίου Σταυρού" },
  { m: 10, d: 26, name: "Αγ. Δημητρίου" },
  { m: 11, d: 8, name: "Αρχαγγέλων Μιχαήλ & Γαβριήλ" },
  { m: 11, d: 21, name: "Εισόδια της Θεοτόκου" },
  { m: 11, d: 30, name: "Αγ. Ανδρέου" },
  { m: 12, d: 6, name: "Αγ. Νικολάου" },
  { m: 12, d: 12, name: "Αγ. Σπυρίδωνος" },
  { m: 12, d: 25, name: "Χριστούγεννα" },
  { m: 12, d: 26, name: "Σύναξη της Υπεραγίας Θεοτόκου" },
];

const MOVABLE: { offset: number; name: string }[] = [
  { offset: -49, name: "Καθαρά Δευτέρα" },
  { offset: -42, name: "Κυριακή της Ορθοδοξίας" },
  { offset: -7, name: "Κυριακή των Βαΐων" },
  { offset: -3, name: "Μεγάλη Πέμπτη" },
  { offset: -2, name: "Μεγάλη Παρασκευή" },
  { offset: -1, name: "Μέγα Σάββατο" },
  { offset: 0, name: "Πάσχα – Κυριακή του Πάσχα" },
  { offset: 1, name: "Δευτέρα της Διακαινησίμου" },
  { offset: 39, name: "Ανάληψη του Κυρίου" },
  { offset: 49, name: "Πεντηκοστή" },
  { offset: 50, name: "Δευτέρα του Αγίου Πνεύματος" },
];

/** All Orthodox holidays for a given year, sorted by date. */
export function orthodoxHolidays(year: number): Holiday[] {
  const pascha = orthodoxPascha(year);
  const list: Holiday[] = FIXED.map((f) => ({
    name: f.name,
    date: new Date(year, f.m - 1, f.d),
    movable: false,
  }));
  for (const mv of MOVABLE) {
    list.push({ name: mv.name, date: addDays(pascha, mv.offset), movable: true });
  }
  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  return list;
}

/** The holiday falling on `date`, or null. */
export function holidayOn(date: Date): Holiday | null {
  const day = startOfDay(date).getTime();
  return (
    orthodoxHolidays(new Date(date).getFullYear()).find(
      (h) => h.date.getTime() === day,
    ) ?? null
  );
}

/** The holiday on `date` if any, otherwise the next upcoming one. */
export function nextHoliday(date: Date): Holiday {
  const day = startOfDay(date).getTime();
  const year = new Date(date).getFullYear();
  const upcoming = orthodoxHolidays(year).find((h) => h.date.getTime() >= day);
  return upcoming ?? orthodoxHolidays(year + 1)[0];
}
