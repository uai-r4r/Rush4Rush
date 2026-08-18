import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError, normalisePhone } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * POST /api/auth/profile
 * Step 3 of registration: name, phone, college, year.
 *
 * No password fields — that was the point of going OTP-only. Whatever the
 * client sends for `role` or `is_uai` is ignored; both are server-owned. is_uai
 * is derived from the email domain at signup and decides whether someone owes
 * the ₹100, so letting it be posted would be a free-entry bug.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const fullName = String(body.fullName ?? "").trim().slice(0, 80);
    if (fullName.length < 2) {
      throw Object.assign(new Error("Enter your full name"), { status: 400 });
    }

    const phone = normalisePhone(body.phone);
    const college = String(body.college ?? "").trim().slice(0, 120) || null;
    const yearOfStudy = String(body.yearOfStudy ?? "").trim().slice(0, 40) || null;

    if (!user.isUai && !college) {
      throw Object.assign(new Error("Enter your college name"), { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        college: user.isUai ? "Universal AI University" : college,
        year_of_study: yearOfStudy,
      })
      .eq("id", user.id)
      .select("id, full_name, phone, college, year_of_study");

    if (error) throw error;

    /**
     * .update() resolves happily when it matches NOTHING, so without this the
     * route returns 200 having changed nothing at all — and the caller loops
     * forever being told to complete a profile it just "saved".
     */
    if (!data || data.length === 0) {
      console.error("[auth/profile] update matched no rows for", user.id);
      throw Object.assign(
        new Error("Could not find your account to update. Try signing out and back in."),
        { status: 500 },
      );
    }

    return ok({ saved: true, profile: data[0] });
  } catch (err) {
    return handleError(err);
  }
}
