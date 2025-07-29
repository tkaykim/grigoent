-- 프로젝트 관리 기능을 위한 데이터베이스 업데이트 스크립트
-- 기존 proposals 테이블의 status 필드 제약조건을 확장

-- 1. 현재 proposals 테이블의 status 값들 확인
SELECT '현재 proposals 테이블의 상태 분포:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM public.proposals 
GROUP BY status 
ORDER BY status;

-- 2. 현재 제약조건 확인
SELECT '현재 proposals 테이블의 제약조건:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.proposals'::regclass 
AND conname LIKE '%status%';

-- 3. 기존 proposals 테이블의 status 제약조건 삭제 (안전하게)
DO $$
BEGIN
    -- 제약조건이 존재하는지 확인 후 삭제
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proposals'::regclass 
        AND conname = 'proposals_status_check'
    ) THEN
        ALTER TABLE public.proposals DROP CONSTRAINT proposals_status_check;
        RAISE NOTICE '기존 제약조건이 삭제되었습니다.';
    ELSE
        RAISE NOTICE '삭제할 제약조건이 없습니다.';
    END IF;
END $$;

-- 4. 기존 데이터에서 'accepted' 상태를 'scheduled'로 변경 (프로젝트 관리에 더 적합)
UPDATE public.proposals 
SET status = 'scheduled' 
WHERE status = 'accepted';

-- 5. 새로운 status 제약조건 추가 (프로젝트 관리 상태 포함)
ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'consulting'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text, 'expired'::text]));

-- 6. proposal_notifications 테이블의 type 제약조건 업데이트
DO $$
BEGIN
    -- 제약조건이 존재하는지 확인 후 삭제
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.proposal_notifications'::regclass 
        AND conname = 'proposal_notifications_type_check'
    ) THEN
        ALTER TABLE public.proposal_notifications DROP CONSTRAINT proposal_notifications_type_check;
        RAISE NOTICE '기존 알림 제약조건이 삭제되었습니다.';
    ELSE
        RAISE NOTICE '삭제할 알림 제약조건이 없습니다.';
    END IF;
END $$;

-- 7. 새로운 notification type 제약조건 추가
ALTER TABLE public.proposal_notifications ADD CONSTRAINT proposal_notifications_type_check 
CHECK (type = ANY (ARRAY['new_proposal'::text, 'proposal_accepted'::text, 'proposal_rejected'::text, 'new_message'::text, 'status_updated'::text, 'project_started'::text, 'project_completed'::text]));

-- 8. 업데이트 완료 확인을 위한 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW proposal_status_summary AS
SELECT 
    status,
    COUNT(*) as count,
    CASE 
        WHEN status = 'pending' THEN '대기중'
        WHEN status = 'consulting' THEN '상담중'
        WHEN status = 'scheduled' THEN '진행예정'
        WHEN status = 'in_progress' THEN '진행중'
        WHEN status = 'completed' THEN '완료'
        WHEN status = 'cancelled' THEN '취소됨'
        WHEN status = 'rejected' THEN '거절됨'
        WHEN status = 'expired' THEN '만료됨'
        ELSE '알 수 없음'
    END as status_label
FROM public.proposals 
GROUP BY status 
ORDER BY count DESC;

-- 9. 업데이트 완료 확인
SELECT '프로젝트 관리 기능을 위한 데이터베이스 업데이트가 완료되었습니다.' as message;

-- 10. 최종 상태 확인
SELECT '현재 proposals 테이블의 상태 분포:' as info;
SELECT * FROM proposal_status_summary;

-- 11. 새로운 제약조건 확인
SELECT '새로운 제약조건 확인:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.proposals'::regclass 
AND conname = 'proposals_status_check';