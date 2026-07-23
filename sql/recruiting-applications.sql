-- 그리고 엔터테인먼트 공개 채용 지원서.
-- 브라우저는 테이블과 Storage에 직접 접근하지 않고 서버 API만 사용한다.

create table if not exists public.recruiting_applications (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  position_slug text not null,
  position_title text not null,
  position_slugs text[] not null default '{}'::text[],
  position_titles text[] not null default '{}'::text[],
  full_name text not null,
  email text not null,
  phone text not null,
  career_summary text not null,
  motivation text not null,
  tool_skills jsonb not null default '{}'::jsonb,
  other_tools text,
  camera_capability text not null check (camera_capability in ('yes', 'basic', 'no')),
  camera_details text,
  driving_capability text not null check (driving_capability in ('yes', 'license_only', 'no')),
  foreign_languages text not null,
  portfolio_url text,
  resume_file_path text not null,
  alternative_position_consent boolean not null default false,
  privacy_consent boolean not null default false check (privacy_consent = true),
  source_path text not null default '/careers',
  review_status text not null default 'submitted'
    check (review_status in ('submitted', 'reviewing', 'interview', 'offer', 'hired', 'not_selected', 'withdrawn')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recruiting_applications is
  '비로그인 공개 채용 지원서. 서비스 롤을 사용하는 서버 API만 읽고 쓴다.';

alter table public.recruiting_applications enable row level security;

alter table public.recruiting_applications
  add column if not exists position_slugs text[] not null default '{}'::text[];
alter table public.recruiting_applications
  add column if not exists position_titles text[] not null default '{}'::text[];

create index if not exists idx_recruiting_applications_created_at
  on public.recruiting_applications(created_at desc);
create index if not exists idx_recruiting_applications_review_status
  on public.recruiting_applications(review_status, created_at desc);
create index if not exists idx_recruiting_applications_position_slug
  on public.recruiting_applications(position_slug, created_at desc);
create index if not exists idx_recruiting_applications_position_slugs
  on public.recruiting_applications using gin(position_slugs);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recruiting-resumes', 'recruiting-resumes', false, 4194304, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
