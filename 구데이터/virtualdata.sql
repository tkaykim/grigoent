-- users 테이블에 가상 프로필 및 Claim 관련 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS claim_user_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS claim_status TEXT CHECK (claim_status IN ('pending', 'approved', 'rejected')); 
ALTER TABLE career_entries ADD COLUMN IF NOT EXISTS date_type TEXT CHECK (date_type IN ('single', 'range')) DEFAULT 'range';
ALTER TABLE career_entries ADD COLUMN IF NOT EXISTS single_date DATE; 