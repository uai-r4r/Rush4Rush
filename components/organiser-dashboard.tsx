"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomListbox } from "@/components/custom-listbox";
import { apiGet, apiPost } from "@/lib/api-client";
import type { CurrentUser } from "@/lib/auth";

/**
 * Organiser dashboard.
 *
 * NOTE ON SCOPING: this component does no club filtering for security. It asks
 * the API for a club it is allowed to see, and the API — plus the SQL function
 * behind it — decides what comes back.
 *
 * The previous version filtered a full in-memory list client-side, so every
 * club's data was already sitting in the browser. Worse, its
 * `clubIds.length === 0` branch fell through to showing everything, meaning an
 * admin scoped to no clubs saw the entire festival. Empty means none, not all.
 */

type Row = {
  registration_id: string;
  payment_id: string | null;
  event_id: string;
  event_name: string;
  club_id: string;
  attendee_name: string | null;
  email: string;
  phone: string | null;
  college: string | null;
  year_of_study: string | null;
  is_uai: boolean;
  amount_inr: number;
  payment_status: string;
  payment_method: string;
  proof_path: string | null;
  acquirer_ref: string | null;
  payer_ref: string | null;
  status: string;
  checked_in_at: string | null;
  registered_at: string;
};

type Payload = {
  clubId: string | null;
  role: string;
  availableClubs: { id: string; name: string }[];
  registrations: Row[];
  proofUrls: Record<string, string>;
};

const statusLabel: Record<string, string> = {
  confirmed: "Paid",
  pending: "Pending",
  cancelled: "Rejected",
};

/** Registration status, unless they are already through the door. */
function displayStatus(row: Row) {
  if (row.checked_in_at) return "checked-in";
  if (row.status === "confirmed") return "paid";
  if (row.status === "cancelled") return "rejected";
  return "pending";
}

