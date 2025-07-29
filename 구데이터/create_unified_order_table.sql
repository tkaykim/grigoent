-- 아티스트와 팀의 통합 순서를 관리하는 테이블
CREATE TABLE display_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT CHECK (item_type IN ('artist', 'team')) NOT NULL,
  item_id UUID NOT NULL, -- users.id 또는 teams.id
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_type, item_id),
  UNIQUE(display_order)
);

-- 기존 아티스트들의 순서 데이터 마이그레이션
INSERT INTO display_order_items (item_type, item_id, display_order)
SELECT 
  'artist' as item_type,
  id as item_id,
  COALESCE(display_order, ROW_NUMBER() OVER (ORDER BY created_at ASC)) as display_order
FROM users 
WHERE type = 'dancer' AND display_order IS NOT NULL;

-- 기존 팀들의 순서 데이터 마이그레이션 (아티스트 다음 순서로)
INSERT INTO display_order_items (item_type, item_id, display_order)
SELECT 
  'team' as item_type,
  id as item_id,
  (SELECT COALESCE(MAX(display_order), 0) FROM display_order_items) + ROW_NUMBER() OVER (ORDER BY created_at ASC) as display_order
FROM teams 
WHERE status = 'active' AND display_order IS NOT NULL;

-- 결과 확인
SELECT 
  item_type,
  item_id,
  display_order,
  CASE 
    WHEN item_type = 'artist' THEN (SELECT name FROM users WHERE id = item_id)
    WHEN item_type = 'team' THEN (SELECT name FROM teams WHERE id = item_id)
  END as name
FROM display_order_items 
ORDER BY display_order ASC;