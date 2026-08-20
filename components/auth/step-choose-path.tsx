"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

/**
 * The prices come from /api/me/pass-status, which reads them from settings —
 * not hardcoded here. Fest pricing changes late, and a screen confidently
 * stating the wrong number is worse than one stating none, so the line simply
 * does not render until the real figure arrives.
 */
type PassFees = { uaiFeeInr: number; guestFeeInr: number };

export function StepChoosePath({
  firstRef,
  audience,
  setAudience,
  error,
  setError,
  onNext,
}: {
  firstRef: React.RefObject<HTMLButtonElement | HTMLInputElement | null>;
  audience: "uai" | "guest" | null;
  setAudience: (value: "uai" | "guest") => void;
  error: string;
  setError: (value: string) => void;
  onNext: () => void;
}) {
  const [fees, setFees] = useState<PassFees | null>(null);

  useEffect(() => {
    apiGet<PassFees>("/api/me/pass-status")
      .then((res) => setFees({ uaiFeeInr: res.uaiFeeInr, guestFeeInr: res.guestFeeInr }))
      // Silent on purpose. The fee line is useful, but a failed fetch must not
      // block someone from choosing how they are attending.
      .catch(() => setFees(null));
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!audience) return setError("Choose how you are attending.");
        onNext();
      }}
    >
      <div className="audience-grid">
        <button
          ref={firstRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className={`audience-card ${audience === "uai" ? "selected" : ""}`}
          onClick={() => setAudience("uai")}
        >
          <strong>UAI STUDENT</strong>
          <span>Verify with your university email.</span>
          {fees && (
            <span style={{ color: "var(--cyan)", fontSize: "0.78rem" }}>
              Rs.{fees.uaiFeeInr} festival pass — both days, food, DJ night
            </span>
          )}
        </button>
        <button
          type="button"
          className={`audience-card ${audience === "guest" ? "selected" : ""}`}
          onClick={() => setAudience("guest")}
        >
          <strong>GUEST</strong>
          <span>Join from another college.</span>
          {fees && (
            <span style={{ color: "var(--cyan)", fontSize: "0.78rem" }}>
              Rs.{fees.guestFeeInr} festival pass — both days, food, DJ night
            </span>
          )}
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <button className="button button-primary auth-submit">CONTINUE</button>
    </form>
  );
}
