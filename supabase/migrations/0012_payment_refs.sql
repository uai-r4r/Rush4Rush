-- R4R 2026 — capture the bank reference (UTR / RRN)
--
-- payments stores razorpay_payment_id (pay_TQybiNq8C8tpxN), which is
-- Razorpay's internal id. That is NOT the number the payer sees.
--
-- What appears in someone's UPI app and on their bank statement is the UTR —
-- the bank's 12-digit reference. So when a person arrives at the desk saying
-- "I paid, here's my screenshot", the number on that screenshot could not be
-- matched to anything we had stored. Razorpay returns it as
-- acquirer_data.rrn, but only in the webhook or a fetch — never in the
-- browser callback.
--
-- Also adds a field for the manual UPI path, where the payer can type their
-- own UTR alongside the screenshot. That makes a club admin's job far easier:
-- match a number instead of squinting at a photo.
--
-- Safe to re-run.

alter table public.payments
  add column if not exists acquirer_ref text,     -- UTR / RRN from the bank
  add column if not exists payer_ref    text;     -- typed by the payer (manual UPI)

create index if not exists payments_acquirer_ref_idx
  on public.payments (acquirer_ref)
  where acquirer_ref is not null;

create index if not exists payments_payer_ref_idx
  on public.payments (payer_ref)
  where payer_ref is not null;

comment on column public.payments.acquirer_ref is
  'Bank UTR/RRN from Razorpay acquirer_data. What the payer sees in their app.';
comment on column public.payments.payer_ref is
  'UTR the payer typed themselves on the manual UPI path. Unverified — treat as a hint for matching, not proof of payment.';

-- ---------------------------------------------------------------------------
-- confirm_payment now records the bank reference too.
-- ---------------------------------------------------------------------------
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
begin
  select status = 'paid' into v_already
  from public.payments where id = p_payment_id;

  if v_already is null then
    return false;
  end if;

  if v_already then
    -- Already confirmed, but the webhook may be arriving after the browser
    -- callback with the bank reference the callback never had. Fill that in
    -- rather than discarding it.
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

  return true;
end $$;

-- Let staff search a payment by the number a person reads off their phone.
create or replace function public.find_payment_by_ref(search_ref text)
returns table (
  payment_id     uuid,
  attendee_name  text,
  email          text,
  phone          text,
  amount_inr     integer,
  status         payment_status,
  method         payment_method,
  acquirer_ref   text,
  payer_ref      text,
  created_at     timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    pay.id, p.full_name, p.email, p.phone,
    pay.amount_inr, pay.status, pay.method,
    pay.acquirer_ref, pay.payer_ref, pay.created_at
  from public.payments pay
  join public.profiles p on p.id = pay.user_id
  where public.has_role_at_least('club_admin')
    and length(trim(search_ref)) >= 4
    and (
      pay.acquirer_ref        ilike '%' || trim(search_ref) || '%'
      or pay.payer_ref        ilike '%' || trim(search_ref) || '%'
      or pay.razorpay_payment_id ilike '%' || trim(search_ref) || '%'
    )
  order by pay.created_at desc
  limit 25;
$$;
