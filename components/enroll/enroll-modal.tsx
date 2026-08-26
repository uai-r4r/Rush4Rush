"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiGet, apiPost, apiUpload } from "@/lib/api-client";
import { CustomListbox } from "@/components/custom-listbox";
import type { EnrollmentIntent } from "@/components/auth-provider";

/**
 * The enrollment + payment flow.
 *
 * Note what this component never does: send a price. It posts eventIds and
 * nothing else. The server reads events.fee_inr, works out whether an entry
 * pass is owed, and returns the total. A client that could name its own price
 * is the oldest bug in online payments.
 *
 * Three outcomes come back from /api/registrations:
 *   confirmed   — ₹0 total (UAI student, free event). Ticket exists already.
 *   razorpay    — open checkout with the returned order.
 *   manual_upi  — show a UPI QR, take a screenshot, wait for a club admin.
 *
 * Which one you get is decided by settings.payment_mode plus whether Razorpay
 * keys are configured — so the same button works before and after KYC clears,
 * with no code change.
 */

type TeamInfo = { teamId: string; code: string; capacity: number };

type Quote = {
  items: { eventId: string; eventName: string; clubId: string; feeInr: number }[];
  needsEntryPass: boolean;
  entryPassInr: number;
  totalInr: number;
};

type EnrollResponse =
  | { status: "confirmed"; paymentId: string; quote: Quote; teams?: Record<string, TeamInfo> }
  | {
      status: "razorpay";
      paymentId: string;
      quote: Quote;
      teams?: Record<string, TeamInfo>;
      order: { id: string; amount: number; currency: string; keyId?: string };
    }
  | {
      status: "manual_upi";
      paymentId: string;
      quote: Quote;
      teams?: Record<string, TeamInfo>;
      upi: { id: string | null; payeeName: string | null; amountInr: number; note: string };
    };

type Stage = "review" | "details" | "working" | "upi" | "done" | "already" | "error";

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

