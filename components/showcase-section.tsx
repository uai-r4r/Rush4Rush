"use client";

import Image from "next/image";
import { useState } from "react";
import { showcase, type ShowcaseEvent } from "@/data/showcase";

/**
 * Showcase — fest events with no online registration.
 *
 * Sits at the bottom of /events, below the registerable grid. These are
 * advertised, not sold: no fee row, no ticket, no QR. The card deliberately
 * has no Enroll button so nobody waits for one that never comes.
 */
function ShowcaseCard({ item }: { item: ShowcaseEvent }) {
  const [open, setOpen] = useState(false);
  const panelId = `showcase-${item.id}`;

  return (
    <article className="showcase-card">
      <div className="showcase-poster">
        <Image
          src={item.poster}
          alt={`${item.name} poster`}
          fill
          sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 30vw"
        />
      </div>

      <div className="showcase-body">
        <p className="showcase-club">{item.club}</p>
        <h3 className="showcase-name">{item.name}</h3>

        <dl className="showcase-meta">
          <div>
            <dt>When</dt>
            <dd>
              {item.day} · {item.time}
            </dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{item.venue}</dd>
          </div>
        </dl>

        {item.tags && item.tags.length > 0 && (
          <div className="showcase-tags">
            {item.tags.map((tag) => (
              <span className="showcase-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          className="showcase-toggle"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {open ? "Hide description" : "Description"}
          <span className={open ? "showcase-caret open" : "showcase-caret"} aria-hidden="true">
            ▾
          </span>
        </button>

        {/* Rendered always, hidden with [hidden], so the text is in the DOM for
            search and screen readers rather than mounted on click. */}
        <p className="showcase-description" id={panelId} hidden={!open}>
          {item.description}
        </p>
      </div>
    </article>
  );
}

export function ShowcaseSection() {
  if (showcase.length === 0) return null;

  return (
    <section
      className="showcase-section"
      id="also-at-the-fest"
      aria-labelledby="showcase-title"
    >
      <p className="eyebrow" id="showcase-title">
        Also at the fest
      </p>
      <p className="showcase-intro">
        No sign-up needed here — turn up on the day.
      </p>
      <div className="showcase-grid">
        {showcase.map((item) => (
          <ShowcaseCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default ShowcaseSection;
