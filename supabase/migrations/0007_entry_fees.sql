-- R4R 2026 — entry pass is no longer free for UAI students
--
-- UAI students now pay ₹50, outsiders still ₹100. Both live in settings rather
-- than being hardcoded, because fest pricing changes late and often — this way
-- a change is one UPDATE, not a redeploy.
--
-- Safe to re-run.

alter table public.settings
  add column if not exists entry_fee_uai_inr   integer not null default 50,
  add column if not exists entry_fee_guest_inr integer not null default 100;

alter table public.settings
  add constraint settings_entry_fees_nonneg
  check (entry_fee_uai_inr >= 0 and entry_fee_guest_inr >= 0);

update public.settings
set entry_fee_uai_inr = 50,
    entry_fee_guest_inr = 100
where id = true;

-- Keep the entry-pass event row in step for display. settings is authoritative
-- for what anyone is actually charged — see lib/pricing.ts.
update public.events
set fee_inr = (select entry_fee_guest_inr from public.settings where id = true)
where id = 'r4r-entry-pass';

-- ---------------------------------------------------------------------------
-- Organiser comps
--
-- A club admin doesn't pay for their own club's events, but does pay for other
-- clubs'. Modelled as an explicit lookup rather than "role = club_admin means
-- free", because price should follow a stated rule, not a permission level —
-- otherwise granting someone dashboard access silently changes what they owe.
-- ---------------------------------------------------------------------------
create or replace function public.is_organiser_of_event(target_event text, target_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.club_admins ca on ca.club_id = e.club_id
    where e.id = target_event
      and ca.user_id = target_user
  ) or exists (
    select 1 from public.profiles
    where id = target_user and role = 'super_admin'
  );
$$;
