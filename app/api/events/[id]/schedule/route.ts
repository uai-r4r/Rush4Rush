import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser, requireClub } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * PATCH /api/events/:id/schedule
 * { day?, startTime?, endTime?, venue? }
 *
 * Lets a club admin move their own slot, with everyone's schedule page
 * updating to match. Three things guard it:
 *
 *  1. OWNERSHIP — requireClub() plus the RLS policy on events. A club admin
 *     can only touch their own club's rows.
 *
 *  2. VENUE CLASH — two clubs will try to move into the same room at the same
 *     hour. Catching it here beats finding out at 10am on day one.
 *
 *  3. FREEZE — settings.schedule_frozen locks edits for everyone but the super
 *     admin. Set it once the schedule goes to print, or someone will shift
 *     their slot the night before and the printed copy will be wrong.
 *
 * Every change is written to audit_log. When a club insists they never moved
 * their slot, that's the record.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser("club_admin");
    const { id: eventId } = await params;

    const admin = createAdminClient();

    const { data: event } = await admin
      .from("events")
      .select("id, club_id, name, day, start_time, end_time, venue")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) throw Object.assign(new Error("Event not found"), { status: 404 });

    requireClub(user, event.club_id);

    const { data: settings } = await admin
      .from("settings")
      .select("schedule_frozen")
      .eq("id", true)
      .single();

    if (settings?.schedule_frozen && user.role !== "super_admin") {
      throw Object.assign(
        new Error(
          "The schedule is locked ahead of the fest. Contact the core team to make a change.",
        ),
        { status: 423 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const day = body.day == null ? event.day : Number(body.day);
    const startTime = body.startTime == null ? event.start_time : String(body.startTime).slice(0, 5);
    const endTime = body.endTime == null ? event.end_time : String(body.endTime).slice(0, 5);
    const venue = body.venue == null ? event.venue : String(body.venue).trim().slice(0, 120);

    if (day !== 1 && day !== 2) {
      throw Object.assign(new Error("Day must be 1 or 2"), { status: 400 });
    }
    if (!TIME.test(startTime) || !TIME.test(endTime)) {
      throw Object.assign(new Error("Times must be in HH:MM format"), { status: 400 });
    }
    if (endTime <= startTime) {
      throw Object.assign(new Error("End time must be after the start time"), { status: 400 });
    }
    if (!venue) {
      throw Object.assign(new Error("Venue is required"), { status: 400 });
    }

    const { data: clashes } = await admin.rpc("find_venue_clash", {
      target_event: eventId,
      target_venue: venue,
      target_day: day,
      target_start: startTime,
      target_end: endTime,
    });

    if (clashes?.length) {
      const c = clashes[0];
      throw Object.assign(
        new Error(
          `${venue} is already booked on Day ${day} — ${c.name} runs ${String(c.start_time).slice(0, 5)}–${String(c.end_time).slice(0, 5)}.`,
        ),
        { status: 409 },
      );
    }

    const { error } = await admin
      .from("events")
      .update({ day, start_time: startTime, end_time: endTime, venue })
      .eq("id", eventId);

    if (error) throw error;

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "event.reschedule",
      entity: "event",
      entity_id: eventId,
      detail: {
        from: {
          day: event.day,
          start: event.start_time,
          end: event.end_time,
          venue: event.venue,
        },
        to: { day, start: startTime, end: endTime, venue },
      },
    });

    // Without this the schedule page keeps serving the cached version and the
    // edit appears to have done nothing. Statically-generated pages do not
    // notice database writes on their own.
    revalidatePath("/schedule");
    revalidatePath("/events");

    return ok({ id: eventId, day, startTime, endTime, venue });
  } catch (err) {
    return handleError(err);
  }
}
