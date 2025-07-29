-- 안전한 제약조건 확장 스크립트
-- 기존 데이터를 보존하면서 새로운 상태 값들을 추가합니다.

-- 1. 현재 상황 확인
SELECT '현재 proposals 테이블의 상태 분포:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM public.proposals 
GROUP BY status 
ORDER BY status;

-- 2. 기존 제약조건 제거 (안전하게)
DO $$
BEGIN
    -- proposals 테이블의 status 제약조건 제거
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proposals'::regclass 
        AND conname = 'proposals_status_check'
    ) THEN
        ALTER TABLE public.proposals DROP CONSTRAINT proposals_status_check;
        RAISE NOTICE '기존 proposals_status_check 제약조건이 제거되었습니다.';
    END IF;
END $$;

-- 3. 확장된 제약조건 추가 (기존 상태 + 새로운 상태)
ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check 
CHECK (status = ANY (ARRAY[
    'pending'::text, 
    'accepted'::text, 
    'rejected'::text, 
    'expired'::text,
    'consulting'::text, 
    'scheduled'::text, 
    'in_progress'::text, 
    'completed'::text, 
    'cancelled'::text
]));

-- 4. proposal_notifications 테이블의 제약조건도 확장
DO $$
BEGIN
    -- proposal_notifications 테이블의 type 제약조건 제거
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proposal_notifications'::regclass 
        AND conname = 'proposal_notifications_type_check'
    ) THEN
        ALTER TABLE public.proposal_notifications DROP CONSTRAINT proposal_notifications_type_check;
        RAISE NOTICE '기존 proposal_notifications_type_check 제약조건이 제거되었습니다.';
    END IF;
END $$;

-- 5. proposal_notifications에 새로운 제약조건 추가
ALTER TABLE public.proposal_notifications ADD CONSTRAINT proposal_notifications_type_check 
CHECK (type = ANY (ARRAY[
    'new_proposal'::text, 
    'proposal_accepted'::text, 
    'proposal_rejected'::text, 
    'new_message'::text,
    'status_updated'::text, 
    'project_started'::text, 
    'project_completed'::text
]));

-- 6. 최종 확인
SELECT '확장 후 proposals 테이블의 상태 분포:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM public.proposals 
GROUP BY status 
ORDER BY status;

SELECT '제약조건 확장 완료 - 기존 데이터는 그대로 유지되었습니다.' as message;