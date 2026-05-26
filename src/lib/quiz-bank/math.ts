import type { QuizQuestion } from "./types";

const QUESTIONS: QuizQuestion[] = [
  { id: "math-001", prompt: "כמה זה 7 + 8?", choices: ["14", "15", "16", "17"], correctIndex: 1 },
  { id: "math-002", prompt: "כמה זה 12 − 5?", choices: ["6", "7", "8", "9"], correctIndex: 1 },
  { id: "math-003", prompt: "כמה זה 6 × 7?", choices: ["42", "36", "48", "40"], correctIndex: 0 },
  { id: "math-004", prompt: "כמה זה 9 × 8?", choices: ["63", "81", "72", "64"], correctIndex: 2 },
  { id: "math-005", prompt: "כמה זה 56 ÷ 7?", choices: ["6", "7", "8", "9"], correctIndex: 2 },
  { id: "math-006", prompt: "כמה זה 81 ÷ 9?", choices: ["7", "8", "9", "10"], correctIndex: 2 },
  {
    id: "math-007",
    prompt: "כמה זה חצי מ-50?",
    choices: ["20", "25", "30", "15"],
    correctIndex: 1,
  },
  {
    id: "math-008",
    prompt: "כמה זה רבע מ-100?",
    choices: ["20", "25", "40", "50"],
    correctIndex: 1,
  },
  {
    id: "math-009",
    prompt: "מהו המספר הבא בסדרה: 2, 4, 6, 8, ...?",
    choices: ["9", "10", "11", "12"],
    correctIndex: 1,
  },
  {
    id: "math-010",
    prompt: "מהו המספר הבא בסדרה: 5, 10, 15, 20, ...?",
    choices: ["22", "23", "24", "25"],
    correctIndex: 3,
  },
  {
    id: "math-011",
    prompt: "יש 4 ילדים, וכל אחד מקבל 3 סוכריות. כמה סוכריות חולקו בסך הכל?",
    choices: ["10", "11", "12", "14"],
    correctIndex: 2,
  },
  {
    id: "math-012",
    prompt: 'אורך אחד הצדדים של ריבוע הוא 5 ס"מ. מהי ההיקף שלו?',
    choices: ["10", "15", "20", "25"],
    correctIndex: 2,
  },
  {
    id: "math-013",
    prompt: "כמה דקות יש בשעה?",
    choices: ["30", "45", "60", "100"],
    correctIndex: 2,
  },
  {
    id: "math-014",
    prompt: "כמה שעות יש ביממה?",
    choices: ["12", "20", "24", "30"],
    correctIndex: 2,
  },
  {
    id: "math-015",
    prompt: "כמה זה 100 − 37?",
    choices: ["53", "63", "73", "67"],
    correctIndex: 1,
  },
  { id: "math-016", prompt: "כמה זה 25 + 47?", choices: ["62", "72", "82", "73"], correctIndex: 1 },
  {
    id: "math-017",
    prompt: "במשולש שווה-צלעות, כל הזוויות שוות. מהי גודלה של כל זווית?",
    choices: ["45°", "60°", "90°", "180°"],
    correctIndex: 1,
  },
  {
    id: "math-018",
    prompt: "כמה זה 3²? (שלוש בריבוע)",
    choices: ["6", "9", "12", "27"],
    correctIndex: 1,
  },
  {
    id: "math-019",
    prompt: 'אם 1 ק"ג עולה 12 ₪, כמה יעלו 3 ק"ג?',
    choices: ["24 ₪", "30 ₪", "36 ₪", "40 ₪"],
    correctIndex: 2,
  },
  {
    id: "math-020",
    prompt: "כמה זה 10% מ-200?",
    choices: ["10", "20", "30", "50"],
    correctIndex: 1,
  },
  {
    id: "math-021",
    prompt: "כמה זה 50% מ-80?",
    choices: ["20", "30", "40", "60"],
    correctIndex: 2,
  },
  { id: "math-022", prompt: "כמה זה 8 × 6?", choices: ["42", "46", "48", "54"], correctIndex: 2 },
  {
    id: "math-023",
    prompt: "מספר אי-זוגי הוא:",
    choices: ["4", "6", "9", "10"],
    correctIndex: 2,
  },
  {
    id: "math-024",
    prompt: "איזה משבר הוא הגדול ביותר?",
    choices: ["1/2", "1/3", "1/4", "1/5"],
    correctIndex: 0,
  },
  {
    id: "math-025",
    prompt: "כמה זה 144 ÷ 12?",
    choices: ["10", "11", "12", "14"],
    correctIndex: 2,
  },
];

export default QUESTIONS;
