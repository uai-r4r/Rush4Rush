import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES ALL RLS.
 *
 * Rules:
 *   1. Never import this into a file with "use client".
 *   2. Never import it into a Server Component that renders user content.
 *   3. Only use it in API route handlers, after you have checked who is asking.
 *
 * If SUPABASE_SERVICE_ROLE_KEY ever reaches the browser, every policy in
 * 0003_rls.sql is void and your whole registration list is public. Treat it
 * like the Razorpay secret.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
