import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTutorOverrides, type TutorConfig } from "@/lib/tutors";

const InputSchema = z.object({
  tutorId: z.string().uuid(),
  childId: z.string().uuid().optional(),
});

const SIGNED_URL_ENDPOINT = "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";

/**
 * Mints a short-lived (15 min) signed WebSocket URL for a live tutor session.
 * Mirrors `src/server/create-child.ts`: RLS-scoped role check, then a
 * privileged call using a server-only secret that never reaches the browser.
 */
export const mintTutorSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError || !roleRow) {
      throw new Error("Forbidden: no role found for user");
    }

    // RLS on `tutors` already scopes this to the caller's household.
    const { data: tutor, error: tutorError } = await supabase
      .from("tutors")
      .select("id, name, subject, topic, personality, voice_id, active")
      .eq("id", data.tutorId)
      .maybeSingle();

    if (tutorError || !tutor) {
      throw new Error("Tutor not found");
    }
    if (!tutor.active) {
      throw new Error("Tutor is not active");
    }

    let childId: string;
    if (roleRow.role === "child") {
      const { data: childProfile, error: childError } = await supabase
        .from("child_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (childError || !childProfile) {
        throw new Error("Child profile not found");
      }
      childId = childProfile.id;
    } else if (roleRow.role === "parent") {
      if (!data.childId) {
        throw new Error("childId is required when a parent starts a tutor session");
      }
      // RLS on `child_profiles` scopes this to the caller's household.
      const { data: childProfile, error: childError } = await supabase
        .from("child_profiles")
        .select("id")
        .eq("id", data.childId)
        .maybeSingle();
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
    };
    const overrides = buildTutorOverrides(tutorConfig);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey || !agentId) {
      throw new Error("Missing ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID env vars");
    }

    const res = await fetch(`${SIGNED_URL_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`, {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) {
      throw new Error(`Failed to mint ElevenLabs signed URL: ${res.status}`);
    }
    const body = (await res.json()) as { signed_url: string };

    return { signedUrl: body.signed_url, overrides, childId, tutorId: tutor.id };
  });
