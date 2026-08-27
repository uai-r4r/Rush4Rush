import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";
export const revalidate = 30;

/**
 * GET /api/events — the public lineup.
 *
 * Serves the events grid from the DATABASE rather than data/clubs.ts. That
 * matters for one reason above all: the card shows a price. If the static file
 * says Rs.50 and events.fee_inr says Rs.120, someone sees one number and gets
 * charged another — and the server is right, because pricing is computed from
 * fee_inr. A stale card is a support ticket at best and a complaint at worst.
 *
 * It also means schedule edits and collabs are reflected automatically: Level
 * Up is one row credited to "Dramatics X Techops", not two lookalike cards.
 */
export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("events_with_clubs")
      .select(
        "id, name, tagline, description, fee_inr, day, start_time, end_time, venue, category, team_size, club_names, is_entry_pass, min_team_size, max_team_size, spans_both_days",
      )
      .eq("is_published", true)
      .eq("is_entry_pass", false)
      .order("day")
      .order("start_time");

    if (error) throw error;

    /**
     * Cheapest priced size per event, so a card can say "From Rs.129" rather
     * than a single figure. An event offering solo at 129 and a four at 299 is
     * misrepresented by either number alone.
     */
    const { data: pricing } = await admin
      .from("event_team_pricing")
      .select("event_id, team_size, fee_inr");

    const priceRange = new Map<string, { min: number; max: number }>();
    for (const row of pricing ?? []) {
      const cur = priceRange.get(row.event_id);
      priceRange.set(row.event_id, {
        min: Math.min(cur?.min ?? row.fee_inr, row.fee_inr),
        max: Math.max(cur?.max ?? row.fee_inr, row.fee_inr),
      });
    }

    const events = (data ?? []).map((e) => {
      const clubs = (e.club_names as string[] | null) ?? [];
      return {
        id: e.id,
        eventName: e.name,
        // Collabs read as "Dramatics X Techops" rather than either club alone.
        club: clubs.join(" X ") || "R4R",
        clubs,
        tagline: e.tagline ?? "",
        description: e.description ?? "",
        fee: e.fee_inr,
        day: e.day,
        // True for events running across both days. `day` stays 1 so schedule
        // ordering works; this is what the label reads.
        spansBothDays: Boolean(e.spans_both_days),
        startTime: (e.start_time ?? "").slice(0, 5),
        endTime: (e.end_time ?? "").slice(0, 5),
        venue: e.venue ?? "TBC",
        category: e.category ?? "Social",
        teamSize: e.team_size ?? "",
        // 1 means solo. >1 makes the enrol modal show a size picker — no code
        // change needed to switch a club between solo and team.
        minTeamSize: e.min_team_size ?? 1,
        maxTeamSize: e.max_team_size ?? 1,
        // Null unless the club priced more than one size at different amounts.
        feeFrom:
          priceRange.get(e.id) && priceRange.get(e.id)!.min !== priceRange.get(e.id)!.max
            ? priceRange.get(e.id)!.min
            : null,
      };
    });

    return ok({ events });
  } catch (err) {
    return handleError(err);
  }
}
