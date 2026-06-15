import type { QuizLevel } from "./types";

// School-level tiers: young ≈ כיתות א'-ב' (under 9), middle ≈ כיתות ג'-ה' (9–11),
// older ≈ כיתות ו' ומעלה (12+). Children without a birthdate get the middle tier.
const MIDDLE_MIN_AGE = 9;
const OLDER_MIN_AGE = 12;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Full years elapsed since an ISO `YYYY-MM-DD` birthdate, or null when the
 * string is unparseable. Parsed by string parts (not `new Date(string)`) so
 * the result is timezone-stable.
 */
export function ageInYears(birthdate: string, now: Date = new Date()): number | null {
  const m = ISO_DATE_RE.exec(birthdate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let age = now.getFullYear() - year;
  const beforeBirthdayThisYear =
    now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

export function levelForBirthdate(
  birthdate: string | null | undefined,
  now: Date = new Date(),
): QuizLevel {
  if (!birthdate) return "middle";
  const age = ageInYears(birthdate, now);
  if (age === null) return "middle";
  if (age < MIDDLE_MIN_AGE) return "young";
  if (age < OLDER_MIN_AGE) return "middle";
  return "older";
}
