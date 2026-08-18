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

export type Ticket = {
  registrationId: string;
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
      "id, status, checked_in_at, created_at, events(id, name, day, start_time, end_time, venue, is_entry_pass, clubs!events_club_id_fkey(name)), payments(status, amount_inr)",
    )
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const tickets = (data ?? []).map((row) => {
    const event = row.events as unknown as {
      name: string;
      day: number | null;
      start_time: string | null;
      end_time: string | null;
      venue: string | null;
      is_entry_pass: boolean;
      clubs: { name: string } | null;
    };
    const payment = row.payments as unknown as {
      status: string;
      amount_inr: number;
    } | null;

    const confirmed = row.status === "confirmed";

    const status: TicketStatus = row.checked_in_at
      ? "checked-in"
      : confirmed
        ? "paid"
        : "pending";

    return {
      registrationId: row.id,
      eventName: event.name.toUpperCase(),
      clubName: event.is_entry_pass
        ? "Rush4Rush Festival"
        : (event.clubs?.name ?? "R4R"),
      day: event.is_entry_pass ? "ALL DAYS" : event.day ? `DAY 0${event.day}` : "DAY TBC",
      time: event.is_entry_pass ? "08:00 — 22:00" : formatTime(event.start_time, event.end_time),
      venue: (event.venue ?? "VENUE TBC").toUpperCase(),
      status,
      amountInr: payment?.amount_inr ?? 0,
      isEntryPass: event.is_entry_pass,
      // A pending ticket gets NO token. At a busy gate a QR that renders is a
      // QR that gets waved through, so an unpaid one must not exist at all.
      token: confirmed ? createTicketToken(row.id) : null,
    };
  });

  // Entry pass first — it's the one needed at the front gate.
  tickets.sort((a, b) => Number(b.isEntryPass) - Number(a.isEntryPass));
  return tickets;
}
