export const SUBJECTS = ["english", "math", "torah", "finance"] as const;
export type QuizSubject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS_HE: Record<QuizSubject, string> = {
  english: "אנגלית",
  math: "חשבון",
  torah: "תורה",
  finance: "כספים",
};

export const QUIZ_LEVELS = ["young", "middle", "older"] as const;
export type QuizLevel = (typeof QUIZ_LEVELS)[number];

export const LEVEL_LABELS_HE: Record<QuizLevel, string> = {
  young: "כיתות א'-ב'",
  middle: "כיתות ג'-ה'",
  older: "כיתות ו' ומעלה",
};

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  level: QuizLevel;
}

export const QUIZ_LENGTH = 5;
export const QUIZ_PASS_THRESHOLD_PCT = 80;

export function isQuizSubject(value: string): value is QuizSubject {
  return (SUBJECTS as readonly string[]).includes(value);
}
