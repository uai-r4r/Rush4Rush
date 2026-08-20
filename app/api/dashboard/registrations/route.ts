import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ok, handleError } from "@/lib/api";
import { requireUser, requireClub } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * GET /api/dashboard/registrations?clubId=rotaract
 *
 * THE SCOPING RULE: the filter is in the query, not the component. Fetching
 * everything and filtering in React means the data already left the server —
 * anyone with DevTools sees every club's list.
 *
 * Two independent guards, deliberately redundant:
 *   1. requireClub() here rejects a club id the caller doesn't administer
 *   2. club_registrations() re-checks via is_admin_of_club() in SQL
 * Either alone would do; both means one mistake still fails closed.
 *
 * AND NOTE: an empty clubIds array means "administers no clubs" — it must
 * never fall through to "sees everything". That inverted default is exactly
 * the bug that handed unscoped admins the whole festival's data.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser("club_admin");
    const url = new URL(req.url);
    const requested = url.searchParams.get("clubId");

    /**
     * The RPCs must be called with the USER'S client, not the service-role one.
     *
     * club_registrations() and all_registrations() guard themselves with
     * auth.uid(). The service-role client carries no session, so auth.uid() is
     * null, my_role() falls back to 'attendee', and the guard rejects everyone
     * — including legitimate admins. The check was silently filtering out the
     * very people it was meant to admit.
     *
     * Using the session client makes the SQL-level guard do its actual job:
     * a second, independent check behind requireClub() below.
     */
    const supabase = await createClient();
    const admin = createAdminClient();

    // Super admin with no club selected → every club in one view.
    const wantsAll =
      user.role === "super_admin" && (!requested || requested === "all");

    let rows;
    if (wantsAll) {
      const { data, error } = await supabase.rpc("all_registrations");
      if (error) throw error;
      rows = data;
    } else {
      const clubId = requested ?? user.clubIds[0];
      if (!clubId) {
        return ok({ clubId: null, availableClubs: [], registrations: [], proofUrls: {} });
      }
      requireClub(user, clubId);
      const { data, error } = await supabase.rpc("club_registrations", { target_club: clubId });
      if (error) throw error;
      rows = data;
    }

    // Club names for the filter dropdown.
    const { data: clubs } = await admin.from("clubs").select("id, name");
    const clubNames = Object.fromEntries((clubs ?? []).map((c) => [c.id, c.name]));

    /**
     * Screenshots live in a PRIVATE bucket — those images carry real names and
     * UPI IDs. Mint short-lived signed URLs instead of making the bucket
     * public, and only for rows that actually have a proof.
     */
    const proofUrls: Record<string, string> = {};
    await Promise.all(
      (rows ?? [])
        .filter((r: { proof_path: string | null }) => r.proof_path)
        .map(async (r: { registration_id: string; proof_path: string }) => {
          const { data } = await admin.storage
            .from("payment-proofs")
            .createSignedUrl(r.proof_path, 300);
          if (data?.signedUrl) proofUrls[r.registration_id] = data.signedUrl;
        }),
    );

    return ok({
      clubId: wantsAll ? "all" : (requested ?? user.clubIds[0]),
      role: user.role,
      availableClubs: (user.role === "super_admin" ? Object.keys(clubNames) : user.clubIds).map(
        (id) => ({ id, name: clubNames[id] ?? id }),
      ),
      registrations: rows ?? [],
      proofUrls,
    });
  } catch (err) {
    return handleError(err);
  }
}
