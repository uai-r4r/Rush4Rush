"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

/**
 * Fee amounts come from the API, not hardcoded here.
 *
 * They live in the settings table precisely so a price change is one SQL
 * statement. Hardcoding "Rs.50" into a button would leave this screen
 * confidently stating the wrong price until someone remembered to edit it.
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
        </button>
        <button
          type="button"
          className={`audience-card ${audience === "guest" ? "selected" : ""}`}
          onClick={() => setAudience("guest")}
        >
          <strong>GUEST</strong>
          <span>Join from another college.</span>
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <button className="button button-primary auth-submit">CONTINUE</button>
    </form>
  );
}
