import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { consume, LIMITS } from "@/lib/rate-limit";
import { entryPassQuote } from "@/lib/pricing";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * POST /api/pass/checkout
 *
 * Buys the festival pass on its own, during signup, with no club event
 * attached. Same three outcomes as /api/registrations — free, razorpay, or
 * manual_upi — decided by settings.payment_mode plus whether Razorpay keys
 * exist, so this works before and after KYC with no code change.
 *
 * No migration needed: create_checkout already has a branch for exactly this
 * shape. p_event_ids of {} with p_needs_entry true writes a payment of type
 * 'entry_pass' and one registration against r4r-entry-pass.
 *
 * Like everywhere else, the body carries no amount. The price is read from
 * settings server-side (lib/pricing.ts).
 */
export async function POST() {
  try {
    const user = await requireUser();
    await consume(`pass:${user.id}`, LIMITS.registerPerUser);

    const admin = createAdminClient();

    const { data: settings } = await admin
      .from("settings")
      .select("registration_open, payment_mode, upi_id, upi_payee_name")
      .eq("id", true)
      .single();

    if (!settings?.registration_open) {
      throw Object.assign(new Error("Registration is currently closed."), {
        status: 403,
      });
    }

    /**
     * The gate needs a phone number — it is the fallback when a QR will not
     * scan. In the signup flow the details step has just run, so this should
     * never fire; it exists because this route is reachable on its own.
     */
    if (!user.phone) {
      throw Object.assign(new Error("Complete your profile details first."), {
        status: 409,
        code: "PROFILE_INCOMPLETE",
      });
    }

    const pass = await entryPassQuote({ userId: user.id, isUai: user.isUai });

    /**
     * Already holds one. Answered as a normal result rather than an error,
     * because the pass step calls this on mount to decide whether to show
     * itself at all — and "you already have it" is a success, not a failure.
     */
    if (pass.alreadyHeld) {
      return ok({ status: "already_held", amountInr: 0 });
    }

    const useRazorpay =
      pass.amountInr > 0 &&
      settings.payment_mode !== "manual_upi" &&
      razorpayConfigured();

    const method =
      pass.amountInr === 0 ? "free" : useRazorpay ? "razorpay" : "manual_upi";

    const { data, error } = await admin.rpc("create_checkout", {
      p_user_id: user.id,
      // Empty on purpose — this is the pass and nothing else.
      p_event_ids: [],
      p_amount_inr: pass.amountInr,
      p_method: method,
      p_needs_entry: true,
      p_entry_inr: pass.amountInr,
    });

    if (error) {
      // Should be unreachable given the alreadyHeld check above, but a race
      // between two tabs can still land here.
      if (error.message.includes("ALREADY_REGISTERED")) {
        return ok({ status: "already_held", amountInr: 0 });
      }
      throw error;
    }

    const paymentId = data?.[0]?.payment_id as string;

    // ── Comped (organisers) — confirmed on the spot ──────────────────────────
    if (pass.amountInr === 0) {
      return ok({ status: "confirmed", paymentId, amountInr: 0 });
    }

    // ── Razorpay ─────────────────────────────────────────────────────────────
    if (useRazorpay) {
      const order = await createOrder({
        amountInr: pass.amountInr,
        receipt: paymentId,
        notes: { paymentId, userId: user.id, kind: "entry_pass" },
      });

      await admin
        .from("payments")
        .update({ razorpay_order_id: order.id })
        .eq("id", paymentId);

      return ok({
        status: "razorpay",
        paymentId,
        amountInr: pass.amountInr,
        order: {
          id: order.id,
          amount: order.amount, // paise
          currency: order.currency,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        },
      });
    }

    // ── Manual UPI ───────────────────────────────────────────────────────────
    return ok({
      status: "manual_upi",
      paymentId,
      amountInr: pass.amountInr,
      upi: {
        id: settings.upi_id,
        payeeName: settings.upi_payee_name,
        amountInr: pass.amountInr,
        note: `R4R ${paymentId.slice(0, 8)}`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
