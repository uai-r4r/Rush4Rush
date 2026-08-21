"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import type { TeamInfo } from "@/lib/ticket-data";

/**
 * The team block on a ticket card.
 *
 * Everyone in the team sees the code and how full it is. Only the leader gets
 * "Add a place" — they are the one who paid, and /api/teams/upgrade enforces
 * that server-side regardless of what this component renders.
 *
 * Growing the team charges the DIFFERENCE between the size paid for and the
 * new size, both priced by team_fee() on the server. The extra seat does not
 * exist until the payment confirms — capacity rides on payments.team_capacity
 * and is applied by confirm_payment(), so closing the Razorpay window mid-flow
 * leaves the team exactly as it was.
 */

type UpgradeResponse =
  | { status: "confirmed"; capacity: number; amountInr: number }
  | {
      status: "razorpay";
      paymentId: string;
      amountInr: number;
      newSize: number;
      order: { id: string; amount: number; currency: string; keyId?: string };
    }
  | {
      status: "manual_upi";
      paymentId: string;
      amountInr: number;
      newSize: number;
      upi: {
        id: string | null;
        payeeName: string | null;
        amountInr: number;
        note: string;
      };
    };

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

export function TeamPanel({ team, eventName }: { team: TeamInfo; eventName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const full = team.members >= team.capacity;
  const canGrow = team.isLeader && team.capacity < team.maxTeamSize;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(team.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked on insecure origins and some in-app browsers.
      // The code is on screen anyway, so this is a nicety, not a dependency.
      setError("Couldn't copy — read the code out instead.");
    }
  }

  async function addPlace() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const data = await apiPost<UpgradeResponse>("/api/teams/upgrade", {
        teamId: team.id,
        newSize: team.capacity + 1,
      });

      if (data.status === "confirmed") {
        setNote("Place added. Refresh to see the new count.");
        setBusy(false);
        return;
      }

      if (data.status === "manual_upi") {
        setNote(
          `Pay Rs.${data.amountInr} to ${data.upi.id ?? "the festival UPI"} with reference ${data.upi.note}, then send the screenshot to your club admin. The place opens once it's verified.`,
        );
        setBusy(false);
        return;
      }

      const ready = await loadRazorpay();
      if (!ready) {
        setError("Could not load the payment window. Check your connection and retry.");
        setBusy(false);
        return;
      }

      const rzp = new window.Razorpay!({
        key: data.order.keyId,
        order_id: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Rush4Rush 2026",
        description: `${eventName} — one more place`,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiPost("/api/payments/razorpay/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            // Server-rendered page — a reload is the simplest way to show the
            // new capacity without duplicating the state here.
            window.location.reload();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: "#ff2d87" },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add a place.");
      setBusy(false);
    }
  }

  return (
    <div className="team-panel">
      <div className="team-panel-row">
        <span className="ticket-label">TEAM CODE</span>
        <button type="button" className="team-code" onClick={copyCode}>
          {team.code}
          <span className="team-code-hint">{copied ? "COPIED" : "TAP TO COPY"}</span>
        </button>
      </div>

      <p className="team-panel-count">
        {team.members} of {team.capacity} places filled
        {full && team.capacity < team.maxTeamSize && " — team is full"}
        {full && team.capacity >= team.maxTeamSize && " — at the event maximum"}
      </p>

      {!team.isLeader && !full && (
        <p className="team-panel-hint">Share this code with the rest of your team.</p>
      )}

      {team.isLeader && (
        <>
          <p className="team-panel-hint">
            Share this code — whoever enters it takes one of your paid places.
          </p>
          {canGrow ? (
            <button
              type="button"
              className="button button-primary team-add"
              onClick={addPlace}
              disabled={busy}
            >
              {busy ? "OPENING..." : "ADD A PLACE — PAY THE DIFFERENCE"}
            </button>
          ) : (
            team.capacity >= team.maxTeamSize && (
              <p className="team-panel-hint">
                {eventName} allows at most {team.maxTeamSize} per team.
              </p>
            )
          )}
        </>
      )}

      {note && <p className="team-panel-note">{note}</p>}
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
