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
  '1개월 트레이닝 비용',
  '트레이닝·실무 한국어·실무 투입 교육이 포함된 1개월 이용권입니다.',
  '1개월권에는 트레이닝 수강권, 실무 한국어 교육, 실무 투입 업무교육이 포함됩니다. 이용하실 달의 비용만 결제하시며, 다음 달 계속 여부는 매달 다시 선택하실 수 있습니다.',
  array['트레이닝 수강권', '실무 한국어 교육', '실무 투입 업무교육'],
  'KRW',
  true,
  21,
  '{
    "en": {
      "title": "Monthly Training Fee",
      "subtitle": "A one-month pass covering training, Korean for work, and on-the-job preparation.",
      "description": "The one-month pass includes training classes, practical Korean lessons, and on-the-job work preparation. You pay only for the month you use, and you decide each month whether to continue.",
      "highlights": ["Training classes", "Practical Korean lessons", "On-the-job work preparation"]
    },
    "ja": {
      "title": "1ヶ月トレーニング費用",
      "subtitle": "トレーニング・実務韓国語・実務投入教育を含む1ヶ月利用券です。",
      "description": "1ヶ月券にはトレーニング受講券、実務韓国語教育、実務投入業務教育が含まれます。ご利用になる月の費用のみお支払いいただき、翌月の継続は毎月あらためてお選びいただけます。",
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
  '이용하실 달의 비용입니다.',
  true,
  1,
  '{
    "en": {"label": "1 month", "note": "The fee for the month you use."},
    "ja": {"label": "1ヶ月", "note": "ご利用になる月の費用です。"}
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
