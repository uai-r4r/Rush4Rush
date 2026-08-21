import { createAdminClient } from "@/lib/supabase/admin";

export const ENTRY_PASS_EVENT_ID = "r4r-entry-pass";

/**
 * Server-side price computation.
 *
 * THE RULE: the client tells us WHICH events and, for team events, HOW MANY
 * PEOPLE — never how much. Every amount is read fresh from the database. A
 * request body carrying `amount: 1` is the oldest bug in online payments and
 * this is where it gets closed.
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
 *   UAI student  → entry_fee_uai_inr   (₹50)
 *   Outsider     → entry_fee_guest_inr (₹100)
 * Compulsory for everyone: both days, food, DJ night.
 */
export async function quote(params: {
  userId: string;
  isUai: boolean;
  eventIds: string[];
  /**
   * Team size the leader is paying for, keyed by event id.
   *
   * Priced by team_fee(), which reads the club's per-size table and falls back
   * to events.fee_inr. This matters beyond the price: teams.capacity is set
   * from what was PAID for, so without it a leader could pay the 2-person rate
   * and hand the join code to a third person.
   */
  teamSizes?: Record<string, number>;
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
   * ONLY super admins are comped the pass. Club admins and volunteers pay it
   * like everyone else — they are students attending the festival, and the
   * food and DJ night cost the same to provide whoever eats them.
   *
   * The pass is still ISSUED at ₹0 for a super admin rather than skipped, so
   * they get a gate ticket and a QR like everyone else and the scanner needs
   * no special case for staff.
   *
   * This rule is duplicated in entryPassQuote() below. If you change who is
   * comped, change it in BOTH — a mismatch means someone is comped at signup
   * and charged at enrol, or the reverse.
   */
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", params.userId)
    .single();

  const comped = profile?.role === "super_admin";

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

  /**
   * Per-size team pricing. A club can charge ₹200 for a pair and ₹350 for a
   * trio without that being a per-head multiple — team_fee() reads their table
   * and falls back to the flat event fee where they haven't set one.
   */
  const teamFees = new Map<string, number>();
  await Promise.all(
    events.map(async (e) => {
      const size = params.teamSizes?.[e.id];
      if (!size || size < 1) return;
      const { data } = await admin.rpc("team_fee", {
        p_event_id: e.id,
        p_size: size,
      });
      if (typeof data === "number") teamFees.set(e.id, data);
    }),
  );

  const items: PricedItem[] = events.map((e) => ({
    eventId: e.id,
    eventName: e.name,
    clubId: e.club_id,
    feeInr: compedEvents.has(e.id) ? 0 : (teamFees.get(e.id) ?? e.fee_inr),
  }));

  const totalInr =
    items.reduce((sum, i) => sum + i.feeInr, 0) +
    (needsEntryPass ? entryPassInr : 0);

  return { items, needsEntryPass, entryPassInr, totalInr };
}

/**
 * What the entry pass costs THIS person, with no club event attached.
 *
 * quote() deliberately refuses an empty event list — enrolling in nothing is a
 * bug there. But the signup pass step buys the pass on its own, so it needs
 * the same pricing rules without that guard.
 *
 * Comp rule: super admin only. Club admins and volunteers pay the pass. Note
 * this is SEPARATE from the per-event organiser comp in quote(), which still
 * gives a club admin their own club's events free — not paying to run your own
 * event is a different question from paying to attend the festival.
 */
export async function entryPassQuote(params: {
  userId: string;
  isUai: boolean;
}): Promise<{ alreadyHeld: boolean; amountInr: number; comped: boolean }> {
  const admin = createAdminClient();

  const { data: existingPass } = await admin
    .from("registrations")
    .select("id")
    .eq("user_id", params.userId)
    .eq("event_id", ENTRY_PASS_EVENT_ID)
    .eq("status", "confirmed")
    .maybeSingle();

  const { data: settings } = await admin
    .from("settings")
    .select("entry_fee_uai_inr, entry_fee_guest_inr")
    .eq("id", true)
    .single();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", params.userId)
    .single();

  // Super admin only. See the matching note in quote() above.
  const comped = profile?.role === "super_admin";

  return {
    alreadyHeld: Boolean(existingPass),
    comped,
    amountInr: comped
      ? 0
      : params.isUai
        ? (settings?.entry_fee_uai_inr ?? 50)
        : (settings?.entry_fee_guest_inr ?? 100),
  };
}
