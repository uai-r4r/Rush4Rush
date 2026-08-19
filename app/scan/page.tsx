import { redirect } from "next/navigation";
import { getCurrentUser, hasAtLeast } from "@/lib/auth-server";
import { createClient } from "@/lib/supabase/server";
import { VolunteerScanner } from "@/components/volunteer-scanner";

/**
 * Event list is fetched server-side so the dropdown is populated on first
 * paint. A volunteer opening this at the gate should not wait on a request
 * before they can start scanning.
 */
export default async function ScanRoute() {
  const user = await getCurrentUser();
  if (!user || !hasAtLeast(user.role, "volunteer")) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.rpc("scannable_events");

  /**
   * One option per event, even for collabs. Level Up is a single row shared by
   * Dramatics and Techops, so a volunteer at either door picks the same entry
   * and every valid ticket scans green — which was not true when the collab
   * existed as two separate events.
   */
  type ScannableEvent = {
    id: string;
    name: string;
    day: number | null;
    is_entry_pass: boolean;
    club_names: string[] | null;
  };

  const events = ((data ?? []) as ScannableEvent[]).map((e) => {
    const clubs = (e.club_names as string[] | null) ?? [];
    const label = e.is_entry_pass
      ? `${e.name} (gate)`
      : clubs.length > 1
        ? `${e.name} (${clubs.join(" + ")})`
        : e.name;
    return { id: e.id, name: label };
  });

  return (
    <div className="gated-page-shell">
      <VolunteerScanner user={user} events={events} />
    </div>
  );
}
