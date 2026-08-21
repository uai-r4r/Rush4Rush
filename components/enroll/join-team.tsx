"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api-client";

/**
 * Join a team by code.
 *
 * Kept to one input and one button — this gets used on a phone, often while
 * reading a code out of a group chat. Uppercases as you type so nobody has to
 * think about it, and the code alphabet excludes 0/O and 1/I because those get
 * misread constantly when retyped.
 */
export function JoinTeam({ onJoined }: { onJoined?: (eventName: string) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<{ eventName: string; members: number } | null>(null);

  async function submit() {
    if (code.trim().length < 4) {
      setError("Enter the code your team leader shared.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ eventName: string; members: number }>("/api/teams/join", {
        code: code.trim(),
      });
      setJoined(res);
      onJoined?.(res.eventName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join that team.");
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <div className="team-joined">
        <p className="ticket-label">YOU&apos;RE IN</p>
        <h3>{joined.eventName}</h3>
        <p className="auth-hint">
          {joined.members} in the team. Your ticket is under My Tickets.
        </p>
        <a className="button button-primary" href="/tickets">
          VIEW MY TICKET
        </a>
      </div>
    );
  }

  return (
    <div className="team-join">
      <label className="auth-field">
        <span>TEAM CODE</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. K7M2QP"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={10}
          className="team-code-input"
        />
      </label>
      {error && <p className="auth-error">{error}</p>}
      <button
        className="button button-primary"
        type="button"
        disabled={busy}
        onClick={submit}
      >
        {busy ? "JOINING…" : "JOIN TEAM"}
      </button>
      <p className="auth-hint">
        No extra charge — your leader paid the event fee, and you already have your festival pass.
      </p>
    </div>
  );
}
