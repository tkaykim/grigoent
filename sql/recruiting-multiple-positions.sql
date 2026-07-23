-- 채용 지원서에서 복수 직무 선택을 저장한다.

alter table public.recruiting_applications
  add column if not exists position_slugs text[] not null default '{}'::text[];

alter table public.recruiting_applications
  add column if not exists position_titles text[] not null default '{}'::text[];

create index if not exists idx_recruiting_applications_position_slugs
  on public.recruiting_applications using gin(position_slugs);
