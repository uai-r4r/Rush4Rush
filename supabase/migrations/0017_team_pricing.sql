-- R4R 2026 — team size pricing and paid capacity
--
-- THE HOLE THIS CLOSES: capacity used to come from events.max_team_size, so a
-- leader could pay the 2-person rate and then share the code with a third
-- person on a 3-max event. The club is short and nobody notices until the day.
--
-- Capacity now comes from what was PAID FOR, not what the event allows:
--
--   leader declares a size at checkout → server prices that size →
--   teams.capacity is set to it → the code stops working at exactly that many
--
-- Clubs can price sizes independently (Rs.200 for 2, Rs.350 for 3) rather than
-- assuming a per-head multiple. Where a club charges one flat fee regardless,
-- leaving event_team_pricing empty falls back to events.fee_inr.
--
-- Teams can also grow later by paying the difference — see
-- payments.team_capacity below.
--
-- Safe to re-run.

create table if not exists public.event_team_pricing (
  event_id  text    not null references public.events(id) on delete cascade,
  team_size integer not null check (team_size >= 1 and team_size <= 20),
  fee_inr   integer not null check (fee_inr >= 0),
  primary key (event_id, team_size)
);

alter table public.event_team_pricing enable row level security;

create policy "team pricing is public"
  on public.event_team_pricing for select using (true);

create policy "super admin manages team pricing"
  on public.event_team_pricing for all
  using (public.has_role_at_least('super_admin'))
  with check (public.has_role_at_least('super_admin'));

alter table public.teams
  add column if not exists capacity integer not null default 1;

comment on column public.teams.capacity is
  'How many members this team PAID for. Not events.max_team_size — that is only the ceiling a club allows.';

-- Payments can now carry a capacity change, applied when the payment confirms.
-- Keeps the "grow the team later" flow on the same rails as every other
-- payment: nothing changes until money is actually verified.
alter table public.payments
  add column if not exists team_id       uuid references public.teams(id) on delete set null,
  add column if not exists team_capacity integer;

-- ---------------------------------------------------------------------------
-- What a team of N costs for an event.
--
-- Explicit price for that size if the club set one; otherwise the event's flat
-- fee. Never multiplies by head count on its own — a club charging per person
-- should say so by filling in the rows.
-- ---------------------------------------------------------------------------
create or replace function public.team_fee(p_event_id text, p_size integer)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select fee_inr from public.event_team_pricing
      where event_id = p_event_id and team_size = p_size),
    (select fee_inr from public.events where id = p_event_id),
    0
  );
$$;

-- ---------------------------------------------------------------------------
-- create_team now records what was paid for.
-- ---------------------------------------------------------------------------
drop function if exists public.create_team(text, uuid, text);

