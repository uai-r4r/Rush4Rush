"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";

/**
 * Schedule, served from the DATABASE rather than data/clubs.ts.
 *
 * The static file had 23 events including the two collabs that were merged, no
 * idea which events are published, and times that stopped matching reality the
 * first time a club moved its slot. People were reading a timetable that
 * disagreed with the ticket in their pocket.
 */

type ScheduleEvent = {
  id: string;
  eventName: string;
  club: string;
  clubs: string[];
  tagline: string;
  description: string;
  fee: number;
  feeFrom: number | null;
  day: number;
  startTime: string;
  endTime: string;
  venue: string;
  category: string;
  teamSize: string;
  minTeamSize: number;
  maxTeamSize: number;
  spansBothDays: boolean;
  isShowcase?: boolean;
};

const hours = Array.from({ length: 13 }, (_, i) => 8 + i);

const colors: Record<string, string> = {
  Culture: "#ff1498",
  Business: "#ffc857",
  Tech: "#16d7ed",
  Sports: "#68e05f",
  Social: "#9b6cff",
};
const fallbackColor = "#9b6cff";

function minutes(value: string) {
  if (!value) return 0;
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isNow(event: ScheduleEvent) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= minutes(event.startTime) && current < minutes(event.endTime);
}

/** "Day 1", or "Day 1-2" for events running across both. */
function dayLabel(event: ScheduleEvent) {
  return event.spansBothDays ? "Day 1-2" : `Day ${event.day}`;
}

function priceLabel(event: ScheduleEvent) {
  if (event.isShowcase) return "Open to all";
  if (event.feeFrom !== null) return `From Rs. ${event.feeFrom}`;
  return event.fee === 0 ? "Free" : `Rs. ${event.fee}`;
}

function EventModal({
  event,
  onClose,
  onEnroll,
}: {
  event: ScheduleEvent;
  onClose: () => void;
  onEnroll: (event: ScheduleEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const els = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button,[href],input,[tabindex]:not([tabindex="-1"])',
          ),
        ];
        if (els.length && e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (els.length && !e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="event-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="event-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-event-title"
      >
        <button
          className="modal-close"
          ref={closeRef}
          onClick={onClose}
          aria-label="Close event details"
        >
          ×
        </button>
        <p className="eyebrow">Event brief // {dayLabel(event).toLowerCase()}</p>
        <p className="event-category">{event.category}</p>
        <h2 id="schedule-event-title">{event.eventName}</h2>
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
            <strong>{priceLabel(event)}</strong>
          </div>
        </div>
        {event.isShowcase ? (
          <p className="showcase-note">
            Open to everyone — just turn up. No registration needed.
          </p>
        ) : (
          <button
            className="button button-primary event-enroll"
            onClick={() => onEnroll(event)}
          >
            Enroll
          </button>
        )}
      </div>
    </div>
  );
}

function ScheduleBlock({
  event,
  onOpen,
}: {
  event: ScheduleEvent;
  onOpen: (event: ScheduleEvent, trigger: HTMLButtonElement) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // Timeline starts at 08:00 rather than 10:00 — futsal opens at 09:00 and was
  // being drawn above the top of the canvas.
  const top = ((minutes(event.startTime) - 480) / 60) * 72;
  const height = Math.max(
    48,
    ((minutes(event.endTime) - minutes(event.startTime)) / 60) * 72,
  );
  return (
    <button
      ref={ref}
      className="schedule-block"
      style={{
        top,
        height,
        borderLeftColor: colors[event.category] ?? fallbackColor,
      }}
      onClick={() => ref.current && onOpen(event, ref.current)}
    >
      <strong>{event.eventName}</strong>
      <span>{event.club}</span>
      <small>{event.venue}</small>
      {isNow(event) && <i className="now-dot" aria-label="Happening now" />}
    </button>
  );
}

export default function SchedulePage() {
  const [day, setDay] = useState<1 | 2>(1);
  const [all, setAll] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const { openEnrollment } = useAuth();

  useEffect(() => {
    apiGet<{ events: ScheduleEvent[] }>("/api/events")
      .then((res) => setAll(res.events))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(
    () =>
      all
        // A two-day event belongs on BOTH tabs — someone checking Day 2 for
        // the futsal tournament must not conclude it isn't running.
        .filter((e) => e.day === day || e.spansBothDays)
        .sort((a, b) => minutes(a.startTime) - minutes(b.startTime)),
    [all, day],
  );

  const close = () => {
    setSelected(null);
    setTimeout(() => trigger.current?.focus(), 0);
  };

  function enroll(event: ScheduleEvent) {
    setSelected(null);
    openEnrollment({
      eventId: event.id,
      eventName: event.eventName,
      fee: event.fee,
      source: "event",
      minTeamSize: event.minTeamSize,
      maxTeamSize: event.maxTeamSize,
    });
  }

  return (
    <div className="festival-page">
      <main className="schedule-main">
        <div className="page-art" data-word="SCHEDULE" aria-hidden="true">
          <span>SCHEDULE</span>
        </div>
        <header className="schedule-header">
          <p className="eyebrow">Protocol // live map</p>
          <h1>
            Event <span>schedule.</span>
          </h1>
          <p>See the rush in motion. Spot clashes, find your route, and move with the campus.</p>
        </header>
        <div className="schedule-tabs" role="tablist">
          {([1, 2] as const).map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={day === item}
              className={day === item ? "schedule-tab active" : "schedule-tab"}
              onClick={() => setDay(item)}
            >
              Day {item}
            </button>
          ))}
        </div>
        <div className="schedule-legend">
          <span>Legend</span>
          {Object.entries(colors).map(([name, color]) => (
            <span key={name}>
              <i style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="gated-copy">Loading the schedule…</p>
        ) : events.length === 0 ? (
          <p className="gated-copy">Nothing scheduled for day {day} yet.</p>
        ) : (
          <>
            <section className="timeline-desktop" aria-label={`Day ${day} event timeline`}>
              <div className="timeline-hours">
                {hours.map((hour) => (
                  <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
                ))}
              </div>
              <div className="timeline-canvas">
                {hours.map((hour) => (
                  <div className="hour-line" key={hour} style={{ top: (hour - 8) * 72 }} />
                ))}
                {events.map((event) => (
                  <ScheduleBlock
                    key={event.id}
                    event={event}
                    onOpen={(e, t) => {
                      trigger.current = t;
                      setSelected(e);
                    }}
                  />
                ))}
                {events.some(isNow) && (
                  <div
                    className="now-line"
                    style={{
                      top: `${((new Date().getHours() * 60 + new Date().getMinutes() - 480) / 60) * 72}px`,
                    }}
                  >
                    <span>NOW</span>
                  </div>
                )}
              </div>
            </section>
            <section className="schedule-mobile">
              <p className="mobile-only-label">Day {day} // by hour</p>
              {events.map((event) => (
                <button
                  key={event.id}
                  className="schedule-mobile-item"
                  onClick={() => setSelected(event)}
                  style={{ borderLeftColor: colors[event.category] ?? fallbackColor }}
                >
                  <span>
                    {event.startTime}–{event.endTime}
                  </span>
                  <strong>{event.eventName}</strong>
                  <small>
                    {event.club} // {event.venue}
                  </small>
                </button>
              ))}
            </section>
          </>
        )}
      </main>
      {selected && (
        <EventModal event={selected} onClose={close} onEnroll={enroll} />
      )}
    </div>
  );
}
