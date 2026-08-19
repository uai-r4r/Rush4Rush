"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { techTeam } from "@/data/team";

const logos = [
  {
    src: "/logos/universal-ai-university.png",
    alt: "Universal AI University logo",
  },
  {
    src: "/logos/uai-school-of-business.png",
    alt: "UAI School of Business logo",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

export default function AboutPage() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(
      "[v0] contact form submitted",
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    setStatus("sent");
    event.currentTarget.reset();
  };

  return (
    <div className="festival-page">
      <main className="about-main">
        <div className="page-art" data-word="ABOUT" aria-hidden="true">
          <span>ABOUT</span>
        </div>
        <header className="about-header">
          <p className="eyebrow">Protocol // who we are</p>
          <h1>
            About <span>R4R.</span>
          </h1>
        </header>

        <section className="about-section" aria-labelledby="what-is-r4r">
          <p className="eyebrow" id="what-is-r4r">
            What is R4R
          </p>
          <p className="about-lead">
            Rush 4 Rush is the <span>ultimate college festival</span> — 21 clubs, 20 events, one
            unforgettable weekend.
          </p>
          <p className="about-body">
            Born on the Universal AI University campus, R4R fuses culture, business, tech, sports,
            and pure social chaos into a two-day rush. It is built by students, for students — a
            stage for every talent and a home for every crew. Plug in, find your event, and enter
            the rush.
          </p>
        </section>

        <section className="about-section" aria-labelledby="contact-title">
          <p className="eyebrow" id="contact-title">
            Contact
          </p>
          <div className="contact-grid">
            <form className="contact-form" onSubmit={onSubmit} noValidate>
              <div className="field">
                <label htmlFor="contact-name">Name</label>
                <input id="contact-name" name="name" type="text" autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="contact-email">Email</label>
                <input id="contact-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="contact-subject">Subject</label>
                <input id="contact-subject" name="subject" type="text" required />
              </div>
              <div className="field">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" name="message" required />
              </div>
              <button className="button button-primary" type="submit">
                Send message
              </button>
              {status === "sent" && (
                <p className="contact-status" role="status">
                  Message received — the R4R team will reach out soon.
                </p>
              )}
            </form>
            <div className="contact-direct">
              <div className="contact-direct-block">
                <p className="eyebrow">Prefer to skip the form?</p>
                <p>
                  <a href="mailto:r4r@universalai.edu">Rush4Rush@universalai.in</a>
                </p>
                <p className="contact-note">For sponsorships, press, and general queries.</p>
              </div>
              <div className="contact-direct-block">
                <p className="eyebrow">Call the desk</p>
                <p>
                  <a href="tel:+912212345678">+91-9665272538 or +91-9116945845</a>
                </p>
                <p className="contact-note">Weekdays, 10:00–18:00 IST.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" aria-labelledby="tech-team-title">
          <p className="eyebrow" id="tech-team-title">
            Tech Team
          </p>
          <div className="team-grid">
            {techTeam.map((member) => (
              <article className="team-card" key={member.name}>
                <div className="team-avatar" aria-hidden="true">
                  {initials(member.name)}
                </div>
                <h3 className="team-name">{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <div className="team-socials">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                  >
                    <LinkedInIcon />
                  </a>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on GitHub`}
                  >
                    <GitHubIcon />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" aria-labelledby="location-title">
          <p className="eyebrow" id="location-title">
            Location
          </p>
          <div className="location-grid">
            <address className="location-address">
              <strong>Universal AI University</strong>
              Village Vahal &amp; Aaser, Post Adivali
              <br />
              Tehsil Karjat, District Raigad
              <br />
              Maharashtra 410201, India
              <br />
              <a
                className="button button-outline location-map-link"
                href="https://maps.google.com/?q=Universal+AI+University+Karjat"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Maps
              </a>
            </address>
            <div className="logo-row">
              {logos.map((logo) => (
                <div className="logo-frame" key={logo.src}>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={420}
                    height={280}
                    sizes="(max-width: 700px) 80vw, 420px"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
