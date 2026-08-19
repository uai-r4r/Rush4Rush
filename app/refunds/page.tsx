import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/data/legal";
import { LegalShell, Clause, Notice, Bullets } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: `Refund & Cancellation Policy — ${LEGAL.brand}`,
  description: `${LEGAL.brand} passes and event registrations are non-refundable. This page explains the policy and the narrow cases where money is returned.`,
};

export default function RefundsPage() {
  return (
    <LegalShell
      title="Refund & Cancellation Policy"
      intro={`This page explains what happens to your money after you pay for a ${LEGAL.brand} entry pass or event registration. Please read it before you pay — it is short and it is strict.`}
    >
      <Clause n={1} title="All sales are final">
        <Notice>
          <p className="text-white">
            {LEGAL.brand} entry passes and event registration fees are
            non-refundable and non-transferable. Once a payment is confirmed, it
            cannot be cancelled, reversed, exchanged or moved to another person
            or another event.
          </p>
        </Notice>
        <p>
          We set this policy because entry fees are committed in advance to
          venues, equipment, materials, prizes and vendors as soon as a place is
          allotted to you. A place you book is a place another participant cannot
          take.
        </p>
      </Clause>

      <Clause n={2} title="Cases where no refund is given">
        <p>To be explicit, we do not refund a payment because:</p>
        <Bullets
          items={[
            "You changed your mind, or no longer wish to attend.",
            "You did not turn up, arrived after an event started, or left early.",
            "You registered for the wrong event, the wrong category, or bought a duplicate registration by mistake.",
            "You were eliminated, disqualified, or did not place in a competition.",
            "You could not attend because of travel, illness, exams, work or any other personal circumstance.",
            "You were denied entry, or removed from the venue, for breaching our Terms & Conditions or campus rules.",
            "You registered at a student rate you were not entitled to.",
            "You are dissatisfied with the format, judging, timing or venue of an event.",
          ]}
        />
      </Clause>

      <Clause n={3} title="Cancelling your own registration">
        <p>
          You may cancel a registration from your account at any time, which
          releases your place to someone else. Cancelling does not produce a
          refund. Once cancelled, a registration cannot be reinstated and you
          would need to pay again if you want the place back — assuming it is
          still available.
        </p>
      </Clause>

      <Clause n={4} title="Payment failures and duplicate charges">
        <p>
          The policy above covers valid, completed payments. It does not cover
          money that should never have left your account in the first place.
          These are corrected:
        </p>
        <Bullets
          items={[
            <>
              <span className="text-white/90">Money debited, registration not confirmed —</span>{" "}
              if your bank shows a debit but no ticket was issued, the amount is
              usually reversed automatically by your bank or the payment gateway
              within {LEGAL.refundWindowDays}. If it has not returned in that
              time, contact us and we will trace it and refund it in full.
            </>,
            <>
              <span className="text-white/90">Charged twice for the same registration —</span>{" "}
              the duplicate charge is refunded in full.
            </>,
            <>
              <span className="text-white/90">Charged the wrong amount —</span>{" "}
              if a technical fault charged you more than the price shown at
              checkout, we refund the difference.
            </>,
          ]}
        />
        <p>
          Raise these with us within {LEGAL.disputeWindowDays} days of the
          transaction so we can reconcile it against gateway records.
        </p>
      </Clause>

      <Clause n={5} title="If we cancel an event">
        {/*
          NOTE FOR THE TEAM: confirm this clause with the finance office before
          going live. This is the standard position and the one Razorpay expects
          to see, but the university has to be willing to honour it. If finance
          decides on credit toward another event instead of money back, edit this
          clause to say exactly that — do not leave it silent.
        */}
        <p>
          If we cancel an event outright and do not reschedule it, we refund the
          registration fee for that event in full.
        </p>
        <p>
          The festival entry pass is refunded only if
          the entire festival is cancelled before it begins. It is not refunded
          when an individual event within the festival is cancelled, because the
          pass covers access to the festival as a whole.
        </p>
        <p>
          If an event is rescheduled, moved to another venue, changed in format,
          or shortened, your registration carries over and no refund is due. If
          the festival is postponed, all registrations carry over to the new
          dates.
        </p>
      </Clause>

      <Clause n={6} title="How a refund is paid">
        <p>
          Where a refund is due under clause 4 or 5, we process it to the
          original payment method only — the same card, account or UPI ID you
          paid from. We do not refund to a different account, and we do not pay
          refunds in cash.
        </p>
        <Bullets
          items={[
            <>
              We initiate the refund within 3 working days of approving it.
            </>,
            <>
              It typically reaches your account in {LEGAL.refundWindowDays} after
              that, depending on your bank. The final leg is controlled by your
              bank, not by us.
            </>,
            <>
              Where you paid by direct UPI transfer rather than through the
              gateway, refunds are made back to the same UPI ID and may take
              longer, as they are processed manually.
            </>,
            <>
              Refunds are for the amount you paid. Any bank or gateway charge
              your own bank levies separately is not something we can return.
            </>,
          ]}
        />
      </Clause>

      <Clause n={7} title="How to raise a refund request">
        <p>
          Email{" "}
          <span className="text-white/90">{LEGAL.email}</span> from the address
          on your account, with:
        </p>
        <Bullets
          items={[
            "Your full name and registered email address",
            "The event or pass in question",
            "The payment or order ID from your confirmation email",
            "The date and amount of the transaction",
            "A screenshot of the bank or UPI debit, if you are reporting a failed or duplicate payment",
          ]}
        />
        <p>
          We acknowledge requests within 48 hours and give you a decision within
          7 working days. Please contact us before raising a chargeback with your
          bank — a chargeback takes far longer to resolve than a direct refund.
        </p>
      </Clause>

      <Clause n={8} title="Questions">
        <Notice>
          <p>
            Reach us at <span className="text-white">{LEGAL.email}</span> or{" "}
            <span className="text-white">{LEGAL.phone}</span>,{" "}
            {LEGAL.supportHours}. This policy sits alongside our{" "}
            <Link href="/terms" className="text-white underline underline-offset-4">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </Notice>
      </Clause>
    </LegalShell>
  );
}
