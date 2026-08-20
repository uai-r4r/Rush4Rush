import { createHmac, timingSafeEqual } from "crypto";

/**
 * Razorpay integration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER STATUS
 *
 * The signature verification below is real and final — it is plain HMAC and
 * does not depend on your account existing. You can unit-test it today.
 *
 * createOrder() calls the live Razorpay API and therefore needs approved KYC.
 * Until then set PAYMENT_MODE=manual_upi in settings and the whole app routes
 * through the UPI QR + screenshot path instead. Nothing else has to change:
 * registrations, dashboard, tickets and check-in are identical either way.
 * Flipping `settings.payment_mode` to 'razorpay' is the entire switchover.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * KYC needs a bank account, PAN, address proof and an authorised signatory,
 * plus live Terms / Privacy / Refund / Contact pages on your real domain.
 * That is the long pole — start it before you need it.
 */

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function credentials() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) {
    throw Object.assign(
      new Error(
        "Online payment is not enabled yet. Please use the UPI option.",
      ),
      { status: 503 },
    );
  }
  return { id, secret };
}

/**
 * Creates a Razorpay order.
 *
 * amountInr is whole rupees; Razorpay works in paise, so the ×100 happens
 * here and nowhere else. The database never stores paise.
 *
 * The caller must have already computed amountInr from events.fee_inr. A
 * client-supplied amount is a free-goods bug.
 */
export async function createOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const { id, secret } = credentials();

  if (!Number.isInteger(params.amountInr) || params.amountInr <= 0) {
    throw Object.assign(new Error("Invalid amount"), { status: 400 });
  }

  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: params.amountInr * 100, // paise
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    console.error("[razorpay] order failed", res.status, await res.text());
    throw Object.assign(new Error("Could not start payment. Please try again."), {
      status: 502,
    });
  }

  return (await res.json()) as {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Verifies the checkout handshake: HMAC_SHA256(order_id|payment_id, secret).
 *
 * This is the single most important function in the payment flow. Without it,
 * anyone can POST {status:"success"} to your app and register for free — the
 * browser is not a trustworthy narrator of whether money moved.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) {
  const { secret } = credentials();
  const expected = createHmac("sha256", secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, params.signature);
}

/**
 * Verifies a webhook body against RAZORPAY_WEBHOOK_SECRET.
 *
 * The webhook is the authoritative signal, not the browser callback. If a user
 * closes the tab the instant after paying, the callback never fires but the
 * webhook still does. Treat the callback as a UX nicety and the webhook as
 * the source of truth.
 *
 * Note: this must run against the RAW request body. JSON.parse then
 * re-stringify changes the bytes and the signature will never match.
 */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
