-- R4R 2026 — dashboard needs payment_id to approve/reject
--
-- club_registrations() returned proof_path but not the payment it belongs to,
-- so the dashboard had no id to send to /api/payments/review/:id. Adding it
-- here rather than joining client-side keeps the scoping check in one place.
--
-- Safe to re-run.

drop function if exists public.club_registrations(text);

create or replace function public.club_registrations(target_club text)
returns table (
  registration_id uuid,
  payment_id      uuid,
  event_id        text,
  event_name      text,
  club_id         text,
  attendee_name   text,
  email           text,
  phone           text,
  college         text,
  year_of_study   text,
  is_uai          boolean,
  amount_inr      integer,
  payment_status  payment_status,
  payment_method  payment_method,
  proof_path      text,
  status          registration_status,
  checked_in_at   timestamptz,
  registered_at   timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    r.id, r.payment_id, e.id, e.name, e.club_id,
    p.full_name, p.email, p.phone, p.college, p.year_of_study, p.is_uai,
    coalesce(pay.amount_inr, e.fee_inr),
    coalesce(pay.status, 'created'::payment_status),
    coalesce(pay.method, 'free'::payment_method),
    pay.proof_path,
    r.status, r.checked_in_at, r.created_at
  from public.registrations r
  join public.events   e   on e.id = r.event_id
  join public.profiles p   on p.id = r.user_id
  left join public.payments pay on pay.id = r.payment_id
  where e.club_id = target_club
    -- The scoping lives HERE, not in the React component. A club admin
    -- physically cannot receive another club's rows: without this check the
    -- function returns nothing at all.
    and public.is_admin_of_club(target_club)
  order by r.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Super admins need every club in one view rather than 22 separate loads.
-- Same security-definer pattern, gated on the role instead of membership.
-- ---------------------------------------------------------------------------
create or replace function public.all_registrations()
returns table (
  registration_id uuid,
  payment_id      uuid,
  event_id        text,
  event_name      text,
  club_id         text,
  attendee_name   text,
  email           text,
  phone           text,
  college         text,
  year_of_study   text,
  is_uai          boolean,
  amount_inr      integer,
  payment_status  payment_status,
  payment_method  payment_method,
  proof_path      text,
  status          registration_status,
  checked_in_at   timestamptz,
  registered_at   timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    r.id, r.payment_id, e.id, e.name, e.club_id,
    p.full_name, p.email, p.phone, p.college, p.year_of_study, p.is_uai,
    coalesce(pay.amount_inr, e.fee_inr),
    coalesce(pay.status, 'created'::payment_status),
    coalesce(pay.method, 'free'::payment_method),
    pay.proof_path,
    r.status, r.checked_in_at, r.created_at
  from public.registrations r
  join public.events   e   on e.id = r.event_id
  join public.profiles p   on p.id = r.user_id
  left join public.payments pay on pay.id = r.payment_id
  where public.my_role() = 'super_admin'
  order by r.created_at desc;
$$;
