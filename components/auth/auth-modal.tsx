"use client";

import { useEffect, useRef } from "react";
import { RegisterFlow } from "./register-flow";
import { LoginFlow } from "./login-flow";

type Mode = "register" | "login";

export function AuthModal({
  mode,
  intent,
  onClose,
  onSuccess,
  onSwitch,
}: {
  mode: Mode;
  intent?: import("../auth-provider").EnrollmentIntent | null;
  onClose: () => void;
  onSuccess: (name: string) => void;
  onSwitch: (mode: Mode) => void;
}) {
  const firstRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null);

  useEffect(() => {
    firstRef.current?.focus();
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [onClose]);

  return (
    <div
      className="auth-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" onClick={onClose} aria-label="Close authentication">
          ×
        </button>
        <div className="auth-panel">
          {mode === "register" ? (
            <RegisterFlow
              firstRef={firstRef}
              intent={intent}
              onSuccess={onSuccess}
              onSwitch={onSwitch}
            />
          ) : (
            <LoginFlow firstRef={firstRef} onSuccess={onSuccess} onSwitch={onSwitch} />
          )}
        </div>
      </section>
    </div>
  );
}
