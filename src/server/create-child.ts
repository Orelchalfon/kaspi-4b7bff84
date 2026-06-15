import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(100),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now() && s >= "2000-01-01";
    }, "תאריך לידה לא תקין"),
});

/**
 * Creates a child auth account. The DB trigger `on_auth_user_created`
 * runs `handle_new_user`, which reads `role`, `household_id`, `full_name`,
 * and `birthdate` from user_metadata and creates `user_roles` + `child_profiles`
 * atomically. If the trigger fails, the auth.users insert is rolled back.
 */
export const createChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role, household_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError || !roleRow || roleRow.role !== "parent") {
      console.error("Role check failed:", { roleError, roleRow, userId });
      throw new Error("Forbidden: only parents can create children");
    }

    const householdId = roleRow.household_id;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: "child",
        household_id: householdId,
        full_name: data.displayName,
        birthdate: data.birthdate,
      },
    });

    if (createErr || !created.user) {
      console.error("Child account creation failed:", createErr);
      throw new Error(createErr?.message ?? "Failed to create child account");
    }

    return { success: true, childUserId: created.user.id };
  });
