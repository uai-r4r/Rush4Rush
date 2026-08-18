"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CustomListbox } from "@/components/custom-listbox";
import { apiGet, apiPost } from "@/lib/api-client";
import type { CurrentUser } from "@/lib/auth";

/**
 * Gate scanner.
 *
 * Designed for someone standing in the sun with a queue behind them, so:
 *   · the verdict is full-bleed colour and huge type, readable at arm's length
 *   · check-in is automatic — no confirm button to tap 400 times
 *   · it returns to the camera on its own after 2 seconds
 *   · a phone-number fallback sits one tap away, because the network WILL drop
 *     and someone WILL arrive with a dead battery
 *
 * The camera needs HTTPS. It will not work over http:// or a bare LAN IP, so
 * test on the deployed URL rather than localhost on someone's phone. On iOS,
 * use Safari — camera access in other iPhone browsers is unreliable.
 */

type Verdict = {
  result: "OK" | "ALREADY_USED" | "INVALID";
  reason?: string;
  attendeeName?: string | null;
  eventName?: string | null;
  alreadyAt?: string | null;
  ticketFor?: string | null;
};

type Match = {
  registration_id: string;
  attendee_name: string | null;
  phone: string | null;
  event_name: string;
  status: string;
  checked_in_at: string | null;
};

const reasonCopy: Record<string, string> = {
  BAD_TOKEN: "Not a valid R4R ticket",
  NOT_FOUND: "Ticket not recognised",
  NOT_CONFIRMED: "Payment not confirmed yet",
  WRONG_EVENT: "Valid ticket — wrong event",
  ALREADY_TODAY: "Already entered today",
};

