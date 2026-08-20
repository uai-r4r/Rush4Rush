"use client";

import { useState } from "react";
import { StepChoosePath } from "./step-choose-path";
import { StepVerify } from "./step-verify";
import { StepAccountDetails } from "./step-account-details";
import { StepPass } from "./step-pass";
import { StepTicket } from "./step-ticket";

type Mode = "register" | "login";
type Step = "audience" | "verify" | "details" | "pass" | "done";
type RegistrationIntent = import("../auth-provider").EnrollmentIntent;

/**
 * Registration: choose path → verify email → details → festival pass → done.
 *
 * The pass is charged here rather than at first enrolment, so people know the
 * real cost of attending before they start picking events.
 *
 * The pass step is SKIPPABLE, and that matters. /api/registrations still adds
 * the pass to a first enrolment when it is missing, so someone who abandons or
 * fails payment here is not stranded — they have an account and pay later,
 * exactly as before. Making it mandatory would turn a payment hiccup into a
 * dead end with no way into the site.
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

  const stepNumber = { audience: 1, verify: 2, details: 3, pass: 4, done: 5 }[step];
  const title = step === "done" ? "YOU ARE IN" : "JOIN THE RUSH";

  return (
    <>
      <p className="eyebrow auth-eyebrow">R4R // 2026 · STEP {stepNumber} OF 4</p>
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
          // they just logged in. They still pass through the pass step, which
          // skips ITSELF if the server says they already hold one.
          onVerified={(needsDetails) => setStep(needsDetails ? "details" : "pass")}
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
          onNext={() => setStep("pass")}
        />
      )}

      {step === "pass" && (
        <StepPass firstRef={firstRef} onDone={() => setStep("done")} />
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
