// Canonical config for AI voice tutors: personality/voice catalogs and the
// Hebrew prompt/override builders fed into the ElevenLabs Agents session.
// Mirrors the single-source-of-truth convention in `src/lib/transactions.ts`.

// Imported from @elevenlabs/react (which re-exports @elevenlabs/client) so we
// don't need @elevenlabs/client as a separate direct dependency.
import type { BaseSessionConfig } from "@elevenlabs/react";

export const TUTOR_PERSONALITIES = ["friendly", "playful", "calm", "strict"] as const;
export type TutorPersonality = (typeof TUTOR_PERSONALITIES)[number];

export const PERSONALITY_LABELS_HE: Record<TutorPersonality, string> = {
  friendly: "ידידותי",
  playful: "משעשע",
  calm: "רגוע",
  strict: "רציני",
};

export const TUTOR_LANGUAGES = ["he", "en", "ar", "ru", "fr"] as const;
export type TutorLanguage = (typeof TUTOR_LANGUAGES)[number];

export const LANGUAGE_LABELS_HE: Record<TutorLanguage, string> = {
  he: "עברית",
  en: "אנגלית",
  ar: "ערבית",
  ru: "רוסית",
  fr: "צרפתית",
};

export const DEFAULT_LANGUAGE: TutorLanguage = "he";

export interface TutorVoiceOption {
  id: string;
  label: string;
  gender: "male" | "female";
}

// Placeholder ids — replace with real Hebrew-capable ElevenLabs voice ids
// from the user's voice library before this feature goes live. These
// deliberately do not look like real ElevenLabs ids so they can't be
// mistaken for working ones.
export const TUTOR_VOICES: readonly TutorVoiceOption[] = [
  { id: "uotMEafxiIOT6Y3Q2VoZ", label: "אבי", gender: "male" },
  { id: "Lzv0WyyKupOrbKO120f8", label: "נועה", gender: "female" },
];

export const DEFAULT_VOICE_ID = TUTOR_VOICES[0].id;

export interface TutorConfig {
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  voice_id: string;
  language: TutorLanguage;
}

// Every tutor's conversation defaults to Hebrew-only. A tutor whose purpose
// is practicing another language (e.g. an English-conversation tutor) needs
// this one line swapped instead, or it can never actually speak the language
// it's meant to teach - the rest of the safety floor stays untouched and
// still applies regardless of which language the lesson is conducted in.
function languageInstructionLine(language: TutorLanguage): string {
  if (language === "he") return "- דברו רק בעברית.";
  const label = LANGUAGE_LABELS_HE[language];
  return `- נהלו את השיעור ותרגלו עם הילד/ה ב${label} - זו שפת התרגול של החונך הזה. אפשר להסביר מונחים בעברית במידת הצורך כדי לוודא הבנה, אך רוב השיחה צריכה להתנהל ב${label}.`;
}

/**
 * The safety floor is duplicated here as defense-in-depth: it also belongs in
 * the ElevenLabs agent's own base prompt (dashboard-configured), so a child
 * session stays safe even if a specific override toggle is left disabled.
 */
function buildSafetyFloorHe(language: TutorLanguage): string {
  return `
כללי בטיחות (חובה תמיד):
${languageInstructionLine(language)}
- ההתאמה היא לילדים - השתמשו בשפה פשוטה ומתאימה לגיל.
- אין לבקש פרטים אישיים (כתובת, טלפון, סיסמאות, מיקום).
- אם הילד/ה משתפים מצוקה, פחד או בקשת עזרה - הפנו אותם בעדינות בעברית לפנות להורה או למבוגר אחראי, גם אם שאר השיחה מתנהלת בשפה אחרת.
- אין להזכיר תוכן אלים, מיני או לא הולם.
`.trim();
}

export function buildTutorSystemPrompt(tutor: TutorConfig): string {
  const personalityHe = PERSONALITY_LABELS_HE[tutor.personality];
  return `
אתם ${tutor.name}, חונך/ת פרטי/ת שמנהל/ת שיחת קול בזמן אמת עם ילד/ה.

הנחיות הוראה:
- התמקדו בנושא "${tutor.topic}" במקצוע "${tutor.subject}" ולמדו אותו את/ה ילד/ה.
- שמרו על שיחה זורמת אך מובילה - את/ה מוביל/ה את קצב השיחה.
- מדי פעם ודאו שהילד/ה עוקב/ת אחריכם ומבין/ה.
- פרקו את הנושא לחלקים קטנים ולמדו חלק אחד בכל פעם.
- סגנון הדיבור שלכם: ${personalityHe}.
- שמרו על תשובות קצרות, כמו בשיחת קול אמיתית.
- אל תשתמשו בתווים מיוחדים בתשובות - זו שיחה קולית.

${buildSafetyFloorHe(tutor.language)}
`.trim();
}

export function buildTutorFirstMessage(tutor: TutorConfig): string {
  return `שלום! בואו נתחיל את השיחה שלנו. היום נדבר על ${tutor.topic}.`;
}

// Sourced directly from the installed @elevenlabs/client's BaseSessionConfig,
// so this stays correct if the SDK's override shape ever changes.
export type TutorAgentOverrides = NonNullable<BaseSessionConfig["overrides"]>;

export function buildTutorOverrides(tutor: TutorConfig): TutorAgentOverrides {
  return {
    agent: {
      prompt: { prompt: buildTutorSystemPrompt(tutor) },
      firstMessage: buildTutorFirstMessage(tutor),
      language: tutor.language,
    },
    // A placeholder voice_id (not yet replaced with a real ElevenLabs voice)
    // must not be sent — omitting the override falls back to the agent's own
    // dashboard-configured default voice instead of breaking the session.
    ...(tutor.voice_id.startsWith("REPLACE_WITH") ? {} : { tts: { voiceId: tutor.voice_id } }),
  };
}
