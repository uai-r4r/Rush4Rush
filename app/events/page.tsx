"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { posters } from "@/data/posters";
import { useAuth } from "@/components/auth-provider";

const categories = ["All", "Culture", "Business", "Tech", "Sports", "Social"] as const;

/**
 * Shape returned by /api/events. Mirrors the old ClubEvent from data/clubs.ts
 * so the card and modal below did not need rewriting — but the values now come
 * from the database, so the price on the card is the price you get charged.
 */
/**
 * What the festival pass would cost the person currently looking. Fetched once
 * per page load from /api/me/pass-status.
 */
type PassStatus = {
  signedIn: boolean;
  hasPass: boolean;
  isOrganiser: boolean;
  entryFeeInr: number | null;
  uaiFeeInr: number;
  guestFeeInr: number;
};

/**
 * The line under a fee explaining the festival pass.
 *
 * The pass is bought during signup, so most signed-in people already hold one
 * and see nothing here — a card that keeps announcing a fee they have already
 * paid reads as a second charge.
 *
 * It still shows for people browsing logged out (so the total cost is honest
 * before they commit) and for anyone who abandoned signup before paying.
 */
function passNote(pass: PassStatus | null): string | null {
  if (!pass) return null;
  if (pass.hasPass || pass.isOrganiser) return null;
  if (!pass.signedIn) {
    return `Plus the festival pass, required to attend — Rs.${pass.uaiFeeInr} UAI students / Rs.${pass.guestFeeInr} guests`;
  }
  return `You still need the Rs.${pass.entryFeeInr} festival pass to attend`;
}

type ClubEvent = {
  id: string;
  eventName: string;
  club: string;
  clubs: string[];
  tagline: string;
  description: string;
  fee: number;
  day: number;
  startTime: string;
  endTime: string;
  venue: string;
  category: string;
  teamSize: string;
  minTeamSize: number;
  maxTeamSize: number;
  /** Set when a club prices sizes differently — card then shows "From Rs.X". */
  feeFrom: number | null;
  spansBothDays: boolean;
  isShowcase: boolean;
};

/**
 * "Day 1", or "Day 1-2" for events running across both.
 *
 * One helper rather than the same conditional in three places — a two-day
 * event mislabelled as Day 1 means people turn up once for something that
 * needed them twice.
 */
function dayLabel(event: ClubEvent): string {
  return event.spansBothDays ? "Day 1-2" : `Day ${event.day}`;
}

type Category = (typeof categories)[number];

