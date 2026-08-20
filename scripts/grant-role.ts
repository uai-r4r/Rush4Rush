/**
 * Grant a role / assign a club admin.
 *
 *   npx tsx scripts/grant-role.ts <email> <role> [clubId]
 *
 *   npx tsx scripts/grant-role.ts you@universalai.in super_admin
 *   npx tsx scripts/grant-role.ts head@universalai.in club_admin rotaract
 *   npx tsx scripts/grant-role.ts core@universalai.in club_admin rotaract   # 2nd login
 *   npx tsx scripts/grant-role.ts gate1@universalai.in volunteer
 *
 * Deliberately a script and not a signup page. There is no self-serve
 * organiser onboarding — 21 clubs is a one-time job, and a public "claim my
 * club" flow is an obvious way for someone to claim a club that isn't theirs.
 *
 * The person must have signed in at least once (which creates their auth row).
 * Give every club TWO admins: one phone dies or one head is mid-performance
 * and nobody can check a number otherwise.
 */
import { createClient } from "@supabase/supabase-js";

const ROLES = ["attendee", "volunteer", "club_admin", "super_admin"] as const;

async function main() {
  const [, , email, role, clubId] = process.argv;

  if (!email || !role || !ROLES.includes(role as (typeof ROLES)[number])) {
    console.error(
      "usage: grant-role.ts <email> <attendee|volunteer|club_admin|super_admin> [clubId]",
    );
    process.exit(1);
  }
  if (role === "club_admin" && !clubId) {
    console.error("club_admin needs a clubId, e.g. 'rotaract'");
    process.exit(1);
  }

  /**
   * Volunteers do NOT need a club: the festival entry pass is open to every
   * volunteer, so an unassigned one can still work the gate. Give them a club
   * only if they should also scan that club's own events.
   */
  if (role === "volunteer" && !clubId) {
    console.log("Note: no club given — this volunteer can scan the gate pass only.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing env vars. Run with: npx tsx --env-file=.env.local scripts/grant-role.ts ...",
    );
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: profile, error } = await db
    .from("profiles")
    .select("id, email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!profile) {
    console.error(`No account for ${email}. Ask them to sign in once first.`);
    process.exit(1);
  }

  await db.from("profiles").update({ role }).eq("id", profile.id);
  console.log(`OK  ${email} -> ${role}`);

  if (clubId) {
    const { data: club } = await db
      .from("clubs")
      .select("id, name")
      .eq("id", clubId)
      .maybeSingle();

    if (!club) {
      console.error(
        `No club '${clubId}'. Check supabase/migrations/0004_seed_clubs.sql for ids.`,
      );
      process.exit(1);
    }

    await db.from("club_admins").upsert({ user_id: profile.id, club_id: clubId });
    console.log(`OK  ${email} administers ${club.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
