import type { QuizQuestion } from "./types";

const QUESTIONS: QuizQuestion[] = [
  {
    id: "torah-001",
    prompt: "מי היה האדם הראשון לפי התורה?",
    choices: ["נח", "אברהם", "אדם", "משה"],
    correctIndex: 2,
  },
  {
    id: "torah-002",
    prompt: "כמה ימים נמשך מבול נח?",
    choices: ["7 ימים", "40 ימים", "100 ימים", "365 ימים"],
    correctIndex: 1,
  },
  {
    id: "torah-003",
    prompt: "מי הוציא את בני ישראל ממצרים?",
    choices: ["יוסף", "משה", "אהרון", "יהושע"],
    correctIndex: 1,
  },
  {
    id: "torah-004",
    prompt: "כמה הם עשרת הדיברות?",
    choices: ["7", "10", "12", "13"],
    correctIndex: 1,
  },
  {
    id: "torah-005",
    prompt: "בהר איזה ניתנה התורה?",
    choices: ["הר המוריה", "הר תבור", "הר סיני", "הר חרמון"],
    correctIndex: 2,
  },
  {
    id: "torah-006",
    prompt: "כמה הם חמשת חומשי תורה?",
    choices: ["3", "4", "5", "6"],
    correctIndex: 2,
  },
  {
    id: "torah-007",
    prompt: "מי היו שלושת האבות?",
    choices: ["אברהם, יצחק, יעקב", "משה, אהרון, מרים", "שאול, דוד, שלמה", "אדם, נח, שם"],
    correctIndex: 0,
  },
  {
    id: "torah-008",
    prompt: "מי היו אמהות עם ישראל?",
    choices: [
      "שרה, רבקה, רחל, לאה",
      "מרים, חנה, רות, אסתר",
      "דבורה, יעל, חולדה, אסתר",
      "תמר, רחב, רות, בת-שבע",
    ],
    correctIndex: 0,
  },
  {
    id: "torah-009",
    prompt: "באיזה חג אוכלים מצה?",
    choices: ["חנוכה", "פסח", "סוכות", "פורים"],
    correctIndex: 1,
  },
  {
    id: "torah-010",
    prompt: "כמה נרות מדליקים בלילה האחרון של חנוכה (לא כולל השמש)?",
    choices: ["6", "7", "8", "9"],
    correctIndex: 2,
  },
  {
    id: "torah-011",
    prompt: "באיזה חודש חל ראש השנה?",
    choices: ["ניסן", "תמוז", "אלול", "תשרי"],
    correctIndex: 3,
  },
  {
    id: "torah-012",
    prompt: "מהו היום הקדוש ביותר בשנה היהודית?",
    choices: ["ראש השנה", "יום כיפור", "פסח", "שבועות"],
    correctIndex: 1,
  },
  {
    id: "torah-013",
    prompt: "באיזה חג אוכלים בסוכה?",
    choices: ["פורים", "חנוכה", "סוכות", 'ל"ג בעומר'],
    correctIndex: 2,
  },
  {
    id: "torah-014",
    prompt: "מהי המגילה שקוראים בפורים?",
    choices: ["מגילת רות", "מגילת אסתר", "מגילת איכה", "שיר השירים"],
    correctIndex: 1,
  },
  {
    id: "torah-015",
    prompt: "איזה חג מציין את קבלת התורה?",
    choices: ["פסח", "שבועות", "סוכות", "ראש השנה"],
    correctIndex: 1,
  },
  {
    id: "torah-016",
    prompt: "כמה שבטים היו לבני ישראל?",
    choices: ["10", "12", "13", "14"],
    correctIndex: 1,
  },
  {
    id: "torah-017",
    prompt: "מי בנה את בית המקדש הראשון?",
    choices: ["דוד המלך", "שלמה המלך", "שאול המלך", "חזקיהו המלך"],
    correctIndex: 1,
  },
  {
    id: "torah-018",
    prompt: "מי כתב את ספר תהילים?",
    choices: ["משה", "דוד המלך", "שלמה המלך", "שמואל"],
    correctIndex: 1,
  },
  {
    id: "torah-019",
    prompt: "מה הוא היום השביעי לפי התורה?",
    choices: ["יום שלישי", "יום שישי", "שבת", "ראש חודש"],
    correctIndex: 2,
  },
  {
    id: "torah-020",
    prompt: 'מי "מלחמת דוד עם" — הניסיון הקלאסי של הקטן מול הגדול?',
    choices: ["עמלק", "גוליית", "פרעה", "המן"],
    correctIndex: 1,
  },
  {
    id: "torah-021",
    prompt: 'כמה הם ה-ל"ט מלאכות?',
    choices: ["29", "39", "49", "59"],
    correctIndex: 1,
  },
  {
    id: "torah-022",
    prompt: "מהי הברכה הראשונה בכל ארוחה עם לחם?",
    choices: ["שהכל", "המוציא", "בורא פרי האדמה", "בורא נפשות"],
    correctIndex: 1,
  },
  {
    id: "torah-023",
    prompt: 'איזה ספר פותח את התנ"ך?',
    choices: ["שמות", "ויקרא", "בראשית", "במדבר"],
    correctIndex: 2,
  },
  {
    id: "torah-024",
    prompt: "מי היה הנביא שעלה ברוח סערה השמיימה?",
    choices: ["ישעיהו", "ירמיהו", "אליהו", "יחזקאל"],
    correctIndex: 2,
  },
  {
    id: "torah-025",
    prompt: "כמה ימים נמשך חג סוכות (לא כולל שמיני עצרת)?",
    choices: ["5", "6", "7", "8"],
    correctIndex: 2,
  },
];

export default QUESTIONS;
