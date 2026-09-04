"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clubEvents } from "@/data/clubs";
import { merch, getMerchBySchool, type MerchSchool } from "@/data/merch";
import { useAuth } from "@/components/auth-provider";

const gallery = [
  {
    src: "/gallery/r4r-crowd.webp",
    alt: "Festival crowd under neon lights",
    className: "gallery-wide",
  },
  {
    src: "/gallery/r4r-stage.webp",
    alt: "Performer on the R4R stage",
    className: "gallery-tall",
  },
  {
    src: "/gallery/r4r-installation.webp",
    alt: "Students at a digital art installation",
    className: "gallery-mid",
  },
];

function MerchPopup({ onClose }: { onClose: () => void }) {
  const featured = merch[0];

  return (
    <div className="merch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="merch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merch-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close merch popup"
        >
          ×
        </button>

        <div className="modal-image">
          <Image
            src="/merch/r4r-polo-collage.webp"
            alt="R4R polos for all three schools"
            fill
            sizes="(max-width: 700px) 90vw, 400px"
          />
        </div>

        <div className="modal-copy">
          <p className="eyebrow">Limited drop // 001</p>
          <h2 id="merch-modal-title">
            Catch the vibe.
            <br />
            <span>Wear the R4R.</span>
          </h2>

          <p className="modal-price">
            School polos // Rs. {featured.price}
          </p>

          <Link
            className="button button-primary"
            href="#merch"
            onClick={onClose}
          >
            Shop the drop
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Second popup, shown once the merch one is dismissed.
 *
 * Rumble Racers takes no online registration, so it has no card in the events
 * grid and is easy to miss entirely — this is the only place it gets promoted
 * on the home page.
 */
function ShowcasePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="merch-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="merch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="showcase-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Only Rumble Racers gets this extra class */}
        <button
          className="modal-close showcase-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close popup"
        >
          ×
        </button>

        <div className="modal-image modal-image-dark">
          <Image
            src="/showcase/rumble-racers.webp"
            alt="Rumble Racers poster"
            fill
            sizes="(max-width: 700px) 90vw, 400px"
          />
        </div>

        <div className="modal-copy">
          <p className="eyebrow">Also at the fest // no sign-up</p>

          <h2 id="showcase-popup-title">
            Race. Fight.
            <br />
            <span>Dominate.</span>
          </h2>

          <p className="modal-price">
            Rumble Racers // Rs. 50 on site
          </p>

          <Link
            className="button button-primary"
            href="/events?section=showcase"
            onClick={onClose}
          >
            Check it out
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { openEnrollment } = useAuth();

  const [popup, setPopup] = useState<
    "none" | "merch" | "showcase"
  >("none");

  const [school, setSchool] = useState<MerchSchool>("music");
  const product = getMerchBySchool(school);
  const [size, setSize] = useState(product.sizes[1]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPopup("merch"), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!product.sizes.includes(size)) {
      setSize(product.sizes[1]);
    }
  }, [product, size]);

  return (
    <div id="top" className="festival-page">
      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">
              Live protocol <span>//</span> initiated
            </p>

            <h1 id="hero-title">
              <span className="hero-line">R4R: THE</span>
              <span className="hero-line">ULTIMATE</span>
              <span className="hero-line pink">COLLEGE</span>
              <span className="hero-line pink">FESTIVAL</span>
            </h1>

            <div className="hero-summary">
              <p>
                4th & 5th September. 21 clubs. 20 events. 1 unforgettable
                weekend. Plug into the digital rave and experience the most
                kinetic campus event of the year.
              </p>
            </div>

            <div className="hero-actions" id="register">
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  openEnrollment({
                    eventId: "festival-general",
                    eventName: "R4R Festival Entry",
                    fee: 0,
                    source: "hero",
                  })
                }
              >
                Register now
              </button>

              <Link className="button button-outline" href="/events">
                View lineup
              </Link>
            </div>
          </div>

          <div className="outline-art" aria-hidden="true">
            <span>R4R</span>
          </div>
        </section>

        <section className="stat-strip" aria-label="Festival statistics">
          <div>
            <strong>21</strong>
            <span>Clubs</span>
          </div>
          <div>
            <strong>20</strong>
            <span>Events</span>
          </div>
          <div>
            <strong>02</strong>
            <span>Days</span>
          </div>
          <div>
            <strong>01</strong>
            <span>Campus</span>
          </div>
        </section>

        <section className="gallery-section" id="about">
          <div className="section-heading">
            <p className="eyebrow">Archive // 2026</p>
            <h2>
              Last year <span>at R4R.</span>
            </h2>
          </div>

          <div className="gallery-grid">
            {gallery.map((item) => (
              <div className={`gallery-item ${item.className}`} key={item.src}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="merch-section" id="merch">
          <div className="merch-image">
            <Image
              key={product.image}
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 700px) 100vw, 55vw"
            />
          </div>

          <div className="merch-copy">
            <p className="eyebrow">Merch // Official uniform</p>

            <h2>
              Wear the <span>frequency.</span>
            </h2>

            <div
              className="audience-toggle school-toggle"
              role="group"
              aria-label="Choose your school"
            >
              {merch.map((item) => (
                <button
                  key={item.school}
                  type="button"
                  className={school === item.school ? "selected" : ""}
                  onClick={() => setSchool(item.school)}
                  aria-pressed={school === item.school}
                >
                  {item.shortName}
                </button>
              ))}
            </div>

            <p className="merch-school-name">{product.name}</p>
            <p className="merch-description">{product.description}</p>
            <p className="merch-price">Rs. {product.price}</p>

            <div className="size-selector" aria-label="Choose size">
              {product.sizes.map((item) => (
                <button
                  className={size === item ? "selected" : ""}
                  key={item}
                  type="button"
                  onClick={() => setSize(item)}
                  aria-pressed={size === item}
                >
                  {item}
                </button>
              ))}
            </div>

            <button className="button button-primary add-cart" type="button">
              Add to cart / {size}
            </button>

            <p className="micro-copy">
              One polo per school. Limited run, no restocks.
              <br />
              Ships after the festival protocol goes live.
            </p>
          </div>
        </section>

        <section className="closing-cta">
          <p className="eyebrow">
            Transmission ends // until next time
          </p>

          <h2>
            Enter the <span>rush.</span>
          </h2>

          <Link className="button button-outline" href="/events">
            Explore all events
          </Link>
        </section>
      </main>

      {popup === "merch" && (
        <MerchPopup onClose={() => setPopup("showcase")} />
      )}

      {popup === "showcase" && (
        <ShowcasePopup onClose={() => setPopup("none")} />
      )}
    </div>
  );
}