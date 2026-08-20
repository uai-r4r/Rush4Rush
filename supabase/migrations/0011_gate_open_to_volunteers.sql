-- R4R 2026 — the entry pass is scannable by any volunteer
--
-- Club scoping is right for club events: a Techops volunteer has no business
-- checking people into Rotaract's room. But the festival entry pass is
-- fest-wide, and volunteers rotate between the gate and their own door all
-- day. Requiring a database change to move someone to the gate for an hour is
-- friction with no security benefit — there is no club-specific data behind
-- the entry pass, and check_ins still records exactly who scanned what.
--
-- Rule now:
--   entry pass  → any volunteer or above
--   club event  → only staff assigned to a club running that event
--
-- Safe to re-run.

create or replace function public.can_scan_event(target_event text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.my_role() = 'super_admin'
    -- Fest-wide gate pass: open to all volunteers.
    or (
      public.has_role_at_least('volunteer')
      and exists (
        select 1 from public.events
        where id = target_event and is_entry_pass
      )
    )
    -- Club events stay scoped to the clubs running them.
    or exists (
      select 1
      from public.event_clubs ec
      join public.club_admins ca on ca.club_id = ec.club_id
      where ec.event_id = target_event
        and ca.user_id = auth.uid()
    );
$$;

-- The same allowance inside check_in_registration, which takes scanner_id
-- explicitly rather than reading auth.uid() (it runs via the service-role
-- client, where auth.uid() is null).
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
  scanner_rk integer;
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

  select public.role_rank(role) into scanner_rk
  from public.profiles where id = scanner_id;

  if scanner_rk is null or scanner_rk < public.role_rank('volunteer') then
    return query select false, 'NOT_YOUR_EVENT', rec.full_name, rec.ev_name, null::timestamptz;
    return;
  end if;

  allowed :=
    -- super admin
    scanner_rk >= public.role_rank('super_admin')
    -- or the fest-wide gate pass, which any volunteer may scan
    or rec.is_entry_pass
    -- or a club event they are assigned to
    or exists (
      select 1
      from public.event_clubs ec
      join public.club_admins ca on ca.club_id = ec.club_id
      where ec.event_id = rec.event_id
        and ca.user_id = scanner_id
    );

  if not allowed then
    return query select false, 'NOT_YOUR_EVENT', rec.full_name, rec.ev_name, null::timestamptz;
    return;
  end if;

  if rec.status <> 'confirmed' then
    return query select false, 'NOT_CONFIRMED', rec.full_name, rec.ev_name, null::timestamptz;
    return;
  end if;

  if rec.is_entry_pass then
    -- One entry per calendar day, so day 2 works.
    select scanned_at into prior
    from public.check_ins
    where registration_id = reg_id and scan_date = today
    order by scanned_at limit 1;

    if prior is not null then
      return query select false, 'ALREADY_TODAY', rec.full_name, rec.ev_name, prior;
      return;
    end if;
  else
    -- One entry ever — this is what catches a forwarded screenshot.
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
