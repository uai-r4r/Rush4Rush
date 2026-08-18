"use client";

import { useState } from "react";
import { StepChoosePath } from "./step-choose-path";
import { StepVerify } from "./step-verify";
import { StepAccountDetails } from "./step-account-details";
import { StepTicket } from "./step-ticket";

type Mode = "register" | "login";
type Step = "audience" | "verify" | "details" | "done";
type RegistrationIntent = import("../auth-provider").EnrollmentIntent;

/**
 * Registration is now account creation only: choose path → verify email →
 * details → done.
 *
 * The payment step is gone from here on purpose. Money is collected at ENROL
 * time via /api/registrations, which works out the entry pass automatically
 * (₹100 for guests, ₹0 for UAI students, skipped entirely if they already have
 * one). Charging during signup would mean guessing what they'll enrol in
 * before they've picked anything.
 */
export function RegisterFlow({
  firstRef,
  intent,
  onSuccess,
  onSwitch,
}: {
  firstRef: React.RefObject<HTMLButtonElement | HTMLInputElement | null>;
  intent?: RegistrationIntent | null;
  onSuccess: (name: string) => void;
  onSwitch: (mode: Mode) => void;
}) {
  const [step, setStep] = useState<Step>("audience");
  const [audience, setAudience] = useState<"uai" | "guest" | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  const stepNumber = { audience: 1, verify: 2, details: 3, done: 4 }[step];
  const title = step === "done" ? "YOU ARE IN" : "JOIN THE RUSH";

  return (
    <>
      <p className="eyebrow auth-eyebrow">R4R // 2026 · STEP {stepNumber} OF 3</p>
      <h2 id="auth-title">{title}</h2>
      <p className="auth-subtitle">One weekend. Every version of you.</p>

      {step === "audience" && (
        <StepChoosePath
          firstRef={firstRef}
          audience={audience}
          setAudience={setAudience}
          error={error}
          setError={setError}
          onNext={() => setStep("verify")}
        />
      )}

      {step === "verify" && audience && (
        <StepVerify
          firstRef={firstRef}
          path={audience}
          email={email}
          setEmail={setEmail}
          otp={otp}
          setOtp={setOtp}
          error={error}
          setError={setError}
          onBack={() => setStep("audience")}
          // Someone who already finished registering skips the details step —
          // they just logged in.
          onVerified={(needsDetails) => setStep(needsDetails ? "details" : "done")}
        />
      )}

      {step === "details" && (
        <StepAccountDetails
          firstRef={firstRef}
          guest={audience === "guest"}
          email={email}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          college={college}
          setCollege={setCollege}
          year={year}
          setYear={setYear}
          error={error}
          setError={setError}
          onNext={() => setStep("done")}
        />
      )}

      {step === "done" && (
        <StepTicket
          name={name}
          email={email}
          onSuccess={onSuccess}
          nextLabel={intent ? `CONTINUE TO ${intent.eventName.toUpperCase()}` : "ENTER THE RUSH"}
        />
      )}

      {step !== "done" && (
        <p className="auth-switch">
          Already registered?{" "}
          <button className="auth-link" onClick={() => onSwitch("login")}>
            Log in
          </button>
        </p>
      )}
    </>
  );
}
