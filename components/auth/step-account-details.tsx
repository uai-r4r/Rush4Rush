"use client";

import { useState } from "react";
import { CustomListbox } from "../custom-listbox";
import { apiPost } from "@/lib/api-client";

/**
 * Step 3 — name, phone, college, year.
 *
 * No password fields: that was the whole point of going OTP-only. No username
 * either — there is no username column, and nothing in the app addresses
 * people by handle.
 *
 * Phone is required, not optional. It is the gate fallback when a QR won't
 * scan, and a registration without one is a person who cannot be found at the
 * door.
 */
export function StepAccountDetails({
  firstRef,
  guest,
  email,
  name,
  setName,
  phone,
  setPhone,
  college,
  setCollege,
  year,
  setYear,
  error,
  setError,
  onNext,
}: {
  firstRef: React.RefObject<HTMLButtonElement | HTMLInputElement | null>;
  guest: boolean;
  email: string;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  college: string;
  setCollege: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  error: string;
  setError: (v: string) => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) return setError("Enter your full name.");
    if (phone.replace(/\D/g, "").length < 10) {
      return setError("Enter a 10-digit mobile number.");
    }
    if (!year) return setError("Select your year of study.");
    if (guest && !college.trim()) return setError("Enter your college name.");

    setBusy(true);
    try {
      await apiPost("/api/auth/profile", {
        fullName: name,
        phone,
        college: guest ? college : "Universal AI University",
        yearOfStudy: year,
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="verified-email">
        VERIFIED EMAIL <strong>{email}</strong>
      </div>

      <label className="auth-field">
        Full name
        <input
          ref={firstRef as React.RefObject<HTMLInputElement>}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          disabled={busy}
        />
      </label>

      <div className="auth-two-col">
        <label className="auth-field">
          Phone
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="10-digit mobile"
            disabled={busy}
          />
        </label>
        <label className="auth-field">
          Year of study
          <CustomListbox value={year} onChange={setYear} />
        </label>
      </div>

      {guest && (
        <label className="auth-field">
          College name
          <input
            value={college}
            onChange={(event) => setCollege(event.target.value)}
            placeholder="Your college"
            disabled={busy}
          />
        </label>
      )}

      {error && <p className="auth-error">{error}</p>}
      <button className="button button-primary auth-submit" disabled={busy}>
        {busy ? "SAVING…" : "CONTINUE"}
      </button>
    </form>
  );
}
