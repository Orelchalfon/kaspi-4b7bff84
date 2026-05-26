import englishQuestions from "./english";
import financeQuestions from "./finance";
import mathQuestions from "./math";
import torahQuestions from "./torah";
import {
  QUIZ_LENGTH,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  SUBJECTS,
  isQuizSubject,
  type QuizQuestion,
  type QuizSubject,
} from "./types";

const BANK: Record<QuizSubject, QuizQuestion[]> = {
  english: englishQuestions,
  math: mathQuestions,
  torah: torahQuestions,
  finance: financeQuestions,
};

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getRandomQuiz(subject: QuizSubject, n: number = QUIZ_LENGTH): QuizQuestion[] {
  const pool = BANK[subject];
  const sampled = shuffle(pool).slice(0, Math.min(n, pool.length));
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

export function bankSize(subject: QuizSubject): number {
  return BANK[subject].length;
}

export {
  QUIZ_LENGTH,
  QUIZ_PASS_THRESHOLD_PCT,
  SUBJECT_LABELS_HE,
  SUBJECTS,
  isQuizSubject,
  type QuizQuestion,
  type QuizSubject,
};
