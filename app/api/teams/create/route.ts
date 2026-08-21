import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * POST /api/teams/create   { eventId, name? }
 *
 * Called after the leader's enrolment is paid. Idempotent — calling twice
 * returns the same code rather than making a second team, because people
 * refresh and two teams for one leader would split their members.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const eventId = String(body.eventId ?? "");
    const name = String(body.name ?? "").trim().slice(0, 60) || null;
    // Capacity is what they PAID for, not the event ceiling — see 0017.
    const capacity = Number(body.capacity ?? 1);

    if (!eventId) {
      throw Object.assign(new Error("No event given"), { status: 400 });
    }

    const admin = createAdminClient();

    // Must actually be registered before leading a team for it.
    const { data: reg } = await admin
      .from("registrations")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("event_id", eventId)
      .maybeSingle();

    if (!reg) {
      throw Object.assign(new Error("Enrol in the event first."), { status: 409 });
    }

    const { data, error } = await admin.rpc("create_team", {
      p_event_id: eventId,
      p_user_id: user.id,
      p_capacity: capacity,
      p_name: name,
    });

    if (error) {
      if (error.message.includes("NOT_A_TEAM_EVENT")) {
        throw Object.assign(new Error("That event is solo entry."), { status: 400 });
      }
      if (error.message.includes("BAD_TEAM_SIZE")) {
        throw Object.assign(new Error("That team size isn't allowed for this event."), {
          status: 400,
        });
      }
      throw error;
    }

    const row = data?.[0];
    return ok({ teamId: row?.team_id, code: row?.code, capacity: row?.capacity });
  } catch (err) {
    return handleError(err);
  }
}
