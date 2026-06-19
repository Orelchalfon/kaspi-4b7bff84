export const SUBJECTS = ["english", "math", "torah", "finance"] as const;
export type QuizSubject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS_HE: Record<QuizSubject, string> = {
  english: "אנגלית",
  math: "חשבון",
  torah: "תורה",
  finance: "כספים",
};

// Two-grade school bands. The key is the grade range; difficulty tracks the
// child's actual grade (derived from birthdate) far more closely than the old
// 3-tier model, which lumped grades 6–12 into a single "older" pool.
export const QUIZ_BANDS = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12"] as const;
export type QuizBand = (typeof QUIZ_BANDS)[number];

export const BAND_LABELS_HE: Record<QuizBand, string> = {
  "1-2": "כיתות א'-ב'",
  "3-4": "כיתות ג'-ד'",
  "5-6": "כיתות ה'-ו'",
  "7-8": "כיתות ז'-ח'",
  "9-10": "כיתות ט'-י'",
  "11-12": 'כיתות י"א-י"ב',
};

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  band: QuizBand;
}

export const QUIZ_LENGTH = 5;
export const QUIZ_PASS_THRESHOLD_PCT = 80;

export function isQuizSubject(value: string): value is QuizSubject {
  return (SUBJECTS as readonly string[]).includes(value);
}
