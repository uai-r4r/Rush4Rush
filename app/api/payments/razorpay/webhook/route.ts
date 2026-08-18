import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * POST /api/payments/razorpay/webhook
 *
 * The authoritative payment signal. If a user closes the tab the instant after
 * paying, the browser callback never fires — but this does. Without it you get
 * people who are genuinely charged and have no ticket, which is the worst
 * possible failure at a gate.
 *
 * Set it up in the Razorpay dashboard → Webhooks:
 *   URL    https://<your-domain>/api/payments/razorpay/webhook
 *   Events payment.captured, payment.failed
 *
 * NOT session-authenticated — Razorpay has no cookie. The HMAC signature is
 * the authentication, which is exactly why it must be checked before anything
 * else happens, and against the RAW body (parsing and re-stringifying changes
 * the bytes and breaks the hash).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(raw, signature)) {
    console.error("[webhook] bad signature");
    return new Response("invalid signature", { status: 400 });
  }

  let event: {
    event: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;

  if (!orderId) return new Response("ok", { status: 200 });

  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (!payment) {
    // Unknown order — acknowledge anyway. A non-2xx makes Razorpay retry
    // forever on something we will never recognise.
    return new Response("ok", { status: 200 });
  }

  if (event.event === "payment.captured") {
    // confirm_payment is idempotent, which matters: Razorpay retries, and the
    // browser callback usually got here first.
    await admin.rpc("confirm_payment", {
      p_payment_id: payment.id,
      p_razorpay_payment_id: paymentId ?? null,
    });
  } else if (event.event === "payment.failed" && payment.status !== "paid") {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
  }

  await admin.from("audit_log").insert({
    action: `webhook.${event.event}`,
    entity: "payment",
    entity_id: payment.id,
    detail: { orderId, paymentId },
  });

  return new Response("ok", { status: 200 });
}
