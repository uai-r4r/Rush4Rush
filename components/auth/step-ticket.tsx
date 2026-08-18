export function StepTicket({
  name,
  email,
  onSuccess,
  nextLabel = "ENTER THE RUSH",
}: {
  name: string;
  email: string;
  onSuccess: (name: string) => void;
  nextLabel?: string;
}) {
  return (
    <div className="ticket-card">
      <span className="ticket-label">ACCOUNT CREATED</span>
      <strong>R4R 2026</strong>
      <span>
        {name || "Registered guest"} · {email}
      </span>
      <p className="auth-hint">
        You&apos;re signed in. Pick your events and your passes appear in My Tickets.
      </p>
      <button
        className="button button-primary auth-submit"
        onClick={() => onSuccess(name || email.split("@")[0])}
      >
        {nextLabel}
      </button>
    </div>
  );
}
