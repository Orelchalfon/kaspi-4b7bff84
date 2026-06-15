import { describe, expect, it } from "vitest";
import {
  QUIZ_LEVELS,
  SUBJECTS,
  ageInYears,
  bankSize,
  getRandomQuiz,
  levelForBirthdate,
} from "@/lib/quiz-bank";
import englishQuestions from "@/lib/quiz-bank/english";

// Fixed reference date so boundary tests are deterministic.
const NOW = new Date(2026, 5, 12); // 2026-06-12

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

describe("levelForBirthdate", () => {
  it("maps under-9 to young", () => {
    expect(levelForBirthdate("2017-06-13", NOW)).toBe("young"); // 8y364d
    expect(levelForBirthdate("2020-01-01", NOW)).toBe("young");
  });

  it("maps 9-11 to middle", () => {
    expect(levelForBirthdate("2017-06-12", NOW)).toBe("middle"); // exactly 9
    expect(levelForBirthdate("2014-06-13", NOW)).toBe("middle"); // 11y364d
  });

  it("maps 12+ to older", () => {
    expect(levelForBirthdate("2014-06-12", NOW)).toBe("older"); // exactly 12
    expect(levelForBirthdate("2010-01-01", NOW)).toBe("older");
  });

  it("falls back to middle for missing or invalid birthdate", () => {
    expect(levelForBirthdate(null, NOW)).toBe("middle");
    expect(levelForBirthdate(undefined, NOW)).toBe("middle");
    expect(levelForBirthdate("garbage", NOW)).toBe("middle");
  });
});

describe("question banks", () => {
  it("every subject has a usable pool (≥ QUIZ_LENGTH) per level", () => {
    for (const subject of SUBJECTS) {
      for (const level of QUIZ_LEVELS) {
        expect(bankSize(subject, level)).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("ids are globally unique with valid correctIndex and 4 choices", () => {
    const seen = new Set<string>();
    for (const subject of SUBJECTS) {
      for (const q of getRandomQuiz(subject, "middle", 1000)) {
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
  it("serves only the requested level when the pool is big enough", () => {
    for (const level of QUIZ_LEVELS) {
      const quiz = getRandomQuiz("english", level, 5);
      expect(quiz).toHaveLength(5);
      expect(new Set(quiz.map((q) => q.id)).size).toBe(5);
      for (const q of quiz) expect(q.level).toBe(level);
    }
  });

  it("tops up from other levels (no duplicates) when the pool is too thin", () => {
    const whole = getRandomQuiz("english", "young", 1000);
    expect(whole).toHaveLength(bankSize("english"));
    expect(new Set(whole.map((q) => q.id)).size).toBe(whole.length);
  });

  it("keeps correctIndex pointing at the right choice after shuffling", () => {
    const byId = new Map(englishQuestions.map((q) => [q.id, q]));
    for (const q of getRandomQuiz("english", "older", 10)) {
      const original = byId.get(q.id)!;
      expect(q.choices[q.correctIndex]).toBe(original.choices[original.correctIndex]);
    }
  });
});
