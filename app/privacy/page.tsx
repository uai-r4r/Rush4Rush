import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, ADDRESS_LINES } from "@/data/legal";
import { LegalShell, Clause, Notice, Bullets } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: `Privacy Policy — ${LEGAL.brand}`,
  description: `What personal data ${LEGAL.brand} collects, why we collect it, who we share it with, and how you can control it.`,
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      intro={`This policy explains what personal data ${LEGAL.brand} collects when you use this website, why we collect it, who else sees it, and what you can ask us to do with it.`}
    >
      <Clause n={1} title="Who controls your data">
        <p>
          {LEGAL.entity}, organiser of {LEGAL.brand}, is the data fiduciary
          responsible for the personal data collected through this website. We
          handle it in line with the Digital Personal Data Protection Act, 2023
          and the Information Technology Act, 2000 and rules made under it.
        </p>
        <address className="not-italic text-white/60">
          {ADDRESS_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      </Clause>

      <Clause n={2} title="What we collect">
        <p className="text-white/90">Information you give us</p>
        <Bullets
          items={[
            "Your name and email address, collected when you sign in with a one-time code.",
            "Your phone number, so we can reach you about schedule changes or a problem with your registration.",
            "Your college or institution, and for students of the university, verification that your email uses the official college domain.",
            "Details specific to an event you enter — for example a team name, teammate names, a performance category, or a submission you upload.",
            "Where you pay by direct UPI transfer, the screenshot or reference you upload as proof.",
          ]}
        />

        <p className="pt-2 text-white/90">Information created by using the site</p>
        <Bullets
          items={[
            "Your registrations, order history and payment status.",
            "Your ticket records and the time and gate at which a QR code was scanned.",
            "Basic technical logs — IP address, browser type, pages requested and timestamps — kept for security and troubleshooting.",
          ]}
        />

        <p className="pt-2 text-white/90">Information we deliberately do not collect</p>
        <Notice>
          <p>
            We never receive or store your card number, CVV, expiry date, UPI PIN,
            netbanking password or any other payment credential. Those are entered
            directly with our payment gateway and never reach our servers. What we
            receive back is limited to a payment identifier, an amount, and whether
            the payment succeeded or failed.
          </p>
        </Notice>
        <p>
          We also do not ask for your date of birth, government ID number, caste,
          religion, health records or biometric data through this website.
        </p>
      </Clause>

      <Clause n={3} title="Why we use it">
        <Bullets
          items={[
            "To create your account and sign you in without a password.",
            "To take payment, issue a ticket, and prove at the gate that you paid.",
            "To work out which entry pass rate applies to you, based on your email domain.",
            "To give each club a list of who registered for its own events, so it can run them.",
            "To email you confirmations, tickets, reminders and changes to the programme.",
            "To manage venue capacity, attendance and safety.",
            "To detect fraud, duplicate tickets and misuse of the site.",
            "To produce aggregate footfall and participation figures for the university. These are counts, not lists of names.",
          ]}
        />
        <p>
          We do not sell your data, rent it, or use it for advertising, and we do
          not send you marketing email unless you ask us to.
        </p>
      </Clause>

      <Clause n={4} title="The basis we rely on">
        <p>
          For most of the above, we rely on your consent, given when you create
          an account and complete a registration. For issuing tickets and taking
          payment, we rely on the necessity of performing the contract you enter
          into when you buy a pass. For fraud prevention, security logs and
          record-keeping, we rely on our legitimate interest in running the
          festival safely.
        </p>
        <p>
          You may withdraw consent at any time by writing to us. Withdrawing
          consent does not undo processing already carried out, and it may mean
          we can no longer honour a ticket you have bought.
        </p>
      </Clause>

      <Clause n={5} title="Who else sees it">
        <p>
          We share the minimum necessary with the following, each of which is
          bound to use it only to provide their service to us:
        </p>
        <Bullets
          items={[
            <>
              <span className="text-white/90">Razorpay Software Private Limited —</span>{" "}
              our payment gateway. Receives your name, email and phone to process
              a payment and to handle refunds or disputes. Governed by
              Razorpay&rsquo;s own privacy policy.
            </>,
            <>
              <span className="text-white/90">Supabase —</span> our database and
              authentication provider. Stores your account and registration
              records.
            </>,
            <>
              <span className="text-white/90">Resend —</span> our transactional
              email provider. Receives your email address in order to deliver
              one-time codes, confirmations and tickets.
            </>,
            <>
              <span className="text-white/90">Vercel —</span> our hosting
              provider, which serves this website and keeps standard access logs.
            </>,
            <>
              <span className="text-white/90">Club administrators and volunteers —</span>{" "}
              student organisers, who see the registration list for the specific
              clubs they are assigned to and nothing beyond that.
            </>,
            <>
              <span className="text-white/90">University administration —</span>{" "}
              which receives participation records and aggregate figures for the
              festival.
            </>,
          ]}
        />
        <p>
          We will also disclose data where we are required to by law, by a court,
          or by a lawful request from a government authority or the police.
        </p>
      </Clause>

      <Clause n={6} title="Where it is stored">
        <p>
          Our database is hosted in the Mumbai (ap-south-1) region, so your
          account and registration records are stored in India. Some of our
          service providers — in particular our email and hosting providers —
          operate infrastructure outside India, which means limited data such as
          your email address and access logs may be processed abroad. Where that
          happens, it is done under those providers&rsquo; contractual data
          protection commitments.
        </p>
      </Clause>

      <Clause n={7} title="How long we keep it">
        <Bullets
          items={[
            "Account details: until you ask us to delete them, or up to 12 months after the festival, whichever is sooner.",
            "Registration, ticket and payment records: retained for the period required for accounting, audit and tax purposes — ordinarily eight financial years — because they are financial records.",
            "Manual UPI payment proof: deleted once the payment is verified and reconciled.",
            "Technical and access logs: up to 90 days.",
          ]}
        />
        <p>
          After these periods, data is deleted or reduced to anonymous
          statistics that cannot be traced back to you.
        </p>
      </Clause>

      <Clause n={8} title="How we protect it">
        <Bullets
          items={[
            "All traffic to this site is encrypted over HTTPS.",
            "Sign-in uses one-time codes sent to your email, so there is no password of yours for us to lose.",
            "Database access is restricted by row-level security rules, so club administrators can only read records belonging to their own clubs.",
            "Ticket QR codes are cryptographically signed, so a forged or altered code fails validation at the gate.",
          ]}
        />
        <p>
          No system is perfectly secure. If a breach affects your personal data,
          we will notify you and the Data Protection Board of India as required
          under the DPDP Act.
        </p>
      </Clause>

      <Clause n={9} title="Your rights">
        <p>You can ask us to:</p>
        <Bullets
          items={[
            "Tell you what data we hold about you and who we have shared it with.",
            "Correct anything inaccurate or incomplete.",
            "Delete your data, where we are not required to keep it for accounting or legal reasons.",
            "Stop processing your data by withdrawing your consent.",
            "Nominate someone to exercise these rights on your behalf if you die or become incapacitated.",
          ]}
        />
        <p>
          Write to{" "}
          <span className="text-white/90">{LEGAL.email}</span> from the email
          address on your account. We will respond within 30 days. There is no
          charge for a reasonable request.
        </p>
      </Clause>

      <Clause n={10} title="Cookies">
        <p>
          We use a small number of strictly necessary cookies. These keep you
          signed in after you enter your one-time code and protect forms against
          cross-site request forgery. We do not use advertising cookies or
          third-party tracking pixels. Blocking these cookies in your browser
          will stop you from being able to sign in.
        </p>
      </Clause>

      <Clause n={11} title="Children">
        <p>
          This website is not intended for children under 16, and we do not
          knowingly collect their data. Where a registrant is between 16 and 18,
          we rely on consent given by a parent or guardian as required by the
          DPDP Act. If you believe a child has registered without that consent,
          contact us and we will delete the account.
        </p>
      </Clause>

      <Clause n={12} title="Changes to this policy">
        <p>
          We will update this page when our practices change, and the date at the
          top will change with it. Where a change materially affects how we use
          your data, we will tell you by email.
        </p>
      </Clause>

      <Clause n={13} title="Grievance Officer">
        <Notice>
          <p>
            If you are unhappy with how we have handled your data, you can raise
            it with our Grievance Officer, appointed under the DPDP Act, 2023 and
            the Information Technology (Intermediary Guidelines) Rules:
          </p>
          <p className="mt-3">
            <span className="block text-white">{LEGAL.grievanceOfficer.name}</span>
            <span className="block">{LEGAL.grievanceOfficer.designation}</span>
            <span className="block">{LEGAL.grievanceOfficer.email}</span>
          </p>
          <p className="mt-3">
            We acknowledge grievances within 48 hours and aim to resolve them
            within 30 days. If you remain dissatisfied, you may escalate to the
            Data Protection Board of India. See also our{" "}
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
