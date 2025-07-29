-- users 테이블의 claim_status 제약조건 수정
-- 기존 제약조건 확인
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname LIKE '%claim_status%';

-- 기존 제약조건 제거 (있다면)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname = 'users_claim_status_check'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_claim_status_check;
        RAISE NOTICE '기존 claim_status 제약조건이 제거되었습니다.';
    END IF;
END $$;

-- 새로운 제약조건 추가 (completed 포함)
ALTER TABLE public.users 
ADD CONSTRAINT users_claim_status_check 
CHECK (claim_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));

-- 제약조건 확인
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass 
AND conname = 'users_claim_status_check';