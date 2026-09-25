-- quotes: anon 키로 PostgREST 직접 조회가 가능했다(RLS off, view_token 포함 전 컬럼 노출).
-- 정책 없이 RLS 를 켜고 anon/authenticated 권한을 회수해 service-role API(/api/quotes*)로만 접근하게 한다.
-- 2026-09-26 운영 DB 에 apply_migration(quotes_enable_rls_service_role_only)으로 이미 적용됨.
alter table public.quotes enable row level security;
revoke all on table public.quotes from anon, authenticated;
comment on table public.quotes is 'RLS on, no policies: access only via service-role API routes (/api/quotes*, admin guard or view_token).';
