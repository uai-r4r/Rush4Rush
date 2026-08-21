-- R4R 2026 — team registration
--
-- SOLO IS A TEAM OF ONE. Rather than two code paths, every event carries
-- min/max team size: solo events are 1..1, a team event might be 3..5. A club
-- switching from teams to solos next year is then one UPDATE, not a rewrite.
--
-- Because the festival pass is compulsory and per-person, team members must
-- already have their own account and their own pass. So a team is a grouping
-- of existing users, not names typed into a box by the leader — which also
-- means every member gets their own QR and can be checked in independently.
--
-- Flow:
--   leader enrols, pays the event fee once, receives a join code
--   members enter the code — no further charge, they have their own pass
--
-- A code beats the leader listing emails up front: teams form late, people
-- drop out, and a typo'd address matches nobody.
--
-- Safe to re-run.

alter table public.events
  add column if not exists min_team_size integer not null default 1,
  add column if not exists max_team_size integer not null default 1;

alter table public.events
  drop constraint if exists events_team_size_sane;
alter table public.events
  add constraint events_team_size_sane
  check (min_team_size >= 1 and max_team_size >= min_team_size and max_team_size <= 20);

comment on column public.events.max_team_size is
  '1 means solo. Set >1 to make it a team event — no code change needed.';

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null references public.events(id) on delete cascade,
  leader_id  uuid not null references public.profiles(id) on delete cascade,
  name       text,
  -- Short, human-readable, and unguessable enough that nobody gate-crashes by
  -- typing sequential codes.
  code       text not null unique,
  created_at timestamptz not null default now(),
  unique (event_id, leader_id)
);

create index if not exists teams_event_idx on public.teams (event_id);
create index if not exists teams_code_idx  on public.teams (code);

alter table public.registrations
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists registrations_team_idx on public.registrations (team_id);

alter table public.teams enable row level security;

create policy "read own team"
  on public.teams for select
  using (
    leader_id = auth.uid()
    or exists (
      select 1 from public.registrations r
      where r.team_id = public.teams.id and r.user_id = auth.uid()
    )
    or public.is_admin_of_event(event_id)
  );

-- ---------------------------------------------------------------------------
-- Code generator. Ambiguous characters (0/O, 1/I) are excluded — these get
-- read aloud and retyped from a group chat, so O-versus-zero confusion is a
-- real support cost.
-- ---------------------------------------------------------------------------
create or replace function public.generate_team_code()
returns text
language plpgsql volatile security definer set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.teams where code = candidate);
  end loop;
  return candidate;
end $$;

-- ---------------------------------------------------------------------------
-- Create a team for a leader who has just enrolled.
-- ---------------------------------------------------------------------------
create or replace function public.create_team(
  p_event_id text,
  p_user_id  uuid,
  p_name     text default null
)
returns table (team_id uuid, code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_max  integer;
  v_id   uuid;
  v_code text;
begin
  select max_team_size into v_max from public.events where id = p_event_id;

  if v_max is null or v_max <= 1 then
    raise exception 'NOT_A_TEAM_EVENT';
  end if;

  -- Already leading a team for this event? Hand back the same code rather than
  -- making a second one — people refresh, and two teams for one leader would
  -- split their members.
  select t.id, t.code into v_id, v_code
  from public.teams t
  where t.event_id = p_event_id and t.leader_id = p_user_id;

  if v_id is not null then
    return query select v_id, v_code;
    return;
  end if;

  v_code := public.generate_team_code();

  insert into public.teams (event_id, leader_id, name, code)
  values (p_event_id, p_user_id, nullif(trim(coalesce(p_name, '')), ''), v_code)
  returning id, teams.code into v_id, v_code;

  -- Link the leader's own registration to the team.
  update public.registrations
     set team_id = v_id
   where user_id = p_user_id and event_id = p_event_id;

  return query select v_id, v_code;
end $$;

-- ---------------------------------------------------------------------------
-- Join a team by code.
--
-- No payment: the event fee was paid once by the leader, and the member has
-- already bought their own compulsory festival pass. Every check that could
-- reject a join happens HERE, server-side — the client only supplies a string.
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
  members    integer
)
language plpgsql security definer set search_path = public
as $$
declare
  t          record;
  v_count    integer;
  v_has_pass boolean;
  v_reg      uuid;
begin
  select tm.id, tm.event_id, tm.leader_id, e.name as ev_name, e.max_team_size, e.fee_inr
    into t
  from public.teams tm
  join public.events e on e.id = tm.event_id
  where upper(trim(tm.code)) = upper(trim(p_code));

  if not found then
    return query select false, 'BAD_CODE', null::text, null::text, null::uuid, 0;
    return;
  end if;

  -- The festival pass is compulsory, so a member must hold one before they can
  -- be part of anything.
  select exists (
    select 1 from public.registrations
    where user_id = p_user_id
      and event_id = 'r4r-entry-pass'
      and status = 'confirmed'
  ) into v_has_pass;

  if not v_has_pass then
    return query select false, 'NEEDS_PASS', t.event_id, t.ev_name, t.id, 0;
    return;
  end if;

  -- Already registered for this event, alone or in another team?
  select id into v_reg
  from public.registrations
  where user_id = p_user_id and event_id = t.event_id and status <> 'cancelled';

  if v_reg is not null then
    return query select false, 'ALREADY_REGISTERED', t.event_id, t.ev_name, t.id, 0;
    return;
  end if;

  select count(*) into v_count
  from public.registrations
  where team_id = t.id and status <> 'cancelled';

  if v_count >= t.max_team_size then
    return query select false, 'TEAM_FULL', t.event_id, t.ev_name, t.id, v_count;
    return;
  end if;

  -- Confirmed immediately: nothing is owed, so there is nothing to wait for.
  insert into public.registrations (user_id, event_id, team_id, status)
  values (p_user_id, t.event_id, t.id, 'confirmed');

  return query select true, 'OK', t.event_id, t.ev_name, t.id, v_count + 1;
end $$;

-- ---------------------------------------------------------------------------
-- Who is in a team. Used by the leader's ticket and the club dashboard.
-- ---------------------------------------------------------------------------
create or replace function public.team_members(p_team_id uuid)
returns table (
  user_id       uuid,
  attendee_name text,
  email         text,
  phone         text,
  is_leader     boolean,
  checked_in_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.full_name, p.email, p.phone,
    (p.id = t.leader_id) as is_leader,
    r.checked_in_at
  from public.teams t
  join public.registrations r on r.team_id = t.id and r.status <> 'cancelled'
  join public.profiles p on p.id = r.user_id
  where t.id = p_team_id
    and (
      t.leader_id = auth.uid()
      or exists (
        select 1 from public.registrations me
        where me.team_id = t.id and me.user_id = auth.uid()
      )
      or public.is_admin_of_event(t.event_id)
    )
  order by is_leader desc, p.full_name;
$$;
