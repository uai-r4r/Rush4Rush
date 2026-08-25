import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser, requireClub } from "@/lib/auth-server";
import { sendPaymentRejected } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/payments/review/:id   { action: "approve" | "reject", note? }
 *
 * The club admin's Verify / Reject buttons for UPI screenshots.
 *
 * Authorisation is two-layered: club_admin or above to reach the route at all,
 * then requireClub() to confirm this admin owns one of the events the payment
 * covers. Without the second check any club admin could approve any payment
 * in the fest.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser("club_admin");
    const { id: paymentId } = await params;

    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) {
      throw Object.assign(new Error("Invalid payment reference"), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === "reject" ? "reject" : "approve";
    const note = String(body.note ?? "").slice(0, 300);

    const admin = createAdminClient();

    // Which clubs does this payment touch?
    const { data: regs } = await admin
      .from("registrations")
      .select("id, events(club_id, name)")
      .eq("payment_id", paymentId);

    if (!regs?.length) {
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    }

    const clubIds = regs
      .map((r) => (r.events as unknown as { club_id: string }).club_id)
      .filter((c) => c !== "r4r"); // entry pass belongs to the fest, not a club

    /**
     * Festival pass payments belong to no club, so club scoping cannot apply.
     * Approval is limited to super admins plus anyone flagged
     * can_approve_passes — a narrower permission that does NOT grant
     * cross-club data, schedule edits or comped fees.
     *
     * Spreading this matters on the manual UPI path: a pending pass blocks
     * enrolling AND joining a team, so a backlog makes the whole site look
     * broken to someone who has already paid.
     */
    if (clubIds.length === 0) {
      const { data: allowed } = await admin.rpc("user_can_approve_pass", {
        p_user_id: user.id,
      });

      if (!allowed) {
        throw Object.assign(
          new Error("Festival pass payments are reviewed by the core team."),
          { status: 403 },
        );
      }
    } else {
      requireClub(user, clubIds[0]);
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

      const { data: payment } = await admin
        .from("payments")
        .select("profiles(email)")
        .eq("id", paymentId)
        .single();

      const email = (payment?.profiles as unknown as { email: string } | null)?.email;
      const eventName =
        (regs[0].events as unknown as { name: string }).name ?? "your event";

      if (email) {
        await sendPaymentRejected(email, eventName, note || "Payment could not be verified");
      }
    }

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: `payment.${action}`,
      entity: "payment",
      entity_id: paymentId,
      detail: { note },
    });

    return ok({ action });
  } catch (err) {
    return handleError(err);
  }
}
