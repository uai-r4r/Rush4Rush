/**
 * Client-SAFE auth module: types and pure helpers only.
 *
 * Nothing here may import next/headers or any Supabase server client. This
 * file gets pulled into the browser bundle by navbar.tsx, gated-pages.tsx and
 * volunteer-scanner.tsx, and Next will fail the build if server-only code
 * follows it in — which is exactly the guardrail you want.
 *
 * Session lookup lives in lib/auth-server.ts.
 */

export type UserRole = "attendee" | "club_admin" | "volunteer" | "super_admin";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clubIds: string[];
  isUai: boolean;
  phone: string | null;
  college: string | null;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  attendee: "Attendee",
  club_admin: "Club Admin",
  volunteer: "Volunteer",
  super_admin: "Super Admin",
};

const ROLE_RANK = {
  attendee: 1,
  volunteer: 2,
  club_admin: 3,
  super_admin: 4,
} as const;

export function hasAtLeast(role: UserRole, minimum: UserRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isUserRole(value: string | undefined): value is UserRole {
  return (
    value === "attendee" ||
    value === "club_admin" ||
    value === "volunteer" ||
    value === "super_admin"
  );
}

/**
 * Convenience for the navbar. NOT a security boundary — hiding a link is
 * cosmetic and anyone can type the URL. The real gate is the server-side
 * requireUser() check inside each page and route.
 */
export function visibleNavLinks(role: UserRole | null) {
  if (!role) return [];
  const links: { label: string; href: string }[] = [];
  if (hasAtLeast(role, "attendee")) links.push({ label: "My Tickets", href: "/tickets" });
  if (hasAtLeast(role, "club_admin")) links.push({ label: "Dashboard", href: "/dashboard" });
  if (hasAtLeast(role, "volunteer")) links.push({ label: "Scan", href: "/scan" });
  return links;
}
