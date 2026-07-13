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
  { id: "REPLACE_WITH_ELEVENLABS_VOICE_ID__MALE_1", label: "אבי", gender: "male" },
  { id: "REPLACE_WITH_ELEVENLABS_VOICE_ID__FEMALE_1", label: "נועה", gender: "female" },
];

export const DEFAULT_VOICE_ID = TUTOR_VOICES[0].id;

export interface TutorConfig {
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  voice_id: string;
}

/**
 * The safety floor is duplicated here as defense-in-depth: it also belongs in
 * the ElevenLabs agent's own base prompt (dashboard-configured), so a child
 * session stays safe even if a specific override toggle is left disabled.
 */
const SAFETY_FLOOR_HE = `
כללי בטיחות (חובה תמיד):
- דברו רק בעברית.
- ההתאמה היא לילדים - השתמשו בשפה פשוטה ומתאימה לגיל.
- אין לבקש פרטים אישיים (כתובת, טלפון, סיסמאות, מיקום).
- אם הילד/ה משתפים מצוקה, פחד או בקשת עזרה - הפנו אותם בעדינות לפנות להורה או למבוגר אחראי.
- אין להזכיר תוכן אלים, מיני או לא הולם.
`.trim();

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

${SAFETY_FLOOR_HE}
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
      language: "he",
    },
    // A placeholder voice_id (not yet replaced with a real ElevenLabs voice)
    // must not be sent — omitting the override falls back to the agent's own
    // dashboard-configured default voice instead of breaking the session.
    ...(tutor.voice_id.startsWith("REPLACE_WITH") ? {} : { tts: { voiceId: tutor.voice_id } }),
  };
}
