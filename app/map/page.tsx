"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { clubEvents } from "@/data/clubs";

type CampusMap = { id: string; label: string; src: string; alt: string };

const maps: CampusMap[] = [
  {
    id: "north",
    label: "North Zone",
    src: "/map/campus-north.png",
    alt: "Top-down map of the north festival zone showing the Main Auditorium, Sports Arena, Open Stage, Central Courtyard and Festival Grounds",
  },
  {
    id: "south",
    label: "South Zone",
    src: "/map/campus-south.png",
    alt: "Top-down map of the south academic zone showing the Innovation Lab, Robotics Lab, Computer Lab, Seminar Halls, Media Studio and Executive Hall",
  },
];

const venues = Array.from(new Set(clubEvents.map((event) => event.venue))).sort((a, b) =>
  a.localeCompare(b),
);

function Lightbox({ map, onClose }: { map: CampusMap; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="map-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${map.label} enlarged map`}
      onClick={onClose}
    >
      <button
        className="modal-close"
        type="button"
        onClick={onClose}
        aria-label="Close enlarged map"
      >
        ×
      </button>
      <p className="map-lightbox-hint">Scroll or pinch to zoom · click anywhere to close</p>
      <div className="map-lightbox-canvas" onClick={(event) => event.stopPropagation()}>
        <Image
          src={map.src}
          alt={map.alt}
          width={1600}
          height={1200}
          sizes="100vw"
          className="map-lightbox-image"
        />
      </div>
    </div>
  );
}

export default function MapPage() {
  const [active, setActive] = useState(maps[0].id);
  const [zoomed, setZoomed] = useState(false);
  const current = maps.find((map) => map.id === active) ?? maps[0];

  return (
    <div className="festival-page">
      <main className="map-main">
        <div className="page-art" data-word="MAPS" aria-hidden="true">
          <span>MAPS</span>
        </div>
        <header className="map-header">
          <p className="eyebrow">Wayfinding // ground truth</p>
          <h1>
            Campus <span>map.</span>
          </h1>
          <p>
            Lost and in a hurry? Pinch to zoom on mobile, click to enlarge on desktop. Match any
            event to its building with the venue index below.
          </p>
        </header>

        <div className="map-tabs" role="tablist" aria-label="Campus zones">
          {maps.map((map) => (
            <button
              key={map.id}
              role="tab"
              type="button"
              aria-selected={active === map.id}
              className={active === map.id ? "map-tab active" : "map-tab"}
              onClick={() => setActive(map.id)}
            >
              {map.label}
            </button>
          ))}
        </div>

        <section className="map-viewport" aria-label={`${current.label} map`}>
          <button
            type="button"
            className="map-frame"
            onClick={() => setZoomed(true)}
            aria-label={`Enlarge ${current.label} map`}
          >
            <Image
              src={current.src}
              alt={current.alt}
              width={1600}
              height={1200}
              sizes="(max-width: 900px) 100vw, 1000px"
              priority
              className="map-image"
            />
            <span className="map-zoom-badge" aria-hidden="true">
              ＋ Tap to zoom
            </span>
          </button>
        </section>

        <section className="venue-index" aria-labelledby="venue-index-title">
          <div className="section-heading">
            <p className="eyebrow">Venue index</p>
            <p className="venue-count">{venues.length} buildings</p>
          </div>
          <h2 id="venue-index-title" className="sr-only">
            List of all festival venues
          </h2>
          <ul className="venue-list">
            {venues.map((venue, index) => (
              <li key={venue} className="venue-item">
                <span className="venue-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="venue-name">{venue}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      {zoomed && <Lightbox map={current} onClose={() => setZoomed(false)} />}
    </div>
  );
}
