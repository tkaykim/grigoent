-- 미수금·정산 지연 제보 테이블 및 RLS
-- Supabase SQL Editor 또는 CLI에서 실행하세요.

create table if not exists public.fee_payment_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  work_categories text[] not null default '{}',
  client_type text not null check (client_type in ('company', 'individual', 'unknown')),
  counterparty_note text not null,
  amount_note text not null,
  pay_type_note text not null,
  facts text not null,
  reporter_name text,
  reporter_contact text,
  reporter_instagram text not null,
  consent_accepted boolean not null default false
);

comment on table public.fee_payment_reports is '댄서·크리에이터 미수·정산 지연 사례 제보 (내부 참고용)';

alter table public.fee_payment_reports enable row level security;

-- 비로그인·로그인 사용자 제출 (API는 anon/service 패턴에 맞춰 anon insert)
create policy "fee_payment_reports_insert_anon"
  on public.fee_payment_reports
  for insert
  to anon
  with check (consent_accepted is true);

create policy "fee_payment_reports_insert_authenticated"
  on public.fee_payment_reports
  for insert
  to authenticated
  with check (consent_accepted is true);

-- 관리자만 열람 (브라우저 세션 = authenticated)
create policy "fee_payment_reports_select_admin"
  on public.fee_payment_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.type = 'admin'
    )
  );

-- anon은 select 불가 (정책 없음)

-- === 이미 예전 스키마로 테이블이 생성된 경우: 아래만 실행 ===
-- alter table public.fee_payment_reports add column if not exists reporter_instagram text;
-- update public.fee_payment_reports set reporter_instagram = '' where reporter_instagram is null;
-- alter table public.fee_payment_reports alter column reporter_instagram set not null;
-- alter table public.fee_payment_reports alter column reporter_instagram set default '';
