import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL } from "@/data/legal";

const NAV = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund & Cancellation" },
  { href: "/contact", label: "Contact Us" },
];

export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-36 sm:px-8">
      <Link
        href="/"
        className="inline-block text-sm text-white/50 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
      >
        ← Back to {LEGAL.brand}
      </Link>

      <header className="mt-8 border-b border-white/10 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {intro ? (
          <p className="mt-4 text-base leading-relaxed text-white/70">{intro}</p>
        ) : null}
        <p className="mt-6 text-xs uppercase tracking-widest text-white/40">
          Last updated {LEGAL.lastUpdated}
        </p>
      </header>

      <div className="legal-body mt-10 space-y-10">{children}</div>

      <nav
        aria-label="Other policies"
        className="mt-20 border-t border-white/10 pt-8"
      >
        <p className="text-xs uppercase tracking-widest text-white/40">
          Other policies
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}

/** A numbered policy clause. Numbering is real here — reviewers and users
 *  reference clauses by number, so the sequence carries information. */
export function Clause({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-24" id={`clause-${n}`}>
      <h2 className="flex gap-3 text-lg font-semibold text-white">
        <span className="tabular-nums text-white/35">
          {String(n).padStart(2, "0")}
        </span>
        <span>{title}</span>
      </h2>
      <div className="mt-3 space-y-3 pl-0 text-[15px] leading-relaxed text-white/70 sm:pl-9">
        {children}
      </div>
    </section>
  );
}

/** Highlighted callout for the clauses that carry money or legal weight. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.04] p-4 text-[15px] leading-relaxed text-white/80">
      {children}
    </div>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-white/40" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
