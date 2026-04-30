import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  householdName: z.string().min(1).max(100),
});

/**
 * Idempotent bootstrap for a freshly-confirmed parent user:
 *  - if the user already has a role row, return it.
 *  - otherwise create the household + parent role atomically.
 *
 * Uses the admin client so we can roll back on partial failure
 * (avoiding orphan households if role insert fails).
 */
export const bootstrapParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Already bootstrapped? return existing.
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("role, household_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return { role: existing.role, householdId: existing.household_id };
    }

    // Create household
    const { data: household, error: hErr } = await supabaseAdmin
      .from("households")
      .insert({ name: data.householdName, created_by: userId })
      .select("id")
      .single();

    if (hErr || !household) {
      console.error("bootstrapParent: household insert failed", hErr);
      throw new Response("Failed to create household", { status: 500 });
    }

    // Insert role
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "parent", household_id: household.id });

    if (rErr) {
      // rollback household to avoid orphan
      await supabaseAdmin.from("households").delete().eq("id", household.id);
      console.error("bootstrapParent: role insert failed", rErr);
      throw new Response("Failed to assign role", { status: 500 });
    }

    return { role: "parent" as const, householdId: household.id };
  });