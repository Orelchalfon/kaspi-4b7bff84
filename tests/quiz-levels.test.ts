import { describe, expect, it } from "vitest";
import {
  DEFAULT_BAND,
  QUIZ_BANDS,
  SUBJECTS,
  ageInYears,
  bandForBirthdate,
  bankSize,
  getRandomQuiz,
  gradeForBirthdate,
} from "@/lib/quiz-bank";
import englishQuestions from "@/lib/quiz-bank/english";

// Fixed reference date so boundary tests are deterministic.
// June is before September, so the "current school year" started Sept 2025.
const NOW = new Date(2026, 5, 12); // 2026-06-12
// October is on/after September, so the school year started Sept 2026.
const NOW_AUTUMN = new Date(2026, 9, 15); // 2026-10-15

describe("ageInYears", () => {
  it("counts full years only", () => {
    expect(ageInYears("2017-06-12", NOW)).toBe(9); // birthday today
    expect(ageInYears("2017-06-13", NOW)).toBe(8); // birthday tomorrow
    expect(ageInYears("2017-06-11", NOW)).toBe(9);
  });

  it("handles leap-day birthdates", () => {
    expect(ageInYears("2016-02-29", new Date(2026, 1, 28))).toBe(9);
    expect(ageInYears("2016-02-29", new Date(2026, 2, 1))).toBe(10);
  });

  it("returns null for unparseable input", () => {
    expect(ageInYears("not-a-date", NOW)).toBeNull();
    expect(ageInYears("2017-13-01", NOW)).toBeNull();
  });
});

describe("gradeForBirthdate", () => {
  it("derives grade from age as of Sept 1 of the current school year", () => {
    // Born March 2014 → age 11 as of Sept 2025 → grade 6.
    expect(gradeForBirthdate("2014-03-10", NOW)).toBe(6);
    expect(gradeForBirthdate("2019-03-10", NOW)).toBe(1);
    expect(gradeForBirthdate("2008-03-10", NOW)).toBe(12);
  });

  it("clamps to the 1..12 range", () => {
    expect(gradeForBirthdate("2025-03-10", NOW)).toBe(1); // too young
    expect(gradeForBirthdate("2005-03-10", NOW)).toBe(12); // too old
  });

  it("advances a grade once the new school year begins (Sept anchor)", () => {
    // Same child, after Sept 1 2026 the school year is 2026-27 → grade 7.
    expect(gradeForBirthdate("2014-03-10", NOW)).toBe(6);
    expect(gradeForBirthdate("2014-03-10", NOW_AUTUMN)).toBe(7);
  });

  it("returns null for unparseable input", () => {
    expect(gradeForBirthdate("garbage", NOW)).toBeNull();
  });
});

describe("bandForBirthdate", () => {
  it("maps grade to the two-grade band", () => {
    expect(bandForBirthdate("2019-03-10", NOW)).toBe("1-2"); // grade 1
    expect(bandForBirthdate("2017-03-10", NOW)).toBe("3-4"); // grade 3
    expect(bandForBirthdate("2014-03-10", NOW)).toBe("5-6"); // grade 6 (the nephew case)
    expect(bandForBirthdate("2013-03-10", NOW)).toBe("7-8"); // grade 7
    expect(bandForBirthdate("2011-03-10", NOW)).toBe("9-10"); // grade 9
    expect(bandForBirthdate("2008-03-10", NOW)).toBe("11-12"); // grade 12
  });

  it("keeps a grade cohort together regardless of whether the birthday has passed", () => {
    // Both children are in grade 6 in the 2025-26 school year; one already had
    // their 12th birthday (today), the other has not yet turned 11. Anchoring
    // age to Sept 1 puts both in the same band.
    expect(bandForBirthdate("2014-05-01", NOW)).toBe("5-6");
    expect(bandForBirthdate("2014-12-01", NOW)).toBe("5-6");
  });

  it("falls back to DEFAULT_BAND for missing or invalid birthdate", () => {
    expect(DEFAULT_BAND).toBe("5-6");
    expect(bandForBirthdate(null, NOW)).toBe(DEFAULT_BAND);
    expect(bandForBirthdate(undefined, NOW)).toBe(DEFAULT_BAND);
    expect(bandForBirthdate("garbage", NOW)).toBe(DEFAULT_BAND);
  });
});

describe("question banks", () => {
  it("every subject has a usable pool (≥ QUIZ_LENGTH) per band", () => {
    for (const subject of SUBJECTS) {
      for (const band of QUIZ_BANDS) {
        expect(bankSize(subject, band)).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("ids are globally unique with valid correctIndex and 4 choices", () => {
    const seen = new Set<string>();
    for (const subject of SUBJECTS) {
      for (const q of getRandomQuiz(subject, "5-6", 1000)) {
        expect(seen.has(q.id)).toBe(false);
        seen.add(q.id);
        expect(q.choices).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("getRandomQuiz", () => {
  it("serves only the requested band when the pool is big enough", () => {
    for (const band of QUIZ_BANDS) {
      const quiz = getRandomQuiz("english", band, 5);
      expect(quiz).toHaveLength(5);
      expect(new Set(quiz.map((q) => q.id)).size).toBe(5);
      for (const q of quiz) expect(q.band).toBe(band);
    }
  });

  it("tops up from the nearest bands (no duplicates) when the pool is too thin", () => {
    // Ask for far more than any single band holds → fills from neighbours.
    const topUp = getRandomQuiz("math", "11-12", 25);
    expect(topUp.length).toBeGreaterThan(bankSize("math", "11-12"));
    expect(new Set(topUp.map((q) => q.id)).size).toBe(topUp.length);

    // Asking for the whole subject returns every question exactly once.
    const whole = getRandomQuiz("english", "1-2", 1000);
    expect(whole).toHaveLength(bankSize("english"));
    expect(new Set(whole.map((q) => q.id)).size).toBe(whole.length);
  });

  it("keeps correctIndex pointing at the right choice after shuffling", () => {
    const byId = new Map(englishQuestions.map((q) => [q.id, q]));
    for (const q of getRandomQuiz("english", "9-10", 10)) {
      const original = byId.get(q.id)!;
      expect(q.choices[q.correctIndex]).toBe(original.choices[original.correctIndex]);
    }
  });
});
