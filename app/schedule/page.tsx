"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clubEvents, type ClubEvent } from "@/data/clubs";

const hours = Array.from({ length: 11 }, (_, i) => 10 + i);
const colors: Record<ClubEvent["category"], string> = {
  Culture: "#ff1498",
  Business: "#ffc857",
  Tech: "#16d7ed",
  Sports: "#68e05f",
  Social: "#9b6cff",
};
function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function isNow(event: ClubEvent) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= minutes(event.startTime) && current < minutes(event.endTime);
}

function EventModal({ event, onClose }: { event: ClubEvent; onClose: () => void }) {
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
        <p className="eyebrow">Event brief // day {event.day}</p>
        <p className="event-category">{event.category}</p>
        <h2 id="schedule-event-title">{event.eventName}</h2>
        <p className="event-modal-club">Hosted by {event.club}</p>
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
          onClick={() => console.log("[v0] initiatePayment", event.id)}
        >
          Enroll — Rs.{event.fee}
        </button>
      </div>
    </div>
  );
}

function ScheduleBlock({
  event,
  onOpen,
}: {
  event: ClubEvent;
  onOpen: (event: ClubEvent, trigger: HTMLButtonElement) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const top = ((minutes(event.startTime) - 600) / 60) * 72;
  const height = ((minutes(event.endTime) - minutes(event.startTime)) / 60) * 72;
  return (
    <button
      ref={ref}
      className="schedule-block"
      style={{ top, height, borderLeftColor: colors[event.category] }}
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
  const [selected, setSelected] = useState<ClubEvent | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const events = useMemo(
    () =>
      clubEvents
        .filter((e) => e.day === day)
        .sort((a, b) => minutes(a.startTime) - minutes(b.startTime)),
    [day],
  );
  const close = () => {
    setSelected(null);
    setTimeout(() => trigger.current?.focus(), 0);
  };
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
        <section className="timeline-desktop" aria-label={`Day ${day} event timeline`}>
          <div className="timeline-hours">
            {hours.map((hour) => (
              <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
            ))}
          </div>
          <div className="timeline-canvas">
            {hours.map((hour) => (
              <div className="hour-line" key={hour} style={{ top: (hour - 10) * 72 }} />
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
                  top: `${((new Date().getHours() * 60 + new Date().getMinutes() - 600) / 60) * 72}px`,
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
              style={{ borderLeftColor: colors[event.category] }}
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
      </main>
      {selected && <EventModal event={selected} onClose={close} />}
    </div>
  );
}
