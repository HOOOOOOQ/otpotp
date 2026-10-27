-- Kaii OTP — initial schema, RLS policies, and atomic wallet/order functions.
-- Run once in the Supabase SQL Editor (or via `supabase db push`).
-- The service-role key must stay server-side; these functions are NOT callable by anon/authenticated.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  balance_idr bigint not null default 0 check (balance_idr >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_order_id text unique,
  phone_number text,
  country_id integer not null check (country_id >= 0),
  country_name text not null,
  service_code text not null,
  service_name text not null,
  operator text not null,
  price_idr bigint not null check (price_idr >= 0),
  status text not null default 'processing' check (
    status in ('processing', 'waiting_otp', 'otp_received', 'cancel_pending',
               'cancelled', 'failed', 'expired', 'needs_review')
  ),
  otp_code text,
  otp_expires_at timestamptz,
  otp_received_at timestamptz,
  provider_expires_at timestamptz,
  cancel_pending_at timestamptz,
  cancel_idempotency_key text,
  provider_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_number_when_active check (
    status <> 'waiting_otp' or (provider_order_id is not null and phone_number is not null)
  )
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_user_status_idx on public.orders (user_id, status);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('debit', 'refund', 'deposit')),
  amount_idr bigint not null,
  balance_after_idr bigint not null check (balance_after_idr >= 0),
  description text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_created_idx on public.transactions (user_id, created_at desc);

create table if not exists public.order_requests (
  idempotency_key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_hash text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cancel_attempts (
  idempotency_key text primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'unknown')),
  provider_refund_idr bigint,
  provider_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint deposit_requests_user_id_fkey references public.profiles(id) on delete cascade,
  amount_idr bigint not null check (amount_idr between 10000 and 100000000),
  payment_reference text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid constraint deposit_requests_reviewed_by_fkey references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deposit_requests_status_created_idx on public.deposit_requests (status, created_at desc);
create index if not exists deposit_requests_user_created_idx on public.deposit_requests (user_id, created_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_messages_status_created_idx on public.support_messages (status, created_at desc);

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.order_requests enable row level security;
alter table public.cancel_attempts enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.support_messages enable row level security;
alter table public.rate_limits enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
  on public.transactions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own deposit requests" on public.deposit_requests;
create policy "Users can read own deposit requests"
  on public.deposit_requests for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create pending deposit requests" on public.deposit_requests;
create policy "Users can create pending deposit requests"
  on public.deposit_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and amount_idr between 10000 and 100000000
  );

-- No client-side policies for order_requests, cancel_attempts, support_messages or rate_limits.
-- Only the server service role touches those tables through SECURITY DEFINER functions.

-- ---------------------------------------------------------------------------
-- Shared helpers and auth trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists cancel_attempts_set_updated_at on public.cancel_attempts;
create trigger cancel_attempts_set_updated_at before update on public.cancel_attempts
  for each row execute function public.set_updated_at();

drop trigger if exists deposit_requests_set_updated_at on public.deposit_requests;
create trigger deposit_requests_set_updated_at before update on public.deposit_requests
  for each row execute function public.set_updated_at();

drop trigger if exists support_messages_set_updated_at on public.support_messages;
create trigger support_messages_set_updated_at before update on public.support_messages
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic order creation / wallet debit
-- ---------------------------------------------------------------------------

