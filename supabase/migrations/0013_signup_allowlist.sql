-- R4R 2026 — restrict sign-in to the team while the site is being finished
--
-- The site is publicly reachable (Razorpay's reviewers need that, and so do
-- the policy pages), but nobody outside the team should be able to request a
-- code and start registering yet.
--
-- Deliberately gates the OTP SEND, not the whole site:
--   · anyone can browse events, schedule, and the policy pages
--   · only allowlisted addresses can get a code
--   · anyone already signed in stays signed in — sessions are untouched
--
-- One flag flips it off when you open registration. No redeploy.
--
-- Safe to re-run.

alter table public.settings
  add column if not exists signup_restricted boolean not null default false;

comment on column public.settings.signup_restricted is
  'When true, only addresses in allowed_emails (or existing staff) can request an OTP. Set false to open registration.';

create table if not exists public.allowed_emails (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- No policies: RLS on with zero policies means only the service role can read
-- this. The list of who has early access is not public information.

create or replace function public.can_request_otp(target_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    -- Open to everyone once the flag is off.
    not (select signup_restricted from public.settings where id = true)
    -- Explicitly allowlisted.
    or exists (
      select 1 from public.allowed_emails
      where email = lower(trim(target_email))
    )
    -- Or already staff: club admins and volunteers must never be locked out of
    -- their own dashboards by a testing flag.
    or exists (
      select 1 from public.profiles
      where email = lower(trim(target_email))
        and role in ('volunteer', 'club_admin', 'super_admin')
    );
$$;

-- ---------------------------------------------------------------------------
-- Turn it on, and seed the team. Add the rest of your devs here.
-- ---------------------------------------------------------------------------
update public.settings set signup_restricted = true where id = true;

insert into public.allowed_emails (email, note) values
  ('divyanshroutray8d13@gmail.com', 'dev')
on conflict (email) do nothing;
