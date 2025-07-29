# 사용자 권한 및 기능 접근 규칙

## 1. 사용자 타입별 권한 체계

### 1.1 사용자 타입 정의
```typescript
type UserType = 'general' | 'dancer' | 'client' | 'manager' | 'admin'
```

### 1.2 각 타입별 기본 권한

#### 🔵 General (일반 사용자)
- **기본 권한**: 읽기 전용
- **접근 가능 기능**:
  - 홈페이지 조회
  - 아티스트 목록 조회
  - 팀 목록 조회
  - 개인 프로필 조회
- **제한 기능**:
  - 모든 수정 기능 제한
  - 제안서 작성 불가
  - 팀 생성/관리 불가

#### 🎭 Dancer (댄서)
- **기본 권한**: 본인 프로필 관리 + 제안서 수신
- **접근 가능 기능**:
  - 본인 프로필 수정
  - 본인 경력 관리 (추가/수정/삭제)
  - 받은 제안서 조회/응답
  - 팀 참여/탈퇴
  - 본인 포트폴리오 관리
- **제한 기능**:
  - 다른 사용자 프로필 수정 불가
  - 제안서 작성 불가 (클라이언트만 가능)
  - 팀 생성 불가 (매니저/관리자만 가능)

#### 💼 Client (클라이언트)
- **기본 권한**: 제안서 작성 + 본인 프로필 관리
- **접근 가능 기능**:
  - 본인 프로필 수정
  - 아티스트에게 제안서 작성
  - 본인 제안서 관리 (수정/삭제)
  - 제안서 상태 조회
- **제한 기능**:
  - 다른 사용자 프로필 수정 불가
  - 경력 관리 불가 (댄서만 가능)
  - 팀 관리 불가

#### 👔 Manager (매니저)
- **기본 권한**: 팀 관리 + 제한된 관리 기능
- **접근 가능 기능**:
  - 팀 생성/관리
  - 팀 멤버 초대/관리
  - 본인 프로필 관리
  - 팀 프로젝트 관리
  - 제안서 작성/수신
- **제한 기능**:
  - 전체 시스템 관리 불가
  - 사용자 승인/거절 불가

#### 🔴 Admin (관리자)
- **기본 권한**: 전체 시스템 관리
- **접근 가능 기능**:
  - 모든 사용자 관리
  - 사용자 승인/거절
  - 아티스트 순서 관리
  - 시스템 설정 관리
  - 모든 데이터 조회/수정
  - 통계 및 분석

## 2. 기능별 접근 권한 규칙

### 2.1 프로필 관리 권한

#### 본인 프로필 수정
```typescript
const canEditOwnProfile = (currentUser: User, targetUserId: string) => {
  return currentUser.id === targetUserId
}
```

#### 다른 사용자 프로필 수정
```typescript
const canEditOtherProfile = (currentUser: User, targetUserId: string) => {
  return currentUser.type === 'admin'
}
```

#### 프로필 조회
```typescript
const canViewProfile = (currentUser: User | null, targetUserId: string) => {
  // 모든 사용자가 모든 프로필 조회 가능
  return true
}
```

### 2.2 경력 관리 권한

#### 경력 추가/수정/삭제
```typescript
const canManageCareer = (currentUser: User, careerUserId: string) => {
  return currentUser.id === careerUserId || currentUser.type === 'admin'
}
```

#### 경력 조회
```typescript
const canViewCareer = (currentUser: User | null, careerUserId: string) => {
  // 모든 사용자가 모든 경력 조회 가능
  return true
}
```

### 2.3 제안서 관리 권한

#### 제안서 작성
```typescript
const canCreateProposal = (currentUser: User) => {
  return ['client', 'admin'].includes(currentUser.type)
}
```

#### 제안서 수정/삭제
```typescript
const canEditProposal = (currentUser: User, proposal: Proposal) => {
  return (
    currentUser.id === proposal.client_id || 
    currentUser.type === 'admin'
  )
}
```

#### 제안서 조회
```typescript
const canViewProposal = (currentUser: User, proposal: Proposal) => {
  return (
    currentUser.id === proposal.client_id ||
    currentUser.id === proposal.dancer_id ||
    currentUser.type === 'admin'
  )
}
```

### 2.4 팀 관리 권한

#### 팀 생성
```typescript
const canCreateTeam = (currentUser: User) => {
  return ['manager', 'admin'].includes(currentUser.type)
}
```

#### 팀 수정/삭제
```typescript
const canEditTeam = (currentUser: User, team: Team) => {
  return (
    currentUser.id === team.leader_id ||
    currentUser.type === 'admin'
  )
}
```

#### 팀 멤버 관리
```typescript
const canManageTeamMembers = (currentUser: User, team: Team) => {
  return (
    currentUser.id === team.leader_id ||
    currentUser.type === 'admin'
  )
}
```

### 2.5 관리자 전용 기능

#### 사용자 승인/거절
```typescript
const canApproveUsers = (currentUser: User) => {
  return currentUser.type === 'admin'
}
```

#### 아티스트 순서 관리
```typescript
const canManageArtistOrder = (currentUser: User) => {
  return currentUser.type === 'admin'
}
```

#### 시스템 통계 조회
```typescript
const canViewSystemStats = (currentUser: User) => {
  return currentUser.type === 'admin'
}
```

