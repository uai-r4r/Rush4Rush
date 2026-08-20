import { NextResponse } from "next/server";

/** Consistent JSON responses + one place to stop leaking internals. */

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

/**
 * Turns a thrown error into a response.
 *
 * Anything without an explicit status becomes a generic 500. Postgres errors,
 * stack traces and constraint names are logged server-side but never sent to
 * the client — an error message that names your tables is free recon.
 */
export function handleError(err: unknown) {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: unknown }).status)
      : 500;

  const message = err instanceof Error ? err.message : "Unexpected error";

  // A machine-readable code where the caller set one. Status alone is too
  // coarse: several very different situations share a 409, and a client that
  // branches on the number ends up doing the wrong thing for some of them.
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : undefined;

  if (status >= 500) {
    console.error("[api]", err);
    return fail("Something went wrong. Please try again.", 500);
  }
  return fail(message, status, code);
}

/** Client IP for rate limiting. Vercel sets x-forwarded-for. */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function normaliseEmail(raw: unknown): string {
  if (typeof raw !== "string") {
    throw Object.assign(new Error("Email is required"), { status: 400 });
  }
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    throw Object.assign(new Error("Enter a valid email address"), { status: 400 });
  }
  return email;
}

/** Indian mobile, stored normalised so gate lookup-by-phone actually matches. */
export function normalisePhone(raw: unknown): string {
  if (typeof raw !== "string") {
    throw Object.assign(new Error("Phone number is required"), { status: 400 });
  }
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").replace(/^91(?=\d{10}$)/, "");
  if (digits.length !== 10) {
    throw Object.assign(new Error("Enter a 10-digit mobile number"), { status: 400 });
  }
  return digits;
}