export function VolunteerScanner({
  user,
  events,
}: {
  user: CurrentUser;
  events: { id: string; name: string }[];
}) {
  const [eventId, setEventId] = useState<string>(events[0]?.id ?? "");
  const [tab, setTab] = useState<"camera" | "phone">("camera");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [count, setCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);

  const scannerRef = useRef<InstanceType<
    typeof import("html5-qrcode").Html5Qrcode
  > | null>(null);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * eventId lives in a ref as well as state so the decode callback can read the
   * current value without being recreated. Without this the camera tore down
   * and restarted every time the dropdown changed — which raced the previous
   * instance's teardown and left the scanner in a broken state.
   */
  const eventIdRef = useRef(eventId);
  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  const eventName = events.find((e) => e.id === eventId)?.name ?? "";

  const show = useCallback((v: Verdict) => {
    setVerdict(v);
    if (v.result === "OK") setCount((c) => c + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVerdict(null);
      lockRef.current = false;
    }, 2000);
  }, []);

  const submitToken = useCallback(
    async (token: string) => {
      try {
        const res = await apiPost<Verdict>("/api/scan", {
          token,
          eventId: eventIdRef.current,
        });
        show(res);
      } catch {
        show({ result: "INVALID", reason: "NETWORK" });
      }
    },
    [show],
  );

  // ── Camera ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "camera") return;

    let cancelled = false;
    let started = false;
    let instance: InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null = null;

    // localhost counts as a secure context, so this is NOT simply "needs
    // HTTPS" — report what actually happened instead of guessing.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCameraError(
        "Camera needs a secure connection (https). Open the deployed site, or use phone lookup.",
      );
      return;
    }

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        instance = new Html5Qrcode("qr-reader");
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          // Cast: experimentalFeatures is supported at runtime by html5-qrcode
          // but missing from its published types.
          {
            // 25fps: more decode attempts per second, so a hand-held phone
            // catches the code during a brief steady moment instead of needing
            // to be held still.
            fps: 25,
            /**
             * qrbox sized to the viewfinder rather than fixed at 240px. A fixed
             * box on a large screen means the code must be held in a small
             * centre square; scaling it lets the volunteer be sloppier about
             * aim, which is what actually happens with a queue.
             */
            qrbox: (viewW: number, viewH: number) => {
              const edge = Math.floor(Math.min(viewW, viewH) * 0.8);
              return { width: edge, height: edge };
            },
            // Phone screens are glossy and often held at an angle.
            aspectRatio: 1,
            // Use the browser's native detector where available (Chrome,
            // Android). Considerably faster and far better on low contrast
            // than the JS fallback.
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
            disableFlip: false,
          } as Parameters<typeof instance.start>[1],
          (decoded) => {
            // Lock while a verdict is showing, or one ticket held in front of
            // the lens fires the endpoint ten times a second.
            if (lockRef.current) return;
            lockRef.current = true;
            void submitToken(decoded);
          },
          () => {
            /* per-frame decode misses are normal — ignore */
          },
        );

        started = true;

        // Torch, where the device exposes it. Gate areas are often dim and a
        // phone screen behind glass reflects badly; light helps more than any
        // decoder tuning.
        try {
          const caps = instance.getRunningTrackCapabilities() as MediaTrackCapabilities & {
            torch?: boolean;
          };
          setTorchAvailable(Boolean(caps?.torch));
        } catch {
          setTorchAvailable(false);
        }

        if (cancelled) {
          // React runs effects twice in dev; if we were torn down mid-start,
          // stop the camera we just opened rather than leaking it.
          await instance.stop().catch(() => {});
          instance.clear();
        } else {
          setCameraError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setCameraError(
          /permission|denied|notallowed/i.test(message)
            ? "Camera permission denied. Allow access in your browser, then reload."
            : /notfound|no camera|devices/i.test(message)
              ? "No camera found on this device. Use phone lookup."
              : `Camera could not start: ${message}`,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      const s = instance;
      scannerRef.current = null;
      if (!s) return;
      // Guard the whole teardown: calling stop() on a scanner that never
      // started throws "Cannot stop, scanner is not running or paused", and a
      // synchronous throw is not caught by a promise .catch().
      try {
        if (started) {
          void s.stop().then(() => s.clear()).catch(() => {});
        } else {
          s.clear();
        }
      } catch {
        /* already torn down */
      }
    };
  }, [tab, submitToken]);

  // ── Phone fallback ────────────────────────────────────────────────────────
  async function lookup() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) {
      setMatches([]);
      return;
    }
    setBusy(true);
    try {
      const res = await apiGet<{ matches: Match[] }>(
        `/api/scan/lookup?phone=${encodeURIComponent(digits)}`,
      );
      setMatches(res.matches);
    } catch {
      setMatches([]);
    } finally {
      setBusy(false);
    }
  }

  async function checkInManually(m: Match) {
    setBusy(true);
    try {
      const res = await apiPost<Verdict>("/api/scan/manual", {
        registrationId: m.registration_id,
      });
      show(res);
      await lookup();
    } catch {
      show({ result: "INVALID", reason: "NETWORK" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="scanner-shell">
      <header className="scanner-header">
        <p className="eyebrow">R4R // ENTRY SCAN</p>
        <h1>
          LET THEM
          <br />
          <em>IN.</em>
        </h1>
        <p className="gated-copy">
          {user.name} · {count} checked in this session
        </p>
      </header>

      <div className="scanner-controls">
        <CustomListbox
          value={eventName}
          onChange={(name) => {
            const match = events.find((e) => e.name === name);
            if (match) setEventId(match.id);
          }}
          options={events.map((e) => e.name)}
          ariaLabel="Scanning for event"
        />
        <div className="scanner-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "camera"}
            className={tab === "camera" ? "is-active" : ""}
            onClick={() => setTab("camera")}
          >
            Camera
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "phone"}
            className={tab === "phone" ? "is-active" : ""}
            onClick={() => setTab("phone")}
          >
            Phone lookup
          </button>
        </div>
      </div>

      {tab === "camera" ? (
        <div className="scanner-stage">
          <div id="qr-reader" className="qr-reader" />
          {torchAvailable && (
            <button
              className="text-button torch-toggle"
              type="button"
              onClick={async () => {
                try {
                  // `torch` is a real constraint on Android/Chrome but is
                  // absent from the DOM typings, hence the cast.
                  await scannerRef.current?.applyVideoConstraints({
                    advanced: [{ torch: !torchOn }],
                  } as unknown as MediaTrackConstraints);
                  setTorchOn((t) => !t);
                } catch {
                  setTorchAvailable(false);
                }
              }}
            >
              {torchOn ? "Torch off" : "Torch on"}
            </button>
          )}
          {cameraError && <p className="auth-error">{cameraError}</p>}
          <p className="scanner-hint">
            Hold the phone about 15 cm away. Ask them to turn screen brightness up.
          </p>
        </div>
      ) : (
        <div className="scanner-lookup">
          <div className="lookup-row">
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Last 4+ digits of phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              aria-label="Phone number"
            />
            <button className="button button-primary" type="button" disabled={busy} onClick={lookup}>
              {busy ? "…" : "FIND"}
            </button>
          </div>

          {matches?.length === 0 && <p className="gated-copy">No matches.</p>}

          {matches?.map((m) => (
            <div key={m.registration_id} className="lookup-result">
              <div>
                <strong>{m.attendee_name ?? "—"}</strong>
                <span>{m.event_name}</span>
                <small>
                  {m.phone ?? ""}
                  {m.checked_in_at
                    ? ` · already in at ${new Date(m.checked_in_at).toLocaleTimeString("en-IN")}`
                    : ""}
                </small>
              </div>
              <button
                className="text-button"
                type="button"
                disabled={busy || Boolean(m.checked_in_at) || m.status !== "confirmed"}
                onClick={() => checkInManually(m)}
              >
                {m.checked_in_at ? "Done" : m.status !== "confirmed" ? "Unpaid" : "Check in"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Full-bleed verdict. Pure saturated colour and huge type, because phone
          screens wash out completely in direct sunlight. */}
      {verdict && (
        <div
          className={`scan-verdict scan-verdict-${verdict.result.toLowerCase()}`}
          role="status"
          aria-live="assertive"
          onClick={() => {
            setVerdict(null);
            lockRef.current = false;
          }}
        >
          <strong>
            {verdict.result === "OK"
              ? // A gate pass scanned on day 2 is a legitimate re-entry, not a
                // repeat — say so, or the volunteer hesitates over a green screen.
                verdict.reason === "RETURNING"
                ? "WELCOME BACK"
                : "LET THEM IN"
              : verdict.result === "ALREADY_USED"
                ? verdict.reason === "ALREADY_TODAY"
                  ? "ALREADY IN TODAY"
                  : "ALREADY USED"
                : "INVALID"}
          </strong>
          {verdict.attendeeName && <span>{verdict.attendeeName}</span>}
          {verdict.eventName && <em>{verdict.eventName}</em>}
          {verdict.alreadyAt && (
            <small>Entered at {new Date(verdict.alreadyAt).toLocaleTimeString("en-IN")}</small>
          )}
          {verdict.reason && !verdict.attendeeName && (
            <small>{reasonCopy[verdict.reason] ?? verdict.reason}</small>
          )}
          {verdict.ticketFor && <small>Ticket is for {verdict.ticketFor}</small>}
        </div>
      )}
    </main>
  );
}