## 3. 권한 확인 유틸리티 함수

### 3.1 권한 확인 훅
```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { profile } = useAuth()
  
  const isAdmin = () => profile?.type === 'admin'
  const isManager = () => profile?.type === 'manager'
  const isDancer = () => profile?.type === 'dancer'
  const isClient = () => profile?.type === 'client'
  
  const canEditProfile = (targetUserId: string) => {
    if (!profile) return false
    return profile.id === targetUserId || profile.type === 'admin'
  }
  
  const canManageCareer = (careerUserId: string) => {
    if (!profile) return false
    return profile.id === careerUserId || profile.type === 'admin'
  }
  
  const canCreateProposal = () => {
    if (!profile) return false
    return ['client', 'admin'].includes(profile.type)
  }
  
  const canManageTeam = (team: Team) => {
    if (!profile) return false
    return profile.id === team.leader_id || profile.type === 'admin'
  }
  
  return {
    isAdmin,
    isManager,
    isDancer,
    isClient,
    canEditProfile,
    canManageCareer,
    canCreateProposal,
    canManageTeam
  }
}
```

### 3.2 권한 컴포넌트
```typescript
// components/PermissionGate.tsx
interface PermissionGateProps {
  children: React.ReactNode
  condition: boolean
  fallback?: React.ReactNode
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  condition,
  fallback = null
}) => {
  return condition ? <>{children}</> : <>{fallback}</>
}
```

## 4. 데이터베이스 RLS 정책

### 4.1 Users 테이블 정책
```sql
-- 모든 사용자 조회 가능
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- 본인 프로필 수정 가능
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 관리자는 모든 사용자 수정 가능
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );
```

### 4.2 Career Entries 테이블 정책
```sql
-- 모든 경력 조회 가능
CREATE POLICY "Anyone can view career entries" ON career_entries
  FOR SELECT USING (true);

-- 본인 경력 관리 가능
CREATE POLICY "Users can manage own career" ON career_entries
  FOR ALL USING (auth.uid() = user_id);

-- 관리자는 모든 경력 관리 가능
CREATE POLICY "Admins can manage all careers" ON career_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );
```

### 4.3 Proposals 테이블 정책
```sql
-- 제안서 관련자만 조회 가능
CREATE POLICY "Proposal participants can view" ON proposals
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = dancer_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );

-- 클라이언트와 관리자만 제안서 생성 가능
CREATE POLICY "Clients and admins can create proposals" ON proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type IN ('client', 'admin')
    )
  );

-- 제안서 작성자와 관리자만 수정 가능
CREATE POLICY "Proposal creators and admins can update" ON proposals
  FOR UPDATE USING (
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND type = 'admin'
    )
  );
```

## 5. 컴포넌트별 권한 적용 예시

### 5.1 프로필 편집 버튼
```typescript
const ProfileEditButton = ({ userId }: { userId: string }) => {
  const { canEditProfile } = usePermissions()
  
  if (!canEditProfile(userId)) {
    return null
  }
  
  return <Button>프로필 편집</Button>
}
```

### 5.2 경력 관리 섹션
```typescript
const CareerManagement = ({ userId }: { userId: string }) => {
  const { canManageCareer } = usePermissions()
  
  return (
    <PermissionGate condition={canManageCareer(userId)}>
      <CareerForm userId={userId} />
    </PermissionGate>
  )
}
```

### 5.3 관리자 전용 기능
```typescript
const AdminOnlySection = () => {
  const { isAdmin } = usePermissions()
  
  return (
    <PermissionGate condition={isAdmin()}>
      <AdminDashboard />
    </PermissionGate>
  )
}
```

## 6. 보안 고려사항

### 6.1 클라이언트 사이드 검증
- UI에서 권한에 따라 기능 숨김/비활성화
- 사용자 경험 개선을 위한 사전 검증

### 6.2 서버 사이드 검증
- 모든 API 엔드포인트에서 권한 재검증
- 데이터베이스 RLS 정책으로 최종 보안

### 6.3 권한 상승 방지
- 관리자 권한이 필요한 작업은 항상 서버에서 재확인
- 클라이언트에서 전송된 권한 정보 신뢰하지 않음

## 7. 권한 변경 시 고려사항

### 7.1 사용자 타입 변경
- 기존 권한이 있는 데이터에 대한 접근 권한 재검토
- 진행 중인 작업들의 상태 확인

### 7.2 새로운 기능 추가
- 새로운 권한 규칙 정의
- 기존 사용자들에게 미치는 영향 검토
- 데이터베이스 정책 업데이트

### 7.3 권한 테스트
- 각 사용자 타입별로 모든 기능 테스트
- 권한 경계 조건 테스트
- 보안 취약점 검사

## 8. 권한 관리 모니터링

### 8.1 로그 기록
- 권한 관련 작업 로그
- 권한 거부 시도 기록
- 관리자 작업 기록

### 8.2 알림 시스템
- 권한 변경 시 관련자 알림
- 권한 오류 발생 시 관리자 알림
- 보안 이벤트 알림

이 문서는 시스템의 권한 체계를 명확히 정의하고, 개발자들이 일관된 방식으로 권한을 구현할 수 있도록 도와줍니다.