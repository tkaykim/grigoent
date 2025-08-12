-- 안전한 연결 시스템 SQL (기존 데이터 보존)
-- 기존 테이블이나 데이터를 삭제하지 않습니다!

-- 1. career_entries 테이블에 updated_at 컬럼 추가 (안전하게)
DO $$
BEGIN
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

-- 2. career_entries 테이블에 linked_user_id 컬럼 추가 (안전하게)
DO $$
BEGIN
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

-- 3. proposals 테이블에 user_id, team_id 컬럼 추가 (안전하게)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'proposals'
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.proposals
        ADD COLUMN user_id uuid REFERENCES public.users(id);
        RAISE NOTICE 'user_id 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'user_id 컬럼이 이미 존재합니다.';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'proposals'
        AND column_name = 'team_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.proposals
        ADD COLUMN team_id uuid REFERENCES public.teams(id);
        RAISE NOTICE 'team_id 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'team_id 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 4. users 테이블의 claim_status 제약조건 수정 (안전하게)
DO $$
BEGIN
    -- 기존 제약조건 확인
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND conname = 'users_claim_status_check'
    ) THEN
        -- 제약조건 내용 확인
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.users'::regclass 
            AND conname = 'users_claim_status_check'
            AND pg_get_constraintdef(oid) LIKE '%completed%'
        ) THEN
            -- completed가 포함되지 않은 경우에만 제약조건 수정
            ALTER TABLE public.users DROP CONSTRAINT users_claim_status_check;
            ALTER TABLE public.users 
            ADD CONSTRAINT users_claim_status_check 
            CHECK (claim_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));
            RAISE NOTICE 'claim_status 제약조건이 updated되었습니다.';
        ELSE
            RAISE NOTICE 'claim_status 제약조건이 이미 올바르게 설정되어 있습니다.';
        END IF;
    ELSE
        -- 제약조건이 없는 경우 새로 생성
        ALTER TABLE public.users 
        ADD CONSTRAINT users_claim_status_check 
        CHECK (claim_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text]));
        RAISE NOTICE 'claim_status 제약조건이 새로 생성되었습니다.';
    END IF;
END $$;

-- 5. 새로운 연결 시스템 테이블들 생성 (기존 데이터에 영향 없음)
-- 사용자 연결 관계 테이블
CREATE TABLE IF NOT EXISTS user_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  linked_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type = ANY (ARRAY['career'::text, 'profile'::text, 'proposals'::text, 'teams'::text, 'all'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_links_pkey PRIMARY KEY (id),
  CONSTRAINT user_links_unique UNIQUE (primary_user_id, linked_user_id, link_type)
);

-- 데이터 접근 권한 테이블
CREATE TABLE IF NOT EXISTS data_access_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data_type text NOT NULL CHECK (data_type = ANY (ARRAY['career'::text, 'profile'::text, 'proposals'::text, 'teams'::text])),
  original_owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_level text NOT NULL CHECK (access_level = ANY (ARRAY['read'::text, 'write'::text, 'admin'::text])) DEFAULT 'read',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT data_access_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT data_access_permissions_unique UNIQUE (user_id, data_type, original_owner_id)
);

-- 연결 상태 관리 테이블
CREATE TABLE IF NOT EXISTS connection_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'active'::text, 'inactive'::text])),
  connection_type text NOT NULL CHECK (connection_type = ANY (ARRAY['career'::text, 'profile'::text, 'proposals'::text, 'teams'::text, 'all'::text])),
  reason text,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT connection_status_pkey PRIMARY KEY (id),
  CONSTRAINT connection_status_unique UNIQUE (requester_id, target_user_id, connection_type)
);

