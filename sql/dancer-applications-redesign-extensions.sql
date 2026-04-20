-- 에이전시 풀 지원 리디자인: 신규 필드 + 관리자 운영 필드
-- 기존 테이블(public.dancer_applications)에 컬럼만 추가하므로 데이터 보존.

alter table public.dancer_applications
  add column if not exists email text,
  add column if not exists residence_region text,
  add column if not exists specialties text[] not null default '{}'::text[],
  add column if not exists profile_photo_path text,
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

-- review_status 값 제약
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dancer_applications_review_status_check'
  ) then
    alter table public.dancer_applications
      add constraint dancer_applications_review_status_check
      check (review_status in ('pending','in_review','accepted','rejected','hold'));
  end if;
end$$;

-- 자주 조회되는 컬럼 인덱스
create index if not exists idx_dancer_applications_review_status
  on public.dancer_applications(review_status);
create index if not exists idx_dancer_applications_created_at
  on public.dancer_applications(created_at desc);
create index if not exists idx_dancer_applications_specialties
  on public.dancer_applications using gin (specialties);
