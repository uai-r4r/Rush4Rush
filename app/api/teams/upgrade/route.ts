import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";

export const runtime = "nodejs";

/**
 * POST /api/teams/upgrade   { teamId, newSize }
 *
 * Grow a team that has already paid, by paying the difference.
 *
 * Two people paid the 2-person rate, a third turns up — rather than telling
 * them no, charge the gap between the 2-size and 3-size price.
 *
 * The extra seat does NOT exist until the payment confirms: the new capacity
 * rides on payments.team_capacity and is applied by confirm_payment(). Setting
 * it here would let someone open checkout, close it, and keep the seat.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const teamId = String(body.teamId ?? "");
    const newSize = Number(body.newSize);

    if (!/^[0-9a-f-]{36}$/i.test(teamId) || !Number.isInteger(newSize)) {
      throw Object.assign(new Error("Invalid request"), { status: 400 });
    }

    const admin = createAdminClient();

    const { data: team } = await admin
      .from("teams")
      .select("id, event_id, leader_id, capacity, events(name, max_team_size)")
      .eq("id", teamId)
      .maybeSingle();

    if (!team) throw Object.assign(new Error("Team not found"), { status: 404 });

    // Only the leader can grow the team — they are the one who paid.
    if (team.leader_id !== user.id) {
      throw Object.assign(new Error("Only the team leader can add members."), { status: 403 });
    }

    const event = team.events as unknown as { name: string; max_team_size: number };

    if (newSize <= team.capacity) {
      throw Object.assign(new Error("That team already has room."), { status: 400 });
    }
    if (newSize > event.max_team_size) {
      throw Object.assign(
        new Error(`${event.name} allows at most ${event.max_team_size} per team.`),
        { status: 400 },
      );
    }

    // Difference between what they paid for and what they want. Both sides come
    // from team_fee() server-side — the client never names a price.
    const [{ data: oldFee }, { data: newFee }] = await Promise.all([
      admin.rpc("team_fee", { p_event_id: team.event_id, p_size: team.capacity }),
      admin.rpc("team_fee", { p_event_id: team.event_id, p_size: newSize }),
    ]);

    const difference = Math.max(0, (newFee ?? 0) - (oldFee ?? 0));

    const { data: settings } = await admin
      .from("settings")
      .select("payment_mode, upi_id, upi_payee_name")
      .eq("id", true)
      .single();

    const useRazorpay =
      difference > 0 && settings?.payment_mode !== "manual_upi" && razorpayConfigured();

    const { data: payment, error } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        type: "event",
        method: difference === 0 ? "free" : useRazorpay ? "razorpay" : "manual_upi",
        status: difference === 0 ? "paid" : useRazorpay ? "created" : "pending_review",
        amount_inr: difference,
        team_id: teamId,
        team_capacity: newSize,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Nothing to pay — apply immediately.
    if (difference === 0) {
      await admin.rpc("confirm_payment", { p_payment_id: payment.id });
      return ok({ status: "confirmed", capacity: newSize, amountInr: 0 });
    }

    if (useRazorpay) {
      const order = await createOrder({
        amountInr: difference,
        receipt: payment.id,
        notes: { paymentId: payment.id, teamId, newSize: String(newSize) },
      });

      await admin
        .from("payments")
        .update({ razorpay_order_id: order.id })
        .eq("id", payment.id);

      return ok({
        status: "razorpay",
        paymentId: payment.id,
        amountInr: difference,
        newSize,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        },
      });
    }

    return ok({
      status: "manual_upi",
      paymentId: payment.id,
      amountInr: difference,
      newSize,
      upi: {
        id: settings?.upi_id ?? null,
        payeeName: settings?.upi_payee_name ?? null,
        amountInr: difference,
        note: `R4R ${payment.id.slice(0, 8)}`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
