"use client";

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
