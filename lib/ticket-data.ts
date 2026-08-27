import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTicketToken } from "@/lib/tickets";

/**
 * Loads a user's tickets and mints their QR tokens.
 *
 * Shared by the /tickets page (server-rendered, so the card is complete on
 * first paint) and /api/tickets. One implementation, so the page and the API
 * can never disagree about who holds a valid ticket.
 *
 * Tokens are computed per request and never stored. That is why 500 tickets
 * cost zero database bytes, and why a cancelled or refunded registration stops
 * producing a scannable code the moment its status changes — there is no stale
 * image left behind in storage to go looking for.
 */

export type TicketStatus = "paid" | "pending" | "checked-in";

export type TeamInfo = {
  id: string;
  code: string;
  /** Only the leader may grow the team — they are the one who paid. */
  isLeader: boolean;
  /** Confirmed members so far, including the leader. */
  members: number;
  /** How many were PAID for. The code stops working at exactly this many. */
  capacity: number;
  /** The event's ceiling — the most the leader could ever grow to. */
  maxTeamSize: number;
};

export type Ticket = {
  registrationId: string;
  eventId: string;
  eventName: string;
  clubName: string;
  day: string;
  time: string;
  venue: string;
  status: TicketStatus;
  amountInr: number;
  isEntryPass: boolean;
  /** null unless the registration is confirmed — never render a QR without it */
  token: string | null;
  /** null for solo events and the entry pass */
  team: TeamInfo | null;
};

function formatTime(start: string | null, end: string | null) {
  if (!start || !end) return "TIME TBC";
  return `${start.slice(0, 5)} — ${end.slice(0, 5)}`;
}

export async function getTicketsForUser(userId: string): Promise<Ticket[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("registrations")
    .select(
      // `clubs!events_club_id_fkey` is deliberate: since event_clubs was added
      // there are TWO paths from events to clubs (the owning-club foreign key
      // and the collab join table), and PostgREST refuses to guess. This picks
      // the owning club, which is what a ticket should show.
      "id, status, checked_in_at, created_at, team_id, events(id, name, day, start_time, end_time, venue, is_entry_pass, spans_both_days, max_team_size, clubs!events_club_id_fkey(name)), teams(id, code, leader_id, capacity), payments(status, amount_inr)",
    )
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;

  /**
   * How many people are actually in each of this user's teams. Counted in one
   * query rather than per ticket — someone in four team events would otherwise
   * cost four round trips on a page that has to be fast at the gate.
   */
  const teamIds = (data ?? [])
    .map((row) => (row as { team_id: string | null }).team_id)
    .filter((id): id is string => Boolean(id));

  const memberCounts = new Map<string, number>();
  if (teamIds.length) {
    const { data: members } = await admin
      .from("registrations")
      .select("team_id")
      .in("team_id", [...new Set(teamIds)])
      .neq("status", "cancelled");

    for (const m of members ?? []) {
      const id = (m as { team_id: string | null }).team_id;
      if (id) memberCounts.set(id, (memberCounts.get(id) ?? 0) + 1);
    }
  }

  const tickets = (data ?? []).map((row) => {
    const event = row.events as unknown as {
      id: string;
      name: string;
      max_team_size: number | null;
      day: number | null;
      start_time: string | null;
      end_time: string | null;
      venue: string | null;
      is_entry_pass: boolean;
      spans_both_days: boolean;
      clubs: { name: string } | null;
    };
    const payment = row.payments as unknown as {
      status: string;
      amount_inr: number;
    } | null;

    const teamRow = row.teams as unknown as {
      id: string;
      code: string;
      leader_id: string;
      capacity: number;
    } | null;

    const confirmed = row.status === "confirmed";

    const status: TicketStatus = row.checked_in_at
      ? "checked-in"
      : confirmed
        ? "paid"
        : "pending";

    return {
      registrationId: row.id,
      eventId: event.id,
      eventName: event.name.toUpperCase(),
      clubName: event.is_entry_pass
        ? "Rush4Rush Festival"
        : (event.clubs?.name ?? "R4R"),
      /**
       * A two-day event must say so HERE above anywhere else. This is the
       * screen someone glances at on the second morning — labelled "DAY 01"
       * they simply would not turn up, holding a ticket that was valid.
       */
      day: event.is_entry_pass
        ? "ALL DAYS"
        : event.spans_both_days
          ? "DAY 01-02"
          : event.day
            ? `DAY 0${event.day}`
            : "DAY TBC",
      time: event.is_entry_pass ? "08:00 — 22:00" : formatTime(event.start_time, event.end_time),
      venue: (event.venue ?? "VENUE TBC").toUpperCase(),
      status,
      amountInr: payment?.amount_inr ?? 0,
      isEntryPass: event.is_entry_pass,
      // A pending ticket gets NO token. At a busy gate a QR that renders is a
      // QR that gets waved through, so an unpaid one must not exist at all.
      token: confirmed ? createTicketToken(row.id) : null,
      team: teamRow
        ? {
            id: teamRow.id,
            code: teamRow.code,
            isLeader: teamRow.leader_id === userId,
            members: memberCounts.get(teamRow.id) ?? 1,
            capacity: teamRow.capacity,
            maxTeamSize: event.max_team_size ?? 1,
          }
        : null,
    };
  });

  // Entry pass first — it's the one needed at the front gate.
  tickets.sort((a, b) => Number(b.isEntryPass) - Number(a.isEntryPass));
  return tickets;
}
