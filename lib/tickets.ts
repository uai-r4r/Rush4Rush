import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed ticket tokens.
 *
 * The QR encodes `<registrationId>.<signature>` — nothing else. No name, no
 * event, no payment status. The scanner sends the whole string back and the
 * server looks everything up fresh, so a ticket can never assert its own
 * validity.
 *
 * Why sign at all: registration IDs are guessable in principle, and an
 * unsigned QR is trivial to forge with any online generator. The signature is
 * unforgeable without TICKET_SIGNING_SECRET, which lives only on the server.
 *
 * Nothing here is stored. The token is derived on each page load, which is why
 * 500 tickets add zero bytes to the database — and why a cancelled or refunded
 * registration stops producing a valid ticket immediately rather than leaving
 * an orphaned image lying around in storage.
 */

function secret() {
  const s = process.env.TICKET_SIGNING_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "TICKET_SIGNING_SECRET must be set to at least 32 chars. Generate one with: openssl rand -hex 32",
    );
  }
  return s;
}

function sign(registrationId: string) {
  return createHmac("sha256", secret())
    .update(registrationId)
    .digest("base64url")
    .slice(0, 32);
}

export function createTicketToken(registrationId: string) {
  return `${registrationId}.${sign(registrationId)}`;
}

/**
 * Returns the registration id, or null if the token is malformed or forged.
 *
 * Uses timingSafeEqual rather than `===`. String comparison short-circuits on
 * the first differing byte, which leaks how much of a guessed signature was
 * correct and makes forgery a byte-at-a-time search.
 */
export function verifyTicketToken(token: unknown): string | null {
  if (typeof token !== "string" || token.length > 200) return null;

  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;

  const [registrationId, provided] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return null;

  const expected = sign(registrationId);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;

  return timingSafeEqual(a, b) ? registrationId : null;
}
