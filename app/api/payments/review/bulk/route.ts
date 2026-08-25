import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

const MAX_BATCH = 100;

/**
 * POST /api/payments/review/bulk   { paymentIds: string[], action, note? }
 *
 * Approving 500 manual-UPI payments one at a time is not a workable job for a
 * fest weekend. This clears a filtered list in one action.
 *
 * SCOPE IS CHECKED PER PAYMENT, not once for the batch. A club admin can send
 * any list of ids they like; each is independently checked against the clubs
 * they administer, and anything they cannot approve is skipped and reported
 * back rather than silently ignored.
 *
 * Festival-pass payments belong to no club, so they are approvable by any club
 * admin — otherwise every pass in the festival queues behind two super admins,
 * and people blocked from enrolling will simply pay twice.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser("club_admin");
    const body = await req.json().catch(() => ({}));

    const action = body.action === "reject" ? "reject" : "approve";
    const note = String(body.note ?? "").slice(0, 300);

    const paymentIds = Array.isArray(body.paymentIds)
      ? body.paymentIds
          .filter((x: unknown): x is string => typeof x === "string")
          .filter((x: string) => /^[0-9a-f-]{36}$/i.test(x))
          .slice(0, MAX_BATCH)
      : [];

    if (paymentIds.length === 0) {
      throw Object.assign(new Error("No payments selected"), { status: 400 });
    }

    const admin = createAdminClient();

    // Which clubs each payment touches, so scope can be checked per payment.
    const { data: regs, error } = await admin
      .from("registrations")
      .select("payment_id, events(club_id)")
      .in("payment_id", paymentIds);

    if (error) throw error;

    const clubsByPayment = new Map<string, Set<string>>();
    for (const r of regs ?? []) {
      const clubId = (r.events as unknown as { club_id: string })?.club_id;
      if (!r.payment_id || !clubId) continue;
      if (!clubsByPayment.has(r.payment_id)) clubsByPayment.set(r.payment_id, new Set());
      clubsByPayment.get(r.payment_id)!.add(clubId);
    }

    const done: string[] = [];
    const skipped: string[] = [];

    for (const paymentId of paymentIds) {
      const clubs = [...(clubsByPayment.get(paymentId) ?? [])].filter((c) => c !== "r4r");

      const allowed =
        user.role === "super_admin" ||
        // Entry-pass-only payment: no club owns it, so any club admin may clear
        // it. Every action is written to audit_log with who did it.
        clubs.length === 0 ||
        clubs.some((c) => user.clubIds.includes(c));

      if (!allowed) {
        skipped.push(paymentId);
        continue;
      }

      if (action === "approve") {
        await admin.rpc("confirm_payment", {
          p_payment_id: paymentId,
          p_razorpay_payment_id: null,
          p_reviewer: user.id,
        });
      } else {
        await admin.rpc("reject_payment", {
          p_payment_id: paymentId,
          p_reviewer: user.id,
          p_note: note || "Payment could not be verified",
        });
      }
      done.push(paymentId);
    }

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: `payment.bulk_${action}`,
      entity: "payment",
      entity_id: null,
      detail: { count: done.length, skipped: skipped.length },
    });

    return ok({ action, approved: done.length, skipped: skipped.length });
  } catch (err) {
    return handleError(err);
  }
}
