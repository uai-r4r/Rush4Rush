-- R4R 2026 — volunteers are scoped to clubs
--
-- Any volunteer could previously scan any event. Problems with that:
--   · a volunteer at one door could check people into another club's event,
--     corrupting that club's numbers with no accountability
--   · nothing stopped a volunteer checking in friends at events they have
--     nothing to do with
--   · a mistake at one door silently became another club's problem
--
-- Model: club_admins is the club ASSIGNMENT table for all staff; the person's
-- role decides what the assignment lets them do.
--
--   volunteer   + assigned to techops → scan techops events only
--   club_admin  + assigned to techops → scan AND dashboard for techops
--   super_admin                       → everything
--
-- Gate volunteers get assigned to the 'r4r' club, which owns the entry pass.
--
-- FAILS CLOSED: a volunteer with no assignment can scan nothing. Empty means
-- none, never all — the same rule that the dashboard scoping got wrong once.
--
-- Safe to re-run.

create or replace function public.can_scan_event(target_event text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.my_role() = 'super_admin'
    or exists (
      select 1
      from public.event_clubs ec
      join public.club_admins ca on ca.club_id = ec.club_id
      where ec.event_id = target_event
        and ca.user_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- Events this person is allowed to scan. Drives the scanner dropdown, so a
-- volunteer never even sees a door they cannot work.
-- ---------------------------------------------------------------------------
create or replace function public.scannable_events()
returns table (
  id            text,
  name          text,
  day           smallint,
  is_entry_pass boolean,
  club_names    text[]
)
language sql stable security definer set search_path = public
as $$
  select
    e.id, e.name, e.day, e.is_entry_pass,
    coalesce(
      (select array_agg(c.name order by c.name)
       from public.event_clubs ec2
       join public.clubs c on c.id = ec2.club_id
       where ec2.event_id = e.id),
      array[]::text[]
    )
  from public.events e
  where e.is_published
    and public.has_role_at_least('volunteer')
    and public.can_scan_event(e.id)
  order by e.is_entry_pass desc, e.day, e.name;
$$;

-- ---------------------------------------------------------------------------
-- Enforce it at check-in too, not just in the dropdown.
--
-- Hiding an option is cosmetic — the dropdown is a convenience, and anyone can
-- craft the request by hand. The scan endpoint passes the caller through here
-- before anything is written.
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
  rec        record;
  today      date := (now() at time zone 'Asia/Kolkata')::date;
  prior      timestamptz;
  entries    integer;
  allowed    boolean;
begin
  select r.id, r.status, r.checked_in_at, r.event_id, p.full_name,
         e.name as ev_name, e.is_entry_pass
    into rec
  from public.registrations r
  join public.profiles p on p.id = r.user_id
  join public.events   e on e.id = r.event_id
  where r.id = reg_id;

  if not found then
    return query select false, 'NOT_FOUND', null::text, null::text, null::timestamptz;
    return;
  end if;

  -- scanner_id is passed explicitly, so this works through the service-role
  -- client where auth.uid() would be null.
  select
    exists (select 1 from public.profiles where id = scanner_id and role = 'super_admin')
    or exists (
      select 1
      from public.event_clubs ec
      join public.club_admins ca on ca.club_id = ec.club_id
      where ec.event_id = rec.event_id
        and ca.user_id = scanner_id
    )
  into allowed;

  if not allowed then
    return query select false, 'NOT_YOUR_EVENT', rec.full_name, rec.ev_name, null::timestamptz;
    return;
  end if;

  if rec.status <> 'confirmed' then
    return query select false, 'NOT_CONFIRMED', rec.full_name, rec.ev_name, null::timestamptz;
    return;
  end if;

  if rec.is_entry_pass then
    select scanned_at into prior
    from public.check_ins
    where registration_id = reg_id and scan_date = today
    order by scanned_at limit 1;

    if prior is not null then
      return query select false, 'ALREADY_TODAY', rec.full_name, rec.ev_name, prior;
      return;
    end if;
  else
    select scanned_at into prior
    from public.check_ins
    where registration_id = reg_id
    order by scanned_at limit 1;

    if prior is not null then
      return query select false, 'ALREADY_USED', rec.full_name, rec.ev_name, prior;
      return;
    end if;
  end if;

  insert into public.check_ins (registration_id, scanned_by) values (reg_id, scanner_id);

  update public.registrations
     set checked_in_at = coalesce(checked_in_at, now()),
         checked_in_by = coalesce(checked_in_by, scanner_id)
   where id = reg_id;

  select count(*) into entries from public.check_ins where registration_id = reg_id;

  return query select true,
                      case when entries > 1 then 'RETURNING' else 'OK' end,
                      rec.full_name, rec.ev_name, null::timestamptz;
end $$;

-- Phone lookup gets the same treatment: a volunteer should not be able to
-- browse other clubs' attendee lists by typing digits.
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
    and public.can_scan_event(e.id)
    and p.phone is not null
    and regexp_replace(p.phone, '\D', '', 'g')
        like '%' || regexp_replace(search_phone, '\D', '', 'g')
  order by e.day, e.start_time
  limit 25;
$$;
