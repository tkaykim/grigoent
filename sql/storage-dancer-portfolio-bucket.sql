-- Supabase Storage: 댄서 지원 포트폴리오 첨부용 버킷
-- Dashboard → SQL Editor에서 실행하세요. (storage.buckets에 대한 소유 권한이 있는 역할 필요)
-- MCP 마이그레이션으로는 권한 오류가 날 수 있어, 수동 실행용으로 둡니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dancer-portfolio-files',
  'dancer-portfolio-files',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 업로드는 서버(API service role)에서만 수행합니다. anon 직접 업로드 정책은 두지 않습니다.
