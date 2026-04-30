import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_PUBLISHABLE_KEY env vars",
  );
}

export const admin: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SERVICE_ROLE,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Create an anon client signed in as the given access token (RLS as that user). */
export function userClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AdHocUser {
  userId: string;
  email: string;
  password: string;
  accessToken: string;
}

/** Create a confirmed auth user via admin API and sign in to get an access token. */
export async function createAdHocUser(prefix: string): Promise<AdHocUser> {
  const email = `${prefix}-${crypto.randomUUID()}@kidcoin.test`;
  const password = `Pwd_${crypto.randomUUID().slice(0, 12)}`;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created.user) {
    throw new Error(`createUser failed: ${cErr?.message}`);
  }
  // Sign in via anon client to obtain an access token
  const anon = createClient<Database>(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signed, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (sErr || !signed.session) {
    throw new Error(`signIn failed: ${sErr?.message}`);
  }
  return {
    userId: created.user.id,
    email,
    password,
    accessToken: signed.session.access_token,
  };
}

/** Delete an auth user by id (cascades through user_roles via FKs/cleanup logic). */
export async function deleteUser(userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

/** Hard-delete a household and everything that references it (service role). */
export async function purgeHousehold(householdId: string): Promise<void> {
  await admin.from("transactions").delete().eq("household_id", householdId);
  await admin.from("tasks").delete().eq("household_id", householdId);
  await admin.from("child_profiles").delete().eq("household_id", householdId);
  await admin.from("user_roles").delete().eq("household_id", householdId);
  await admin.from("households").delete().eq("id", householdId);
}