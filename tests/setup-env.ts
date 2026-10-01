import { loadEnv } from "vite";

// Vitest doesn't put .env values on process.env by itself (Vite only exposes VITE_*
// vars to app code), but tests/helpers/supabase.ts reads SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY / SUPABASE_PUBLISHABLE_KEY from process.env at import
// time. This runs in each worker before any test file is imported. Variables already
// set in the shell/CI are left alone, so they still take precedence over .env.
const fileEnv = loadEnv("test", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
