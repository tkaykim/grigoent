-- 결제 페이지(/training, /audition-fee) 공통 할인코드.
--
-- 타입 명명은 modoo(coupons.discount_type)와 맞춘다: percentage | fixed_amount.
-- 사업부가 달라도 같은 개념을 다른 이름으로 부르면 나중에 통합 조회가 안 된다.

create table if not exists public.training_discount_codes (
  id uuid primary key default gen_random_uuid(),
  -- 항상 대문자로 저장한다. 입력은 대소문자 구분 없이 받고 서버에서 upper() 한다.
  code text not null unique,
  display_name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  -- percentage 면 0~100, fixed_amount 면 원 단위.
  discount_value integer not null check (discount_value > 0),
  -- percentage 할인의 상한(원). null 이면 상한 없음.
  max_discount_amount integer,
  -- 이 금액 이상 주문에만 적용.
  min_order_amount integer not null default 0,
  -- 사용 가능 횟수. null 이면 무제한.
  max_uses integer,
  -- 적용 대상 상품 slug. null 이면 전 상품.
  product_slugs text[],
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사용 이력. 사용 횟수는 이 테이블의 행 수로 센다(코드 테이블에 카운터를 두면 어긋난다).
--
-- (code_id, customer_email) 유니크가 핵심이다.
-- 같은 사람이 결제를 중단했다가 다시 시도하면 자기 슬롯을 재사용하고,
-- 다른 사람이 한도를 넘겨 쓰려 하면 막힌다.
create table if not exists public.training_discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.training_discount_codes(id) on delete cascade,
  customer_email text not null,
  -- 가장 최근에 이 코드를 적용한 주문.
  order_id uuid references public.training_orders(id) on delete set null,
  discount_amount integer not null default 0,
  -- 결제가 실제로 승인된 시각. null 이면 아직 결제 전(예약 상태).
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code_id, customer_email)
);

create index if not exists training_discount_redemptions_code_idx
  on public.training_discount_redemptions (code_id);
create index if not exists training_discount_redemptions_order_idx
  on public.training_discount_redemptions (order_id);

-- 주문에 적용된 할인 스냅샷. 코드가 나중에 수정·삭제돼도 주문 기록은 남아야 한다.
alter table public.training_orders
  add column if not exists discount_code text,
  add column if not exists discount_amount integer not null default 0,
  add column if not exists original_amount integer;

-- 코드 예약(=사용 슬롯 확보)을 한 트랜잭션에서 원자적으로 처리한다.
-- 애플리케이션에서 "센 다음 넣기"로 하면 동시 요청에 한도를 넘길 수 있다.
create or replace function public.reserve_training_discount(
  p_code text,
  p_email text,
  p_order_id uuid,
  p_discount_amount integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.training_discount_codes%rowtype;
  v_used integer;
  v_existing uuid;
  v_id uuid;
begin
  select * into v_code
  from public.training_discount_codes
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'DISCOUNT_NOT_FOUND';
  end if;

  select id into v_existing
  from public.training_discount_redemptions
  where code_id = v_code.id and customer_email = lower(trim(p_email));

  -- 같은 이메일이 이미 슬롯을 갖고 있으면 한도 검사 없이 갱신한다(재시도 허용).
  if v_existing is not null then
    update public.training_discount_redemptions
    set order_id = p_order_id,
        discount_amount = p_discount_amount,
        updated_at = now()
    where id = v_existing
    returning id into v_id;
    return v_id;
  end if;

  if v_code.max_uses is not null then
    select count(*) into v_used
    from public.training_discount_redemptions
    where code_id = v_code.id;

    if v_used >= v_code.max_uses then
      raise exception 'DISCOUNT_EXHAUSTED';
    end if;
  end if;

  insert into public.training_discount_redemptions (code_id, customer_email, order_id, discount_amount)
  values (v_code.id, lower(trim(p_email)), p_order_id, p_discount_amount)
  returning id into v_id;

  return v_id;
end;
$$;

alter table public.training_discount_codes enable row level security;
alter table public.training_discount_redemptions enable row level security;

-- 서비스 롤(서버)만 접근한다. 코드 목록이 공개되면 무단 사용된다.
drop policy if exists training_discount_codes_no_public on public.training_discount_codes;
drop policy if exists training_discount_redemptions_no_public on public.training_discount_redemptions;
