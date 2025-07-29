-- SEO 설정을 관리하는 테이블
CREATE TABLE seo_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT CHECK (setting_type IN ('text', 'textarea', 'url', 'image')) DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 SEO 설정 데이터 삽입
INSERT INTO seo_settings (setting_key, setting_value, setting_type, description) VALUES
  ('site_title', '그리고 엔터테인먼트 - GRIGO entertainment', 'text', '사이트 제목'),
  ('site_description', '그리고 엔터테인먼트는 댄서, 안무가 섭외, 안무제작, 뮤직비디오 제작, 광고를 진행하고 있으며, 한 곳에서 머물러 있는 것이 아닌 가치를 찾아 새로운 길로 나아가는 마인드를 목표로 가지고 있습니다.', 'textarea', '사이트 설명'),
  ('site_keywords', '댄서, 안무가, 섭외, 안무제작, 뮤직비디오, 광고, 그리고엔터테인먼트, GRIGO', 'textarea', '사이트 키워드'),
  ('site_author', '그리고 엔터테인먼트', 'text', '사이트 작성자'),
  ('site_url', 'https://grigoent.com', 'url', '사이트 URL'),
  ('favicon_url', '/favicon.ico', 'image', '파비콘 URL'),
  ('og_image_url', '/og-image.jpg', 'image', 'Open Graph 이미지 URL'),
  ('twitter_image_url', '/twitter-image.jpg', 'image', 'Twitter 카드 이미지 URL'),
  ('google_analytics_id', '', 'text', 'Google Analytics ID'),
  ('google_search_console', '', 'text', 'Google Search Console 메타태그'),
  ('naver_webmaster', '', 'text', '네이버 웹마스터 도구 메타태그'),
  ('robots_txt', 'User-agent: *\nAllow: /\nSitemap: https://grigoent.com/sitemap.xml', 'textarea', 'robots.txt 내용'),
  ('sitemap_urls', 'https://grigoent.com\nhttps://grigoent.com/artists\nhttps://grigoent.com/teams', 'textarea', '사이트맵 URL 목록');

-- RLS 정책 설정
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can view SEO settings" ON seo_settings
  FOR SELECT USING (true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can update SEO settings" ON seo_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );

-- 관리자만 삽입 가능
CREATE POLICY "Admins can insert SEO settings" ON seo_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete SEO settings" ON seo_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );