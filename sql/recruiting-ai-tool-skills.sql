-- 채용 지원서에서 AI 도구별 사용 경험과 숙련도를 저장한다.

alter table public.recruiting_applications
  add column if not exists ai_tool_skills jsonb not null default '{}'::jsonb;
