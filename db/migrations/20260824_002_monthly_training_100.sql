-- 100만원 월간 트레이닝 상품.
-- 기존 monthly-training 과 제공 내용은 같고, 주문·정산 식별을 위해 slug 를 분리한다.

insert into public.training_products (
  id,
  slug,
  title,
  subtitle,
  description,
  highlights,
  currency,
  is_active,
  sort_order,
  i18n
)
values (
  '7b9ac78c-aee6-42b4-8e46-13ef7b62a3b8',
  'monthly-training-100',
  '4개월 월간 트레이닝 프로그램',
  '월 100만원의 1개월 이용권을 매달 결제하며, 총 4개월 동안 진행하는 트레이닝 프로그램입니다.',
  '트레이닝 수강권, 실무 한국어 교육, 실무 투입 업무교육을 4개월 동안 제공합니다. 이 페이지의 결제 금액은 해당 월의 1개월 이용료 100만원입니다. 전체 과정에 계속 참여하시면 매월 한 번씩 총 4번 결제합니다.',
  array['트레이닝 수강권', '실무 한국어 교육', '실무 투입 업무교육'],
  'KRW',
  true,
  21,
  '{
    "en": {
      "title": "Four-Month Monthly Training Program",
      "subtitle": "A four-month training program paid as a KRW 1,000,000 one-month pass each month.",
      "description": "Training classes, practical Korean lessons, and on-the-job work preparation are provided for four months. This page charges KRW 1,000,000 for the current one-month pass. If you continue through the full program, you make one payment each month, four payments in total.",
      "highlights": ["Training classes", "Practical Korean lessons", "On-the-job work preparation"]
    },
    "ja": {
      "title": "4ヶ月月間トレーニングプログラム",
      "subtitle": "月100万ウォンの1ヶ月利用券を毎月お支払いいただき、全4ヶ月間進行するトレーニングプログラムです。",
      "description": "トレーニング受講、実務韓国語教育、実務投入業務教育を4ヶ月間提供します。このページのお支払い金額は該当月の1ヶ月利用料100万ウォンです。全課程を継続される場合は、毎月1回、合計4回お支払いいただきます。",
      "highlights": ["トレーニング受講券", "実務韓国語教育", "実務投入業務教育"]
    }
  }'::jsonb
)
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  highlights = excluded.highlights,
  currency = excluded.currency,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  i18n = excluded.i18n,
  updated_at = now();

insert into public.training_price_plans (
  id,
  product_id,
  code,
  label,
  plan_type,
  installment_months,
  amount_per_charge,
  total_amount,
  currency,
  note,
  is_active,
  sort_order,
  i18n
)
select
  '3a5c668c-9411-4ccf-b2ed-12cdecde70f3',
  product.id,
  'onetime',
  '1개월',
  'onetime',
  1,
  1000000,
  1000000,
  'KRW',
  '4개월 과정 중 해당 월의 1개월 이용료입니다.',
  true,
  1,
  '{
    "en": {"label": "1 month", "note": "The one-month fee for the current month of the four-month program."},
    "ja": {"label": "1ヶ月", "note": "4ヶ月課程のうち、該当月の1ヶ月利用料です。"}
  }'::jsonb
from public.training_products as product
where product.slug = 'monthly-training-100'
on conflict (product_id, code) do update
set
  label = excluded.label,
  plan_type = excluded.plan_type,
  installment_months = excluded.installment_months,
  amount_per_charge = excluded.amount_per_charge,
  total_amount = excluded.total_amount,
  currency = excluded.currency,
  note = excluded.note,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  i18n = excluded.i18n,
  updated_at = now();
