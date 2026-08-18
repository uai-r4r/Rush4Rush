-- R4R 2026 — functions
--
-- Every function here is SECURITY DEFINER with a pinned search_path. Pinning
-- matters: without it a caller can put a malicious schema earlier in the path
-- and hijack the unqualified table names inside the function body.

-- ---------------------------------------------------------------------------
-- New auth.users row → profile row.
-- Runs as the auth system, so it must not depend on any RLS policy.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_uai)
  values (
    new.id,
    lower(new.email),
    lower(new.email) like '%@universalai.in'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helpers — used inside RLS policies.
-- SECURITY DEFINER breaks the recursion that would otherwise happen when a
-- policy on `profiles` needs to read `profiles` to find out your role.
-- ---------------------------------------------------------------------------
create or replace function public.my_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'attendee'::user_role
  );
$$;

create or replace function public.role_rank(r user_role)
returns integer
language sql immutable
as $$
  select case r
    when 'attendee'    then 1
    when 'volunteer'   then 2
    when 'club_admin'  then 3
    when 'super_admin' then 4
  end;
$$;

create or replace function public.has_role_at_least(minimum user_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.role_rank(public.my_role()) >= public.role_rank(minimum);
$$;

create or replace function public.is_admin_of_club(target_club text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.my_role() = 'super_admin'
    or exists (
      select 1 from public.club_admins
      where user_id = auth.uid() and club_id = target_club
    );
$$;

create or replace function public.my_club_ids()
returns text[]
language sql stable security definer set search_path = public
as $$
  select case
    when public.my_role() = 'super_admin'
      then coalesce((select array_agg(id) from public.clubs), '{}')
    else coalesce(
      (select array_agg(club_id) from public.club_admins where user_id = auth.uid()),
      '{}'
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting — atomic fixed-window counter.
-- Returns true when the caller is ALLOWED to proceed.
-- The upsert + conditional reset happens in one statement so two concurrent
-- requests can't both read "count = 2" and both write "3".
-- ---------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  limit_key    text,
  max_count    integer,
  window_secs  integer
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.rate_limits (key, count, window_start)
  values (limit_key, 1, now())
  on conflict (key) do update
    set count = case
          when public.rate_limits.window_start < now() - make_interval(secs => window_secs)
          then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < now() - make_interval(secs => window_secs)
          then now()
          else public.rate_limits.window_start
        end
  returning count into current_count;

  return current_count <= max_count;
end $$;

-- ---------------------------------------------------------------------------
-- Venue clash detection.
-- Two clubs will try to move into the same room at the same hour. Catch it on
-- save rather than at 10am on day one.
-- ---------------------------------------------------------------------------
create or replace function public.find_venue_clash(
  target_event  text,
  target_venue  text,
  target_day    smallint,
  target_start  time,
  target_end    time
)
returns table (id text, name text, start_time time, end_time time)
language sql stable security definer set search_path = public
as $$
  select e.id, e.name, e.start_time, e.end_time
  from public.events e
  where e.id       <> target_event
    and e.venue     = target_venue
    and e.day       = target_day
    and e.is_published
    and e.start_time is not null
    and e.end_time   is not null
    -- half-open overlap: [start, end) — back-to-back slots do not clash
    and e.start_time < target_end
    and e.end_time   > target_start;
$$;

-- ---------------------------------------------------------------------------
-- Atomic check-in.
-- The WHERE clause carries `checked_in_at is null`, so if two volunteers scan
-- the same ticket at the same instant exactly one UPDATE matches a row. The
-- loser gets zero rows back and reports ALREADY_USED. Read-then-write would
-- let both through.
-- ---------------------------------------------------------------------------
create or replace function public.check_in_registration(
  reg_id     uuid,
  scanner_id uuid
)
returns table (
  ok            boolean,
  reason        text,
  attendee_name text,
  event_name    text,
  already_at    timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare
  rec record;
begin
  select r.id, r.status, r.checked_in_at, p.full_name, e.name as ev_name
    into rec
  from public.registrations r
  join public.profiles p on p.id = r.user_id
  join public.events   e on e.id = r.event_id
  where r.id = reg_id;

  if not found then
    return query select false, 'NOT_FOUND', null::text, null::text, null::timestamptz;
    return;
  end if;

  if rec.status <> 'confirmed' then
    return query select false, 'NOT_CONFIRMED', rec.full_name, rec.ev_name, null::timestamptz;
    return;
  end if;

  if rec.checked_in_at is not null then
    return query select false, 'ALREADY_USED', rec.full_name, rec.ev_name, rec.checked_in_at;
    return;
  end if;

  update public.registrations
     set checked_in_at = now(), checked_in_by = scanner_id
   where id = reg_id and checked_in_at is null;

  if not found then
    -- lost the race by microseconds
    select checked_in_at into rec.checked_in_at
      from public.registrations where id = reg_id;
    return query select false, 'ALREADY_USED', rec.full_name, rec.ev_name, rec.checked_in_at;
    return;
  end if;

  return query select true, 'OK', rec.full_name, rec.ev_name, null::timestamptz;
end $$;

-- ---------------------------------------------------------------------------
-- Club dashboard read.
-- The club scoping lives HERE, in the query, not in the React component.
-- A club admin physically cannot receive another club's rows: the function
-- returns empty unless is_admin_of_club() passes.
-- ---------------------------------------------------------------------------
create or replace function public.club_registrations(target_club text)
returns table (
  registration_id uuid,
  event_id        text,
  event_name      text,
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
    r.id, e.id, e.name,
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
    and public.is_admin_of_club(target_club)
  order by r.created_at desc;
$$;

create or replace function public.club_stats(target_club text)
returns table (
  event_id      text,
  event_name    text,
  total         bigint,
  confirmed     bigint,
  pending       bigint,
  checked_in    bigint,
  collected_inr bigint
)
language sql stable security definer set search_path = public
as $$
  select
    e.id, e.name,
    count(r.id),
    count(r.id) filter (where r.status = 'confirmed'),
    count(r.id) filter (where r.status = 'pending'),
    count(r.id) filter (where r.checked_in_at is not null),
    coalesce(sum(pay.amount_inr) filter (where pay.status = 'paid'), 0)
  from public.events e
  left join public.registrations r on r.event_id = e.id and r.status <> 'cancelled'
  left join public.payments pay    on pay.id = r.payment_id
  where e.club_id = target_club
    and public.is_admin_of_club(target_club)
  group by e.id, e.name
  order by e.name;
$$;

-- ---------------------------------------------------------------------------
-- Gate fallback: look someone up by phone when their QR won't scan.
-- Volunteers and above only. Returns nothing for anyone else.
-- ---------------------------------------------------------------------------
create or replace function public.lookup_by_phone(search_phone text)
returns table (
  registration_id uuid,
  attendee_name   text,
  phone           text,
  event_id        text,
  event_name      text,
  status          registration_status,
  checked_in_at   timestamptz
)
language sql stable security definer set search_path = public
as $$
  select r.id, p.full_name, p.phone, e.id, e.name, r.status, r.checked_in_at
  from public.registrations r
  join public.profiles p on p.id = r.user_id
  join public.events   e on e.id = r.event_id
  where public.has_role_at_least('volunteer')
    and p.phone is not null
    and regexp_replace(p.phone, '\D', '', 'g')
        like '%' || regexp_replace(search_phone, '\D', '', 'g')
  order by e.day, e.start_time
  limit 25;
$$;
