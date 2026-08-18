-- R4R 2026 — collaborative events
--
-- Some events are run by two clubs together (Level Up: Dramatics + Techops,
-- Bollywood Object Beats: Equinoxxx + HR). Those were seeded as two separate
-- event rows with the same name, which meant:
--
--   · one person could enrol twice and pay twice
--   · capacity was counted separately per row
--   · each club's dashboard saw only half the attendees
--   · two different QRs existed, so a volunteer scanning for one club
--     rejected every ticket issued under the other
--
-- The model is many-to-many: one event, one registration, one QR, shown on
-- every collaborating club's dashboard. events.club_id stays as the OWNING
-- club (for display and for who settles the money); event_clubs carries the
-- full list of who can see and manage it.
--
-- Safe to re-run.

create table if not exists public.event_clubs (
  event_id   text not null references public.events(id) on delete cascade,
  club_id    text not null references public.clubs(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, club_id)
);

create index if not exists event_clubs_club_idx on public.event_clubs (club_id);

alter table public.event_clubs enable row level security;

create policy "event clubs are public"
  on public.event_clubs for select
  using (true);

create policy "super admin manages event clubs"
  on public.event_clubs for all
  using (public.has_role_at_least('super_admin'))
  with check (public.has_role_at_least('super_admin'));

-- Backfill: every existing event is owned by its current club.
insert into public.event_clubs (event_id, club_id)
select id, club_id from public.events
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Merge the duplicated collabs.
--
-- Keeps the alphabetically-first row as the survivor, moves any registrations
-- across, adds the partner club, then deletes the leftover. Written to be
-- re-runnable: if there is nothing to merge it does nothing.
-- ---------------------------------------------------------------------------
do $$
declare
  dup   record;
  keep  text;
  drop_ text;
begin
  for dup in
    select name
    from public.events
    where not is_entry_pass
    group by name
    having count(*) > 1
  loop
    select id into keep  from public.events where name = dup.name order by id limit 1;

    for drop_ in
      select id from public.events where name = dup.name and id <> keep
    loop
      -- The dropped row's club joins the surviving event.
      insert into public.event_clubs (event_id, club_id)
      select keep, club_id from public.events where id = drop_
      on conflict do nothing;

      -- Move registrations over, skipping anyone already on the kept event so
      -- the (user_id, event_id) uniqueness holds.
      update public.registrations r
         set event_id = keep
       where r.event_id = drop_
         and not exists (
           select 1 from public.registrations x
           where x.user_id = r.user_id and x.event_id = keep
         );

      -- Anything left is a genuine double-registration by the same person
      -- across both halves of the collab. Cancel rather than delete: the row
      -- is the evidence if they ask about a refund.
      update public.registrations
         set status = 'cancelled'
       where event_id = drop_;

      delete from public.event_clubs where event_id = drop_;
      delete from public.registrations where event_id = drop_ and status = 'cancelled';
      delete from public.events where id = drop_;

      raise notice 'merged % into %', drop_, keep;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Club scoping now goes through event_clubs, so BOTH collaborating clubs see
-- the same single registration list.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin_of_event(target_event text)
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
  -- via event_clubs, so a collaborating club sees the shared list
  where exists (
      select 1 from public.event_clubs ec
      where ec.event_id = e.id and ec.club_id = target_club
    )
    and public.is_admin_of_club(target_club)
  order by r.created_at desc;
$$;

-- Organiser comps follow the same rule: an admin of EITHER collaborating club
-- gets their own event free.
create or replace function public.is_organiser_of_event(target_event text, target_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.event_clubs ec
    join public.club_admins ca on ca.club_id = ec.club_id
    where ec.event_id = target_event
      and ca.user_id = target_user
  ) or exists (
    select 1 from public.profiles
    where id = target_user and role = 'super_admin'
  );
$$;

-- Convenience view for the events grid: one row per event with all its clubs.
create or replace view public.events_with_clubs as
select
  e.*,
  coalesce(
    (select array_agg(c.name order by c.name)
     from public.event_clubs ec
     join public.clubs c on c.id = ec.club_id
     where ec.event_id = e.id),
    array[]::text[]
  ) as club_names
from public.events e;
