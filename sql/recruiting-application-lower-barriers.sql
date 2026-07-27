-- 채용 지원서 1차 접수 허들 완화.
-- 이력서 PDF 대신 포트폴리오 링크만 제출할 수 있고, 세부 역량 문항은 선택 입력으로 받는다.

alter table public.recruiting_applications
  alter column motivation drop not null,
  alter column camera_capability drop not null,
  alter column driving_capability drop not null,
  alter column foreign_languages drop not null,
  alter column resume_file_path drop not null;

comment on column public.recruiting_applications.career_summary is
  '선택 입력 자기소개 및 지원 내용. 비워도 1차 지원서를 제출할 수 있다.';

comment on column public.recruiting_applications.resume_file_path is
  '지원자가 첨부한 이력서 PDF 경로. 포트폴리오 링크만 제출한 경우 null.';
