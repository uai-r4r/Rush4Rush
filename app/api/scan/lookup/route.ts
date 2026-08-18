import { createClient } from "@/lib/supabase/server";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * GET /api/scan/lookup?phone=98765
 *
 * The escape hatch. Fest wifi will drop, a phone screen will be too cracked to
 * scan, someone will arrive with a dead battery. Without a manual path the
 * queue simply stops moving.
 *
 * Returns names and event registrations only — no emails, no payment amounts.
 * A volunteer needs to identify a person at a door; they do not need the
 * attendee list as a data export.
 */
export async function GET(req: Request) {
  try {
    await requireUser("volunteer");

    const phone = new URL(req.url).searchParams.get("phone") ?? "";
    const digits = phone.replace(/\D/g, "");

    // Require a meaningful fragment. A 1-digit search would return the whole
    // fest, which turns the fallback into a bulk data leak.
    if (digits.length < 4) {
      throw Object.assign(new Error("Enter at least 4 digits of the phone number"), {
        status: 400,
      });
    }

    /**
     * Session client: lookup_by_phone() checks has_role_at_least('volunteer'),
     * which reads auth.uid(). Called with the service-role client that is null,
     * so the function would return nothing — a silent failure at the exact
     * moment a volunteer needs the fallback most.
     */
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("lookup_by_phone", { search_phone: digits });
    if (error) throw error;

    return ok({ matches: data ?? [] });
  } catch (err) {
    return handleError(err);
  }
}
