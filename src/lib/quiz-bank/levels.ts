import { QUIZ_BANDS, type QuizBand } from "./types";

// Band assigned when a child has no (or an unparseable) birthdate: the central
// elementary band. Safe default — never punishingly hard for an unknown child.
export const DEFAULT_BAND: QuizBand = "5-6";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

interface Ymd {
  year: number;
  month: number;
  day: number;
}

function parseIso(birthdate: string): Ymd | null {
  const m = ISO_DATE_RE.exec(birthdate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Full years between a birthdate and a target (year, month 1-12, day) point. */
function fullYearsBetween(b: Ymd, atYear: number, atMonth: number, atDay: number): number {
  let age = atYear - b.year;
  const beforeBirthday = atMonth < b.month || (atMonth === b.month && atDay < b.day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Full years elapsed since an ISO `YYYY-MM-DD` birthdate, or null when the
 * string is unparseable. Parsed by string parts (not `new Date(string)`) so
 * the result is timezone-stable.
 */
export function ageInYears(birthdate: string, now: Date = new Date()): number | null {
  const b = parseIso(birthdate);
  if (!b) return null;
  return fullYearsBetween(b, now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * The child's (approximate) school grade 1–12, derived from birthdate.
 *
 * Age is measured **as of Sept 1 of the current school year** (if `now` is
 * before September, the school year started last September). Anchoring to
 * Sept 1 — rather than "today" — keeps both halves of a grade cohort (the kid
 * who already had their birthday this year and the one who hasn't) in the same
 * grade. `grade = ageAtSept1 - 5`, clamped to [1, 12]. Returns null for an
 * unparseable date.
 */
export function gradeForBirthdate(birthdate: string, now: Date = new Date()): number | null {
  const b = parseIso(birthdate);
  if (!b) return null;
  // School year starts Sept 1; month here is 1-based (September === 9).
  const schoolYearStart = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const ageAtSept1 = fullYearsBetween(b, schoolYearStart, 9, 1);
  const grade = ageAtSept1 - 5;
  return Math.min(12, Math.max(1, grade));
}

/** The two-grade quiz band for a birthdate; null/invalid → DEFAULT_BAND. */
export function bandForBirthdate(
  birthdate: string | null | undefined,
  now: Date = new Date(),
): QuizBand {
  if (!birthdate) return DEFAULT_BAND;
  const grade = gradeForBirthdate(birthdate, now);
  if (grade === null) return DEFAULT_BAND;
  return QUIZ_BANDS[Math.floor((grade - 1) / 2)];
}
