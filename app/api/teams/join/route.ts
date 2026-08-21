import { createAdminClient } from "@/lib/supabase/admin";
import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { consume, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const REASONS: Record<string, string> = {
  BAD_CODE: "That code isn't right. Check it with your team leader.",
  NEEDS_PASS: "Buy your festival pass first, then join the team.",
  ALREADY_REGISTERED: "You're already registered for this event.",
  TEAM_FULL: "That team is full — its leader can add a place from their ticket.",
};

/**
 * POST /api/teams/join   { code }
 *
 * No payment: the leader paid the event fee once, and this person has already
 * bought their own compulsory festival pass.
 *
 * Rate limited because a 6-character code is guessable given enough attempts,
 * and joining someone else's team is exactly the kind of nuisance a bored
 * student tries.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await consume(`team:join:${user.id}`, LIMITS.registerPerUser);

    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();

    if (!/^[A-Z0-9]{4,10}$/.test(code)) {
      throw Object.assign(new Error("Enter the code your team leader shared."), {
        status: 400,
        code: "BAD_CODE",
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("join_team", {
      p_code: code,
      p_user_id: user.id,
    });

    if (error) throw error;

    const row = data?.[0];
    if (!row) throw Object.assign(new Error("Could not join that team."), { status: 400 });

    if (!row.ok) {
      throw Object.assign(new Error(REASONS[row.reason] ?? "Could not join that team."), {
        status: row.reason === "TEAM_FULL" ? 409 : 400,
        code: row.reason,
      });
    }

    return ok({
      joined: true,
      eventName: row.event_name,
      teamId: row.team_id,
      members: row.members,
      capacity: row.capacity,
    });
  } catch (err) {
    return handleError(err);
  }
}
