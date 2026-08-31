import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiting, backed by the consume_rate_limit() SQL function
 * so the increment is atomic across concurrent serverless invocations.
 *
 * The OTP endpoints are the ones that actually need this:
 *
 *   send   — uncapped, someone scripts it and burns the daily email quota, or
 *            just spams a stranger's inbox
 *   verify — a 6-digit code is a million guesses. Unthrottled, that is a few
 *            minutes of scripted requests.
 *
 * Do this even if nothing else on the security list gets done.
 */
export const LIMITS = {
  otpSendPerEmail: { max: 3, windowSecs: 3600 },
  otpSendPerIp: { max: 300, windowSecs: 3600 },
  otpVerifyPerEmail: { max: 8, windowSecs: 900 },
  registerPerUser: { max: 30, windowSecs: 3600 },
  scanPerUser: { max: 600, windowSecs: 3600 },
  uploadPerUser: { max: 10, windowSecs: 3600 },
} as const;

export async function consume(
  key: string,
  limit: { max: number; windowSecs: number },
) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    limit_key: key,
    max_count: limit.max,
    window_secs: limit.windowSecs,
  });

  // Fail CLOSED. If the limiter is broken we would rather reject the request
  // than leave the OTP endpoints wide open.
  if (error) {
    console.error("[rate-limit]", error);
    throw Object.assign(new Error("Service busy, try again shortly"), { status: 503 });
  }

  if (data !== true) {
    throw Object.assign(
      new Error("Too many attempts. Please wait a few minutes and try again."),
      { status: 429 },
    );
  }
}
