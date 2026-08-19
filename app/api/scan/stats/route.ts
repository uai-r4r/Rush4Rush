import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * GET /api/scan/stats?eventId=...
 *
 * Live door numbers for the selected event: how many are in, out of how many
 * are expected. A session counter that resets on reload tells a volunteer
 * nothing — and at a gate, "142 of 300" is the number someone will actually
 * ask for.
 *
 * For the festival pass this counts TODAY's entries, since that pass admits
 * once per day. For a club event it counts entries ever, which is the same
 * thing there.
 */
export async function GET(req: Request) {
  try {
    await requireUser("volunteer");

    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) throw Object.assign(new Error("No event selected"), { status: 400 });

    const admin = createAdminClient();

    const { data: event } = await admin
      .from("events")
      .select("is_entry_pass")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) throw Object.assign(new Error("Event not found"), { status: 404 });

    // Expected = confirmed registrations. Pending ones have not paid, so they
    // are not people the door should be waiting for.
    const { count: expected } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    let inside = 0;

    if (event.is_entry_pass) {
      // Today only — yesterday's entries are not in the room now.
      const today = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      )
        .toISOString()
        .slice(0, 10);

      const { data: rows } = await admin
        .from("check_ins")
        .select("registration_id, registrations!inner(event_id)")
        .eq("scan_date", today)
        .eq("registrations.event_id", eventId);

      inside = new Set((rows ?? []).map((r) => r.registration_id)).size;
    } else {
      const { count } = await admin
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .not("checked_in_at", "is", null);
      inside = count ?? 0;
    }

    return ok({ inside, expected: expected ?? 0, isEntryPass: event.is_entry_pass });
  } catch (err) {
    return handleError(err);
  }
}
