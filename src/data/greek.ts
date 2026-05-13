// Greek greeting, namedays, and public holidays.
// Namedays/holidays are keyed by "MM-DD".

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Καλημέρα";
  if (h >= 12 && h < 18) return "Καλό απόγευμα";
  if (h >= 18 && h < 23) return "Καλησπέρα";
  return "Καληνύχτα";
}

function mmdd(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
}

// Popular Greek Orthodox namedays. Not exhaustive — covers the most widely
// celebrated names. Keys are MM-DD on the civil (Gregorian) calendar.
const NAMEDAYS: Record<string, string> = {
  "01-01": "Βασίλη, Βασιλικής",
  "01-06": "Φώτη, Φωτεινής, Θεοφάνη",
  "01-07": "Ιωάννη, Γιάννη, Ιωάννας",
  "01-17": "Αντώνη, Αντωνίας",
  "01-18": "Αθανάση, Κυρίλλου",
  "01-20": "Ευθυμίου",
  "01-25": "Γρηγορίου",
  "02-10": "Χαραλάμπους",
  "02-17": "Θεοδώρου",
  "03-09": "Σαράντα Μαρτύρων",
  "03-25": "Ευαγγελίας, Ευάγγελου",
  "04-23": "Γιώργου, Γεωργίας",
  "05-05": "Ειρήνης",
  "05-08": "Ιωάννου του Θεολόγου",
  "05-21": "Κωνσταντίνου και Ελένης",
  "06-24": "Ιωάννου του Προδρόμου",
  "06-29": "Πέτρου και Παύλου",
  "07-01": "Κοσμά και Δαμιανού",
  "07-07": "Κυριακής",
  "07-17": "Μαρίνας",
  "07-20": "Ηλία, Ηλιάνας",
  "07-22": "Μαρίας Μαγδαληνής",
  "07-25": "Άννας",
  "07-26": "Παρασκευής",
  "07-27": "Παντελεήμονος",
  "08-06": "Σωτηρίου",
  "08-15": "Μαρίας, Παναγιώτη, Παναγιώτας, Δέσποινας",
  "08-30": "Αλεξάνδρου",
  "09-08": "Γενέθλιο της Θεοτόκου",
  "09-14": "Σταύρου, Σταυρούλας",
  "09-17": "Σοφίας, Πίστης, Ελπίδας, Αγάπης",
  "10-18": "Λουκά",
  "10-26": "Δημήτρη, Δήμητρας",
  "11-08": "Μιχαήλ, Γαβριήλ, Άγγελου, Στρατή",
  "11-09": "Νεκταρίου",
  "11-13": "Χρυσοστόμου",
  "11-14": "Φιλίππου",
  "11-16": "Ματθαίου",
  "11-21": "Εισόδια της Θεοτόκου",
  "11-25": "Αικατερίνης, Κατερίνας",
  "11-30": "Ανδρέα",
  "12-04": "Βαρβάρας",
  "12-05": "Σάββα",
  "12-06": "Νικολάου, Νίκης",
  "12-09": "Άννας",
  "12-12": "Σπυρίδωνος, Σπύρου",
  "12-15": "Ελευθερίου",
  "12-25": "Χριστού, Χριστίνας, Χρήστου",
  "12-26": "Εμμανουήλ, Μανώλη",
  "12-27": "Στεφάνου, Στεφανίας",
};

const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "Πρωτοχρονιά",
  "01-06": "Θεοφάνεια",
  "03-25": "25η Μαρτίου — Εθνική Εορτή",
  "05-01": "Πρωτομαγιά",
  "08-15": "Κοίμηση της Θεοτόκου",
  "10-28": "28η Οκτωβρίου — Εθνική Εορτή",
  "12-25": "Χριστούγεννα",
  "12-26": "Σύναξη Θεοτόκου",
};

// Meeus's Julian Easter algorithm; result is converted from Julian to Gregorian
// by adding 13 days (valid 1900-2099).
export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julian = new Date(Date.UTC(year, month - 1, day));
  julian.setUTCDate(julian.getUTCDate() + 13);
  return new Date(julian.getUTCFullYear(), julian.getUTCMonth(), julian.getUTCDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function movableHolidays(year: number): { date: Date; name: string }[] {
  const easter = orthodoxEaster(year);
  const add = (days: number) => {
    const d = new Date(easter);
    d.setDate(d.getDate() + days);
    return d;
  };
  return [
    { date: add(-48), name: "Καθαρά Δευτέρα" },
    { date: add(-2), name: "Μεγάλη Παρασκευή" },
    { date: easter, name: "Πάσχα" },
    { date: add(1), name: "Δευτέρα του Πάσχα" },
    { date: add(50), name: "Αγίου Πνεύματος" },
  ];
}

export interface DayInfo {
  nameday: string | null;
  holiday: string | null;
}

export function lookupDay(date = new Date()): DayInfo {
  const key = mmdd(date);
  const nameday = NAMEDAYS[key] ?? null;
  let holiday: string | null = FIXED_HOLIDAYS[key] ?? null;
  if (!holiday) {
    for (const h of movableHolidays(date.getFullYear())) {
      if (sameDay(h.date, date)) {
        holiday = h.name;
        break;
      }
    }
  }
  return { nameday, holiday };
}
