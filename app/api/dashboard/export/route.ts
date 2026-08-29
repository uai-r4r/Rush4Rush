import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { handleError } from "@/lib/api";
import { requireUser, requireClub } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * GET /api/dashboard/export?clubId=rotaract  → CSV download
 *
 * Every club will ask for this, and it doubles as your backup: the Supabase
 * free tier has no automated backups, so export once signups open and keep
 * doing it. Ten seconds against losing the whole registration list.
 */
/**
 * Excel strips leading zeros from anything that looks like a number, so a UTR
 * of 001234567890 opens as 1234567890 and no longer matches the bank
 * statement. Wrapping it as ="..." makes Excel treat it as text and keep every
 * digit.
 *
 * The quoting below escapes a leading = as formula injection, so this is
 * applied via a marker the escaper leaves alone.
 */
function utrCell(value: string): string {
  return value ? `\u0000EXCELTEXT:${value}` : "";
}

export async function GET(req: Request) {
  try {
    const user = await requireUser("club_admin");
    const requested = new URL(req.url).searchParams.get("clubId");

    // Session client, not service-role — see the note in ./registrations.
    const supabase = await createClient();

    /**
     * Mirror the branching in ./registrations exactly.
     *
     * Without this, a super admin exporting "all" called
     * club_registrations('all') — and since no club has the id 'all', the CSV
     * came back with headers and no rows. An empty export is a nasty failure
     * mode: it looks like a successful download of zero registrations, so you
     * only notice when you go looking for a name that should be there.
     */
    const wantsAll = user.role === "super_admin" && (!requested || requested === "all");

    let data;
    if (wantsAll) {
      const result = await supabase.rpc("all_registrations");
      if (result.error) throw result.error;
      data = result.data;
    } else {
      const clubId = requested ?? user.clubIds[0];
      if (!clubId) throw Object.assign(new Error("No club selected"), { status: 400 });
      requireClub(user, clubId);
      const result = await supabase.rpc("club_registrations", { target_club: clubId });
      if (result.error) throw result.error;
      data = result.data;
    }

    const headers = [
      "Registration ID", "Club", "Event", "Name", "Email", "Phone",
      "UTR",
      "College", "Year", "UAI Student", "Amount (INR)",
      "Payment", "Status", "Checked In", "Registered At",
    ];

    const rows = (data ?? []).map((r: Record<string, unknown>) => [
      r.registration_id, r.club_id, r.event_name, r.attendee_name, r.email, r.phone,
      // One UTR column. acquirer_ref comes from Razorpay's webhook and is
      // authoritative; payer_ref is typed by the payer on manual UPI. Only one
      // is ever populated for a given payment, so two columns just meant one
      // was always blank and looked broken.
      utrCell(String(r.acquirer_ref ?? r.payer_ref ?? "")),
      r.college, r.year_of_study, r.is_uai ? "Yes" : "No", r.amount_inr,
      r.payment_status, r.status,
      r.checked_in_at ? new Date(String(r.checked_in_at)).toLocaleString("en-IN") : "",
      new Date(String(r.registered_at)).toLocaleString("en-IN"),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell: unknown) => {
            const raw = cell == null ? "" : String(cell);

            // Deliberate ="..." wrapper — keeps leading zeros in Excel. Applied
            // before the formula-injection guard so it is not escaped away.
            if (raw.startsWith("\u0000EXCELTEXT:")) {
              const value = raw.slice("\u0000EXCELTEXT:".length).replace(/"/g, '""');
              return `"=""${value}"""`;
            }

            const s = raw;
            // Escape formula injection: a cell starting with = + - @ is executed
            // by Excel on open. Registration data ends up in spreadsheets, and
            // a name field is a perfectly good delivery vector.
            const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
            return `"${safe.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");

    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "dashboard.export",
      entity: "club",
      entity_id: wantsAll ? "all" : (requested ?? user.clubIds[0]),
      detail: { rows: rows.length },
    });

    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="r4r-${wantsAll ? "all-clubs" : (requested ?? user.clubIds[0])}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
