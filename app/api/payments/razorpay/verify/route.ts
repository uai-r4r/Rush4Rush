import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { verifyPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * POST /api/payments/razorpay/verify
 * { razorpayOrderId, razorpayPaymentId, signature }
 *
 * Called by the Razorpay checkout handler in the browser.
 *
 * THIS IS THE FUNCTION THAT DECIDES WHETHER SOMEONE PAID. The browser is not
 * a trustworthy narrator — without the signature check, a hand-crafted POST
 * saying "success" registers for free. The signature is HMAC(order|payment)
 * with a secret only Razorpay and your server hold.
 *
 * The webhook is still the authority (see ./webhook). This route exists so the
 * user sees their ticket immediately instead of waiting on webhook delivery.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const razorpayOrderId = String(body.razorpayOrderId ?? "");
    const razorpayPaymentId = String(body.razorpayPaymentId ?? "");
    const signature = String(body.signature ?? "");

    if (!razorpayOrderId || !razorpayPaymentId || !signature) {
      throw Object.assign(new Error("Incomplete payment response"), { status: 400 });
    }

    const valid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature,
    });

    const admin = createAdminClient();

    if (!valid) {
      // Log loudly. A failed signature is either a broken integration or
      // somebody probing — both are worth waking up for.
      console.error("[razorpay] BAD SIGNATURE", { razorpayOrderId, user: user.id });
      await admin.from("audit_log").insert({
        actor_id: user.id,
        action: "payment.signature_failed",
        entity: "payment",
        entity_id: razorpayOrderId,
      });
      throw Object.assign(new Error("Payment could not be verified."), { status: 400 });
    }

    // Ownership check: the order must belong to the caller. Otherwise a valid
    // signature from someone else's payment could confirm your registration.
    const { data: payment } = await admin
      .from("payments")
      .select("id, user_id, status")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (!payment || payment.user_id !== user.id) {
      throw Object.assign(new Error("Payment not found."), { status: 404 });
    }

    await admin.rpc("confirm_payment", {
      p_payment_id: payment.id,
      p_razorpay_payment_id: razorpayPaymentId,
    });

    return ok({ status: "confirmed", paymentId: payment.id });
  } catch (err) {
    return handleError(err);
  }
}
