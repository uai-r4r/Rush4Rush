import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUserRole, type CurrentUser, type UserRole } from "@/lib/auth";

export type { CurrentUser, UserRole };
export { hasAtLeast, ROLE_LABELS, isUserRole } from "@/lib/auth";

/**
 * Server-only session resolution.
 *
 * The `server-only` import at the top is a build-time tripwire: if this file
 * ever gets imported by a client component, the build fails loudly instead of
 * quietly shipping the service-role path to the browser.
 */

/**
 * Resolves the signed-in user from the session cookie.
 *
 * Uses getUser(), not getSession(). getSession() reads the cookie and trusts
 * whatever is in it; getUser() verifies the JWT against the auth server. On a
 * page that gates access by role, that difference is the whole ballgame — a
 * forged cookie passes getSession() and fails getUser().
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, college, is_uai, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const role: UserRole = isUserRole(profile.role) ? profile.role : "attendee";

  // Club scoping. Only ever populated for club_admin and super_admin — an
  // attendee always gets [].
  let clubIds: string[] = [];
  if (role === "super_admin") {
    const { data } = await supabase.from("clubs").select("id");
    clubIds = data?.map((c) => c.id) ?? [];
  } else if (role === "club_admin") {
    const { data } = await supabase
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id);
    clubIds = data?.map((c) => c.club_id) ?? [];
  }

  return {
    id: profile.id,
    name: profile.full_name ?? profile.email.split("@")[0],
    email: profile.email,
    role,
    clubIds,
    isUai: profile.is_uai,
    phone: profile.phone,
    college: profile.college,
  };
}

/** Guard for API routes. Throws 401/403, which handleError turns into JSON. */
export async function requireUser(minimum: UserRole = "attendee") {
  const user = await getCurrentUser();
  if (!user) throw Object.assign(new Error("Not signed in"), { status: 401 });

  const rank = { attendee: 1, volunteer: 2, club_admin: 3, super_admin: 4 } as const;
  if (rank[user.role] < rank[minimum]) {
    throw Object.assign(new Error("Not allowed"), { status: 403 });
  }
  return user;
}

/**
 * Club scoping check.
 *
 * NOTE THE DEFAULT: an empty clubIds array means "administers no clubs" and
 * fails every check. It must never fall through to "sees everything" — that
 * inverted default is precisely the bug that handed unscoped admins the whole
 * fest's data. Membership is checked explicitly, never inferred from emptiness.
 */
export function requireClub(user: CurrentUser, clubId: string) {
  if (user.role === "super_admin") return;
  if (!user.clubIds.includes(clubId)) {
    throw Object.assign(new Error("Not an admin of this club"), { status: 403 });
  }
}
