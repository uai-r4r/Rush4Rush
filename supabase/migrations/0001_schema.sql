-- R4R 2026 — core schema
-- Run order: 0001_schema → 0002_functions → 0003_rls → 0004_seed_clubs

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role           as enum ('attendee', 'volunteer', 'club_admin', 'super_admin');
create type registration_status as enum ('pending', 'confirmed', 'cancelled');
create type payment_type        as enum ('entry_pass', 'event', 'merch');
create type payment_method      as enum ('razorpay', 'manual_upi', 'free');
create type payment_status      as enum ('created', 'pending_review', 'paid', 'failed', 'rejected', 'refunded');

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users, holds everything auth.users doesn't
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  phone         text,
  college       text,
  year_of_study text,
  is_uai        boolean   not null default false,
  role          user_role not null default 'attendee',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx  on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone);

-- ---------------------------------------------------------------------------
-- clubs / club_admins
-- club_admins is many-to-many on purpose: give every club TWO logins so a lost
-- phone or a club head mid-performance doesn't lock anyone out.
-- ---------------------------------------------------------------------------
create table public.clubs (
  id         text primary key,          -- slug, e.g. 'rotaract'
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.club_admins (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  club_id    text not null references public.clubs(id)    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, club_id)
);

create index club_admins_club_idx on public.club_admins (club_id);

-- ---------------------------------------------------------------------------
-- events
-- ids match data/clubs.ts so the frontend keeps working unchanged.
-- Fees are WHOLE RUPEES. Razorpay wants paise — conversion happens only at the
-- Razorpay boundary (lib/razorpay.ts), never in the database.
-- ---------------------------------------------------------------------------
create table public.events (
  id            text primary key,
  club_id       text not null references public.clubs(id) on delete restrict,
  name          text not null,
  tagline       text,
  description   text,
  fee_inr       integer not null default 0 check (fee_inr >= 0),
  day           smallint check (day in (1, 2)),
  start_time    time,
  end_time      time,
  venue         text,
  category      text,
  team_size     text,
  capacity      integer check (capacity is null or capacity > 0),
  is_entry_pass boolean not null default false,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint events_time_order check (
    start_time is null or end_time is null or end_time > start_time
  )
);

create index events_club_idx  on public.events (club_id);
create index events_day_idx   on public.events (day, start_time);
create index events_venue_idx on public.events (venue, day);

-- The festival entry pass is modelled as an ordinary event. That means the
-- ₹100 gate pass gets a ticket, a QR, and a check-in for free — one ticket
-- system instead of two, and the scanner needs no special case.
insert into public.clubs (id, name) values ('r4r', 'Rush4Rush');
insert into public.events (id, club_id, name, tagline, fee_inr, is_entry_pass, category)
values ('r4r-entry-pass', 'r4r', 'R4R Festival Entry Pass',
        'Two days. Twenty-one clubs.', 100, true, 'Social');

-- ---------------------------------------------------------------------------
-- payments
-- One row per money movement: entry pass, an event fee, or merch.
-- amount_inr is ALWAYS recomputed server-side from events.fee_inr. The client
-- never gets to say what something costs.
-- ---------------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  type               payment_type   not null,
  method             payment_method not null default 'razorpay',
  status             payment_status not null default 'created',
  amount_inr         integer not null check (amount_inr >= 0),
  razorpay_order_id  text unique,
  razorpay_payment_id text unique,
  proof_path         text,           -- storage object path, manual_upi only
  reviewed_by        uuid references public.profiles(id),
  reviewed_at        timestamptz,
  review_note        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index payments_user_idx   on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status)
  where status in ('created', 'pending_review');

-- ---------------------------------------------------------------------------
-- registrations
-- ---------------------------------------------------------------------------
create table public.registrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  event_id      text not null references public.events(id)   on delete restrict,
  payment_id    uuid references public.payments(id) on delete set null,
  status        registration_status not null default 'pending',
  team_name     text,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- one person cannot register for the same event twice
  unique (user_id, event_id)
);

create index registrations_event_idx  on public.registrations (event_id, status);
create index registrations_user_idx   on public.registrations (user_id);
create index registrations_payment_idx on public.registrations (payment_id);

-- ---------------------------------------------------------------------------
-- otp_attempts — brute-force tracking for Supabase-issued email OTPs.
-- Supabase stores the code itself (hashed, in auth schema); we only count
-- failures so we can lock an email out after N wrong guesses. A 6-digit code
-- is a million guesses — without this it is trivially brute-forceable.
-- ---------------------------------------------------------------------------
create table public.otp_attempts (
  email       text primary key,
  fail_count  integer not null default 0,
  locked_until timestamptz,
  last_fail_at timestamptz,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rate_limits — fixed-window counter, keyed by "action:identifier"
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_log — who changed a schedule slot, who approved a payment.
-- When a club swears they never moved their slot, you will want this.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id         bigserial primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx  on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- settings — single row of fest-wide switches
-- ---------------------------------------------------------------------------
create table public.settings (
  id                     boolean primary key default true check (id),
  registration_open      boolean not null default true,
  schedule_frozen        boolean not null default false,
  payment_mode           text    not null default 'manual_upi'
                         check (payment_mode in ('razorpay', 'manual_upi', 'both')),
  upi_id                 text,
  upi_payee_name         text,
  updated_at             timestamptz not null default now()
);

insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch      before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger events_touch        before update on public.events
  for each row execute function public.touch_updated_at();
create trigger payments_touch      before update on public.payments
  for each row execute function public.touch_updated_at();
create trigger registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();
