import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTutorOverrides, type TutorConfig } from "@/lib/tutors";

const InputSchema = z.object({
  tutorId: z.string().uuid(),
  childId: z.string().uuid().optional(),
});

// WebRTC session token. (The newer documented `POST /v1/convai/conversations/get-webrtc-token`
// answered 405 when verified on 2026-10-02; this GET returns `{ token, conversation_id }`.)
const CONVERSATION_TOKEN_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/token";

/**
 * Mints a short-lived WebRTC conversation token for a live tutor session.
 * Mirrors `src/server/create-child.ts`: RLS-scoped role check, then a
 * privileged call using a server-only secret that never reaches the browser.
 * The client treats the token as single-use (one token per `startSession`).
 */
export const mintTutorConversationToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey || !agentId) {
      throw new Error("Missing ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID env vars");
    }

    // The ElevenLabs fetch depends on nothing below - start it now and only
    // await it once authorization has passed.
    const tokenPromise = fetch(
      `${CONVERSATION_TOKEN_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    tokenPromise.catch(() => {});

    // All lookups are independent, so they run in one round-trip. Both child-profile
    // candidates are fetched; the role decides which one is used:
    // - a child is always resolved from their own auth user (never a client-sent id),
    // - a parent names the child, and RLS on `child_profiles` scopes it to their household.
    // RLS on `tutors` already scopes it to the caller's household.
    const [roleResult, tutorResult, ownProfileResult, namedChildResult] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase
        .from("tutors")
        .select("id, name, subject, topic, personality, voice_id, language, active")
        .eq("id", data.tutorId)
        .maybeSingle(),
      supabase.from("child_profiles").select("id").eq("user_id", userId).maybeSingle(),
      data.childId
        ? supabase.from("child_profiles").select("id").eq("id", data.childId).maybeSingle()
        : Promise.resolve(null),
    ]);
    const { data: roleRow, error: roleError } = roleResult;
    const { data: tutor, error: tutorError } = tutorResult;

    if (roleError || !roleRow) {
      throw new Error("Forbidden: no role found for user");
    }

    if (tutorError || !tutor) {
      throw new Error("Tutor not found");
    }
    if (!tutor.active) {
      throw new Error("Tutor is not active");
    }

    let childId: string;
    if (roleRow.role === "child") {
      const { data: childProfile, error: childError } = ownProfileResult;
      if (childError || !childProfile) {
        throw new Error("Child profile not found");
      }
      childId = childProfile.id;
    } else if (roleRow.role === "parent") {
      if (!data.childId || !namedChildResult) {
        throw new Error("childId is required when a parent starts a tutor session");
      }
      const { data: childProfile, error: childError } = namedChildResult;
      if (childError || !childProfile) {
        throw new Error("Child not found in household");
      }
      childId = childProfile.id;
    } else {
      throw new Error("Forbidden: role not permitted to start tutor sessions");
    }

    const tutorConfig: TutorConfig = {
      name: tutor.name,
      subject: tutor.subject,
      topic: tutor.topic,
      personality: tutor.personality as TutorConfig["personality"],
      voice_id: tutor.voice_id,
      language: tutor.language as TutorConfig["language"],
    };
    const overrides = buildTutorOverrides(tutorConfig);

    const res = await tokenPromise;
    if (!res.ok) {
      throw new Error(`Failed to mint ElevenLabs conversation token: ${res.status}`);
    }
    const body = (await res.json()) as { token: string };

    return { conversationToken: body.token, overrides, childId, tutorId: tutor.id };
  });
