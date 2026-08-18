import { redirect } from "next/navigation";
import { getCurrentUser, hasAtLeast } from "@/lib/auth-server";
import { OrganiserDashboard } from "@/components/organiser-dashboard";

export default async function DashboardRoute() {
  const user = await getCurrentUser();
  if (!user || !hasAtLeast(user.role, "club_admin")) redirect("/");
  return (
    <div className="gated-page-shell">
      <OrganiserDashboard user={user} />
    </div>
  );
}
