import { Resend } from "resend";

/**
 * Transactional email.
 *
 * IMPORTANT — login OTPs do NOT go through this file.
 *
 * Those are sent by Supabase Auth, which you point at Resend via SMTP in the
 * dashboard (Project Settings → Authentication → SMTP). That way Supabase owns
 * code generation, hashing, expiry and single-use enforcement, and Resend just
 * carries the mail. Hand-rolling OTP storage on top of an auth system that
 * already does it correctly is how subtle holes get introduced.
 *
 * This file is for the handful of emails the app itself originates. Keep that
 * list short — Resend's free tier is 3,000/month but hard-capped at 100/DAY,
 * and the daily cap is what actually breaks: 200 signups on launch morning
 * silently stops sending around email 100.
 *
 * Deliberately NOT sending: registration confirmations and ticket copies. The
 * ticket lives in the app. Emailing it too is ~500 sends bought for nothing.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM ?? "R4R <noreply@example.com>";

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", subject);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    // Never let a failed email fail the request that triggered it. A payment
    // that succeeded must not roll back because a mail server hiccuped.
    console.error("[email] send failed", err);
  }
}

const shell = (body: string) => `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;letter-spacing:0.08em;margin:0 0 16px">RUSH4RUSH 2026</h1>
    ${body}
    <p style="color:#888;font-size:12px;margin-top:32px">
      Universal AI University · Karjat
    </p>
  </div>`;

/** Sent when a club admin rejects a UPI screenshot — otherwise the person has
 *  no idea their blurry photo was refused until they are turned away at a door. */
export function sendPaymentRejected(to: string, eventName: string, reason: string) {
  return send(
    to,
    `Payment needs another look — ${eventName}`,
    shell(`
      <p>We couldn't confirm your payment for <strong>${escapeHtml(eventName)}</strong>.</p>
      <p style="padding:12px;background:#f5f5f5;border-radius:6px">${escapeHtml(reason)}</p>
      <p>Log in and upload a clearer screenshot to try again.</p>`),
  );
}

/** Sent once when you add someone as a club admin, so they know to log in. */
export function sendClubAdminInvite(to: string, clubName: string, siteUrl: string) {
  return send(
    to,
    `You're an organiser for ${clubName}`,
    shell(`
      <p>You now have organiser access for <strong>${escapeHtml(clubName)}</strong>.</p>
      <p>Sign in at <a href="${siteUrl}">${siteUrl}</a> with this email address —
      you'll get a 6-digit code, no password needed. Your dashboard link appears
      in the nav once you're in.</p>`),
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
