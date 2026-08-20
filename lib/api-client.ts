"use client";

/**
 * Small fetch wrapper for the API routes.
 *
 * All routes answer with { ok: true, data } or { ok: false, error }, so this
 * unwraps that shape and throws the server's message. The messages are written
 * to be shown to users as-is — "That code isn't right", not "401".
 */
export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  let json: { ok?: boolean; data?: T; error?: string; code?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error("Server did not respond properly. Please try again.");
  }

  if (!res.ok || !json.ok) {
    // Carry both the status AND the server's error code. Status alone is not
    // enough: "profile incomplete" and "already registered" are both 409, and
    // branching on the number sent already-enrolled users to a details form.
    throw Object.assign(new Error(json.error ?? "Something went wrong. Please try again."), {
      status: res.status,
      code: json.code,
    });
  }
  return json.data as T;
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load. Please try again.");
  }
  return json.data as T;
}

/** Multipart upload — used for the UPI screenshot. */
export async function apiUpload<T = unknown>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Upload failed. Please try again.");
  }
  return json.data as T;
}
