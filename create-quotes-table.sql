-- =============================================
-- 견적서(quotes) 테이블 생성 SQL
-- Supabase SQL Editor에서 실행하세요
-- =============================================

CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id      UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  client_name     TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_phone    TEXT DEFAULT '',
  client_company  TEXT DEFAULT '',
  project_title   TEXT DEFAULT '',
  project_type    TEXT DEFAULT '',
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  supply_amount   NUMERIC NOT NULL DEFAULT 0,
  vat             NUMERIC NOT NULL DEFAULT 0,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  valid_until     DATE,
  notes           TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at         TIMESTAMPTZ,
  view_token      UUID UNIQUE DEFAULT gen_random_uuid(),
  client_response TEXT CHECK (client_response IS NULL OR client_response IN ('pending', 'approved', 'revision_requested', 'rejected')),
  client_response_at   TIMESTAMPTZ,
  client_response_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_view_token ON quotes(view_token);
CREATE INDEX IF NOT EXISTS idx_quotes_inquiry_id ON quotes(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- RLS 비활성화 (서비스 롤 키로 접근하므로)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- 서비스 롤은 모든 작업 허용
CREATE POLICY "service_role_all" ON quotes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 공개 읽기: view_token으로 sent 상태의 견적서만 조회 가능
CREATE POLICY "public_view_sent_quotes" ON quotes
  FOR SELECT
  USING (status = 'sent' AND view_token IS NOT NULL);
