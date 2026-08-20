"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { Ticket, TicketStatus } from "@/lib/ticket-data";

/**
 * Renders real tickets. Markup and class names are unchanged from the v0 mock,
 * so the existing pass-card styling applies untouched — only the data source
 * moved from a hardcoded array to the database.
 */

const statusLabels: Record<TicketStatus, string> = {
  paid: "PAID",
  pending: "PENDING VERIFICATION",
  "checked-in": "CHECKED IN",
};

function PassCard({ ticket }: { ticket: Ticket }) {
  return (
    <article className="pass-card">
      <div className="pass-card-main">
        <div className="pass-heading">
          <span className="ticket-label">{ticket.isEntryPass ? "ENTRY PASS" : "EVENT PASS"}</span>
          <span className={`pass-status pass-status-${ticket.status}`}>
            {statusLabels[ticket.status]}
          </span>
        </div>
        <h2>{ticket.eventName}</h2>
        <p className="pass-club">{ticket.clubName}</p>
        <div className="pass-meta">
          <span>{ticket.day}</span>
          <span>{ticket.time}</span>
          <span>{ticket.venue}</span>
        </div>
        <p className="pass-reference">{ticket.registrationId.slice(0, 8).toUpperCase()}</p>
      </div>

      {ticket.token ? (
        <div className="pass-qr" aria-label={`QR code for ${ticket.eventName}`}>
          <QRCodeSVG
            value={ticket.token}
            size={196}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin
          />
        </div>
      ) : (
        // Deliberately not a QR. Showing the person WHY there's no code beats
        // an empty space — otherwise they assume the site lost their payment
        // and pay a second time.
        <div className="pass-qr pass-qr-pending" aria-label="Awaiting verification">
          <p className="ticket-label">AWAITING VERIFICATION</p>
          <p>Your QR appears here once an organiser confirms your payment.</p>
        </div>
      )}
    </article>
  );
}

export function TicketsView({ name, tickets }: { name: string; tickets: Ticket[] }) {
  return (
    <main className="tickets-shell">
      <header className="tickets-header">
        <p className="eyebrow">R4R // TICKETS</p>
        <h1>
          YOUR ACCESS
          <br />
          <em>IS LOCKED IN.</em>
        </h1>
        <p className="gated-copy">Welcome, {name}. Keep this screen ready at the gate.</p>
      </header>

      {tickets.length ? (
        <section className="passes-list" aria-label="Your passes">
          {tickets.map((ticket) => (
            <PassCard key={ticket.registrationId} ticket={ticket} />
          ))}
        </section>
      ) : (
        <section className="passes-empty">
          <span className="ticket-label">NO PASSES YET</span>
          <h2>
            MAKE YOUR
            <br />
            <em>FIRST MOVE.</em>
          </h2>
          <p>Find an event, pick a room, and make the festival yours.</p>
          <Link className="button button-primary" href="/events">
            Explore events
          </Link>
        </section>
      )}
    </main>
  );
}
