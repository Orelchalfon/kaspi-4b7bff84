import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().min(1).max(100),
});

export const createChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    // Verify caller is a parent and get their household
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role, household_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError || !roleRow || roleRow.role !== "parent") {
      throw new Response("Forbidden: only parents can create children", {
        status: 403,
      });
    }

    const householdId = roleRow.household_id;

    // 1. Create the child auth user (auto-confirmed) using admin client
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

    if (createErr || !created.user) {
      console.error("Child account creation failed:", createErr);
      throw new Response("Failed to create child account", { status: 400 });
    }

    const childUserId = created.user.id;

    // 2. Insert the child role (bypasses RLS via admin)
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: childUserId,
        role: "child",
        household_id: householdId,
      });

    if (roleInsertErr) {
      // rollback the auth user
      await supabaseAdmin.auth.admin.deleteUser(childUserId);
      console.error("Child role insert failed:", roleInsertErr);
      throw new Response("Failed to set child role", { status: 500 });
    }

    // 3. Insert the child profile
    const { error: profileErr } = await supabaseAdmin
      .from("child_profiles")
      .insert({
        user_id: childUserId,
        household_id: householdId,
        display_name: data.displayName,
      });

    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(childUserId);
      console.error("Child profile creation failed:", profileErr);
      throw new Response("Failed to create child profile", { status: 500 });
    }

    return { success: true, childUserId };
  });
