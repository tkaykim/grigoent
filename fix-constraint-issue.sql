-- 제약조건 문제 해결 스크립트

-- 1. 현재 상황 확인
SELECT '현재 상황 확인:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM public.proposals 
GROUP BY status 
ORDER BY status;

-- 2. 모든 제약조건 임시 제거
DO $$
BEGIN
    -- proposals 테이블의 status 제약조건 제거
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proposals'::regclass 
        AND conname = 'proposals_status_check'
    ) THEN
        ALTER TABLE public.proposals DROP CONSTRAINT proposals_status_check;
        RAISE NOTICE 'proposals_status_check 제약조건이 제거되었습니다.';
    END IF;
    
    -- proposal_notifications 테이블의 type 제약조건 제거
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proposal_notifications'::regclass 
        AND conname = 'proposal_notifications_type_check'
    ) THEN
        ALTER TABLE public.proposal_notifications DROP CONSTRAINT proposal_notifications_type_check;
        RAISE NOTICE 'proposal_notifications_type_check 제약조건이 제거되었습니다.';
    END IF;
END $$;

-- 3. 기존 데이터 정리
UPDATE public.proposals 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'consulting', 'scheduled', 'in_progress', 'completed', 'cancelled', 'rejected', 'expired');

-- 4. 새로운 제약조건 추가
ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'consulting'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text, 'expired'::text]));

ALTER TABLE public.proposal_notifications ADD CONSTRAINT proposal_notifications_type_check 
CHECK (type = ANY (ARRAY['new_proposal'::text, 'proposal_accepted'::text, 'proposal_rejected'::text, 'new_message'::text, 'status_updated'::text, 'project_started'::text, 'project_completed'::text]));

-- 5. 최종 확인
SELECT '수정 후 상태 분포:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM public.proposals 
GROUP BY status 
ORDER BY status;

SELECT '제약조건 설정 완료' as message;

-- career_entries 테이블에 updated_at 컬럼 추가
ALTER TABLE public.career_entries 
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- proposals 테이블 구조 수정 (기존 컬럼들 유지하면서 새로운 컬럼 추가)
-- 기존 proposals 테이블 백업
CREATE TABLE proposals_backup AS SELECT * FROM proposals;

-- proposals 테이블 재생성
DROP TABLE proposals CASCADE;

CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  dancer_id uuid,
  user_id uuid, -- 추가: 제안을 보낸 사용자
  team_id uuid, -- 추가: 팀 제안의 경우 팀 ID
  title text NOT NULL,
  description text NOT NULL,
  project_type text NOT NULL CHECK (project_type = ANY (ARRAY['choreography'::text, 'performance'::text, 'advertisement'::text, 'tv'::text, 'workshop'::text, 'other'::text])),
  budget_min integer,
  budget_max integer,
  start_date date,
  end_date date,
  location text,
  requirements text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proposals_pkey PRIMARY KEY (id),
  CONSTRAINT proposals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT proposals_dancer_id_fkey FOREIGN KEY (dancer_id) REFERENCES public.users(id),
  CONSTRAINT proposals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT proposals_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- 기존 데이터 복원 (새로운 컬럼들은 NULL로 설정)
INSERT INTO proposals (
  id, client_id, dancer_id, title, description, project_type, 
  budget_min, budget_max, start_date, end_date, location, requirements, 
  status, created_at, updated_at
)
SELECT 
  id, client_id, dancer_id, title, description, project_type,
  budget_min, budget_max, start_date, end_date, location, requirements,
  status, created_at, updated_at
FROM proposals_backup;

-- 백업 테이블 삭제
DROP TABLE proposals_backup;

-- career_entries 테이블의 updated_at 컬럼에 기본값 설정
UPDATE career_entries SET updated_at = created_at WHERE updated_at IS NULL;