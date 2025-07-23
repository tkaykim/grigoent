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
}

export interface CareerEntry {
  id: string
  user_id: string
  category: 'choreography' | 'performance' | 'advertisement' | 'tv' | 'workshop'
  title: string
  video_url?: string
  poster_url?: string
  is_featured: boolean
  description?: string
  country: string
  start_date?: string
  end_date?: string
  created_at: string
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