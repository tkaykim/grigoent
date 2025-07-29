-- career_entries 테이블에 updated_at 컬럼 추가 (안전하게)
DO $$
BEGIN
    -- 컬럼이 존재하지 않는 경우에만 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'career_entries' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.career_entries 
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        RAISE NOTICE 'updated_at 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'updated_at 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 기존 데이터의 updated_at 컬럼을 created_at으로 설정
UPDATE career_entries 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 결과 확인
SELECT COUNT(*) as total_entries, 
       COUNT(updated_at) as entries_with_updated_at
FROM career_entries;