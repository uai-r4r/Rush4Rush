"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clubEvents } from "@/data/clubs";
import { getMerchByAudience, type MerchAudience } from "@/data/merch";
import { useAuth } from "@/components/auth-provider";

const gallery = [
  {
    src: "/gallery/r4r-crowd.png",
    alt: "Festival crowd under neon lights",
    className: "gallery-wide",
  },
  {
    src: "/gallery/r4r-stage.png",
    alt: "Performer on the R4R stage",
    className: "gallery-tall",
  },
  {
    src: "/gallery/r4r-installation.png",
    alt: "Students at a digital art installation",
    className: "gallery-mid",
  },
];

function MerchPopup({ onClose }: { onClose: () => void }) {
  const featured = getMerchByAudience("UG");
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
            src={featured.image}
            alt={featured.name}
            fill
            sizes="(max-width: 700px) 90vw, 420px"
          />
        </div>
        <div className="modal-copy">
          <p className="eyebrow">Limited drop // 001</p>
          <h2 id="merch-modal-title">
            Catch the vibe.
            <br />
            <span>Wear the R4R.</span>
          </h2>
          <p className="modal-price">UG &amp; PG tees // from Rs. {featured.price}</p>
          <Link className="button button-primary" href="#merch" onClick={onClose}>
            Shop the drop
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { openEnrollment } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [audience, setAudience] = useState<MerchAudience>("UG");
  const product = getMerchByAudience(audience);
  const [size, setSize] = useState(product.sizes[1]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowPopup(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

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
                21 clubs. 23 events. 1 unforgettable weekend. Plug into the digital rave and
                experience the most kinetic campus event of the year.
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
            <strong>23</strong>
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
                <Image src={item.src} alt={item.alt} fill sizes="(max-width: 700px) 100vw, 50vw" />
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
            <div className="audience-toggle" role="group" aria-label="Choose your program">
              <button
                type="button"
                className={audience === "UG" ? "selected" : ""}
                onClick={() => setAudience("UG")}
                aria-pressed={audience === "UG"}
              >
                Undergrad
              </button>
              <button
                type="button"
                className={audience === "PG" ? "selected" : ""}
                onClick={() => setAudience("PG")}
                aria-pressed={audience === "PG"}
              >
                Postgrad
              </button>
            </div>
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
              Add to cart / {audience} / {size}
            </button>
            <p className="micro-copy">
              Separate cuts for UG &amp; PG students. Limited run, no restocks.
              <br />
              Ships after the festival protocol goes live.
            </p>
          </div>
        </section>
        <section className="closing-cta">
          <p className="eyebrow">Transmission ends // until next time</p>
          <h2>
            Enter the <span>rush.</span>
          </h2>
          <Link className="button button-outline" href="/events">
            Explore all events
          </Link>
        </section>
      </main>
      {showPopup && <MerchPopup onClose={() => setShowPopup(false)} />}
    </div>
  );
}
