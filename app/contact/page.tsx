import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, ADDRESS_LINES } from "@/data/legal";
import { LegalShell, Clause, Bullets } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: `Contact Us — ${LEGAL.brand}`,
  description: `Get in touch with the ${LEGAL.brand} organising team about registrations, payments, tickets or anything else.`,
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/10 py-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="text-xs uppercase tracking-widest text-white/40">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] leading-relaxed text-white/80 sm:mt-0">
        {children}
      </dd>
    </div>
  );
}

export default function ContactPage() {
  return (
    <LegalShell
      title="Contact Us"
      intro={`The ${LEGAL.brand} organising team reads every message. Here is how to reach us, and what to include so we can help you quickly.`}
    >
      <section>
        <dl className="border-t border-white/10">
          <Row label="Organised by">{LEGAL.entity}</Row>

          <Row label="Email">
            <a
              href={`mailto:${LEGAL.email}`}
              className="text-white underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            >
              {LEGAL.email}
            </a>
          </Row>

          <Row label="Phone">
            <a
              href={`tel:${LEGAL.phone.replace(/[^+\d]/g, "")}`}
              className="text-white underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            >
              {LEGAL.phone}
            </a>
          </Row>

          <Row label="Hours">{LEGAL.supportHours}</Row>

          <Row label="Address">
            <address className="not-italic">
              {ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </Row>

          <Row label="Response time">
            We reply to email within 48 hours on working days. During the
            festival itself, expect a slower reply by email — phone is faster.
          </Row>
        </dl>
      </section>

      <Clause n={1} title="Before you write in">
        <p>
          Including these details in your first message saves a round trip and
          gets you an answer the same day:
        </p>
        <Bullets
          items={[
            "The email address on your account — write in from it if you can.",
            "The event or pass you are asking about.",
            "Your order or payment ID, from your confirmation email.",
            "A screenshot, if something on the site did not work as expected.",
          ]}
        />
      </Clause>

      <Clause n={2} title="What we can help with">
        <Bullets
          items={[
            "A one-time code that did not arrive, or a sign-in that will not go through.",
            "A payment that was debited but did not confirm a registration.",
            "A ticket or QR code that is missing from your account.",
            "Questions about which entry pass rate applies to your email address.",
            "Event rules, team sizes, timings and venues.",
            "Accessibility requirements, so we can arrange support at the venue.",
          ]}
        />
        <p>
          For refunds, read our{" "}
          <Link href="/refunds" className="text-white underline underline-offset-4">
            Refund &amp; Cancellation Policy
          </Link>{" "}
          first — it explains what is and is not refundable.
        </p>
      </Clause>

      <Clause n={3} title="Grievances and data requests">
        <p>
          Complaints about how we have handled your personal data, and requests
          to access, correct or delete it, go to our Grievance Officer:
        </p>
        <p>
          <span className="block text-white">{LEGAL.grievanceOfficer.name}</span>
          <span className="block">{LEGAL.grievanceOfficer.designation}</span>
          <a
            href={`mailto:${LEGAL.grievanceOfficer.email}`}
            className="text-white underline underline-offset-4"
          >
            {LEGAL.grievanceOfficer.email}
          </a>
        </p>
        <p>
          We acknowledge grievances within 48 hours and aim to close them within
          30 days. See our{" "}
          <Link href="/privacy" className="text-white underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          for the full picture.
        </p>
      </Clause>

      <Clause n={4} title="Reaching us during the festival">
        <p>
          A help desk operates at the main entrance for both days of the
          festival. Volunteers there can check a registration, re-issue a ticket
          and direct you to a venue. For anything urgent on site, find a
          volunteer in an official {LEGAL.brandShort} t-shirt rather than
          emailing.
        </p>
      </Clause>
    </LegalShell>
  );
}
