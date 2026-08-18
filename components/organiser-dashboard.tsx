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
  const [proof, setProof] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const rows = useMemo(() => data?.registrations ?? [], [data]);

  const events = useMemo(
    () => ["All events", ...Array.from(new Set(rows.map((r) => r.event_name)))],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => {
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
  }, [rows, eventFilter, query, sort]);

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

  const stats = useMemo(
    () => ({
      total: rows.length,
      paid: rows.filter((r) => r.status === "confirmed").length,
      checkedIn: rows.filter((r) => r.checked_in_at).length,
      pending: rows.filter((r) => r.status === "pending").length,
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
          <span>Pending review</span>
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

      {loading ? (
        <p className="dashboard-count">Loading registrations…</p>
      ) : (
        <>
          <div className="registrations-table" role="region" aria-label="Registrations">
            <table>
              <thead>
                <tr>
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
            <img
              src={data?.proofUrls[proof.registration_id]}
              alt="Payment screenshot"
              className="proof-image"
            />
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
    </section>
  );
}
