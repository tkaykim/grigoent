-- career_entries 테이블에 linked_user_id 컬럼 추가 (경력 연동 기능)
DO $$
BEGIN
    -- 컬럼이 존재하지 않는 경우에만 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'career_entries' 
        AND column_name = 'linked_user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.career_entries 
        ADD COLUMN linked_user_id uuid REFERENCES public.users(id);
        RAISE NOTICE 'linked_user_id 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'linked_user_id 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 기존 경력 데이터의 linked_user_id를 user_id와 동일하게 설정 (기본값)
UPDATE career_entries 
SET linked_user_id = user_id 
WHERE linked_user_id IS NULL;

-- 결과 확인
SELECT COUNT(*) as total_entries, 
       COUNT(linked_user_id) as entries_with_linked_user
FROM career_entries;