export function EnrollModal({
  intent,
  onClose,
}: {
  intent: EnrollmentIntent;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("review");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrollResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [payerRef, setPayerRef] = useState("");
  // Defaults to the event's minimum, so a 2..4 event opens on 2 rather than
  // making the leader think about it.
  const [teamSize, setTeamSize] = useState(Math.max(1, intent.minTeamSize ?? 1));
  /**
   * Sizes come from the server, not from a min..max range.
   *
   * A club may offer solo, duo and four but not three. A contiguous picker
   * would show 3, and picking it would fall through to the flat event fee and
   * charge the wrong amount. Only sizes that have a price are offered.
   */
  const [sizeOptions, setSizeOptions] = useState<{ size: number; feeInr: number }[] | null>(
    null,
  );

  useEffect(() => {
    if ((intent.maxTeamSize ?? 1) <= 1) return;
    apiGet<{ options: { size: number; feeInr: number }[] }>(
      `/api/events/${encodeURIComponent(intent.eventId)}/team-pricing`,
    )
      .then((res) => {
        setSizeOptions(res.options);
        if (res.options.length > 0) setTeamSize(res.options[0].size);
      })
      .catch(() => setSizeOptions(null));
  }, [intent.eventId, intent.maxTeamSize]);
  // Inline profile completion — see the 409 branch in startEnrollment().
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function startEnrollment() {
    setStage("working");
    setError(null);
    try {
      const isTeam = (intent.maxTeamSize ?? 1) > 1;
      const data = await apiPost<EnrollResponse>("/api/registrations", {
        eventIds: [intent.eventId],
        ...(isTeam ? { teamSizes: { [intent.eventId]: teamSize } } : {}),
      });
      setResult(data);

      if (data.status === "confirmed") {
        setStage("done");
        return;
      }

      if (data.status === "razorpay") {
        const ready = await loadRazorpay();
        if (!ready) {
          setError("Could not load the payment window. Check your connection and retry.");
          setStage("error");
          return;
        }
        const rzp = new window.Razorpay!({
          key: data.order.keyId,
          order_id: data.order.id,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "Rush4Rush 2026",
          description: intent.eventName,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // The browser saying "paid" proves nothing — the server
              // re-checks the signature before anything is confirmed.
              await apiPost("/api/payments/razorpay/verify", {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              setStage("done");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Payment verification failed.");
              setStage("error");
            }
          },
          modal: { ondismiss: () => setStage("review") },
          theme: { color: "#ff2d87" },
        });
        rzp.open();
        return;
      }

      setStage("upi");
    } catch (err) {
      /**
       * Branch on the server's error CODE, not the status.
       *
       * PROFILE_INCOMPLETE and ALREADY_REGISTERED are both 409 but need
       * opposite responses — one asks for details, the other says you already
       * have a ticket. Reading the number alone sent already-enrolled people
       * to a form demanding details they had already given.
       */
      const code = (err as { code?: string })?.code;

      if (code === "PROFILE_INCOMPLETE") {
        // Recoverable inline: the register flow skips step 3 for an existing
        // account, so without this there is no route back to that form.
        setStage("details");
        return;
      }

      if (code === "ALREADY_REGISTERED") {
        setStage("already");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not start enrollment.");
      setStage("error");
    }
  }

  async function saveDetails() {
    setError(null);
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter a 10-digit mobile number.");
    if (!year) return setError("Select your year of study.");
    if (!college.trim()) return setError("Enter your college name.");

    setSavingDetails(true);
    try {
      await apiPost("/api/auth/profile", {
        fullName: name,
        phone,
        college,
        yearOfStudy: year,
      });
      await startEnrollment();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details.");
    } finally {
      setSavingDetails(false);
    }
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
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const quote = result?.quote;

  return (
    <div
      className="event-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="event-modal" role="dialog" aria-modal="true" aria-labelledby="enroll-title">
        <button
          className="modal-close"
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* ── Review ─────────────────────────────────────────────────────── */}
        {stage === "review" && (
          <>
            <p className="eyebrow">Enrolment // confirm</p>
            <h2 id="enroll-title">{intent.eventName}</h2>
            {(intent.maxTeamSize ?? 1) > 1 ? (
              <>
                <p className="auth-hint">
                  This is a team event. Pick how many you&apos;re paying for — you&apos;ll get a
                  code to share, and it admits exactly that many.
                </p>
                <label className="auth-field">
                  <span>TEAM SIZE</span>
                  <div className="team-size-picker">
                    {(sizeOptions ?? []).map((opt) => (
                      <button
                        key={opt.size}
                        type="button"
                        className={teamSize === opt.size ? "is-active" : ""}
                        onClick={() => setTeamSize(opt.size)}
                        aria-pressed={teamSize === opt.size}
                      >
                        {/* Price on the button — otherwise people pick blind
                            and only discover the cost on the next screen. */}
                        <strong>{opt.size === 1 ? "Solo" : `${opt.size} people`}</strong>
                        <span>Rs.{opt.feeInr}</span>
                      </button>
                    ))}
                    {sizeOptions === null && <span className="auth-hint">Loading sizes…</span>}
                  </div>
                </label>
                <p className="auth-hint">
                  Need another place later? Your leader can add one from the ticket and pay the
                  difference.
                </p>
              </>
            ) : (
              <p className="auth-hint">
                Confirm below and we&apos;ll work out your total — including the festival entry
                pass if you still need one.
              </p>
            )}
            <button className="button button-primary" type="button" onClick={startEnrollment}>
              CONTINUE
            </button>
          </>
        )}

        {/* ── Missing profile details ────────────────────────────────────── */}
        {stage === "details" && (
          <>
            <p className="eyebrow">Enrolment // your details</p>
            <h2 id="enroll-title">A couple of details first</h2>
            <p className="auth-hint">
              We need these before you can enrol — your phone number is how organisers find you at
              the door if your ticket won&apos;t scan.
            </p>

            <label className="auth-field">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={savingDetails}
              />
            </label>

            <div className="auth-two-col">
              <label className="auth-field">
                Phone
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  disabled={savingDetails}
                />
              </label>
              <label className="auth-field">
                Year of study
                <CustomListbox value={year} onChange={setYear} />
              </label>
            </div>

            <label className="auth-field">
              College
              <input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="College name"
                disabled={savingDetails}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="button button-primary"
              type="button"
              disabled={savingDetails}
              onClick={saveDetails}
            >
              {savingDetails ? "SAVING…" : "SAVE & CONTINUE"}
            </button>
          </>
        )}

        {/* ── Already registered ─────────────────────────────────────────── */}
        {stage === "already" && (
          <>
            <p className="eyebrow">Enrolment // already done</p>
            <h2 id="enroll-title">You&apos;re already in</h2>
            <p className="auth-hint">
              You&apos;re registered for {intent.eventName}. Your ticket is under My Tickets — if
              there&apos;s no QR on it yet, an organiser is still confirming your payment.
            </p>
            {result?.teams?.[intent.eventId] && (
              <div className="team-code-display">
                <span className="ticket-label">TEAM CODE</span>
                <strong className="team-code-value">
                  {result.teams[intent.eventId].code}
                </strong>
                <p className="auth-hint">
                  Share this with your team — it admits{" "}
                  {result.teams[intent.eventId].capacity - 1} more.
                </p>
              </div>
            )}
            <a className="button button-primary" href="/tickets">
              VIEW MY TICKETS
            </a>
          </>
        )}

        {stage === "working" && (
          <>
            <p className="eyebrow">Enrolment // working</p>
            <h2 id="enroll-title">One moment</h2>
            <p className="auth-hint">Setting up your registration…</p>
          </>
        )}

        {/* ── Manual UPI ─────────────────────────────────────────────────── */}
        {stage === "upi" && result?.status === "manual_upi" && (
          <>
            <p className="eyebrow">Enrolment // payment</p>
            <h2 id="enroll-title">Pay Rs.{result.upi.amountInr}</h2>

            {quote && (
              <div className="event-detail-grid">
                {quote.items.map((item) => (
                  <div key={item.eventId}>
                    <span>{item.eventName}</span>
                    <strong>Rs. {item.feeInr}</strong>
                  </div>
                ))}
                {quote.needsEntryPass && (
                  <div>
                    <span>Festival entry pass</span>
                    <strong>Rs. {quote.entryPassInr}</strong>
                  </div>
                )}
                <div>
                  <span>Total</span>
                  <strong>Rs. {quote.totalInr}</strong>
                </div>
              </div>
            )}

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
                UPI details haven&apos;t been set up yet. Please contact the organisers.
              </p>
            )}

            <label className="auth-field">
              <span>UPI REFERENCE / UTR (REQUIRED)</span>
              <input
                value={payerRef}
                onChange={(e) => setPayerRef(e.target.value)}
                placeholder="12-digit number from your UPI app"
                inputMode="numeric"
              />
            </label>

            <label className="auth-field">
              <span>UPLOAD PAYMENT SCREENSHOT</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="button button-primary"
              type="button"
              disabled={!file || payerRef.replace(/\D/g, "").length < 6 || uploading}
              onClick={submitProof}
            >
              {uploading ? "UPLOADING…" : "SUBMIT PAYMENT"}
            </button>
            <p className="auth-hint">
              A club organiser will verify it — your ticket appears once approved.
            </p>
          </>
        )}

        {/* ── Done ───────────────────────────────────────────────────────── */}
        {stage === "done" && (
          <>
            <p className="eyebrow">Enrolment // complete</p>
            <h2 id="enroll-title">
              {result?.status === "manual_upi" ? "Payment submitted" : "You're in"}
            </h2>
            <p className="auth-hint">
              {result?.status === "manual_upi"
                ? "We've got your screenshot. Once an organiser verifies it, your ticket and QR appear under My Tickets."
                : `You're registered for ${intent.eventName}. Your ticket and QR are ready.`}
            </p>
            {result?.teams?.[intent.eventId] && (
              <div className="team-code-display">
                <span className="ticket-label">TEAM CODE</span>
                <strong className="team-code-value">
                  {result.teams[intent.eventId].code}
                </strong>
                <p className="auth-hint">
                  Share this with your team — it admits{" "}
                  {result.teams[intent.eventId].capacity - 1} more.
                </p>
              </div>
            )}
            <a className="button button-primary" href="/tickets">
              VIEW MY TICKETS
            </a>
          </>
        )}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {stage === "error" && (
          <>
            <p className="eyebrow">Enrolment // problem</p>
            <h2 id="enroll-title">Couldn&apos;t complete that</h2>
            <p className="auth-error">{error}</p>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setError(null);
                setStage("review");
              }}
            >
              TRY AGAIN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
