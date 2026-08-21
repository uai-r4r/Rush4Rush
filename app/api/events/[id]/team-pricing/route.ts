import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET /api/events/:id/team-pricing
 *
 * What each allowed team size costs for this event, so the picker can label
 * its buttons "3 · Rs.350" instead of a bare "3". Someone choosing a size is
 * choosing a price, and a button that hides the price makes them guess.
 *
 * Prices come from team_fee(), the same function the server uses when it
 * actually charges — so the label and the invoice cannot disagree. A club that
 * has not filled in event_team_pricing falls back to the event's flat fee for
 * every size, which is correct: one fee regardless of head count.
 *
 * The entry pass is NOT included here. It depends on the person, not the team,
 * and gets added by quote() at checkout.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: eventId } = await params;
    const admin = createAdminClient();

    const { data: event, error } = await admin
      .from("events")
      .select("id, min_team_size, max_team_size")
      .eq("id", eventId)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!event) {
      throw Object.assign(new Error("Event not found"), { status: 404 });
    }

    const min = Math.max(event.min_team_size ?? 1, 1);
    const max = event.max_team_size ?? 1;

    if (max <= 1) {
      // Solo event — nothing to pick between.
      return ok({ eventId, sizes: [] });
    }

    const sizes = await Promise.all(
      Array.from({ length: max - min + 1 }, (_, i) => min + i).map(async (size) => {
        const { data: fee } = await admin.rpc("team_fee", {
          p_event_id: eventId,
          p_size: size,
        });
        return { size, feeInr: typeof fee === "number" ? fee : 0 };
      }),
    );

    return ok({ eventId, sizes });
  } catch (err) {
    return handleError(err);
  }
}
