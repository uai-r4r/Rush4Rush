import { ok, handleError } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { getTicketsForUser } from "@/lib/ticket-data";

export const runtime = "nodejs";

/**
 * GET /api/tickets
 *
 * Same helper the /tickets page uses, so the two can never disagree about who
 * holds a valid ticket. Kept for future client-side refresh (e.g. polling
 * while a UPI payment awaits approval).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const tickets = await getTicketsForUser(user.id);
    return ok({ tickets });
  } catch (err) {
    return handleError(err);
  }
}
