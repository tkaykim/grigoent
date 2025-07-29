-- 현재 데이터베이스 상태 확인 스크립트

-- 1. 현재 proposals 테이블의 제약조건 확인
SELECT '현재 proposals 테이블의 제약조건:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.proposals'::regclass 
AND conname LIKE '%status%';

-- 2. 현재 proposals 테이블의 상태 분포 확인
SELECT '현재 proposals 테이블의 상태 분포:' as info;
SELECT DISTINCT status, COUNT(*) as count 
FROM public.proposals 
GROUP BY status 
ORDER BY status;

-- 3. 최근 생성된 제안들 확인 (최근 10개)
SELECT '최근 생성된 제안들:' as info;
SELECT id, title, status, created_at 
FROM public.proposals 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. proposal_notifications 테이블의 제약조건 확인
SELECT '현재 proposal_notifications 테이블의 제약조건:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.proposal_notifications'::regclass 
AND conname LIKE '%type%';

-- 5. proposal_notifications 테이블의 타입 분포 확인
SELECT '현재 proposal_notifications 테이블의 타입 분포:' as info;
SELECT DISTINCT type, COUNT(*) as count 
FROM public.proposal_notifications 
GROUP BY type 
ORDER BY type;

-- 6. proposals 테이블의 전체 레코드 수 확인
SELECT 'proposals 테이블의 전체 레코드 수:' as info;
SELECT COUNT(*) as total_count FROM public.proposals;

-- 7. proposal_notifications 테이블의 전체 레코드 수 확인
SELECT 'proposal_notifications 테이블의 전체 레코드 수:' as info;
SELECT COUNT(*) as total_count FROM public.proposal_notifications;

-- 8. 현재 제약조건이 허용하는 상태 값들 확인
SELECT '현재 제약조건이 허용하는 상태 값들:' as info;
SELECT 
    CASE 
        WHEN conname = 'proposals_status_check' THEN 'proposals 테이블'
        ELSE '기타'
    END as table_name,
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.proposals'::regclass 
AND conname LIKE '%status%';