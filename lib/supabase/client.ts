"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 *
 * Uses the ANON key only. Every query it makes is filtered by the RLS policies
 * in 0003_rls.sql — this key is safe in the browser precisely because RLS
 * assumes it will end up there.
 *
 * Session lives in a cookie written by @supabase/ssr, not localStorage. That
 * distinction is what keeps iPhone users logged in: Safari's tracking
 * prevention caps JS-written storage at 7 days, but leaves server-set cookies
 * alone.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
