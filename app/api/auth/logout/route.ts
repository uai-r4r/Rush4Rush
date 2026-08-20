import { createClient } from "@/lib/supabase/server";
import { ok, handleError } from "@/lib/api";

export const runtime = "nodejs";

/** POST only — a GET logout can be triggered by an <img> tag on any site. */
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return ok({ signedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
