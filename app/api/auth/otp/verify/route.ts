import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError, normaliseEmail } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

/**
 * POST /api/auth/otp/verify   { email, code }
 *
 * On success Supabase sets the session cookies via @supabase/ssr — httpOnly,
 * secure, sameSite=lax. httpOnly is what stops any injected script from
 * reading the token; the browser sends it but JS cannot see it.
 *
 * Session length is configured in the Supabase dashboard, not here. Set the
 * refresh token to ~90 days so someone who registers in August is still signed
 * in at the gate in September — that single setting is what keeps your OTP
 * email volume near zero on fest morning.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normaliseEmail(body.email);
    const code = String(body.code ?? "").replace(/\D/g, "");

    if (code.length !== 6) {
      throw Object.assign(new Error("Enter the 6-digit code"), { status: 400 });
    }

    await consume(`otp:verify:${email}`, LIMITS.otpVerifyPerEmail);

    const admin = createAdminClient();

    // Lockout check. Six digits is a million combinations — cheap to script
    // without this, and the rate limiter alone only slows it down.
    const { data: attempt } = await admin
      .from("otp_attempts")
      .select("fail_count, locked_until")
      .eq("email", email)
      .maybeSingle();

    if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
      throw Object.assign(
        new Error("Too many wrong codes. Request a new one in a few minutes."),
        { status: 429 },
      );
    }

    const supabase = await createClient();

    /**
     * Supabase issues a different token depending on which email it sent, and
     * each only verifies under a matching `type`:
     *
     *   never-confirmed account → "Confirm signup" email → type: "signup"
     *   confirmed account       → "Magic Link" email     → type: "magiclink"
     *
     * Guessing by trying each in turn is unsafe: a failed attempt can burn the
     * token, so the wrong first guess kills a code that was actually valid.
     * Instead, look at email_confirmed_at — that IS the discriminator, and it
     * tells us exactly which email Supabase just sent.
     */
    const { data: authLookup } = await admin.auth.admin.listUsers();
    const existing = authLookup?.users.find(
      (u) => u.email?.toLowerCase() === email,
    );
    const primaryType = existing?.email_confirmed_at ? "magiclink" : "signup";

    let result = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: primaryType,
    });

    // One fallback for the plain email-OTP case, only if the token survived.
    if (result.error && result.error.code !== "otp_expired") {
      result = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    }

    const { data, error } = result;

    if (error || !data.user) {
      console.error("[otp:verify] failed", { primaryType, code: error?.code, message: error?.message });
      const fails = (attempt?.fail_count ?? 0) + 1;
      await admin.from("otp_attempts").upsert({
        email,
        fail_count: fails,
        last_fail_at: new Date().toISOString(),
        locked_until:
          fails >= MAX_FAILS
            ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
            : null,
        updated_at: new Date().toISOString(),
      });

      throw Object.assign(
        new Error(
          fails >= MAX_FAILS
            ? "Too many wrong codes. Request a new one in a few minutes."
            : "That code isn't right. Check it and try again.",
        ),
        { status: 401 },
      );
    }

    await admin
      .from("otp_attempts")
      .upsert({ email, fail_count: 0, locked_until: null, updated_at: new Date().toISOString() });

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, phone, college, is_uai, role")
      .eq("id", data.user.id)
      .single();

    // needsDetails drives the frontend: brand-new users go to Step 3, returning
    // users skip straight in. One flow, two outcomes.
    return ok({
      userId: data.user.id,
      needsDetails: !profile?.full_name || !profile?.phone,
      isUai: profile?.is_uai ?? false,
      role: profile?.role ?? "attendee",
    });
  } catch (err) {
    return handleError(err);
  }
}
