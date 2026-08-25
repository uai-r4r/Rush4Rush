import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marker registration for "this outsider has paid their one-off solo fee".
 * Retained under the old id so existing rows keep working, and because it also
 * gives everyone a gate ticket to scan at the door.
 */
export const ENTRY_PASS_EVENT_ID = "r4r-entry-pass";

/**
 * Server-side price computation.
 *
 * THE RULE: the client tells us WHICH events and, for team events, HOW MANY
 * PEOPLE — never how much. A request body carrying `amount: 1` is the oldest
 * bug in online payments and this is where it gets closed.
 *
 * FEE MODEL
 *   UAI students          → nothing beyond club event fees
 *   Outsiders, solo event → Rs.50 ONCE, on their first solo registration
 *   Outsiders, team event → Rs.100 PER TEAM registration, paid by the leader
 *                           for the whole team, every time
 *
 * Because the fee depends on solo-versus-team, it cannot be collected at
 * signup — at that point nobody knows what they will enter.
 */

export type PricedItem = {
  eventId: string;
  eventName: string;
  clubId: string;
  feeInr: number;
  /** Registration fee attached to this event, shown as its own line. */
  registrationFeeInr: number;
  isTeam: boolean;
};

export type Quote = {
  items: PricedItem[];
  /** Kept for callers that still read it: total registration fees in this quote. */
  needsEntryPass: boolean;
  entryPassInr: number;
  totalInr: number;
};

export async function quote(params: {
  userId: string;
  isUai: boolean;
  eventIds: string[];
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
    .select("id, name, club_id, fee_inr, is_published, capacity, max_team_size")
    .in("id", requested)
    .eq("is_published", true);

  if (error) throw error;

  if (!events || events.length !== requested.length) {
    throw Object.assign(new Error("One or more events are unavailable"), {
      status: 400,
    });
  }

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

  const { data: settings } = await admin
    .from("settings")
    .select("solo_fee_inr, team_fee_inr")
    .eq("id", true)
    .single();

  const soloFee = settings?.solo_fee_inr ?? 50;
  const teamFeeFlat = settings?.team_fee_inr ?? 100;

  // Has this outsider already paid the one-off solo fee?
  const { data: existingPass } = await admin
    .from("registrations")
    .select("id")
    .eq("user_id", params.userId)
    .eq("event_id", ENTRY_PASS_EVENT_ID)
    .eq("status", "confirmed")
    .maybeSingle();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", params.userId)
    .single();

  // Super admins pay nothing. UAI students pay no registration fee — event
  // fees still apply to them.
  const comped = profile?.role === "super_admin";
  const paysRegistrationFees = !comped && !params.isUai;

  /**
   * Organiser comp: a club admin doesn't pay for their own club's events, but
   * does pay for other clubs'. Checked per event, server-side.
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

  // Per-size team pricing, where a club has set it.
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

  /**
   * Registration fees, per event.
   *
   * Solo: charged once ever, so only the FIRST solo event in this quote adds
   * it — and only if they have not already paid it in a previous checkout.
   *
   * Team: charged on every team registration, one flat amount for the whole
   * team regardless of size.
   */
  let soloFeeStillOwed = paysRegistrationFees && !existingPass;
  let registrationTotal = 0;

  const items: PricedItem[] = events.map((e) => {
    const isTeam = (e.max_team_size ?? 1) > 1 && Boolean(params.teamSizes?.[e.id]);
    const eventFee = compedEvents.has(e.id) ? 0 : (teamFees.get(e.id) ?? e.fee_inr);

    let registrationFeeInr = 0;
    if (paysRegistrationFees) {
      if (isTeam) {
        registrationFeeInr = teamFeeFlat;
      } else if (soloFeeStillOwed) {
        registrationFeeInr = soloFee;
        soloFeeStillOwed = false; // once only
      }
    }
    registrationTotal += registrationFeeInr;

    return {
      eventId: e.id,
      eventName: e.name,
      clubId: e.club_id,
      feeInr: eventFee,
      registrationFeeInr,
      isTeam,
    };
  });

  const totalInr =
    items.reduce((sum, i) => sum + i.feeInr + i.registrationFeeInr, 0);

  /**
   * Issue the gate-ticket marker whenever an outsider pays a registration fee
   * for the first time, so everyone has something to scan at the door.
   */
  const needsEntryPass = !existingPass && registrationTotal > 0;

  return {
    items,
    needsEntryPass,
    entryPassInr: 0, // registration fees are itemised per event now
    totalInr,
  };
}

/**
 * Retained so the pass-status endpoint keeps compiling.
 *
 * There is no longer a standalone pass to buy: fees are charged at enrolment
 * and depend on whether the event is solo or team. Reports what an outsider
 * would owe on their next SOLO registration, and 0 once paid.
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
    .select("solo_fee_inr")
    .eq("id", true)
    .single();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", params.userId)
    .single();

  const comped = profile?.role === "super_admin" || params.isUai;

  return {
    alreadyHeld: Boolean(existingPass),
    comped,
    amountInr: comped || existingPass ? 0 : (settings?.solo_fee_inr ?? 50),
  };
}
