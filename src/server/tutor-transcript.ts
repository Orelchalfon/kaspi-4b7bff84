import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const InputSchema = z.object({ sessionId: z.string().uuid() });

interface ElevenLabsTranscriptTurn {
  role: "user" | "agent";
  message?: string | null;
}

export interface TutorTranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Returns the authoritative transcript for a tutor session, upgrading it from
 * the client's best-effort save (`transcript_source: 'client'`) to
 * ElevenLabs' own conversation record the first time anyone views it. RLS on
 * `tutor_sessions` already enforces "caller is the owning child or a
 * household parent" — no separate authorization check is needed here.
 */
export const getTutorSessionTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: session, error: sessionError } = await supabase
      .from("tutor_sessions")
      .select("id, elevenlabs_conversation_id, transcript, transcript_source")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    if (session.transcript_source === "elevenlabs_api") {
      return { transcript: (session.transcript as TutorTranscriptMessage[] | null) ?? [] };
    }
    if (!session.elevenlabs_conversation_id) {
      return { transcript: (session.transcript as TutorTranscriptMessage[] | null) ?? [] };
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ELEVENLABS_API_KEY env var");
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(session.elevenlabs_conversation_id)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      // ElevenLabs may still be processing the conversation right after
      // hangup — fall back to the client's best-effort save rather than
      // failing the view.
      return { transcript: (session.transcript as TutorTranscriptMessage[] | null) ?? [] };
    }
    const body = (await res.json()) as { transcript?: ElevenLabsTranscriptTurn[] };

    const transcript: TutorTranscriptMessage[] = (body.transcript ?? [])
      .filter((t): t is ElevenLabsTranscriptTurn & { message: string } => !!t.message)
      .map((t) => ({ role: t.role === "agent" ? "assistant" : "user", content: t.message }));

    await supabase
      .from("tutor_sessions")
      .update({ transcript: transcript as unknown as Json, transcript_source: "elevenlabs_api" })
      .eq("id", data.sessionId);

    return { transcript };
  });