export function OrganiserDashboard({ user }: { user: CurrentUser }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<string>(
    user.role === "super_admin" ? "all" : (user.clubIds[0] ?? ""),
  );
  const [eventFilter, setEventFilter] = useState("All events");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"Newest" | "Name" | "Status" | "Amount">("Newest");
  /**
   * Default view hides abandoned checkouts.
   *
   * create_checkout writes the registration when someone clicks Continue —
   * before they pay — so anyone who closes the tab leaves a pending row with
   * no UTR and no screenshot. Those are noise: there is nothing to approve and
   * nothing to chase. "Needs review" shows only submissions with actual proof,
   * which is what a club admin is here to act on.
   */
  const [view, setView] = useState<"Needs review" | "All" | "Confirmed" | "Abandoned">(
    "Needs review",
  );
  const [proof, setProof] = useState<Row | null>(null);
  // UPI screenshots are often photographed off a second phone, so the UTR and
  // the amount can be unreadable at modal size. This opens the full image.
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Bulk selection. Manual UPI means hundreds of approvals; one at a time is
  // not a workable job for a fest weekend.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGet<Payload>(
        `/api/dashboard/registrations?clubId=${encodeURIComponent(selectedClub)}`,
      );
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }, [selectedClub]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Freeze the page behind the proof modal, and reset zoom when it closes. */
  useEffect(() => {
    document.body.classList.toggle("menu-open", Boolean(proof));
    if (!proof) setZoomed(false);
    return () => document.body.classList.remove("menu-open");
  }, [proof]);

  /** Escape steps back one layer: zoom first, then the proof modal. */
  useEffect(() => {
    if (!proof) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (zoomed) setZoomed(false);
      else setProof(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [proof, zoomed]);

  const rows = useMemo(() => data?.registrations ?? [], [data]);

  const events = useMemo(
    () => ["All events", ...Array.from(new Set(rows.map((r) => r.event_name)))],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const submitted = Boolean(row.proof_path) || Boolean(row.payer_ref);

        if (view === "Needs review") {
          // Awaiting a decision AND they actually submitted something.
          if (row.payment_status !== "pending_review" || !submitted) return false;
        } else if (view === "Confirmed") {
          if (row.status !== "confirmed") return false;
        } else if (view === "Abandoned") {
          // Started checkout, never submitted proof.
          if (row.status === "confirmed" || submitted) return false;
        }

        if (eventFilter !== "All events" && row.event_name !== eventFilter) return false;
        if (!needle) return true;
        return `${row.attendee_name ?? ""} ${row.email} ${row.phone ?? ""} ${row.registration_id}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        switch (sort) {
          case "Name":
            return (a.attendee_name ?? "").localeCompare(b.attendee_name ?? "");
          case "Status":
            return displayStatus(a).localeCompare(displayStatus(b));
          case "Amount":
            return b.amount_inr - a.amount_inr;
          default:
            return b.registered_at.localeCompare(a.registered_at);
        }
      });
  }, [rows, eventFilter, query, sort, view]);

  /**
   * Approve or reject a UPI payment. Approving flips every registration on
   * that payment to confirmed, which is what makes the attendee's QR appear.
   */
  async function review(row: Row, action: "approve" | "reject") {
    if (!row.payment_id) return;
    setBusy(row.registration_id);
    setError(null);
    try {
      await apiPost(`/api/payments/review/${row.payment_id}`, {
        action,
        note: action === "reject" ? "Payment could not be verified" : undefined,
      });
      setProof(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that payment.");
    } finally {
      setBusy(null);
    }
  }

  /** Only pending-review rows can be acted on, so only those are selectable. */
  const selectable = useMemo(
    () => filtered.filter((r) => r.payment_status === "pending_review" && r.payment_id),
    [filtered],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === selectable.length
        ? new Set()
        : new Set(selectable.map((r) => r.payment_id!)),
    );
  }

  async function bulkReview(action: "approve" | "reject") {
    if (selected.size === 0) return;
    if (
      action === "reject" &&
      !confirm(`Reject ${selected.size} payments? Everyone affected loses their place.`)
    ) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ approved: number; skipped: number }>(
        "/api/payments/review/bulk",
        { paymentIds: [...selected], action },
      );
      setSelected(new Set());
      await load();
      if (res.skipped > 0) {
        setError(`${res.skipped} skipped — not your club's to review.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: rows.length,
      paid: rows.filter((r) => r.status === "confirmed").length,
      checkedIn: rows.filter((r) => r.checked_in_at).length,
      // Only counts people who actually submitted something — an abandoned
      // checkout is not work waiting for anyone.
      pending: rows.filter(
        (r) =>
          r.payment_status === "pending_review" && (r.proof_path || r.payer_ref),
      ).length,
      collected: rows
        .filter((r) => r.payment_status === "paid")
        .reduce((sum, r) => sum + r.amount_inr, 0),
    }),
    [rows],
  );

  const clubOptions = useMemo(() => {
    const list = data?.availableClubs ?? [];
    const names = list.map((c) => c.name);
    return user.role === "super_admin" ? ["All clubs", ...names] : names;
  }, [data, user.role]);

  function onClubChange(name: string) {
    if (name === "All clubs") {
      setSelectedClub("all");
      return;
    }
    const match = data?.availableClubs.find((c) => c.name === name);
    if (match) setSelectedClub(match.id);
  }

  const currentClubName =
    selectedClub === "all"
      ? "All clubs"
      : (data?.availableClubs.find((c) => c.id === selectedClub)?.name ?? "");

  const proofUrl = proof ? data?.proofUrls[proof.registration_id] : undefined;

  return (
    <section className="organiser-dashboard">
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">R4R // ORGANISER CONSOLE</p>
          <h1>
            REGISTRATION
            <br />
            <em>CONTROL</em>
          </h1>
          <p className="gated-copy">
            Review entries, verify payment proof, and keep the room moving.
          </p>
        </div>
        <a
          className="button button-primary"
          href={`/api/dashboard/export?clubId=${encodeURIComponent(selectedClub)}`}
        >
          Export CSV
        </a>
      </header>

      <div className="dashboard-stats">
        <div>
          <span>Total registrations</span>
          <strong>{stats.total}</strong>
        </div>
        <div>
          <span>Paid</span>
          <strong>{stats.paid}</strong>
        </div>
        <div>
          <span>Checked in</span>
          <strong>{stats.checkedIn}</strong>
        </div>
        <div>
          <span>Awaiting review</span>
          <strong>{stats.pending}</strong>
        </div>
        <div>
          <span>Collected</span>
          <strong>Rs. {stats.collected}</strong>
        </div>
      </div>

      <div className="dashboard-toolbar">
        <input
          aria-label="Search registrations"
          placeholder="Search name, email, phone, or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {clubOptions.length > 1 && (
          <CustomListbox
            value={currentClubName}
            onChange={onClubChange}
            options={clubOptions}
            ariaLabel="Filter by club"
          />
        )}
        <CustomListbox
          value={view}
          onChange={(v) => setView(v as typeof view)}
          options={["Needs review", "All", "Confirmed", "Abandoned"]}
          ariaLabel="Filter by status"
        />
        <CustomListbox
          value={eventFilter}
          onChange={setEventFilter}
          options={events}
          ariaLabel="Filter by event"
        />
        <CustomListbox
          value={sort}
          onChange={(v) => setSort(v as "Newest" | "Name" | "Status" | "Amount")}
          options={["Newest", "Name", "Status", "Amount"]}
          ariaLabel="Sort registrations"
        />
      </div>

      {error && <p className="auth-error">{error}</p>}

      {selectable.length > 0 && (
        <div className="bulk-bar">
          <label>
            <input
              type="checkbox"
              checked={selected.size === selectable.length && selectable.length > 0}
              onChange={toggleAll}
            />
            <span>
              {selected.size > 0
                ? `${selected.size} selected`
                : `${selectable.length} awaiting review`}
            </span>
          </label>
          {selected.size > 0 && (
            <div className="bulk-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={bulkBusy}
                onClick={() => bulkReview("approve")}
              >
                {bulkBusy ? "WORKING…" : `APPROVE ${selected.size}`}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={bulkBusy}
                onClick={() => bulkReview("reject")}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="dashboard-count">Loading registrations…</p>
      ) : (
        <>
          <div className="registrations-table" role="region" aria-label="Registrations">
            <table>
              <thead>
                <tr>
                  <th aria-label="Select" />
                  <th>Attendee</th>
                  <th>Club / event</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const state = displayStatus(row);
                  const awaiting = row.payment_status === "pending_review";
                  return (
                    <tr key={row.registration_id}>
                      <td>
                        {awaiting && row.payment_id && (
                          <input
                            type="checkbox"
                            checked={selected.has(row.payment_id)}
                            onChange={() => toggle(row.payment_id!)}
                            aria-label={`Select ${row.attendee_name ?? row.email}`}
                          />
                        )}
                      </td>
                      <td>
                        <strong>{row.attendee_name ?? "—"}</strong>
                        <span>{row.email}</span>
                        <small>
                          {row.phone ?? "no phone"} · {row.college ?? "—"}
                          {row.is_uai ? " · UAI" : ""}
                        </small>
                      </td>
                      <td>
                        <strong>{row.event_name}</strong>
                        <span>{row.club_id}</span>
                      </td>
                      <td>Rs. {row.amount_inr}</td>
                      <td>
                        <span className={`status status-${state}`}>
                          {statusLabel[row.status] ?? row.status}
                        </span>
                      </td>
                      <td>
                        {data?.proofUrls[row.registration_id] ? (
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => setProof(row)}
                          >
                            View proof
                          </button>
                        ) : (
                          <span className="muted-label">—</span>
                        )}
                      </td>
                      <td>
                        {awaiting ? (
                          <>
                            <button
                              className="text-button"
                              type="button"
                              disabled={busy === row.registration_id}
                              onClick={() => review(row, "approve")}
                            >
                              Approve
                            </button>
                            {" · "}
                            <button
                              className="text-button"
                              type="button"
                              disabled={busy === row.registration_id}
                              onClick={() => review(row, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="muted-label">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="dashboard-count">
            Showing {filtered.length} of {rows.length} registrations
            {currentClubName ? ` · ${currentClubName}` : ""}
          </p>
        </>
      )}

      {proof && (
        <div
          className="proof-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Payment proof"
          onClick={() => setProof(null)}
        >
          <div className="proof-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="auth-close"
              type="button"
              aria-label="Close proof"
              onClick={() => setProof(null)}
            >
              ×
            </button>
            <p className="eyebrow">PAYMENT PROOF // Rs. {proof.amount_inr}</p>
            <h2>{proof.attendee_name ?? proof.email}</h2>
            {/* Signed URL, ~5 minute life. The bucket itself stays private. */}
            <button
              className="proof-image-button"
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Enlarge payment screenshot"
            >
              <img src={proofUrl} alt="Payment screenshot" className="proof-image" />
              <span className="map-zoom-badge" aria-hidden="true">
                ＋ Tap to zoom
              </span>
            </button>
            <div className="proof-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={busy === proof.registration_id}
                onClick={() => review(proof, "approve")}
              >
                Mark verified
              </button>
              <button
                className="text-button"
                type="button"
                disabled={busy === proof.registration_id}
                onClick={() => review(proof, "reject")}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sits above the proof modal rather than inside it — .proof-modal has
          overflow:auto, so a child could never escape its scroll box. */}
      {proof && zoomed && (
        <div
          className="map-lightbox-backdrop proof-zoom"
          role="dialog"
          aria-modal="true"
          aria-label="Payment screenshot enlarged"
          onClick={() => setZoomed(false)}
        >
          <button
            className="modal-close"
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close enlarged screenshot"
          >
            ×
          </button>
          <p className="map-lightbox-hint">
            Scroll or pinch to zoom · click anywhere to close
          </p>
          <div
            className="map-lightbox-canvas"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={proofUrl}
              alt="Payment screenshot"
              className="map-lightbox-image"
            />
          </div>
        </div>
      )}
    </section>
  );
}
