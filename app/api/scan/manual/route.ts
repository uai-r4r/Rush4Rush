import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { consume, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/scan/manual   { registrationId }
 *
 * Check someone in without a QR — the escape hatch for a cracked screen, a
 * dead battery, or a ticket that simply won't load. Reached via the
 * phone-number lookup on the scanner page.
 *
 * Uses the SAME check_in_registration() function as the QR path, so the
 * one-scan-only guarantee holds identically: a ticket already used by QR
 * cannot then be waved through manually, and vice versa. Two doors into one
 * atomic update, not two parallel systems that can disagree.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser("volunteer");
    await consume(`scan:${user.id}`, LIMITS.scanPerUser);

    const body = await req.json().catch(() => ({}));
    const registrationId = String(body.registrationId ?? "");

    if (!/^[0-9a-f-]{36}$/i.test(registrationId)) {
      throw Object.assign(new Error("Invalid registration reference"), { status: 400 });
    }

    const admin = createAdminClient();

    // scanner_id is passed explicitly rather than read from auth.uid(), so this
    // works correctly through the service-role client.
    const { data, error } = await admin.rpc("check_in_registration", {
      reg_id: registrationId,
      scanner_id: user.id,
    });

    if (error) throw error;

    const row = data?.[0];
    if (!row) return ok({ result: "INVALID", reason: "NOT_FOUND" });

    // Manual check-ins are logged with who did it. If a dispute comes up about
    // someone getting in without a valid ticket, this is the record.
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "checkin.manual",
      entity: "registration",
      entity_id: registrationId,
      detail: { result: row.reason },
    });

    if (row.ok) {
      return ok({
        result: "OK",
        attendeeName: row.attendee_name,
        eventName: row.event_name,
      });
    }

    return ok({
      result:
        row.reason === "ALREADY_USED" || row.reason === "ALREADY_TODAY"
          ? "ALREADY_USED"
          : "INVALID",
      reason: row.reason,
      attendeeName: row.attendee_name,
      eventName: row.event_name,
      alreadyAt: row.already_at,
    });
  } catch (err) {
    return handleError(err);
  }
}
