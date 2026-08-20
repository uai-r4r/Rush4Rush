import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, ADDRESS_LINES } from "@/data/legal";
import { LegalShell, Clause, Notice, Bullets } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: `Terms & Conditions — ${LEGAL.brand}`,
  description: `The terms that govern ticket purchases and event registrations on the ${LEGAL.brand} website.`,
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms & Conditions"
      intro={`These terms govern your use of the ${LEGAL.brand} website and any passes or event registrations you purchase through it. By creating an account or completing a payment, you agree to them.`}
    >
      <Clause n={1} title="Who we are">
        <p>
          {LEGAL.brand} ({LEGAL.brandShort}) is a two-day inter-collegiate
          festival organised by students of {LEGAL.entity}, held on the campus at{" "}
          {LEGAL.address.city}, {LEGAL.address.state}. The festival hosts events
          run by student clubs across culture, technology, sport and the arts.
        </p>
        <p>
          In these terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;the
          organisers&rdquo; mean {LEGAL.entity}. &ldquo;You&rdquo; means anyone
          who visits this website, registers an account, or buys a pass or event
          registration.
        </p>
        <p>Our registered address is:</p>
        <address className="not-italic text-white/60">
          {ADDRESS_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      </Clause>

      <Clause n={2} title="Accepting these terms">
        <p>
          You accept these terms when you sign in, register for an event, or pay
          for a pass. If you do not agree with any part of them, do not use the
          site or attend the festival.
        </p>
        <p>
          We may update these terms — for example if we change what we sell or
          how the festival runs. The date at the top of this page shows when it
          was last changed. Continuing to use the site after a change means you
          accept the updated terms.
        </p>
      </Clause>

      <Clause n={3} title="Your account">
        <p>
          We do not use passwords. You sign in with your email address and a
          one-time code (OTP) sent to that address. Keeping access to that inbox
          secure is your responsibility — anyone who can read your email can sign
          in as you.
        </p>
        <Bullets
          items={[
            "You must give accurate details. Your name on the site must match the photo ID you bring to the venue.",
            <>
              Students of {LEGAL.entity} verify their status using a{" "}
              <span className="text-white/90">{LEGAL.pricing.studentDomain}</span>{" "}
              email address. Using someone else&rsquo;s college email to obtain a
              student rate is grounds for cancellation without refund.
            </>,
            "One account per person. Duplicate or fraudulent accounts may be removed.",
            "You must be at least 16 years old to create an account. If you are under 18, a parent or guardian must consent to your registration and attendance.",
          ]}
        />
      </Clause>

      <Clause n={4} title="What you are buying">
        <p>We sell two things through this website, both in Indian Rupees (₹):</p>
        <Bullets
          items={[
            <>
            <span className="text-white/90">Festival entry pass —</span> this
            grants entry to the festival grounds for the duration of the
            event, and is required of everyone attending. It costs{" "}
            {LEGAL.pricing.studentEntryPass} for students of {LEGAL.entity},
            verified by a {LEGAL.pricing.studentDomain} email address, and{" "}
            {LEGAL.pricing.entryPass} for all other visitors. The rate is
            applied automatically at checkout based on the email address on
            your account.
            </>,
            <>
              <span className="text-white/90">Event registrations —</span> a
              separate fee set by each club for each event. Fees vary by event
              and are shown on the event page before you pay.
            </>,
          ]}
        />
        <p>
          The entry pass alone does not register you for any event, and an event
          registration alone does not grant entry to the festival grounds — you
          need both. The total you owe is shown at checkout before payment.
        </p>
      </Clause>

      <Clause n={5} title="Payment">
        <p>
          Payments are processed by Razorpay Software Private Limited, a payment
          gateway regulated in India. Depending on the option shown at checkout,
          you may pay by card, netbanking, UPI or wallet, or by uploading proof
          of a direct UPI transfer for manual verification.
        </p>
        <Bullets
          items={[
            "All prices are in Indian Rupees and inclusive of applicable taxes unless stated otherwise on the event page.",
            "We never see or store your card number, CVV, UPI PIN or banking credentials. Those are handled entirely by the payment gateway.",
            "A registration is confirmed only once payment succeeds and you receive a confirmation email with a ticket. A pending or failed payment does not hold a place.",
            "Where you pay by direct UPI transfer, your registration stays pending until an organiser verifies the transfer. Verification is not instant and may take up to 48 hours.",
            "Events have limited capacity. Places are allotted in order of confirmed payment, and an event may sell out while a payment is pending.",
          ]}
        />
      </Clause>

      <Clause n={6} title="Tickets and entry">
        <p>
          After a confirmed payment, your ticket appears in your account and
          carries a QR code that is scanned at the venue.
        </p>
        <Bullets
          items={[
            "Tickets are personal to you and are not transferable, resaleable or refundable.",
            "Bring a government photo ID, and your college ID if you registered at a student rate. Entry may be refused if your ID does not match your registration.",
            "Each QR code is valid for a single entry scan per event. Do not share screenshots of your ticket — if a code is scanned before you arrive, we cannot issue a replacement.",
            "Doors, start times and venue allocations are published on the schedule page and may change.",
          ]}
        />
      </Clause>

      <Clause n={7} title="Changes to the programme">
        <p>
          Festivals move. We may change the timing, venue, format, judges,
          performers or running order of any event, and we may combine, split or
          cancel an event where entries are too few or conditions require it.
          Where an event is cancelled outright by us, the refund terms in our{" "}
          <Link href="/refunds" className="text-white underline underline-offset-4">
            Refund &amp; Cancellation Policy
          </Link>{" "}
          apply.
        </p>
        <p>
          We are not liable for travel, accommodation or other costs you incur
          around a changed or cancelled event.
        </p>
      </Clause>

      <Clause n={8} title="Conduct on campus">
        <p>
          The festival takes place on an operating university campus. While you
          are on the premises you are bound by campus rules as well as these
          terms.
        </p>
        <Bullets
          items={[
            "No alcohol, narcotics, weapons, or hazardous items on the premises.",
            "No harassment, discrimination, intimidation or violence toward participants, volunteers, staff or performers.",
            "No damage to property, and no interference with the running of an event.",
            "Follow instructions from organisers, volunteers and campus security, particularly around crowd control and safety.",
          ]}
        />
        <p>
          We may remove anyone from the venue, disqualify them from events and
          cancel their registrations without refund for breaching this clause.
          Serious breaches will be reported to the university administration and,
          where appropriate, to the police.
        </p>
      </Clause>

      <Clause n={9} title="Photography and recording">
        <p>
          The festival is photographed and filmed. By entering the venue you
          consent to being captured in photographs, video and live streams, and
          to that material being used by {LEGAL.entity} for reporting, archives
          and promotion of the festival — including on social media — without
          payment.
        </p>
        <p>
          If you do not want to appear in festival media, write to us at{" "}
          <span className="text-white/90">{LEGAL.email}</span> and we will do our
          reasonable best to accommodate you, though we cannot guarantee removal
          from wide crowd shots or third-party coverage.
        </p>
      </Clause>

      <Clause n={10} title="Competitions and prizes">
        <p>
          Individual events may publish their own rules on eligibility, team
          size, scoring and judging. Those rules apply alongside these terms.
          Judges&rsquo; decisions are final. Prizes are non-negotiable, cannot be
          exchanged for cash unless stated, and may require valid ID and, where
          applicable, tax documentation before they are handed over.
        </p>
      </Clause>

      <Clause n={11} title="Intellectual property">
        <p>
          The {LEGAL.brand} name, logo, artwork, site design, copy and code
          belong to the organisers and may not be copied or reused commercially
          without written permission.
        </p>
        <p>
          Work you submit or perform at an event remains yours. By entering, you
          grant us a non-exclusive, royalty-free licence to record, display and
          share that work in connection with the festival and its promotion.
        </p>
      </Clause>

      <Clause n={12} title="Acceptable use of this site">
        <p>You agree not to:</p>
        <Bullets
          items={[
            "Attempt to access accounts, dashboards or data that are not yours.",
            "Probe, scan or test the security of the site, or interfere with its normal operation.",
            "Forge, duplicate or tamper with ticket QR codes.",
            "Scrape the site or use automated tools to create accounts or registrations.",
            "Upload falsified payment proof.",
          ]}
        />
        <p>
          We may suspend or delete accounts that breach this clause and cancel
          any associated registrations without refund.
        </p>
      </Clause>

      <Clause n={13} title="Liability">
        <p>
          You attend the festival and take part in its events at your own risk.
          Some events are physical. Make sure you are fit to participate, and
          tell an organiser about any medical condition that may need attention.
        </p>
        <p>
          To the fullest extent permitted by law, the organisers are not liable
          for personal injury, loss or damage to property, theft, or any
          indirect or consequential loss arising from your attendance, except
          where such loss is caused by our own negligence. Where liability
          cannot be excluded, it is limited to the amount you actually paid us
          for the affected pass or registration.
        </p>
        <p>
          We provide this website on an &ldquo;as available&rdquo; basis. We do
          not guarantee uninterrupted access, and we are not liable for losses
          caused by downtime, gateway outages or events outside our reasonable
          control — including weather, power failure, strikes, public health
          restrictions or orders from authorities.
        </p>
      </Clause>

      <Clause n={14} title="Privacy">
        <p>
          How we collect and handle your personal data is set out in our{" "}
          <Link href="/privacy" className="text-white underline underline-offset-4">
            Privacy Policy
          </Link>
          , which forms part of these terms.
        </p>
      </Clause>

      <Clause n={15} title="Governing law">
        <p>
          These terms are governed by the laws of India. Any dispute arising
          from them is subject to the exclusive jurisdiction of the courts at{" "}
          {LEGAL.jurisdiction}.
        </p>
      </Clause>

      <Clause n={16} title="Reaching us">
        <Notice>
          <p>
            Questions about these terms go to{" "}
            <span className="text-white">{LEGAL.email}</span> or{" "}
            <span className="text-white">{LEGAL.phone}</span>. Full details are on
            our{" "}
            <Link href="/contact" className="text-white underline underline-offset-4">
              Contact Us
            </Link>{" "}
            page.
          </p>
        </Notice>
      </Clause>
    </LegalShell>
  );
}
