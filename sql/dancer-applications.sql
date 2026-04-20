-- 댄서 지원 신청 (공개 폼 → 서버 API가 service role로만 insert)
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.dancer_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  stage_name text not null,
  birth_date date not null,
  instagram_handle text not null,
  careers text[] not null default '{}'::text[],
  phone text,
  gender text,
  height_cm integer,
  portfolio_url text,
  agency_name text,
  nationality text,
  is_korean_national boolean,
  has_visa boolean,
  visa_details text,
  privacy_consent boolean not null default false
);

comment on table public.dancer_applications is '공개 댄서 지원 신청. 클라이언트는 직접 insert 하지 않고 /api/dancer-applications 만 사용.';

alter table public.dancer_applications enable row level security;

-- anon/authenticated 에 대한 정책을 두지 않음 → 브라우저 anon 키로는 읽기/쓰기 불가.
-- 서비스 롤 키는 RLS를 우회하므로 API Route에서만 삽입 가능.
