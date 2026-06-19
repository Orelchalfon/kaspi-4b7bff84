import englishQuestions from "./english";
import financeQuestions from "./finance";
import { ageInYears, bandForBirthdate, gradeForBirthdate, DEFAULT_BAND } from "./levels";
import mathQuestions from "./math";
import torahQuestions from "./torah";
import {
  BAND_LABELS_HE,
  QUIZ_BANDS,
  QUIZ_LENGTH,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  SUBJECTS,
  isQuizSubject,
  type QuizBand,
  type QuizQuestion,
  type QuizSubject,
} from "./types";

const BANK: Record<QuizSubject, QuizQuestion[]> = {
  english: englishQuestions,
  math: mathQuestions,
  torah: torahQuestions,
  finance: financeQuestions,
};

/** Bands ordered by nearness to `band`; ties resolve to the easier (lower) band. */
function fallbackOrder(band: QuizBand): QuizBand[] {
  const target = QUIZ_BANDS.indexOf(band);
  return QUIZ_BANDS.filter((b) => b !== band).sort((a, b) => {
    const da = Math.abs(QUIZ_BANDS.indexOf(a) - target);
    const db = Math.abs(QUIZ_BANDS.indexOf(b) - target);
    if (da !== db) return da - db;
    // Same distance (one easier, one harder) → prefer the easier (lower index).
    return QUIZ_BANDS.indexOf(a) - QUIZ_BANDS.indexOf(b);
  });
}

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
  band: QuizBand,
  n: number = QUIZ_LENGTH,
): QuizQuestion[] {
  const pool = shuffle(BANK[subject].filter((q) => q.band === band));
  // When a band's own pool is too thin, top up from the nearest bands first.
  for (const fallbackBand of fallbackOrder(band)) {
    if (pool.length >= n) break;
    for (const q of shuffle(BANK[subject].filter((qq) => qq.band === fallbackBand))) {
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

export function bankSize(subject: QuizSubject, band?: QuizBand): number {
  if (!band) return BANK[subject].length;
  return BANK[subject].filter((q) => q.band === band).length;
}

export {
  BAND_LABELS_HE,
  DEFAULT_BAND,
  QUIZ_BANDS,
  QUIZ_LENGTH,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  SUBJECTS,
  ageInYears,
  bandForBirthdate,
  gradeForBirthdate,
  isQuizSubject,
  type QuizBand,
  type QuizQuestion,
  type QuizSubject,
};
