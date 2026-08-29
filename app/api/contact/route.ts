import { Resend } from "resend";
import { ok, fail, handleError, clientIp, normaliseEmail } from "@/lib/api";
import { consume } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/contact   { name, email, subject, message }
 *
 * The about-page contact form. Delivers to CONTACT_TO with reply-to set to the
 * sender, so replying from the inbox goes straight back to them.
 *
 * Unlike lib/email.ts this does NOT swallow send failures. Everywhere else a
 * failed email must not fail the request behind it — a confirmed payment can't
 * roll back because a mail server hiccuped. Here the email IS the request, so
 * if it doesn't go out the person has to be told, not thanked.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM ?? "R4R <noreply@rush4rush.com>";
const TO = process.env.CONTACT_TO ?? "Rush4Rush@universalai.in";

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function clean(raw: unknown, max: number) {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = clean(body.name, 100);
    const email = normaliseEmail(body.email);
    const subject = clean(body.subject, 150);
    const message = clean(body.message, 4000);

    if (!name || !email || !subject || !message) {
      return fail("Please fill in every field.", 400);
    }
    if (!email.includes("@")) {
      return fail("That email address doesn't look right.", 400);
    }

    // Per-IP only: there is no account behind this form. Five an hour is
    // generous for a human and useless for a spam bot.
    await consume(`contact:${clientIp(req)}`, { max: 5, windowSecs: 3600 });

    if (!resend) {
      console.error("[contact] RESEND_API_KEY not set — message dropped");
      return fail("Messages are temporarily unavailable. Please email us directly.", 503);
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `[R4R contact] ${subject}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px">
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr style="border:0;border-top:1px solid #ddd;margin:16px 0" />
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>`,
    });

    if (error) {
      console.error("[contact] resend rejected", error);
      return fail("We couldn't send that just now. Please try again shortly.", 502);
    }

    return ok({ sent: true });
  } catch (err) {
    return handleError(err);
  }
}