import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getTicketsForUser } from "@/lib/ticket-data";
import { TicketsView } from "@/components/tickets-view";

/**
 * Server-rendered on purpose: the tickets are in the HTML on first paint, so
 * there is no spinner while a request round-trips over congested fest wifi.
 * At a gate with a queue behind you, that matters.
 */
export default async function TicketsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const tickets = await getTicketsForUser(user.id);

  return (
    <div className="gated-page-shell">
      <TicketsView name={user.name} tickets={tickets} />
    </div>
  );
}
