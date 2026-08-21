"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";
import { EnrollModal } from "@/components/enroll/enroll-modal";
import type { CurrentUser, UserRole } from "@/lib/auth";

/**
 * REPLACES the dev-cookie version. Same public interface — navbar.tsx and
 * every other consumer keep working untouched.
 *
 * Two things changed:
 *   · `user` now arrives from the server (layout.tsx resolves the real session
 *     and passes it down), so there is no hydration flicker and no client-side
 *     guess at who you are.
 *   · setRole()/RoleSwitcher are gone. Roles now live in the database, where
 *     they can't be changed by editing a cookie in DevTools. Delete
 *     components/role-switcher.tsx.
 */

type AuthMode = "register" | "login";

export type EnrollmentIntent = {
  eventId: string;
  eventName: string;
  fee: number;
  source: "event" | "hero";
  /** >1 means the enrol modal offers a team size picker. Defaults to solo. */
  minTeamSize?: number;
  maxTeamSize?: number;
};

type AuthContextValue = {
  openAuth: (mode: AuthMode, intent?: EnrollmentIntent) => void;
  openEnrollment: (intent: EnrollmentIntent) => void;
  user: CurrentUser | null;
  role: UserRole | null;
  logout: () => Promise<void>;
  intent: EnrollmentIntent | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: CurrentUser | null;
}) {
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [intent, setIntent] = useState<EnrollmentIntent | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const user = initialUser;

  // After signing in the page reloads, so pick the pending enrolment back up.
  useEffect(() => {
    if (!user) return;
    const stashed = sessionStorage.getItem("r4r:intent");
    if (!stashed) return;
    sessionStorage.removeItem("r4r:intent");
    try {
      setIntent(JSON.parse(stashed) as EnrollmentIntent);
      setEnrolling(true);
    } catch {
      /* malformed stash — ignore */
    }
  }, [user]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  /**
   * Enrolling while signed out opens registration; while signed in it goes
   * straight to payment. The intent is carried through so someone who clicks
   * "Enrol" on an event card lands back on that event afterwards rather than
   * on the homepage wondering what happened.
   */
  /**
   * Enrolling while signed out opens registration and REMEMBERS the event, so
   * after verifying they land back on payment for the thing they clicked —
   * not on the homepage wondering what happened.
   *
   * Signed in, it skips straight to payment.
   */
  const openEnrollment = (nextIntent: EnrollmentIntent) => {
    setIntent(nextIntent);
    if (user) {
      setEnrolling(true);
    } else {
      setMode("register");
    }
  };

  const openAuth = (nextMode: AuthMode, nextIntent?: EnrollmentIntent) => {
    setIntent(nextIntent ?? null);
    setMode(nextMode);
  };

  return (
    <AuthContext.Provider
      value={{ openAuth, openEnrollment, user, role: user?.role ?? null, logout, intent }}
    >
      {children}
      {enrolling && intent && (
        <EnrollModal
          intent={intent}
          onClose={() => {
            setEnrolling(false);
            setIntent(null);
          }}
        />
      )}
      {mode && (
        <AuthModal
          mode={mode}
          intent={intent}
          onClose={() => {
            setMode(null);
            setIntent(null);
          }}
          onSuccess={() => {
            setMode(null);
            // Refresh so server components pick up the new session. The intent
            // is stashed first so the enrol modal can reopen on the far side.
            if (intent) sessionStorage.setItem("r4r:intent", JSON.stringify(intent));
            window.location.reload();
          }}
          onSwitch={setMode}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
