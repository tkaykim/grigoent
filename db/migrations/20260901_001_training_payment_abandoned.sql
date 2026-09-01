-- 결제창 인증 전에 이탈한 주문은 카드·PG 승인 실패와 분리한다.
alter table public.training_order_payments
  drop constraint if exists training_order_payments_status_check;

alter table public.training_order_payments
  add constraint training_order_payments_status_check
  check (status = any (array[
    'pending'::text,
    'paid'::text,
    'failed'::text,
    'abandoned'::text,
    'cancelled'::text,
    'refunded'::text
  ]));

-- Toss 원장에 결제 객체가 없고 결제키도 발급되지 않은 과거 건도 이탈로 바로잡는다.
update public.training_order_payments
set
  status = 'abandoned',
  updated_at = now()
where status = 'failed'
  and payment_key is null
  and coalesce(raw ->> 'code', '') = 'NOT_FOUND_PAYMENT';

comment on column public.training_order_payments.status is
  'pending, paid, failed(PG/card rejection), abandoned(pre-auth checkout exit), cancelled, refunded';
