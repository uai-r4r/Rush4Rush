import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { consume, LIMITS } from "@/lib/rate-limit";
import { quote } from "@/lib/pricing";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * POST /api/registrations   { eventIds: string[] }
 *
 * The one entry point for enrolling. Returns either a Razorpay order to open
 * the checkout with, or a manual-UPI instruction, or an immediate confirmation
 * when the total is ₹0.
 *
 * Note what the request body does NOT contain: an amount. Prices come from
 * events.fee_inr every time (lib/pricing.ts). The client picks events; the
 * server decides what they cost.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await consume(`register:${user.id}`, LIMITS.registerPerUser);

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

    // Profile must be complete first — a registration with no phone number is
    // useless at the gate, where phone lookup is the fallback when a QR won't
    // scan.
    if (!user.phone) {
      console.error("[registrations] 409 — profile incomplete", {
        userId: user.id,
        phone: user.phone,
        name: user.name,
      });
      throw Object.assign(new Error("Complete your profile details first."), {
        status: 409,
        code: "PROFILE_INCOMPLETE",
      });
    }

    const body = await req.json().catch(() => ({}));
    const eventIds = Array.isArray(body.eventIds)
      ? body.eventIds.filter((x: unknown): x is string => typeof x === "string")
      : [];

    const q = await quote({ userId: user.id, isUai: user.isUai, eventIds });

    const useRazorpay =
      q.totalInr > 0 &&
      settings.payment_mode !== "manual_upi" &&
      razorpayConfigured();

    const method = q.totalInr === 0 ? "free" : useRazorpay ? "razorpay" : "manual_upi";

    const { data, error } = await admin.rpc("create_checkout", {
      p_user_id: user.id,
      p_event_ids: q.items.map((i) => i.eventId),
      p_amount_inr: q.totalInr,
      p_method: method,
      p_needs_entry: q.needsEntryPass,
      p_entry_inr: q.entryPassInr,
    });

    if (error) {
      if (error.message.includes("ALREADY_REGISTERED")) {
        throw Object.assign(
          new Error("You're already registered for this event."),
          { status: 409, code: "ALREADY_REGISTERED" },
        );
      }
      throw error;
    }

    const paymentId = data?.[0]?.payment_id as string;

    // ── Free path ────────────────────────────────────────────────────────────
    if (q.totalInr === 0) {
      return ok({ status: "confirmed", paymentId, quote: q });
    }

    // ── Razorpay path ────────────────────────────────────────────────────────
    if (useRazorpay) {
      const order = await createOrder({
        amountInr: q.totalInr,
        receipt: paymentId,
        notes: { paymentId, userId: user.id },
      });

      await admin
        .from("payments")
        .update({ razorpay_order_id: order.id })
        .eq("id", paymentId);

      return ok({
        status: "razorpay",
        paymentId,
        quote: q,
        order: {
          id: order.id,
          amount: order.amount, // paise — Razorpay checkout expects paise
          currency: order.currency,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        },
      });
    }

    // ── Manual UPI fallback ──────────────────────────────────────────────────
    // Same database, same dashboard, same tickets. Only the money step differs,
    // which is why this is a real fallback and a Google Form is not.
    return ok({
      status: "manual_upi",
      paymentId,
      quote: q,
      upi: {
        id: settings.upi_id,
        payeeName: settings.upi_payee_name,
        amountInr: q.totalInr,
        note: `R4R ${paymentId.slice(0, 8)}`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

/** GET /api/registrations — the signed-in user's own registrations. */
export async function GET() {
  try {
    const user = await requireUser();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("registrations")
      .select(
        "id, status, checked_in_at, created_at, events(id, name, club_id, day, start_time, end_time, venue, is_entry_pass), payments(status, amount_inr, method)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ok({ registrations: data ?? [] });
  } catch (err) {
    return handleError(err);
  }
}
