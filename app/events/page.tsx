"use client";

import { useEffect, useRef, useState } from "react";
import { clubEvents, type ClubEvent } from "@/data/clubs";
import { useAuth } from "@/components/auth-provider";

const categories = ["All", "Culture", "Business", "Tech", "Sports", "Social"] as const;

type Category = (typeof categories)[number];

function EventModal({
  event,
  onClose,
  onEnroll,
}: {
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
        <p className="eyebrow">Event brief // day {event.day}</p>
        <p className="event-category">{event.category}</p>
        <h2 id="event-modal-title">{event.eventName}</h2>
        <p className="event-modal-club">Hosted by {event.clubs.join(" × ")}</p>
        <p className="event-description">{event.description}</p>
        <div className="event-detail-grid">
          <div>
            <span>Schedule</span>
            <strong>
              Day {event.day}, {event.startTime}–{event.endTime}
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
            <strong>Rs. {event.fee}</strong>
          </div>
        </div>
        <button
          className="button button-primary event-enroll"
          type="button"
          onClick={() => onEnroll(event)}
        >
          Enroll — Rs.{event.fee}
        </button>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onOpen,
}: {
  event: ClubEvent;
  onOpen: (event: ClubEvent, element: HTMLButtonElement) => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  return (
    <button
      className="event-card"
      ref={cardRef}
      type="button"
      onClick={() => cardRef.current && onOpen(event, cardRef.current)}
    >
      <div className="event-card-top">
        <span className="event-category">{event.category}</span>
        <span className="event-day">Day {event.day}</span>
      </div>
      <h2>{event.eventName}</h2>
      <p className="event-club">{event.clubs.join(" × ")}</p>
      <div className="event-card-meta">
        <span>{event.fee === 0 ? "Free" : `Rs. ${event.fee}`}</span>
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const filtered = clubEvents.filter((event) => {
    const matchesCategory = category === "All" || event.category === category;
    const search = query.trim().toLowerCase();
    return (
      matchesCategory &&
      (!search ||
        `${event.eventName} ${event.clubs.join(" × ")} ${event.category}`.toLowerCase().includes(search))
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
            Twenty-three ways to enter the rush. Filter the signal, find your crew, and claim your
            slot.
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
          Showing {filtered.length} of {clubEvents.length} events
        </p>
        <section className="events-grid" aria-live="polite">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
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
          event={selected}
          onClose={closeModal}
          onEnroll={(event) =>
            openEnrollment({
              eventId: event.id,
              eventName: event.eventName,
              fee: event.fee,
              source: "event",
            })
          }
        />
      )}
    </div>
  );
}
