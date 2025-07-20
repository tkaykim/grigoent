-- 댄서-클라이언트 플랫폼 데이터베이스 스키마

-- 1. users 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  profile_image TEXT,
  slug TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('general', 'dancer', 'client', 'manager', 'admin')) DEFAULT 'general',
  pending_type TEXT CHECK (pending_type IN ('dancer', 'client')),
  display_order INTEGER,
  introduction TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. career_entries 테이블
CREATE TABLE career_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('choreography', 'performance', 'advertisement', 'tv', 'workshop')) NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  poster_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  description TEXT,
  country TEXT DEFAULT 'Korea',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 슬러그 자동 생성을 위한 함수 (중복 시 -1, -2 자동 처리)
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  new_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM users WHERE slug = new_slug) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- 슬러그 자동 생성 트리거
CREATE OR REPLACE FUNCTION set_user_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_slug(lower(regexp_replace(NEW.name_en, '[^a-zA-Z0-9]', '-', 'g')));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_user_slug
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_slug();

-- 대표작 제한 (카테고리별 최대 2개)
CREATE OR REPLACE FUNCTION check_featured_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    IF (SELECT COUNT(*) FROM career_entries 
        WHERE user_id = NEW.user_id 
        AND category = NEW.category 
        AND is_featured = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 2 THEN
      RAISE EXCEPTION '카테고리별 대표작은 최대 2개까지만 선택할 수 있습니다.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_featured_limit
  BEFORE INSERT OR UPDATE ON career_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_featured_limit();

-- RLS (Row Level Security) 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_entries ENABLE ROW LEVEL SECURITY;

-- users 테이블 정책
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- career_entries 테이블 정책
CREATE POLICY "Anyone can view career entries" ON career_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own career entries" ON career_entries
  FOR ALL USING (auth.uid() = user_id);

-- 샘플 데이터 (테스트용)
INSERT INTO users (id, name, name_en, email, type, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', '김댄서', 'Kim Dancer', 'dancer1@example.com', 'dancer', 'kim-dancer'),
  ('22222222-2222-2222-2222-222222222222', '이댄서', 'Lee Dancer', 'dancer2@example.com', 'dancer', 'lee-dancer'),
  ('33333333-3333-3333-3333-333333333333', '박댄서', 'Park Dancer', 'dancer3@example.com', 'dancer', 'park-dancer'),
  ('44444444-4444-4444-4444-444444444444', '최댄서', 'Choi Dancer', 'dancer4@example.com', 'dancer', 'choi-dancer'),
  ('55555555-5555-5555-5555-555555555555', '정댄서', 'Jung Dancer', 'dancer5@example.com', 'dancer', 'jung-dancer'),
  ('66666666-6666-6666-6666-666666666666', '강댄서', 'Kang Dancer', 'dancer6@example.com', 'dancer', 'kang-dancer'),
  ('77777777-7777-7777-7777-777777777777', '조댄서', 'Jo Dancer', 'dancer7@example.com', 'dancer', 'jo-dancer'),
  ('88888888-8888-8888-8888-888888888888', '윤댄서', 'Yoon Dancer', 'dancer8@example.com', 'dancer', 'yoon-dancer');

-- 샘플 경력 데이터
INSERT INTO career_entries (user_id, category, title, description, country) VALUES
  ('11111111-1111-1111-1111-111111111111', 'choreography', '아이돌 그룹 A 타이틀곡 안무', 'K-POP 아이돌 그룹의 타이틀곡 안무 제작', 'Korea'),
  ('11111111-1111-1111-1111-111111111111', 'performance', '대형 콘서트 메인 댄서', '5만명 규모 콘서트 메인 댄서 참여', 'Korea'),
  ('22222222-2222-2222-2222-222222222222', 'advertisement', '브랜드 CF 안무', '유명 브랜드 광고 안무 및 출연', 'Korea'),
  ('22222222-2222-2222-2222-222222222222', 'tv', '댄스 경연 프로그램', 'TV 댄스 경연 프로그램 출연', 'Korea'),
  ('33333333-3333-3333-3333-333333333333', 'workshop', 'K-POP 댄스 워크샵', '해외 K-POP 댄스 워크샵 진행', 'Japan'); 