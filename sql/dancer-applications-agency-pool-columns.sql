-- 에이전시 풀 모집 확장 컬럼 (기존 dancer_applications 테이블에 추가)
-- Supabase SQL Editor에서 실행하세요.

alter table public.dancer_applications
  add column if not exists phone text,
  add column if not exists gender text,
  add column if not exists height_cm integer,
  add column if not exists portfolio_url text,
  add column if not exists agency_name text,
  add column if not exists nationality text,
  add column if not exists is_korean_national boolean,
  add column if not exists has_visa boolean,
  add column if not exists visa_details text,
  add column if not exists privacy_consent boolean not null default false;

comment on column public.dancer_applications.phone is '연락처';
comment on column public.dancer_applications.gender is '성별';
comment on column public.dancer_applications.height_cm is '키(cm)';
comment on column public.dancer_applications.portfolio_url is '포트폴리오(프로필) URL';
comment on column public.dancer_applications.agency_name is '소속사명 (없으면 null)';
comment on column public.dancer_applications.nationality is '국적 표기';
comment on column public.dancer_applications.is_korean_national is '대한민국 국적 여부';
comment on column public.dancer_applications.has_visa is '비자 보유(외국인만, 국적이 한국이면 null)';
comment on column public.dancer_applications.visa_details is '비자 종류·만료일 등';
comment on column public.dancer_applications.privacy_consent is '개인정보 활용 동의';
