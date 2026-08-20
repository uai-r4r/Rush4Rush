-- R4R 2026 — checkout
--
-- Creating a payment row and its registration rows must be all-or-nothing.
-- Done as separate calls from an API route, a cold-start timeout between them
-- leaves either an orphan payment (money with nothing attached) or orphan
-- registrations (entry with nothing paid). A plpgsql function is one
-- transaction by definition, so this cannot half-happen.

create or replace function public.create_checkout(
  p_user_id      uuid,
  p_event_ids    text[],
  p_amount_inr   integer,
  p_method       payment_method,
  p_needs_entry  boolean,
  p_entry_inr    integer
)
returns table (payment_id uuid, registration_ids uuid[])
language plpgsql security definer set search_path = public
as $$
declare
  v_payment_id uuid;
  v_reg_ids    uuid[] := '{}';
  v_reg_id     uuid;
  v_event      text;
  v_status     registration_status;
  v_pay_status payment_status;
begin
  -- A zero-rupee checkout (UAI student, free events) is confirmed on the spot.
  -- There is nothing to wait for, and making them sit in 'pending' would mean
  -- a club admin has to approve a payment that never existed.
  if p_amount_inr = 0 then
    v_pay_status := 'paid';
    v_status     := 'confirmed';
  elsif p_method = 'manual_upi' then
    v_pay_status := 'pending_review';
    v_status     := 'pending';
  else
    v_pay_status := 'created';
    v_status     := 'pending';
  end if;

  insert into public.payments (user_id, type, method, status, amount_inr)
  values (
    p_user_id,
    case when p_needs_entry and array_length(p_event_ids, 1) is null
         then 'entry_pass'::payment_type
         else 'event'::payment_type end,
    case when p_amount_inr = 0 then 'free'::payment_method else p_method end,
    v_pay_status,
    p_amount_inr
  )
  returning id into v_payment_id;

  -- Entry pass first, so the gate ticket exists even if a club event is later
  -- cancelled. UAI students get one too (at ₹0) — everybody scans in at the
  -- gate the same way.
  if p_needs_entry then
    insert into public.registrations (user_id, event_id, payment_id, status)
    values (p_user_id, 'r4r-entry-pass', v_payment_id, v_status)
    on conflict (user_id, event_id) do update
      set payment_id = excluded.payment_id,
          status     = excluded.status
      where public.registrations.status <> 'confirmed'
    returning id into v_reg_id;

    if v_reg_id is not null then
      v_reg_ids := array_append(v_reg_ids, v_reg_id);
    end if;
  end if;

  foreach v_event in array coalesce(p_event_ids, '{}')
  loop
    insert into public.registrations (user_id, event_id, payment_id, status)
    values (p_user_id, v_event, v_payment_id, v_status)
    on conflict (user_id, event_id) do update
      set payment_id = excluded.payment_id,
          status     = excluded.status
      where public.registrations.status <> 'confirmed'
    returning id into v_reg_id;

    if v_reg_id is not null then
      v_reg_ids := array_append(v_reg_ids, v_reg_id);
    end if;
  end loop;

  if array_length(v_reg_ids, 1) is null then
    raise exception 'ALREADY_REGISTERED';
  end if;

  return query select v_payment_id, v_reg_ids;
end $$;

-- ---------------------------------------------------------------------------
-- Confirm a payment and everything attached to it.
--
-- Idempotent on purpose: Razorpay retries webhooks, and the browser callback
-- and the webhook routinely both arrive. Running twice must not double-confirm
-- or overwrite a review trail.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_payment(
  p_payment_id  uuid,
  p_razorpay_payment_id text default null,
  p_reviewer    uuid default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_already boolean;
begin
  select status = 'paid' into v_already
  from public.payments where id = p_payment_id;

  if v_already is null then
    return false;
  end if;

  if v_already then
    return true;  -- already done, nothing to do
  end if;

  update public.payments
     set status              = 'paid',
         razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id),
         reviewed_by         = coalesce(p_reviewer, reviewed_by),
         reviewed_at         = case when p_reviewer is not null then now() else reviewed_at end
   where id = p_payment_id;

  update public.registrations
     set status = 'confirmed'
   where payment_id = p_payment_id
     and status = 'pending';

  return true;
end $$;

create or replace function public.reject_payment(
  p_payment_id uuid,
  p_reviewer   uuid,
  p_note       text
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  update public.payments
     set status = 'rejected', reviewed_by = p_reviewer,
         reviewed_at = now(), review_note = p_note
   where id = p_payment_id and status <> 'paid';

  if not found then return false; end if;

  -- Registrations are cancelled, not deleted. The row is the evidence trail
  -- when someone insists at the gate that they definitely paid.
  update public.registrations
     set status = 'cancelled'
   where payment_id = p_payment_id and status = 'pending';

  return true;
end $$;
