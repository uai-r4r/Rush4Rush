-- R4R 2026 — row level security
--
-- Model: deny by default, then grant the narrowest thing that works.
-- The service-role key used by API routes bypasses all of this — that key is
-- server-only and must never reach the browser. These policies are what stands
-- between a leaked anon key and your registration list.

alter table public.profiles      enable row level security;
alter table public.clubs         enable row level security;
alter table public.club_admins   enable row level security;
alter table public.events        enable row level security;
alter table public.registrations enable row level security;
alter table public.payments      enable row level security;
alter table public.otp_attempts  enable row level security;
alter table public.rate_limits   enable row level security;
alter table public.audit_log     enable row level security;
alter table public.settings      enable row level security;

-- otp_attempts, rate_limits and audit_log get NO policies at all. RLS with zero
-- policies means zero rows for everyone except the service role. That is
-- deliberate — nothing client-side has any business reading them.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "super admin reads all profiles"
  on public.profiles for select
  using (public.has_role_at_least('super_admin'));

-- Users may edit their own contact details but NOT their own role.
-- Privilege escalation is the whole reason for the second clause.
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- clubs + events — public read, scoped write
-- ---------------------------------------------------------------------------
create policy "clubs are public"
  on public.clubs for select
  using (true);

create policy "published events are public"
  on public.events for select
  using (is_published or public.is_admin_of_club(club_id));

-- A club admin can only reschedule their OWN events, and only while the
-- schedule is unfrozen. USING checks the row before the edit, WITH CHECK the
-- row after — both are needed or an admin could reassign an event to another
-- club on the way out.
create policy "club admin edits own events"
  on public.events for update
  using (
    public.is_admin_of_club(club_id)
    and (
      public.my_role() = 'super_admin'
      or not (select schedule_frozen from public.settings where id = true)
    )
  )
  with check (public.is_admin_of_club(club_id));

create policy "super admin manages events"
  on public.events for all
  using (public.has_role_at_least('super_admin'))
  with check (public.has_role_at_least('super_admin'));

-- ---------------------------------------------------------------------------
-- club_admins — you can see your own club assignments; only super admin writes
-- ---------------------------------------------------------------------------
create policy "read own club assignments"
  on public.club_admins for select
  using (user_id = auth.uid() or public.has_role_at_least('super_admin'));

create policy "super admin manages club assignments"
  on public.club_admins for all
  using (public.has_role_at_least('super_admin'))
  with check (public.has_role_at_least('super_admin'));

-- ---------------------------------------------------------------------------
-- registrations
-- Reads for the ticket tab. Writes go through API routes only, because a
-- registration is never valid on its own — it has to be created together with
-- a correctly-priced payment row in one transaction.
-- ---------------------------------------------------------------------------
create policy "read own registrations"
  on public.registrations for select
  using (user_id = auth.uid());

create policy "club admin reads registrations for own events"
  on public.registrations for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_admin_of_club(e.club_id)
    )
  );

create policy "volunteers read registrations for check-in"
  on public.registrations for select
  using (public.has_role_at_least('volunteer'));

-- Attendees may cancel a pending registration, nothing else.
create policy "cancel own pending registration"
  on public.registrations for update
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled');

-- ---------------------------------------------------------------------------
-- payments — read-only for the owner. Status transitions are server-side only.
-- Nobody gets to mark their own payment 'paid'.
-- ---------------------------------------------------------------------------
create policy "read own payments"
  on public.payments for select
  using (user_id = auth.uid());

create policy "club admin reads payments for own events"
  on public.payments for select
  using (
    exists (
      select 1
      from public.registrations r
      join public.events e on e.id = r.event_id
      where r.payment_id = public.payments.id
        and public.is_admin_of_club(e.club_id)
    )
  );

-- ---------------------------------------------------------------------------
-- settings — everyone reads (frontend needs payment_mode + upi_id),
-- super admin writes
-- ---------------------------------------------------------------------------
create policy "settings are public"
  on public.settings for select
  using (true);

create policy "super admin updates settings"
  on public.settings for update
  using (public.has_role_at_least('super_admin'))
  with check (public.has_role_at_least('super_admin'));

-- ---------------------------------------------------------------------------
-- Storage: payment proof screenshots
--
-- PRIVATE bucket. A public bucket means anyone who guesses the URL pattern can
-- browse everyone's payment screenshots — which carry real names and UPI IDs.
-- Reads happen through short-lived signed URLs minted server-side.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false,
  5242880,                                    -- 5 MB ceiling
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Objects are stored as: payment-proofs/<user_id>/<payment_id>.jpg
-- The folder-name check is what stops someone uploading into another user's
-- folder or reading out of it.
create policy "upload own payment proof"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "read own payment proof"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role_at_least('club_admin')
    )
  );