create or replace function public.create_team(
  p_event_id text,
  p_user_id  uuid,
  p_capacity integer,
  p_name     text default null
)
returns table (team_id uuid, code text, capacity integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_min  integer;
  v_max  integer;
  v_id   uuid;
  v_code text;
  v_cap  integer;
begin
  select min_team_size, max_team_size into v_min, v_max
  from public.events where id = p_event_id;

  if v_max is null or v_max <= 1 then
    raise exception 'NOT_A_TEAM_EVENT';
  end if;

  if p_capacity < greatest(v_min, 1) or p_capacity > v_max then
    raise exception 'BAD_TEAM_SIZE';
  end if;

  select t.id, t.code, t.capacity into v_id, v_code, v_cap
  from public.teams t
  where t.event_id = p_event_id and t.leader_id = p_user_id;

  if v_id is not null then
    return query select v_id, v_code, v_cap;
    return;
  end if;

  v_code := public.generate_team_code();

  insert into public.teams (event_id, leader_id, name, code, capacity)
  values (p_event_id, p_user_id, nullif(trim(coalesce(p_name, '')), ''), v_code, p_capacity)
  returning id, teams.code, teams.capacity into v_id, v_code, v_cap;

  update public.registrations
     set team_id = v_id
   where user_id = p_user_id and event_id = p_event_id;

  return query select v_id, v_code, v_cap;
end $$;

-- ---------------------------------------------------------------------------
-- join_team: capacity check now reads teams.capacity, not the event maximum.
-- ---------------------------------------------------------------------------
create or replace function public.join_team(
  p_code    text,
  p_user_id uuid
)
returns table (
  ok         boolean,
  reason     text,
  event_id   text,
  event_name text,
  team_id    uuid,
  members    integer,
  capacity   integer
)
language plpgsql security definer set search_path = public
as $$
declare
  t          record;
  v_count    integer;
  v_has_pass boolean;
  v_reg      uuid;
begin
  select tm.id, tm.event_id, tm.capacity, e.name as ev_name
    into t
  from public.teams tm
  join public.events e on e.id = tm.event_id
  where upper(trim(tm.code)) = upper(trim(p_code));

  if not found then
    return query select false, 'BAD_CODE', null::text, null::text, null::uuid, 0, 0;
    return;
  end if;

  select exists (
    select 1 from public.registrations
    where user_id = p_user_id
      and event_id = 'r4r-entry-pass'
      and status = 'confirmed'
  ) into v_has_pass;

  if not v_has_pass then
    return query select false, 'NEEDS_PASS', t.event_id, t.ev_name, t.id, 0, t.capacity;
    return;
  end if;

  select id into v_reg
  from public.registrations
  where user_id = p_user_id and event_id = t.event_id and status <> 'cancelled';

  if v_reg is not null then
    return query select false, 'ALREADY_REGISTERED', t.event_id, t.ev_name, t.id, 0, t.capacity;
    return;
  end if;

  select count(*) into v_count
  from public.registrations
  where team_id = t.id and status <> 'cancelled';

  -- Paid capacity, NOT the event ceiling. This is the whole point: a team that
  -- paid for 2 admits 2, even on an event that allows 3.
  if v_count >= t.capacity then
    return query select false, 'TEAM_FULL', t.event_id, t.ev_name, t.id, v_count, t.capacity;
    return;
  end if;

  insert into public.registrations (user_id, event_id, team_id, status)
  values (p_user_id, t.event_id, t.id, 'confirmed');

  return query select true, 'OK', t.event_id, t.ev_name, t.id, v_count + 1, t.capacity;
end $$;

-- ---------------------------------------------------------------------------
-- confirm_payment applies a paid-for capacity increase.
--
-- Growing a team goes through the same path as any other payment: the extra
-- seat does not exist until the money is verified.
-- ---------------------------------------------------------------------------
drop function if exists public.confirm_payment(uuid, text, uuid);
drop function if exists public.confirm_payment(uuid, text, uuid, text);

create or replace function public.confirm_payment(
  p_payment_id          uuid,
  p_razorpay_payment_id text default null,
  p_reviewer            uuid default null,
  p_acquirer_ref        text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_already boolean;
  v_team    uuid;
  v_cap     integer;
begin
  select status = 'paid', team_id, team_capacity
    into v_already, v_team, v_cap
  from public.payments where id = p_payment_id;

  if v_already is null then
    return false;
  end if;

  if v_already then
    if p_acquirer_ref is not null then
      update public.payments
         set acquirer_ref = coalesce(acquirer_ref, p_acquirer_ref)
       where id = p_payment_id;
    end if;
    return true;
  end if;

  update public.payments
     set status              = 'paid',
         razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id),
         acquirer_ref        = coalesce(p_acquirer_ref, acquirer_ref),
         reviewed_by         = coalesce(p_reviewer, reviewed_by),
         reviewed_at         = case when p_reviewer is not null then now() else reviewed_at end
   where id = p_payment_id;

  update public.registrations
     set status = 'confirmed'
   where payment_id = p_payment_id
     and status = 'pending';

  -- Only ever grows capacity — greatest() stops a stale or replayed webhook
  -- shrinking a team that has since grown further.
  if v_team is not null and v_cap is not null then
    update public.teams
       set capacity = greatest(capacity, v_cap)
     where id = v_team;
  end if;

  return true;
end $$;
