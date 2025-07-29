-- 기존 팀들에게 display_order 값 설정
-- created_at 순서대로 1부터 시작하는 순서 부여

UPDATE teams 
SET display_order = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM teams 
  WHERE status = 'active'
) as subquery
WHERE teams.id = subquery.id;

-- 결과 확인
SELECT id, name, name_en, display_order, created_at
FROM teams 
WHERE status = 'active'
ORDER BY display_order ASC;