create or replace function public.reserve_order(
  p_user_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_country_id integer,
  p_country_name text,
  p_service_code text,
  p_service_name text,
  p_operator text,
  p_price_idr bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
  v_existing public.order_requests;
  v_order public.orders;
  v_balance bigint;
  v_order_id uuid;
  v_new_balance bigint;
begin
  if p_price_idr is null or p_price_idr < 0 then
    raise exception 'INVALID_PRICE';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key)::bigint);

  insert into public.order_requests (idempotency_key, user_id, request_hash)
  values (p_idempotency_key, p_user_id, p_request_hash)
  on conflict (idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_existing from public.order_requests where idempotency_key = p_idempotency_key;
    if v_existing.user_id <> p_user_id or v_existing.request_hash <> p_request_hash then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.order_id is not null then
      select * into v_order from public.orders where id = v_existing.order_id;
      return jsonb_build_object(
        'outcome', 'duplicate',
        'order_id', v_order.id,
        'status', v_order.status
      );
    end if;
    return jsonb_build_object('outcome', 'duplicate', 'order_id', null, 'status', 'processing');
  end if;

  select balance_idr into v_balance from public.profiles where id = p_user_id for update;
  if not found then
    delete from public.order_requests where idempotency_key = p_idempotency_key;
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_balance < p_price_idr then
    delete from public.order_requests where idempotency_key = p_idempotency_key;
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_new_balance := v_balance - p_price_idr;
  update public.profiles set balance_idr = v_new_balance where id = p_user_id;

  insert into public.orders (
    user_id, country_id, country_name, service_code, service_name,
    operator, price_idr, status
  ) values (
    p_user_id, p_country_id, p_country_name, p_service_code, p_service_name,
    p_operator, p_price_idr, 'processing'
  ) returning id into v_order_id;

  insert into public.transactions (
    user_id, order_id, type, amount_idr, balance_after_idr, description, idempotency_key
  ) values (
    p_user_id, v_order_id, 'debit', -p_price_idr, v_new_balance,
    'Pembelian nomor OTP', 'debit:' || p_idempotency_key
  );

  update public.order_requests set order_id = v_order_id where idempotency_key = p_idempotency_key;

  return jsonb_build_object(
    'outcome', 'reserved',
    'order_id', v_order_id,
    'balance_idr', v_new_balance
  );
end;
$$;

create or replace function public.finalize_order_creation(
  p_order_id uuid,
  p_provider_order_id text,
  p_phone_number text,
  p_provider_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.orders
  set provider_order_id = p_provider_order_id,
      phone_number = p_phone_number,
      provider_expires_at = p_provider_expires_at,
      status = 'waiting_otp',
      updated_at = now()
  where id = p_order_id and status = 'processing';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'ORDER_NOT_PROCESSING';
  end if;
  return jsonb_build_object('outcome', 'finalized', 'order_id', p_order_id);
end;
$$;

create or replace function public.refund_unfilled_order(
  p_order_id uuid,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_balance bigint;
  v_refund_key text;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text)::bigint);
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status <> 'processing' then
    return jsonb_build_object('outcome', 'already_final', 'status', v_order.status);
  end if;

  v_refund_key := 'refund:unfilled:' || p_order_id::text;
  if exists (select 1 from public.transactions where idempotency_key = v_refund_key) then
    update public.orders set status = 'failed', provider_error_code = p_reason_code where id = p_order_id;
    return jsonb_build_object('outcome', 'already_refunded', 'status', 'failed');
  end if;

  update public.profiles
  set balance_idr = balance_idr + v_order.price_idr
  where id = v_order.user_id
  returning balance_idr into v_balance;

  insert into public.transactions (
    user_id, order_id, type, amount_idr, balance_after_idr, description, idempotency_key
  ) values (
    v_order.user_id, p_order_id, 'refund', v_order.price_idr, v_balance,
    'Refund pesanan gagal', v_refund_key
  );

  update public.orders
  set status = 'failed', provider_error_code = p_reason_code, updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('outcome', 'refunded', 'status', 'failed', 'balance_idr', v_balance);
end;
$$;

create or replace function public.mark_order_needs_review(
  p_order_id uuid,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.orders
  set status = 'needs_review', provider_error_code = p_reason_code, updated_at = now()
  where id = p_order_id and status in ('processing', 'cancel_pending');
  return jsonb_build_object('outcome', 'needs_review', 'order_id', p_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- OTP handling (short retention, no raw SMS)
-- ---------------------------------------------------------------------------

create or replace function public.purge_expired_otp(
  p_order_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.orders
  set otp_code = null, otp_expires_at = null, updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and otp_expires_at is not null
    and otp_expires_at <= now();
end;
$$;

create or replace function public.purge_expired_otps_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.orders
  set otp_code = null, otp_expires_at = null, updated_at = now()
  where user_id = p_user_id
    and otp_expires_at is not null
    and otp_expires_at <= now();
end;
$$;

create or replace function public.mark_order_otp(
  p_order_id uuid,
  p_user_id uuid,
  p_otp_code text,
  p_ttl_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_expires_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text)::bigint);
  select * into v_order from public.orders
  where id = p_order_id and user_id = p_user_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'otp_received' and v_order.otp_code is not null
     and v_order.otp_expires_at > now() then
    return jsonb_build_object(
      'outcome', 'cached',
      'status', 'otp_received',
      'otp_code', v_order.otp_code,
      'otp_expires_at', v_order.otp_expires_at
    );
  end if;

  if v_order.status = 'waiting_otp' then
    update public.orders
    set status = 'otp_received',
        otp_code = p_otp_code,
        otp_expires_at = now() + make_interval(secs => p_ttl_seconds::double precision),
        otp_received_at = now(),
        updated_at = now()
    where id = p_order_id
    returning otp_expires_at into v_expires_at;
    return jsonb_build_object(
      'outcome', 'received',
      'status', 'otp_received',
      'otp_code', p_otp_code,
      'otp_expires_at', v_expires_at
    );
  end if;

  return jsonb_build_object('outcome', 'unchanged', 'status', v_order.status);
end;
$$;

create or replace function public.set_order_terminal_status(
  p_order_id uuid,
  p_user_id uuid,
  p_status text,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('cancelled', 'expired', 'failed', 'needs_review') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.orders
  set status = p_status,
      otp_code = null,
      otp_expires_at = null,
      provider_error_code = coalesce(provider_error_code, p_reason_code),
      cancel_pending_at = null,
      cancel_idempotency_key = null,
      updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and status = 'waiting_otp';
  return jsonb_build_object('outcome', 'updated', 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancellation claim + official provider refund
-- ---------------------------------------------------------------------------

create or replace function public.request_order_cancel(
  p_order_id uuid,
  p_user_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_attempt public.cancel_attempts;
  v_inserted integer;
  v_reset integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_order_id::text)::bigint);
  select * into v_order from public.orders
  where id = p_order_id and user_id = p_user_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'cancel_pending' then
    return jsonb_build_object('outcome', 'in_progress', 'status', v_order.status);
  end if;
  if v_order.status in ('otp_received', 'cancelled', 'failed', 'expired', 'needs_review') then
    return jsonb_build_object('outcome', 'already_final', 'status', v_order.status);
  end if;
  if v_order.status <> 'waiting_otp' or v_order.provider_order_id is null then
    return jsonb_build_object('outcome', 'not_cancellable', 'status', v_order.status);
  end if;

  insert into public.cancel_attempts (idempotency_key, order_id, user_id, status)
  values (p_idempotency_key, p_order_id, p_user_id, 'pending')
  on conflict (idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_attempt from public.cancel_attempts where idempotency_key = p_idempotency_key;
    if v_attempt.order_id <> p_order_id or v_attempt.user_id <> p_user_id then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    -- A definitive provider rejection may be retried with the same client key.
    -- Any other existing claim is treated as in-progress to avoid duplicate provider calls.
    update public.cancel_attempts
    set status = 'pending', provider_error_code = null, updated_at = now()
    where idempotency_key = p_idempotency_key
      and order_id = p_order_id
      and user_id = p_user_id
      and status = 'failed';
    get diagnostics v_reset = row_count;
    if v_reset = 0 then
      return jsonb_build_object('outcome', 'in_progress', 'status', v_order.status);
    end if;
  end if;

  update public.orders
  set status = 'cancel_pending',
      cancel_pending_at = now(),
      cancel_idempotency_key = p_idempotency_key,
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'outcome', 'claimed',
    'status', 'cancel_pending',
    'provider_order_id', v_order.provider_order_id,
    'price_idr', v_order.price_idr
  );
end;
$$;

create or replace function public.finalize_order_cancel(
  p_order_id uuid,
  p_user_id uuid,
  p_idempotency_key text,
  p_refunded_amount_idr bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_refund bigint;
  v_balance bigint;
  v_transaction_key text;
begin
  if p_refunded_amount_idr is null or p_refunded_amount_idr < 0 then
    raise exception 'INVALID_REFUND_AMOUNT';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_order_id::text)::bigint);
  select * into v_order from public.orders
  where id = p_order_id and user_id = p_user_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status = 'cancelled' then
    return jsonb_build_object('outcome', 'already_final', 'status', v_order.status);
  end if;
  if v_order.status <> 'cancel_pending' or v_order.cancel_idempotency_key <> p_idempotency_key then
    raise exception 'INVALID_CANCEL_STATE';
  end if;

  v_refund := least(p_refunded_amount_idr, v_order.price_idr);
  v_transaction_key := 'refund:cancel:' || p_order_id::text;

  if v_refund > 0 and not exists (
    select 1 from public.transactions where idempotency_key = v_transaction_key
  ) then
    update public.profiles
    set balance_idr = balance_idr + v_refund
    where id = v_order.user_id
    returning balance_idr into v_balance;

    insert into public.transactions (
      user_id, order_id, type, amount_idr, balance_after_idr, description, idempotency_key
    ) values (
      v_order.user_id, p_order_id, 'refund', v_refund, v_balance,
      'Refund pembatalan pesanan', v_transaction_key
    );
  else
    select balance_idr into v_balance from public.profiles where id = v_order.user_id;
  end if;

  update public.cancel_attempts
  set status = 'confirmed', provider_refund_idr = v_refund, updated_at = now()
  where idempotency_key = p_idempotency_key;

  update public.orders
  set status = 'cancelled',
      otp_code = null,
      otp_expires_at = null,
      cancel_pending_at = null,
      cancel_idempotency_key = null,
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'outcome', 'confirmed',
    'status', 'cancelled',
    'refunded_amount_idr', v_refund,
    'balance_idr', v_balance
  );
end;
$$;

create or replace function public.fail_order_cancel(
  p_order_id uuid,
  p_user_id uuid,
  p_idempotency_key text,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.cancel_attempts
  set status = 'failed', provider_error_code = p_reason_code, updated_at = now()
  where idempotency_key = p_idempotency_key and order_id = p_order_id and user_id = p_user_id;

  update public.orders
  set status = 'waiting_otp',
      cancel_pending_at = null,
      cancel_idempotency_key = null,
      updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and status = 'cancel_pending'
    and cancel_idempotency_key = p_idempotency_key;

  return jsonb_build_object('outcome', 'reverted', 'status', 'waiting_otp');
end;
$$;

create or replace function public.review_order_cancel(
  p_order_id uuid,
  p_user_id uuid,
  p_idempotency_key text,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.cancel_attempts
  set status = 'unknown', provider_error_code = p_reason_code, updated_at = now()
  where idempotency_key = p_idempotency_key and order_id = p_order_id and user_id = p_user_id;

  update public.orders
  set status = 'needs_review',
      otp_code = null,
      otp_expires_at = null,
      provider_error_code = p_reason_code,
      cancel_pending_at = null,
      cancel_idempotency_key = null,
      updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and status = 'cancel_pending'
    and cancel_idempotency_key = p_idempotency_key;

  return jsonb_build_object('outcome', 'needs_review', 'status', 'needs_review');
end;
$$;

-- ---------------------------------------------------------------------------
-- Manual deposits: no automatic credit without admin verification
-- ---------------------------------------------------------------------------

create or replace function public.approve_deposit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.deposit_requests;
  v_admin_role text;
  v_balance bigint;
  v_transaction_key text;
begin
  select role into v_admin_role from public.profiles where id = p_admin_id;
  if v_admin_role <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_request_id::text)::bigint);
  select * into v_request from public.deposit_requests where id = p_request_id for update;
  if not found then
    raise exception 'DEPOSIT_NOT_FOUND';
  end if;
  if v_request.status <> 'pending' then
    return jsonb_build_object('outcome', 'already_processed', 'status', v_request.status);
  end if;

  v_transaction_key := 'deposit:' || p_request_id::text;
  if exists (select 1 from public.transactions where idempotency_key = v_transaction_key) then
    update public.deposit_requests
    set status = 'approved', admin_note = p_admin_note, reviewed_by = p_admin_id, reviewed_at = now()
    where id = p_request_id;
    return jsonb_build_object('outcome', 'already_credited', 'status', 'approved');
  end if;

  update public.profiles
  set balance_idr = balance_idr + v_request.amount_idr
  where id = v_request.user_id
  returning balance_idr into v_balance;

  insert into public.transactions (
    user_id, type, amount_idr, balance_after_idr, description, idempotency_key
  ) values (
    v_request.user_id, 'deposit', v_request.amount_idr, v_balance,
    'Deposit diverifikasi admin', v_transaction_key
  );

  update public.deposit_requests
  set status = 'approved', admin_note = p_admin_note, reviewed_by = p_admin_id, reviewed_at = now()
  where id = p_request_id;

  return jsonb_build_object('outcome', 'approved', 'status', 'approved', 'balance_idr', v_balance);
end;
$$;

create or replace function public.reject_deposit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_role text;
  v_status text;
begin
  select role into v_admin_role from public.profiles where id = p_admin_id;
  if v_admin_role <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  update public.deposit_requests
  set status = 'rejected', admin_note = p_admin_note, reviewed_by = p_admin_id, reviewed_at = now()
  where id = p_request_id and status = 'pending'
  returning status into v_status;

  if v_status is null then
    return jsonb_build_object('outcome', 'already_processed');
  end if;
  return jsonb_build_object('outcome', 'rejected', 'status', 'rejected');
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting + sensitive-data cleanup
-- ---------------------------------------------------------------------------

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_retry_after integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
  set count = case
        when rate_limits.window_start <= now() - make_interval(secs => p_window_seconds::double precision)
          then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start <= now() - make_interval(secs => p_window_seconds::double precision)
          then now()
        else rate_limits.window_start
      end,
      updated_at = now()
  returning window_start, count into v_window_start, v_count;

  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds::double precision) - now())))::integer
  );

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'retry_after', v_retry_after
  );
