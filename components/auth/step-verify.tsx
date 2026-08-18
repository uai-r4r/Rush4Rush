"use client";

import { useState } from "react";
import { OtpInput, OtpResend, useOtpCountdown } from "./otp-input";
import { apiPost } from "@/lib/api-client";

/**
 * Email + OTP verification, shared by both registration paths.
 *
 * Replaces step-uai-verify.tsx and step-guest-verify.tsx — they were the same
 * component with a different regex, and the domain rule now lives on the
 * server anyway (owning a @universalai.in address IS the student check, so it
 * has to be enforced somewhere the user can't edit).
 */
export function StepVerify({
  firstRef,
  path,
  email,
  setEmail,
  otp,
  setOtp,
  error,
  setError,
  onBack,
  onVerified,
}: {
  firstRef: React.RefObject<HTMLButtonElement | HTMLInputElement | null>;
  path: "uai" | "guest";
  email: string;
  setEmail: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  onBack: () => void;
  onVerified: (needsDetails: boolean) => void;
}) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useOtpCountdown(sent);

  const sendCode = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");

    setBusy(true);
    try {
      await apiPost("/api/auth/otp/send", { email, path });
      setSent(true);
      setSeconds(30);
      setOtp("");
    } catch (err) {
      // Server-side wrong-path messages land here, e.g. a gmail address on the
      // UAI path or a college address on the guest path.
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError("");
    if (otp.length !== 6) return setError("Enter the 6-digit code.");

    setBusy(true);
    try {
      const data = await apiPost<{ needsDetails: boolean }>("/api/auth/otp/verify", {
        email,
        code: otp,
      });
      onVerified(data.needsDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
      setOtp("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void (sent ? verify() : sendCode());
      }}
    >
      <label className="auth-field">
        {path === "uai" ? "UAI email" : "Email"}
        <input
          ref={firstRef as React.RefObject<HTMLInputElement>}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={path === "uai" ? "name.surname@universalai.in" : "you@example.com"}
          disabled={busy || sent}
        />
      </label>

      {path === "guest" && !sent && (
        <p className="auth-hint">
          Guests pay a Rs.100 festival entry pass — added when you enrol for your
          first event.
        </p>
      )}

      {sent && (
        <>
          <label className="auth-field">
            6-digit code
            <OtpInput value={otp} onChange={setOtp} onComplete={() => void verify()} />
          </label>
          <OtpResend seconds={seconds} onResend={() => void sendCode()} />
        </>
      )}

      {error && <p className="auth-error">{error}</p>}

      <button className="button button-primary auth-submit" disabled={busy}>
        {busy ? "PLEASE WAIT…" : sent ? "VERIFY CODE" : "SEND CODE"}
      </button>
      <button
        type="button"
        className="auth-link"
        onClick={() => {
          if (sent) {
            setSent(false);
            setOtp("");
            setError("");
          } else onBack();
        }}
      >
        ← {sent ? "Change email" : "Back"}
      </button>
    </form>
  );
}