function EventModal({
  event,
  onClose,
  onEnroll,
  pass,
}: {
  pass: PassStatus | null;
  event: ClubEvent;
  onClose: () => void;
  onEnroll: (event: ClubEvent) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
      if (keyboardEvent.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault();
        last.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="event-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="event-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
      >
        <button
          className="modal-close"
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close event details"
        >
          ×
        </button>
        <p className="eyebrow">Event brief // {dayLabel(event).toLowerCase()}</p>
        <p className="event-category">{event.category}</p>
        <h2 id="event-modal-title">{event.eventName}</h2>
        <p className="event-modal-club">Hosted by {event.club}</p>
        <p className="event-description">{event.description}</p>
        <div className="event-detail-grid">
          <div>
            <span>Schedule</span>
            <strong>
              {dayLabel(event)}, {event.startTime}–{event.endTime}
            </strong>
          </div>
          <div>
            <span>Venue</span>
            <strong>{event.venue}</strong>
          </div>
          <div>
            <span>Team size</span>
            <strong>{event.teamSize}</strong>
          </div>
          <div>
            <span>Entry</span>
            {/* Range where the club prices sizes differently — a single figure
                would contradict the size picker on the next screen. */}
            <strong>
              {event.feeFrom !== null
                ? `From Rs. ${event.feeFrom}`
                : event.fee === 0
                  ? "Free"
                  : `Rs. ${event.fee}`}
            </strong>
          </div>
        </div>
        {event.isShowcase ? (
          <p className="showcase-note">
            Open to everyone — just turn up. No registration needed.
          </p>
        ) : (
          <button
            className="button button-primary event-enroll"
            type="button"
            onClick={() => onEnroll(event)}
          >
            Enroll
          </button>
        )}
      </div>
    </div>
  );
}

function EventCard({
  event,
  onOpen,
  pass,
}: {
  event: ClubEvent;
  onOpen: (event: ClubEvent, element: HTMLButtonElement) => void;
  pass: PassStatus | null;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const poster = posters[event.id];
  return (
    <button
      className={poster ? "event-card has-poster" : "event-card"}
      ref={cardRef}
      type="button"
      onClick={() => cardRef.current && onOpen(event, cardRef.current)}
    >
      {poster && (
        <span className="event-card-poster" aria-hidden="true">
          <Image src={poster} alt="" fill sizes="(max-width: 900px) 1px, 33vw" />
        </span>
      )}
      <div className="event-card-top">
        <span className="event-category">{event.category}</span>
        <span className="event-day">{dayLabel(event)}</span>
      </div>
      <h2>{event.eventName}</h2>
      <p className="event-club">{event.club}</p>
      <div className="event-card-meta">
        <span>
          {event.feeFrom !== null
            ? `From Rs. ${event.feeFrom}`
            : event.fee === 0
              ? "Free"
              : `Rs. ${event.fee}`}
        </span>
        <span>{event.teamSize}</span>
      </div>
    </button>
  );
}

export default function EventsPage() {
  const { openEnrollment } = useAuth();
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [pass, setPass] = useState<PassStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    apiGet<{ events: ClubEvent[] }>("/api/events")
      .then((res) => setEvents(res.events))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));

    // Separate request so a failure here never blocks the lineup from
    // rendering — the note is helpful, but the events matter more.
    apiGet<PassStatus>("/api/me/pass-status")
      .then(setPass)
      .catch(() => setPass(null));
  }, []);

  const filtered = events.filter((event) => {
    const matchesCategory = category === "All" || event.category === category;
    const search = query.trim().toLowerCase();
    return (
      matchesCategory &&
      (!search ||
        `${event.eventName} ${event.club} ${event.category}`.toLowerCase().includes(search))
    );
  });
  const closeModal = () => {
    setSelected(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  return (
    <div className="festival-page events-page">
      <main className="events-main">
        <div className="page-art" data-word="EVENTS" aria-hidden="true">
          <span>EVENTS</span>
        </div>
        <header className="events-header">
          <p className="eyebrow">Protocol // lineup</p>
          <h1>
            Find your <span>event.</span>
          </h1>
          <p>
            {loading ? "Loading the lineup…" : `${events.length} ways to enter the rush.`} Filter
            the signal, find your crew, and claim your slot.
          </p>
        </header>
        <section className="event-controls" aria-label="Filter events">
          <div className="category-chips" role="group" aria-label="Filter by category">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "chip active" : "chip"}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">Search events</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events / clubs"
              type="search"
            />
          </label>
        </section>
        <p className="results-count">
          Showing {filtered.length} of {events.length} events
        </p>
        <section className="events-grid" aria-live="polite">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              pass={pass}
              onOpen={(item, element) => {
                triggerRef.current = element;
                setSelected(item);
              }}
            />
          ))}
        </section>
        {!filtered.length && (
          <p className="empty-state">No events match that signal. Try another filter.</p>
        )}
      </main>
      {selected && (
        <EventModal
          pass={pass}
          event={selected}
          onClose={closeModal}
          onEnroll={(event) =>
            openEnrollment({
              eventId: event.id,
              eventName: event.eventName,
              fee: event.fee,
              source: "event",
              minTeamSize: event.minTeamSize,
              maxTeamSize: event.maxTeamSize,
            })
          }
        />
      )}
    </div>
  );
}
