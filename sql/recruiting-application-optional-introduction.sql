-- 채용 지원서 자기소개 및 지원 내용 선택 입력 전환.
-- 지원자가 기본 연락처와 이력서 또는 포트폴리오만으로도 1차 지원을 완료할 수 있게 한다.

alter table public.recruiting_applications
  alter column career_summary drop not null;

comment on column public.recruiting_applications.career_summary is
  '선택 입력 자기소개 및 지원 내용. 비워도 1차 지원서를 제출할 수 있다.';
