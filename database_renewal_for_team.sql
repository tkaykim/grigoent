-- 팀 기능을 위한 데이터베이스 스키마 추가
-- 기존 테이블 구조는 유지하고 새로운 테이블들만 추가

-- 1. 팀 테이블
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image TEXT,
  leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 팀 멤버 테이블
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('leader', 'member', 'invited')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. 팀 프로젝트 테이블
CREATE TABLE team_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT CHECK (project_type IN ('choreography', 'performance', 'advertisement', 'tv', 'workshop')),
  status TEXT CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  budget_min INTEGER,
  budget_max INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 팀 초대 테이블
CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT CHECK (role IN ('member', 'leader')) DEFAULT 'member',
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 팀 활동 로그 테이블 (선택사항 - 향후 확장용)
CREATE TABLE team_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT CHECK (activity_type IN ('member_joined', 'member_left', 'project_created', 'project_updated', 'invitation_sent', 'invitation_accepted', 'invitation_declined')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 슬러그 자동 생성을 위한 함수 (팀용)
CREATE OR REPLACE FUNCTION generate_unique_team_slug(base_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  new_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM teams WHERE slug = new_slug) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- 팀 슬러그 자동 생성 트리거
CREATE OR REPLACE FUNCTION set_team_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_team_slug(lower(regexp_replace(NEW.name_en, '[^a-zA-Z0-9]', '-', 'g')));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_team_slug
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_team_slug();

-- updated_at 자동 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- teams 테이블의 updated_at 자동 업데이트 트리거
CREATE TRIGGER trigger_update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- team_projects 테이블의 updated_at 자동 업데이트 트리거
CREATE TRIGGER trigger_update_team_projects_updated_at
  BEFORE UPDATE ON team_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 설정
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;

-- teams 테이블 정책
CREATE POLICY "Anyone can view active teams" ON teams
  FOR SELECT USING (status = 'active');

CREATE POLICY "Team leaders can update their teams" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid() 
      AND role = 'leader'
    )
  );

CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- team_members 테이블 정책
CREATE POLICY "Team members can view their team members" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm2 
      WHERE tm2.team_id = team_members.team_id 
      AND tm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm2 
      WHERE tm2.team_id = team_members.team_id 
      AND tm2.user_id = auth.uid() 
      AND tm2.role = 'leader'
    )
  );

CREATE POLICY "Users can view their own team memberships" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- team_projects 테이블 정책
CREATE POLICY "Team members can view team projects" ON team_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_projects.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can manage team projects" ON team_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_projects.team_id 
      AND user_id = auth.uid() 
      AND role = 'leader'
    )
  );

-- team_invitations 테이블 정책
CREATE POLICY "Users can view invitations sent to them" ON team_invitations
  FOR SELECT USING (
    invitee_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can send invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_invitations.team_id 
      AND user_id = auth.uid() 
      AND role = 'leader'
    )
  );

CREATE POLICY "Users can respond to their invitations" ON team_invitations
  FOR UPDATE USING (
    invitee_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

-- team_activities 테이블 정책
CREATE POLICY "Team members can view team activities" ON team_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_activities.team_id 
      AND user_id = auth.uid()
    )
  );

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_leader_id ON teams(leader_id);
CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_projects_team_id ON team_projects(team_id);
CREATE INDEX idx_team_projects_status ON team_projects(status);
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_invitee_email ON team_invitations(invitee_email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_activities_team_id ON team_activities(team_id);
CREATE INDEX idx_team_activities_created_at ON team_activities(created_at); 