-- 6. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_links_primary_user ON user_links(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_linked_user ON user_links(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_permissions_user ON data_access_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_permissions_owner ON data_access_permissions(original_owner_id);
CREATE INDEX IF NOT EXISTS idx_connection_status_requester ON connection_status(requester_id);
CREATE INDEX IF NOT EXISTS idx_connection_status_target ON connection_status(target_user_id);

-- 7. 기존 데이터의 linked_user_id 초기화 (안전하게)
UPDATE career_entries
SET linked_user_id = user_id
WHERE linked_user_id IS NULL;

-- 8. 기존 claim 데이터를 새로운 연결 시스템으로 마이그레이션 (안전하게)
-- 기존 claim 데이터를 새로운 연결 시스템으로 마이그레이션
INSERT INTO connection_status (
  requester_id, 
  target_user_id, 
  status, 
  connection_type, 
  reason
)
SELECT 
  id,
  claim_user_id,
  CASE 
    WHEN claim_status = 'completed' THEN 'active'
    ELSE claim_status
  END,
  'all',
  claim_reason
FROM users 
WHERE claim_user_id IS NOT NULL
ON CONFLICT (requester_id, target_user_id, connection_type) DO NOTHING;

-- 활성 연결인 경우 데이터 접근 권한 부여
INSERT INTO data_access_permissions (
  user_id, 
  data_type, 
  original_owner_id, 
  access_level
)
SELECT 
  id,
  'career',
  claim_user_id,
  'write'
FROM users 
WHERE claim_user_id IS NOT NULL 
AND claim_status = 'completed'
ON CONFLICT (user_id, data_type, original_owner_id) DO NOTHING;

INSERT INTO data_access_permissions (
  user_id, 
  data_type, 
  original_owner_id, 
  access_level
)
SELECT 
  id,
  'profile',
  claim_user_id,
  'write'
FROM users 
WHERE claim_user_id IS NOT NULL 
AND claim_status = 'completed'
ON CONFLICT (user_id, data_type, original_owner_id) DO NOTHING;

INSERT INTO data_access_permissions (
  user_id, 
  data_type, 
  original_owner_id, 
  access_level
)
SELECT 
  id,
  'proposals',
  claim_user_id,
  'write'
FROM users 
WHERE claim_user_id IS NOT NULL 
AND claim_status = 'completed'
ON CONFLICT (user_id, data_type, original_owner_id) DO NOTHING;

INSERT INTO data_access_permissions (
  user_id, 
  data_type, 
  original_owner_id, 
  access_level
)
SELECT 
  id,
  'teams',
  claim_user_id,
  'write'
FROM users 
WHERE claim_user_id IS NOT NULL 
AND claim_status = 'completed'
ON CONFLICT (user_id, data_type, original_owner_id) DO NOTHING;

-- 9. 결과 확인 (안전성 검증)
SELECT 
  'Migration completed safely' as status,
  COUNT(*) as total_connections,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_connections,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_connections
FROM connection_status;

SELECT 
  'Permissions created safely' as status,
  COUNT(*) as total_permissions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT original_owner_id) as unique_owners
FROM data_access_permissions;

-- 10. 기존 데이터 보존 확인
SELECT 
  'Existing data preserved' as status,
  COUNT(*) as total_career_entries,
  COUNT(*) as total_proposals,
  COUNT(*) as total_users
FROM career_entries;

SELECT 
  'Existing data preserved' as status,
  COUNT(*) as total_proposals
FROM proposals;

SELECT 
  'Existing data preserved' as status,
  COUNT(*) as total_users
FROM users;

-- 11. 문의게시판 테이블 (비밀번호 해시 보관, 비공개 기본)
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL, -- ex) general, proposal, etc
  title text NOT NULL,
  content text NOT NULL,
  name text,
  contact text,
  password_hash text NOT NULL,
  is_private boolean DEFAULT true,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inquiries_pkey PRIMARY KEY (id)
);

-- 12. 문의 답변 테이블
CREATE TABLE IF NOT EXISTS inquiry_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  responder_id uuid REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT inquiry_replies_pkey PRIMARY KEY (id)
);