export interface User {
  id: string
  name: string
  name_en: string
  email: string
  phone?: string
  profile_image?: string
  slug: string
  type: 'general' | 'dancer' | 'client' | 'manager' | 'admin'
  pending_type?: 'dancer' | 'client'
  display_order?: number
  introduction?: string
  instagram_url?: string
  twitter_url?: string
  youtube_url?: string
  created_at: string
  is_hidden?: boolean
  claim_user_id?: string
  claim_status?: 'pending' | 'approved' | 'rejected' | 'completed'
  claim_reason?: string
}

export interface CareerEntry {
  id: string;
  user_id: string;
  linked_user_id?: string; // 연동된 사용자 ID
  category: string;
  title: string;
  description?: string;
  country?: string;
  video_url?: string;
  poster_url?: string;
  start_date?: string;
  end_date?: string;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
  // 추가
  date_type?: 'single' | 'range';
  single_date?: string;
  // 새로운 연결 시스템
  is_linked?: boolean; // 연결된 데이터인지 여부
}

// 새로운 연결 시스템 타입들
export interface UserLink {
  id: string;
  primary_user_id: string;
  linked_user_id: string;
  link_type: 'career' | 'profile' | 'proposals' | 'teams' | 'all';
  created_at: string;
  updated_at: string;
}

export interface DataAccessPermission {
  id: string;
  user_id: string;
  data_type: 'career' | 'profile' | 'proposals' | 'teams';
  original_owner_id: string;
  access_level: 'read' | 'write' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface ConnectionStatus {
  id: string;
  requester_id: string;
  target_user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  connection_type: 'career' | 'profile' | 'proposals' | 'teams' | 'all';
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string
  client_id?: string // 익명 제안의 경우 null
  dancer_id: string
  title: string
  description: string
  project_type: 'choreography' | 'performance' | 'advertisement' | 'tv' | 'workshop' | 'other'
  budget_min?: number
  budget_max?: number
  start_date?: string
  end_date?: string
  location?: string
  requirements?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  updated_at: string
  client?: User
  dancer?: User
}

// 팀 관련 타입 정의
export interface Team {
  id: string
  name: string
  name_en: string
  slug: string
  description?: string
  logo_url?: string
  cover_image?: string
  leader_id?: string
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
  leader?: User
  member_count?: number
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'leader' | 'member' | 'invited'
  joined_at: string
  user?: User
  team?: Team
}

export interface TeamProject {
  id: string
  team_id: string
  title: string
  description?: string
  project_type: 'choreography' | 'performance' | 'advertisement' | 'tv' | 'workshop'
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled'
  start_date?: string
  end_date?: string
  budget_min?: number
  budget_max?: number
  created_at: string
  updated_at: string
  team?: Team
}

export interface TeamInvitation {
  id: string
  team_id: string
  inviter_id: string
  invitee_email: string
  role: 'member' | 'leader'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  created_at: string
  team?: Team
  inviter?: User
}

export interface TeamActivity {
  id: string
  team_id: string
  user_id?: string
  activity_type: 'member_joined' | 'member_left' | 'project_created' | 'project_updated' | 'invitation_sent' | 'invitation_accepted' | 'invitation_declined'
  description?: string
  metadata?: Record<string, any>
  created_at: string
  team?: Team
  user?: User
}

export interface ProposalMessage {
  id: string
  proposal_id: string
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
  sender?: User
}

export interface ProposalNotification {
  id: string
  user_id: string
  proposal_id: string
  type: 'new_proposal' | 'proposal_accepted' | 'proposal_rejected' | 'new_message'
  title: string
  message: string
  is_read: boolean
  created_at: string
  proposal?: Proposal
}

export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    name?: string
    name_en?: string
  }
}

export interface CareerCategory {
  value: string
  label: string
  placeholder: string
}

// 견적서 관련 타입 정의
export interface QuoteItem {
  name: string
  category?: string
  qty: number
  unit: string
  unit_price: number
  amount: number
}

export interface Quote {
  id: string
  inquiry_id: string | null
  client_name: string
  client_email: string
  client_phone: string
  client_company: string
  project_title: string
  project_type: string
  items: QuoteItem[]
  supply_amount: number
  vat: number
  total_amount: number
  valid_until: string
  notes: string
  status: 'draft' | 'sent'
  sent_at: string | null
  view_token: string | null
  client_response: 'pending' | 'approved' | 'revision_requested' | 'rejected' | null
  client_response_at: string | null
  client_response_note: string | null
  created_at: string
}

export const QUOTE_ITEM_PRESETS: { category: string; label: string; items: string[] }[] = [
  {
    category: 'dancer_casting',
    label: '댄서섭외비',
    items: ['백업댄서', '메인댄서', '안무시안 댄서', '모션캡쳐 댄서']
  },
  {
    category: 'choreography',
    label: '안무제작비',
    items: ['타이틀곡 안무', 'B-side 안무', '광고 안무', '행사 안무', '뮤직비디오 안무']
  },
  {
    category: 'rehearsal',
    label: '리허설비',
    items: ['연습실 대관', '리허설 진행비']
  },
  {
    category: 'travel',
    label: '교통/숙박비',
    items: ['교통비', '숙박비', '해외 출장비']
  },
  {
    category: 'costume',
    label: '의상/소품비',
    items: ['의상 제작', '의상 대여', '소품 준비']
  },
  {
    category: 'video',
    label: '영상촬영비',
    items: ['촬영 비용', '편집 비용', '뮤직비디오 제작']
  },
  {
    category: 'other',
    label: '기타',
    items: ['디렉팅비', '워크샵 진행비', '기타']
  }
]

export const PROJECT_TYPES = [
  { value: 'choreography', label: '안무제작' },
  { value: 'dancer_casting', label: '댄서섭외' },
  { value: 'music_video', label: '뮤직비디오' },
  { value: 'advertisement', label: '광고' },
  { value: 'concert', label: '콘서트/공연' },
  { value: 'event', label: '행사' },
  { value: 'workshop', label: '워크샵/레슨' },
  { value: 'other', label: '기타' }
]

export const CAREER_CATEGORIES: CareerCategory[] = [
  {
    value: 'choreography',
    label: '안무제작이력',
    placeholder: '예: 아이돌 그룹 OO 타이틀곡 안무'
  },
  {
    value: 'performance',
    label: '댄서참여이력',
    placeholder: '예: OO 콘서트 메인 댄서 참여'
  },
  {
    value: 'advertisement',
    label: '광고진행이력',
    placeholder: '예: OO 브랜드 CF 안무 및 출연'
  },
  {
    value: 'tv',
    label: 'TV프로그램 진행이력',
    placeholder: '예: OO 방송 댄스 프로그램 출연'
  },
  {
    value: 'workshop',
    label: '워크샵 진행이력',
    placeholder: '예: OO 아카데미 K-POP 워크샵 진행'
  }
] 