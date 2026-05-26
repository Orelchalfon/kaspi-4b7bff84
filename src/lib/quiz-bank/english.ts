import type { QuizQuestion } from "./types";

const QUESTIONS: QuizQuestion[] = [
  {
    id: "english-001",
    prompt: 'איך אומרים "חתול" באנגלית?',
    choices: ["dog", "cat", "cow", "cup"],
    correctIndex: 1,
  },
  {
    id: "english-002",
    prompt: 'איך אומרים "כלב" באנגלית?',
    choices: ["dog", "dig", "deer", "duck"],
    correctIndex: 0,
  },
  {
    id: "english-003",
    prompt: 'איך אומרים "ספר" באנגלית?',
    choices: ["pen", "paper", "book", "bag"],
    correctIndex: 2,
  },
  {
    id: "english-004",
    prompt: 'איך אומרים "מים" באנגלית?',
    choices: ["wine", "water", "milk", "juice"],
    correctIndex: 1,
  },
  {
    id: "english-005",
    prompt: 'איך אומרים "שמש" באנגלית?',
    choices: ["sun", "son", "sea", "sky"],
    correctIndex: 0,
  },
  {
    id: "english-006",
    prompt: 'איך אומרים "ירח" באנגלית?',
    choices: ["star", "moon", "month", "morning"],
    correctIndex: 1,
  },
  {
    id: "english-007",
    prompt: 'איך אומרים "בית" באנגלית?',
    choices: ["home", "house", "hotel", "hat"],
    correctIndex: 1,
  },
  {
    id: "english-008",
    prompt: 'איך אומרים "אדום" באנגלית?',
    choices: ["red", "read", "rod", "ride"],
    correctIndex: 0,
  },
  {
    id: "english-009",
    prompt: 'איך אומרים "כחול" באנגלית?',
    choices: ["black", "brown", "blue", "blew"],
    correctIndex: 2,
  },
  {
    id: "english-010",
    prompt: 'איך אומרים "ירוק" באנגלית?',
    choices: ["grin", "green", "gray", "great"],
    correctIndex: 1,
  },
  {
    id: "english-011",
    prompt: 'איך אומרים "אמא" באנגלית?',
    choices: ["mother", "father", "sister", "brother"],
    correctIndex: 0,
  },
  {
    id: "english-012",
    prompt: 'איך אומרים "אבא" באנגלית?',
    choices: ["father", "uncle", "grandfather", "friend"],
    correctIndex: 0,
  },
  {
    id: "english-013",
    prompt: 'מה זה "apple"?',
    choices: ["תפוז", "תפוח", "ענב", "אגס"],
    correctIndex: 1,
  },
  {
    id: "english-014",
    prompt: 'מה זה "school"?',
    choices: ["בית-חולים", "בית-כנסת", "בית-ספר", "בית-קפה"],
    correctIndex: 2,
  },
  {
    id: "english-015",
    prompt: 'מה זה "teacher"?',
    choices: ["מורה", "תלמיד", "רופא", "טבח"],
    correctIndex: 0,
  },
  {
    id: "english-016",
    prompt: 'מה זה "happy"?',
    choices: ["עצוב", "כועס", "שמח", "עייף"],
    correctIndex: 2,
  },
  {
    id: "english-017",
    prompt: 'מה זה "friend"?',
    choices: ["אויב", "חבר", "קרוב משפחה", "שכן"],
    correctIndex: 1,
  },
  {
    id: "english-018",
    prompt: 'איך אומרים "שבע" באנגלית?',
    choices: ["six", "seven", "eight", "nine"],
    correctIndex: 1,
  },
  {
    id: "english-019",
    prompt: 'איך אומרים "עשר" באנגלית?',
    choices: ["ten", "twenty", "tin", "tan"],
    correctIndex: 0,
  },
  {
    id: "english-020",
    prompt: 'איך אומרים "יום ראשון" באנגלית?',
    choices: ["Monday", "Sunday", "Saturday", "Friday"],
    correctIndex: 1,
  },
  {
    id: "english-021",
    prompt: 'מה זה "to read"?',
    choices: ["לכתוב", "לקרוא", "לרוץ", "לישון"],
    correctIndex: 1,
  },
  {
    id: "english-022",
    prompt: 'מה זה "to eat"?',
    choices: ["לאכול", "לשתות", "לשחק", "לחשוב"],
    correctIndex: 0,
  },
  {
    id: "english-023",
    prompt: 'איך אומרים "ים" באנגלית?',
    choices: ["see", "sea", "say", "sky"],
    correctIndex: 1,
  },
  {
    id: "english-024",
    prompt: 'איך אומרים "חורף" באנגלית?',
    choices: ["summer", "spring", "winter", "fall"],
    correctIndex: 2,
  },
  {
    id: "english-025",
    prompt: 'מה זה "big"?',
    choices: ["קטן", "גדול", "ארוך", "קצר"],
    correctIndex: 1,
  },
];

export default QUESTIONS;
