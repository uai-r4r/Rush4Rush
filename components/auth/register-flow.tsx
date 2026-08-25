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
 * choose path → verify email → details → festival pass → done.
 *
 * The pass is charged HERE rather than at enrolment because it is compulsory
 * for every attendee: both days, food, DJ night. Nobody gets in without one,
 * so collecting it up front is honest rather than a wall in front of an
 * optional extra.
 *
 * Club events afterwards cost only their own fee — lib/pricing.ts sees the
 * confirmed pass and stops adding it.
 *
 * The cost of charging this early is abandonment: someone who closes the tab
 * on the pass step has an account and no pass. StepVerify therefore routes a
 * returning user straight back here if they still owe it, so there is always a
 * way to finish.
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
          /**
           * Three outcomes, not two: brand-new users fill in details, users who
           * abandoned at payment go straight back to the pass step, and fully
           * registered users skip both. Without the middle case someone who
           * closed the tab mid-payment would be stranded with an account they
           * cannot use.
           */
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
