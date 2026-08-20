"use client";

import { useState } from "react";
import { OtpInput, OtpResend, useOtpCountdown } from "./otp-input";
import { apiPost } from "@/lib/api-client";

/**
 * Login: email → 6-digit code. No password.
 *
 * Same two endpoints the register flow uses. With OTP there is genuinely no
 * difference between logging in and signing up — if the address is new an
 * account is created on verify, if not you just sign in. That is why there is
 * no "account already exists" dead end anywhere in this flow.
 */
export function LoginFlow({
  firstRef,
  onSuccess,
  onSwitch,
}: {
  firstRef: React.RefObject<HTMLButtonElement | HTMLInputElement | null>;
  onSuccess: (name: string) => void;
  onSwitch: (mode: "register" | "login") => void;
}) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useOtpCountdown(sent);

  const sendCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");

    setBusy(true);
    try {
      // The server decides which path this is from the domain, so login does
      // not need to ask whether they are a UAI student.
      await apiPost("/api/auth/otp/send", {
        email,
        path: email.toLowerCase().endsWith("@universalai.in") ? "uai" : "guest",
      });
      setSent(true);
      setSeconds(30);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError("");
    if (otp.length !== 6) return setError("Enter the 6-digit code.");

    setBusy(true);
    try {
      const data = await apiPost<{ needsDetails: boolean }>("/api/auth/otp/verify", {
        email,
        code: otp,
      });
      // Someone who never finished registering lands back in the details step
      // rather than into a half-made account.
      if (data.needsDetails) {
        onSwitch("register");
        return;
      }
      onSuccess(email.split("@")[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
      setOtp("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="eyebrow auth-eyebrow">R4R // 2026</p>
      <h2 id="auth-title">WELCOME BACK</h2>
      <p className="auth-subtitle">
        {sent ? `Code sent to ${email}.` : "No password needed — we'll email you a code."}
      </p>

      {!sent ? (
        <form onSubmit={sendCode}>
          <label className="auth-field">
            Email
            <input
              ref={firstRef as React.RefObject<HTMLInputElement>}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={busy}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? "SENDING…" : "SEND LOGIN CODE"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label className="auth-field">
            6-digit code
            {/* onComplete submits as soon as the last digit lands — one less tap */}
            <OtpInput value={otp} onChange={setOtp} onComplete={() => verify()} />
          </label>
          <OtpResend seconds={seconds} onResend={() => sendCode()} />
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? "VERIFYING…" : "VERIFY & LOGIN"}
          </button>
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setSent(false);
              setOtp("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="auth-switch">
        New here?{" "}
        <button className="auth-link" onClick={() => onSwitch("register")}>
          Register
        </button>
      </p>
    </>
  );
}
