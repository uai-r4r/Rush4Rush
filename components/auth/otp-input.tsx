"use client";

import { useEffect, useRef, useState } from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
};

export function OtpInput({ value, onChange, onComplete }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const update = (index: number, input: string) => {
    const digit = input.replace(/\D/g, "").slice(-1);
    const next = digits
      .map((current, currentIndex) => (currentIndex === index ? digit : current))
      .join("");
    onChange(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
    if (next.length === 6) onComplete?.(next);
  };

  const paste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  };

  return (
    <div className="otp-input" role="group" aria-label="6-digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          aria-label={`Digit ${index + 1}`}
          className={digit ? "filled" : ""}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(event) => update(index, event.target.value)}
          onPaste={paste}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit) {
              if (index > 0) {
                refs.current[index - 1]?.focus();
                const next = digits
                  .map((current, currentIndex) => (currentIndex === index - 1 ? "" : current))
                  .join("");
                onChange(next);
              }
            } else if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
            else if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function OtpResend({ seconds, onResend }: { seconds: number; onResend: () => void }) {
  return (
    <button type="button" className="otp-resend" disabled={seconds > 0} onClick={onResend}>
      {seconds > 0 ? `RESEND IN ${seconds}s` : "RESEND CODE"}
    </button>
  );
}

export function useOtpCountdown(active: boolean) {
  const [seconds, setSeconds] = useState(active ? 30 : 0);
  useEffect(() => {
    if (!active || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [active, seconds]);
  return [seconds, setSeconds] as const;
}
