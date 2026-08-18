import { createAdminClient } from "@/lib/supabase/admin";

export const ENTRY_PASS_EVENT_ID = "r4r-entry-pass";

/**
 * Server-side price computation.
 *
 * THE RULE: the client tells us WHICH events, never HOW MUCH. Every amount is
 * read fresh from events.fee_inr. A request body carrying `amount: 1` is the
 * oldest bug in online payments and this is where it gets closed.
 */

export type PricedItem = {
  eventId: string;
  eventName: string;
  clubId: string;
  feeInr: number;
};

export type Quote = {
  items: PricedItem[];
  needsEntryPass: boolean;
  entryPassInr: number;
  totalInr: number;
};

/**
 * Entry pass rule:
 *   UAI student  → free, and issued automatically so they still get a gate
 *                  ticket to scan
 *   Outsider     → ₹100, and required before any club event can be paid for
 */
export async function quote(params: {
  userId: string;
  isUai: boolean;
  eventIds: string[];
}): Promise<Quote> {
  const admin = createAdminClient();

  const requested = [...new Set(params.eventIds)].filter(
    (id) => id !== ENTRY_PASS_EVENT_ID,
  );

  if (requested.length === 0) {
    throw Object.assign(new Error("Select at least one event"), { status: 400 });
  }
  if (requested.length > 23) {
    throw Object.assign(new Error("Too many events selected"), { status: 400 });
  }

  const { data: events, error } = await admin
    .from("events")
    .select("id, name, club_id, fee_inr, is_published, capacity")
    .in("id", requested)
    .eq("is_published", true);

  if (error) throw error;

  if (!events || events.length !== requested.length) {
    throw Object.assign(new Error("One or more events are unavailable"), {
      status: 400,
    });
  }

  // Capacity check. Counts confirmed registrations only — a pending row that
  // never gets paid should not hold a seat hostage.
  for (const ev of events) {
    if (ev.capacity == null) continue;
    const { count } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("status", "confirmed");
    if ((count ?? 0) >= ev.capacity) {
      throw Object.assign(new Error(`${ev.name} is full`), { status: 409 });
    }
  }

  // Already has a paid (or free-issued) entry pass?
  const { data: existingPass } = await admin
    .from("registrations")
    .select("id")
    .eq("user_id", params.userId)
    .eq("event_id", ENTRY_PASS_EVENT_ID)
    .eq("status", "confirmed")
    .maybeSingle();

  /**
   * Entry pass pricing lives in settings, not in code.
   *   UAI student → entry_fee_uai_inr   (₹50)
   *   Outsider    → entry_fee_guest_inr (₹100)
   * Fest pricing changes late; a change should be one UPDATE, not a redeploy.
   */
  const { data: settings } = await admin
    .from("settings")
    .select("entry_fee_uai_inr, entry_fee_guest_inr")
    .eq("id", true)
    .single();

  /**
   * Organisers are comped the entry pass too — they are working the festival,
   * not attending it. The pass is still ISSUED at ₹0 rather than skipped, so
   * they get a gate ticket and a QR like everyone else and the scanner needs
   * no special case for staff.
   */
  const { data: isOrganiser } = await admin
    .from("club_admins")
    .select("club_id")
    .eq("user_id", params.userId)
    .limit(1);

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", params.userId)
    .single();

  const comped = Boolean(isOrganiser?.length) || profile?.role === "super_admin";

  const needsEntryPass = !existingPass;
  const entryPassInr = comped
    ? 0
    : params.isUai
      ? (settings?.entry_fee_uai_inr ?? 50)
      : (settings?.entry_fee_guest_inr ?? 100);

  /**
   * Organiser comp: a club admin doesn't pay for their own club's events, but
   * does pay for other clubs'. Checked per event, server-side — the client
   * never gets to assert that something is free.
   */
  const compedEvents = new Set<string>();
  await Promise.all(
    events.map(async (e) => {
      const { data: organiserOfThis } = await admin.rpc("is_organiser_of_event", {
        target_event: e.id,
        target_user: params.userId,
      });
      if (organiserOfThis) compedEvents.add(e.id);
    }),
  );

  const items: PricedItem[] = events.map((e) => ({
    eventId: e.id,
    eventName: e.name,
    clubId: e.club_id,
    feeInr: compedEvents.has(e.id) ? 0 : e.fee_inr,
  }));

  const totalInr =
    items.reduce((sum, i) => sum + i.feeInr, 0) +
    (needsEntryPass ? entryPassInr : 0);

  return { items, needsEntryPass, entryPassInr, totalInr };
}
