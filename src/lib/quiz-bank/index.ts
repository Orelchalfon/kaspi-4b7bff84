import englishQuestions from "./english";
import financeQuestions from "./finance";
import { ageInYears, levelForBirthdate } from "./levels";
import mathQuestions from "./math";
import torahQuestions from "./torah";
import {
  LEVEL_LABELS_HE,
  QUIZ_LENGTH,
  QUIZ_LEVELS,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  SUBJECTS,
  isQuizSubject,
  type QuizLevel,
  type QuizQuestion,
  type QuizSubject,
} from "./types";

const BANK: Record<QuizSubject, QuizQuestion[]> = {
  english: englishQuestions,
  math: mathQuestions,
  torah: torahQuestions,
  finance: financeQuestions,
};

// When a level's pool is too thin, top up from the nearest tiers first.
const LEVEL_FALLBACK: Record<QuizLevel, QuizLevel[]> = {
  young: ["middle", "older"],
  middle: ["young", "older"],
  older: ["middle", "young"],
};

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getRandomQuiz(
  subject: QuizSubject,
  level: QuizLevel,
  n: number = QUIZ_LENGTH,
): QuizQuestion[] {
  const pool = shuffle(BANK[subject].filter((q) => q.level === level));
  for (const fallbackLevel of LEVEL_FALLBACK[level]) {
    if (pool.length >= n) break;
    for (const q of shuffle(BANK[subject].filter((qq) => qq.level === fallbackLevel))) {
      if (pool.length >= n) break;
      pool.push(q);
    }
  }
  const sampled = pool.slice(0, Math.min(n, pool.length));
  // Shuffle each question's choices and rebind correctIndex so memorizing position doesn't help.
  return sampled.map((q) => {
    const indexed = q.choices.map((choice, idx) => ({ choice, isCorrect: idx === q.correctIndex }));
    const shuffled = shuffle(indexed);
    const newCorrect = shuffled.findIndex((c) => c.isCorrect) as 0 | 1 | 2 | 3;
    return {
      ...q,
      choices: shuffled.map((c) => c.choice) as [string, string, string, string],
      correctIndex: newCorrect,
    };
  });
}

export function bankSize(subject: QuizSubject, level?: QuizLevel): number {
  if (!level) return BANK[subject].length;
  return BANK[subject].filter((q) => q.level === level).length;
}

export {
  LEVEL_LABELS_HE,
  QUIZ_LENGTH,
  QUIZ_LEVELS,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  SUBJECTS,
  ageInYears,
  isQuizSubject,
  levelForBirthdate,
  type QuizLevel,
  type QuizQuestion,
  type QuizSubject,
};
