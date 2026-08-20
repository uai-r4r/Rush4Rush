import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError, clientIp, normaliseEmail } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const UAI_DOMAIN = "@universalai.in";

/**
 * POST /api/auth/otp/send   { email, path: "uai" | "guest" }
 *
 * Sends a 6-digit login code. Supabase generates and stores it (hashed, in the
 * auth schema); Resend carries the mail via the SMTP settings on the project.
 *
 * Same endpoint for login and register — with OTP there is no difference. If
 * the address is new a user is created on verify; if not they just sign in.
 * That collapses two flows into one and removes the "account already exists"
 * dead end entirely.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normaliseEmail(body.email);
    const path = body.path === "uai" ? "uai" : "guest";
    const ip = clientIp(req);

    // Rate limit BEFORE sending. Per-email stops inbox spam, per-IP stops one
    // script cycling through addresses to burn the daily quota.
    await consume(`otp:send:email:${email}`, LIMITS.otpSendPerEmail);
    await consume(`otp:send:ip:${ip}`, LIMITS.otpSendPerIp);

    // The domain check is the entire UAI verification. Owning an address at
    // the college domain IS being a student — no ID upload, no manual review.
    const isUaiEmail = email.endsWith(UAI_DOMAIN);

    if (path === "uai" && !isUaiEmail) {
      return handleError(
        Object.assign(
          new Error(
            `Use your UAI college email (${UAI_DOMAIN}) to register as a student. Not a UAI student? Go back and choose the other option.`,
          ),
          { status: 400 },
        ),
      );
    }

    // Guard the reverse too: a college address must not slip through the guest
    // path, or a student pays ₹100 they don't owe.
    if (path === "guest" && isUaiEmail) {
      return handleError(
        Object.assign(
          new Error(
            "That's a UAI email — go back and choose the student option, no entry fee needed.",
          ),
          { status: 400 },
        ),
      );
    }

    // Clear any brute-force lock left over from a previous session.
    const admin = createAdminClient();
    await admin.from("otp_attempts").upsert({
      email,
      fail_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      console.error("[otp:send]", error.message);
      // Deliberately vague. A distinguishable "no such user" response turns
      // this endpoint into an account-enumeration oracle.
      return handleError(
        Object.assign(new Error("Could not send the code. Please try again."), {
          status: 502,
        }),
      );
    }

    return ok({ sent: true, isUai: isUaiEmail });
  } catch (err) {
    return handleError(err);
  }
}
