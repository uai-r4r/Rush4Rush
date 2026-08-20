import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-server";
import { entryPassQuote } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * GET /api/me/pass-status
 *
 * What the festival pass costs THIS person, right now. Drives the fee lines on
 * the signup cards and the pass step itself.
 *
 * Works signed out — returns both tiers so the signup screen can state the
 * price before anyone has an account. Deliberately per-user once signed in:
 * a page that keeps announcing "+Rs.100" to someone who already paid reads as
 * a second charge, which is the exact confusion this is meant to prevent.
 */
export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: settings } = await admin
      .from("settings")
      .select("entry_fee_uai_inr, entry_fee_guest_inr")
      .eq("id", true)
      .single();

    const uaiFeeInr = settings?.entry_fee_uai_inr ?? 50;
    const guestFeeInr = settings?.entry_fee_guest_inr ?? 100;

    const user = await getCurrentUser();

    if (!user) {
      return ok({
        signedIn: false,
        hasPass: false,
        comped: false,
        entryFeeInr: null,
        uaiFeeInr,
        guestFeeInr,
      });
    }

    const pass = await entryPassQuote({ userId: user.id, isUai: user.isUai });

    return ok({
      signedIn: true,
      hasPass: pass.alreadyHeld,
      comped: pass.comped,
      entryFeeInr: pass.amountInr,
      uaiFeeInr,
      guestFeeInr,
    });
  } catch (err) {
    return handleError(err);
  }
}
