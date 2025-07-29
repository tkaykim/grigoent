-- 연동 신청 테스트를 위한 SQL

-- 1. 기존 댄서 계정 생성 (연동 대상)
INSERT INTO public.users (
  id,
  name,
  name_en,
  email,
  slug,
  type,
  introduction,
  instagram_url,
  youtube_url,
  profile_image,
  display_order
) VALUES (
  gen_random_uuid(),
  '테스트 댄서',
  'Test Dancer',
  'test.dancer@example.com',
  'test-dancer',
  'dancer',
  '테스트 댄서입니다.',
  'https://instagram.com/testdancer',
  'https://youtube.com/testdancer',
  'https://example.com/profile.jpg',
  1
) ON CONFLICT (email) DO NOTHING;

-- 2. 일반 회원 계정 생성 (연동 신청자)
INSERT INTO public.users (
  id,
  name,
  name_en,
  email,
  slug,
  type
) VALUES (
  gen_random_uuid(),
  '테스트 일반회원',
  'Test General User',
  'test.general@example.com',
  'test-general',
  'general'
) ON CONFLICT (email) DO NOTHING;

-- 3. 연동 신청 상태 확인
SELECT 
  u1.id as requester_id,
  u1.name as requester_name,
  u1.email as requester_email,
  u1.claim_user_id,
  u1.claim_status,
  u1.claim_reason,
  u2.name as claimed_dancer_name,
  u2.email as claimed_dancer_email
FROM public.users u1
LEFT JOIN public.users u2 ON u1.claim_user_id = u2.id
WHERE u1.claim_user_id IS NOT NULL;

-- 4. 모든 사용자 확인
SELECT id, name, email, type, claim_user_id, claim_status, claim_reason 
FROM public.users 
ORDER BY created_at DESC;