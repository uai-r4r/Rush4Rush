import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET /api/events/:id/team-pricing
 *
 * The sizes a club actually offers, with their prices.
 *
 * Deliberately NOT a min..max range. A club may offer solo, duo and four but
 * not three — a contiguous picker would show 3, and picking it would fall
 * through to the flat event fee and charge the wrong amount. Returning the
 * priced rows means the picker can only offer sizes that have a price.
 *
 * Falls back to the min..max range where a club has set no per-size rows at
 * all, since those events charge one flat fee whatever the size.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: event, error } = await admin
      .from("events")
      .select("id, name, fee_inr, min_team_size, max_team_size")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!event) {
      throw Object.assign(new Error("Event not found"), { status: 404 });
    }

    const min = event.min_team_size ?? 1;
    const max = event.max_team_size ?? 1;

    const { data: priced } = await admin
      .from("event_team_pricing")
      .select("team_size, fee_inr")
      .eq("event_id", id)
      .order("team_size");

    const rows = (priced ?? []).filter((r) => r.team_size >= min && r.team_size <= max);

    const options =
      rows.length > 0
        ? rows.map((r) => ({ size: r.team_size, feeInr: r.fee_inr }))
        : Array.from({ length: max - min + 1 }, (_, i) => ({
            size: min + i,
            feeInr: event.fee_inr,
          }));

    return ok({
      eventId: event.id,
      isTeam: max > 1,
      minTeamSize: min,
      maxTeamSize: max,
      options,
    });
  } catch (err) {
    return handleError(err);
  }
}
