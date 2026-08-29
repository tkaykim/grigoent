-- Immutable refund ledger for training package payments.
-- The original payment amount and capture payload stay unchanged after partial refunds.

alter table public.training_order_payments
  add column if not exists provider_order_id text;

alter table public.training_order_payments
  add column if not exists refund_lock_at timestamptz;

create table if not exists public.training_payment_refunds (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique,
  payment_id uuid not null references public.training_order_payments(id) on delete restrict,
  order_id uuid not null references public.training_orders(id) on delete restrict,
  provider text not null check (provider in ('toss', 'paypal')),
  ledger_amount_krw integer not null check (ledger_amount_krw > 0),
  provider_amount numeric(14, 2) not null check (provider_amount > 0),
  provider_currency text not null check (provider_currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null unique,
  status text not null default 'processing'
    check (status in ('processing', 'pending', 'completed', 'failed', 'reconciliation_required')),
  provider_refund_id text,
  provider_status text,
  reason text not null check (char_length(reason) between 1 and 500),
  requested_by uuid,
  approved_by uuid,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  error_code text,
  error_message text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint training_payment_refunds_distinct_actors
    check (approved_by is null or requested_by is null or requested_by <> approved_by)
);

create index if not exists training_payment_refunds_payment_status_idx
  on public.training_payment_refunds (payment_id, status, requested_at desc);

create index if not exists training_payment_refunds_order_created_idx
  on public.training_payment_refunds (order_id, requested_at desc);

create unique index if not exists training_payment_refunds_one_active_per_payment_idx
  on public.training_payment_refunds (payment_id)
  where status in ('processing', 'pending', 'reconciliation_required');

alter table public.training_payment_refunds enable row level security;

revoke all on table public.training_payment_refunds from anon, authenticated, service_role;
grant select, insert, update on table public.training_payment_refunds to service_role;

comment on table public.training_payment_refunds is
  'Server-only immutable ledger of Toss and PayPal full/partial refunds.';

comment on column public.training_order_payments.provider_order_id is
  'Provider-side order ID used to verify cancellation before capture.';
