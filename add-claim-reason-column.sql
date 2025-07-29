-- 연동 신청 이유 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN claim_reason text;

-- 기존 데이터는 그대로 유지
SELECT 'claim_reason 컬럼이 추가되었습니다.' as message;