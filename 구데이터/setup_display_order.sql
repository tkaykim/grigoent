-- 기존 아티스트들에게 display_order 값 설정
-- created_at 순서대로 1부터 시작하는 순서 부여

UPDATE users 
SET display_order = subquery.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM users 
  WHERE type = 'dancer'
) as subquery
WHERE users.id = subquery.id;

-- 결과 확인
SELECT id, name, name_en, display_order, created_at
FROM users 
WHERE type = 'dancer'
ORDER BY display_order ASC;