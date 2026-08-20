"use client";

import Link from "next/link";
import { clubEvents } from "@/data/clubs";
import { ROLE_LABELS, type CurrentUser } from "@/lib/auth";

export function DashboardPage({ user }: { user: CurrentUser }) {
  return (
    <main className="gated-shell">
      <p className="eyebrow">R4R // {ROLE_LABELS[user.role].toUpperCase()}</p>
      <h1>
        CONTROL
        <br />
        <em>THE RUSH.</em>
      </h1>
      <p className="gated-copy">
        Demo dashboard for club operations, attendance, and festival coordination.
      </p>
      <div className="gated-grid">
        <article>
          <span className="ticket-label">CHECK-INS</span>
          <strong>1,284</strong>
          <span>+18% from last hour</span>
        </article>
        <article>
          <span className="ticket-label">ACTIVE EVENTS</span>
          <strong>{clubEvents.length}</strong>
          <span>All systems nominal</span>
        </article>
      </div>
      <Link className="button button-secondary" href="/events">
        View events
      </Link>
    </main>
  );
}
export function ScanPage({ user }: { user: CurrentUser }) {
  return (
    <main className="gated-shell">
      <p className="eyebrow">R4R // ENTRY SCAN</p>
      <h1>
        LET THEM
        <br />
        <em>IN.</em>
      </h1>
      <p className="gated-copy">
        Volunteer scan station for {user.name}. Camera integration is staged for launch.
      </p>
      <div className="scan-frame">
        <span>QR SCANNER READY</span>
        <strong>POINT DEVICE AT PASS</strong>
      </div>
      <Link className="button button-primary" href="/">
        Back home
      </Link>
    </main>
  );
}

