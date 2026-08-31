"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll-reveal for cards and sections.
 *
 * Mounted once in layout.tsx; no page needs to know about it.
 *
 * Two things this has to handle that a naive version does not:
 *
 *  1. LATE CONTENT. /events, /schedule and /dashboard fetch their data after
 *     mount, so a one-shot querySelectorAll on mount finds an empty grid and
 *     never looks again. A MutationObserver picks up cards as they appear.
 *
 *  2. NAVIGATION. App Router keeps this component mounted across route
 *     changes, so without the pathname dependency the new page's cards are
 *     never observed.
 *
 * Elements are hidden by adding .reveal-init in JS rather than in the
 * stylesheet on purpose: if the script fails or JS is off, nothing is hidden
 * and the page reads normally instead of being blank.
 */

/** What gets revealed. Add selectors here, not data attributes in the JSX. */
const TARGETS = [
  ".events-grid > *",
  ".team-card",
  ".dept-card",
  ".gallery-item",
  ".stat-strip > *",
  ".about-section",
  ".schedule-block",
  ".showcase-card",
  "[data-reveal]",
].join(", ");

export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The gate scanner is a working tool in a queue — no animation there.
    if (pathname?.startsWith("/scan")) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    const seen = new WeakSet<Element>();

    function scan() {
      document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Already on screen at first paint (hero, stat strip): show it without
        // a transition, so the top of the page is never briefly blank.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) {
          el.classList.add("reveal-init", "reveal-in");
          return;
        }
        el.classList.add("reveal-init");
        io.observe(el);
      });
    }

    scan();

    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
