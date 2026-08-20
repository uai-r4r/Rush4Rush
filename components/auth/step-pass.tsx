"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiPost, apiUpload } from "@/lib/api-client";

/**
 * Festival pass payment, collected during signup.
 *
 * Same three outcomes as the enroll modal — free, Razorpay, manual UPI —
 * because it calls the same create_checkout function underneath. The only
 * difference is that no club event is attached.
 *
 * ABANDONMENT IS SAFE, and the flow depends on that. If someone closes the tab
 * here they have an account and no pass, and quote() still adds the pass to
 * their first enrolment exactly as it does today. Nothing is stranded and
 * nobody is charged twice. This step also skips ITSELF on a later visit,
 * because the server answers "already_held" before any UI renders.
 *
 * Styling reuses the classes the enroll modal already uses (auth-field,
 * auth-hint, verified-email, event-detail-grid) plus inline styles for the QR
 * block, so this needs no additions to globals.css.
 */

type PassResponse =
  | { status: "already_held"; amountInr: number }
  | { status: "confirmed"; paymentId: string; amountInr: number }
  | {
      status: "razorpay";
      paymentId: string;
      amountInr: number;
      order: { id: string; amount: number; currency: string; keyId?: string };
    }
  | {
      status: "manual_upi";
      paymentId: string;
      amountInr: number;
      upi: {
        id: string | null;
        payeeName: string | null;
        amountInr: number;
        note: string;
      };
    };

type Stage = "loading" | "review" | "working" | "upi" | "error";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function StepPass({
  firstRef,
  onDone,
}: {
  firstRef: React.RefObject<HTMLButtonElement | HTMLInputElement | null>;
  /** Called once the pass is paid, comped, already held, or awaiting review. */
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [result, setResult] = useState<PassResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [payerRef, setPayerRef] = useState("");
  const [uploading, setUploading] = useState(false);
  const started = useRef(false);

  /**
   * Ask the server what this person owes before showing anything. An organiser
   * or someone who already paid should never see a payment screen at all.
   *
   * The ref guard matters: StrictMode mounts effects twice in dev, and without
   * it that becomes two payment rows for one signup.
   */
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    apiPost<PassResponse>("/api/pass/checkout")
      .then((data) => {
        if (data.status === "already_held" || data.status === "confirmed") {
          onDone();
          return;
        }
        setResult(data);
        setStage("review");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load the pass.");
        setStage("error");
      });
    // Runs once, on purpose — re-running creates a second payment row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fee = result?.amountInr ?? 0;

  async function pay() {
    if (!result) return;
    setError(null);

    if (result.status === "manual_upi") {
      setStage("upi");
      return;
    }
    if (result.status !== "razorpay") return;

    setStage("working");
    const ready = await loadRazorpay();
    if (!ready) {
      setError("Could not load the payment window. Check your connection and retry.");
      setStage("error");
      return;
    }

    const rzp = new window.Razorpay!({
      key: result.order.keyId,
      order_id: result.order.id,
      amount: result.order.amount,
      currency: result.order.currency,
      name: "Rush4Rush 2026",
      description: "Festival pass - both days, food, DJ night",
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // The browser saying "paid" proves nothing — the server re-checks
          // the signature before anything is confirmed.
          await apiPost("/api/payments/razorpay/verify", {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment verification failed.");
          setStage("error");
        }
      },
      modal: { ondismiss: () => setStage("review") },
      theme: { color: "#ff2d87" },
    });
    rzp.open();
  }

  async function submitProof() {
    if (!file || !result || result.status !== "manual_upi") return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("paymentId", result.paymentId);
      form.append("proof", file);
      if (payerRef.trim()) form.append("payerRef", payerRef.trim());
      await apiUpload("/api/payments/manual", form);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (stage === "loading") {
    return <p className="auth-subtitle">Checking your pass...</p>;
  }

  if (stage === "error") {
    return (
      <div>
        <p className="auth-error">{error}</p>
        {/*
          Skipping is deliberate, not a loophole. The pass is charged at first
          enrolment anyway, so a payment failure must not trap someone inside
          signup with a working account they cannot reach.
        */}
        <button
          ref={firstRef as React.RefObject<HTMLButtonElement>}
          className="button button-primary auth-submit"
          type="button"
          onClick={onDone}
        >
          CONTINUE - PAY LATER
        </button>
      </div>
    );
  }

  if (stage === "upi" && result?.status === "manual_upi") {
    return (
      <div>
        <p className="auth-hint">
          Pay Rs.{result.upi.amountInr} and upload the screenshot. A club admin confirms it,
          usually within a few hours.
        </p>
        {result.upi.id ? (
          <div style={{ display: "grid", justifyItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
              <QRCodeSVG
                value={`upi://pay?pa=${encodeURIComponent(result.upi.id)}&pn=${encodeURIComponent(
                  result.upi.payeeName ?? "Rush4Rush",
                )}&am=${result.upi.amountInr}&cu=INR&tn=${encodeURIComponent(result.upi.note)}`}
                size={172}
                level="M"
              />
            </div>
            <p className="verified-email">{result.upi.id}</p>
            <p className="auth-hint">
              Reference: <strong>{result.upi.note}</strong> — include it so your payment can be
              matched.
            </p>
          </div>
        ) : (
          <p className="auth-error">
            No UPI ID is configured yet. Skip for now — you can pay at your first event.
          </p>
        )}
        <label className="auth-field">
          <span>Payment screenshot</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="auth-field">
          <span>UPI reference (optional)</span>
          <input
            value={payerRef}
            onChange={(e) => setPayerRef(e.target.value)}
            placeholder="12-digit UTR"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button
          className="button button-primary auth-submit"
          type="button"
          onClick={submitProof}
          disabled={!file || uploading}
        >
          {uploading ? "UPLOADING..." : "SUBMIT PROOF"}
        </button>
        <p className="auth-switch">
          <button className="auth-link" type="button" onClick={onDone}>
            Skip - pay at your first event
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="event-detail-grid">
        <div>
          <span>Festival pass</span>
          <strong>Rs. {fee}</strong>
        </div>
        <div>
          <span>Includes</span>
          <strong>Both days, food, DJ night</strong>
        </div>
      </div>
      <p className="auth-hint">
        One-time, for the whole festival. Club events are charged separately when you enrol.
      </p>
      {error && <p className="auth-error">{error}</p>}
      <button
        ref={firstRef as React.RefObject<HTMLButtonElement>}
        className="button button-primary auth-submit"
        type="button"
        onClick={pay}
        disabled={stage === "working"}
      >
        {stage === "working" ? "OPENING..." : `PAY RS.${fee}`}
      </button>
      <p className="auth-switch">
        <button className="auth-link" type="button" onClick={onDone}>
          Skip - pay at your first event
        </button>
      </p>
    </div>
  );
}
