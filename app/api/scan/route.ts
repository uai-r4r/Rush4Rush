import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { consume, LIMITS } from "@/lib/rate-limit";
import { verifyTicketToken } from "@/lib/tickets";

export const runtime = "nodejs";

/**
 * POST /api/scan   { token, eventId? }
 *
 * Returns exactly one of three verdicts for the volunteer:
 *   OK             → green, name + event, already checked in by this call
 *   ALREADY_USED   → amber, with the time of the first entry
 *   INVALID        → red
 *
 * ALREADY_USED is the whole point of the system. A ticket screenshot forwarded
 * to five friends looks identical to the real thing; the second scan is what
 * catches it. Which is also why the check-in has to happen server-side and
 * atomically — see check_in_registration() in 0002_functions.sql.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser("volunteer");
    await consume(`scan:${user.id}`, LIMITS.scanPerUser);

    const body = await req.json().catch(() => ({}));
    const registrationId = verifyTicketToken(body.token);

    if (!registrationId) {
      return ok({ result: "INVALID", reason: "BAD_TOKEN" });
    }

    const admin = createAdminClient();

    // Optional gate-vs-door scoping: the fest entrance scans the entry pass,
    // each club scans its own event. Same page, different selection.
    if (typeof body.eventId === "string" && body.eventId) {
      const { data: reg } = await admin
        .from("registrations")
        .select("event_id, events(name)")
        .eq("id", registrationId)
        .maybeSingle();

      if (!reg) return ok({ result: "INVALID", reason: "NOT_FOUND" });

      if (reg.event_id !== body.eventId) {
        return ok({
          result: "INVALID",
          reason: "WRONG_EVENT",
          ticketFor: (reg.events as unknown as { name: string })?.name,
        });
      }
    }

    const { data, error } = await admin.rpc("check_in_registration", {
      reg_id: registrationId,
      scanner_id: user.id,
    });

    if (error) throw error;

    const row = data?.[0];
    if (!row) return ok({ result: "INVALID", reason: "NOT_FOUND" });

    if (row.ok) {
      return ok({
        result: "OK",
        attendeeName: row.attendee_name,
        eventName: row.event_name,
      });
    }

    return ok({
      // ALREADY_TODAY is the gate pass being re-scanned on the same day — same
      // amber "already in" treatment, not a red INVALID.
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
