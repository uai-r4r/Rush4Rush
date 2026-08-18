import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client, bound to the request's cookies.
 * Still the anon key, so RLS still applies — this is the client to use for
 * anything acting *as the signed-in user*.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      /**
       * @supabase/ssr defaults to PKCE. That is correct for OAuth redirects,
       * where the server needs to exchange a code it received in a URL — but
       * we never do OAuth. We verify a 6-digit code server-side.
       *
       * Under PKCE the emailed OTP is stored as `pkce_<hash>`, and verifying a
       * plain 6-digit code against it fails with `otp_expired` even though the
       * code is perfectly valid and seconds old. Implicit flow stores the
       * token in the plain form verifyOtp() actually looks for.
       *
       * Nothing is lost: for email and phone OTPs, PKCE and implicit behave
       * identically — the session comes back in the response body, and
       * @supabase/ssr still persists it to httpOnly cookies below.
       */
      auth: { flowType: "implicit" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which cannot set cookies.
            // Safe to ignore: middleware.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