end;
$$;

create or replace function public.cleanup_sensitive_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_otp_count integer;
  v_rate_count integer;
begin
  update public.orders
  set otp_code = null, otp_expires_at = null, updated_at = now()
  where otp_expires_at is not null and otp_expires_at <= now();
  get diagnostics v_otp_count = row_count;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_rate_count = row_count;

  return jsonb_build_object('expired_otps_cleared', v_otp_count, 'rate_limit_rows_deleted', v_rate_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lock down SECURITY DEFINER functions to trusted server code only
-- ---------------------------------------------------------------------------

revoke all on function public.reserve_order(uuid, text, text, integer, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.finalize_order_creation(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.refund_unfilled_order(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_order_needs_review(uuid, text) from public, anon, authenticated;
revoke all on function public.purge_expired_otp(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purge_expired_otps_for_user(uuid) from public, anon, authenticated;
revoke all on function public.mark_order_otp(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.set_order_terminal_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.request_order_cancel(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.finalize_order_cancel(uuid, uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.fail_order_cancel(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.review_order_cancel(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.approve_deposit_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_deposit_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.cleanup_sensitive_data() from public, anon, authenticated;

grant execute on function public.reserve_order(uuid, text, text, integer, text, text, text, text, bigint) to service_role;
grant execute on function public.finalize_order_creation(uuid, text, text, timestamptz) to service_role;
grant execute on function public.refund_unfilled_order(uuid, text) to service_role;
grant execute on function public.mark_order_needs_review(uuid, text) to service_role;
grant execute on function public.purge_expired_otp(uuid, uuid) to service_role;
grant execute on function public.purge_expired_otps_for_user(uuid) to service_role;
grant execute on function public.mark_order_otp(uuid, uuid, text, integer) to service_role;
grant execute on function public.set_order_terminal_status(uuid, uuid, text, text) to service_role;
grant execute on function public.request_order_cancel(uuid, uuid, text) to service_role;
grant execute on function public.finalize_order_cancel(uuid, uuid, text, bigint) to service_role;
grant execute on function public.fail_order_cancel(uuid, uuid, text, text) to service_role;
grant execute on function public.review_order_cancel(uuid, uuid, text, text) to service_role;
grant execute on function public.approve_deposit_request(uuid, uuid, text) to service_role;
grant execute on function public.reject_deposit_request(uuid, uuid, text) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.cleanup_sensitive_data() to service_role;
