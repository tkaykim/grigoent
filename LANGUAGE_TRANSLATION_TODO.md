# 한/영 전환 기능 적용 투두리스트

## 📋 전체 작업 계획

### Phase 1: 기본 구조 및 레이아웃 컴포넌트
- [x] 1. LanguageToggle 컴포넌트 개선
- [x] 2. Header 컴포넌트 번역 적용
- [x] 3. Footer 컴포넌트 번역 적용
- [x] 4. Layout 컴포넌트 번역 적용

### Phase 2: 홈페이지 컴포넌트
- [x] 5. HeroSection 컴포넌트 번역 적용
- [x] 6. AboutSection 컴포넌트 번역 적용
- [x] 7. ArtistsSection 컴포넌트 번역 적용
- [x] 8. WorksSection 컴포넌트 번역 적용
- [x] 9. ContactSection 컴포넌트 번역 적용
- [x] 10. GeneralProposalSection 컴포넌트 번역 적용

### Phase 3: 인증 관련 컴포넌트
- [x] 11. SigninForm 컴포넌트 번역 적용
- [x] 12. SignupForm 컴포넌트 번역 적용
- [x] 13. LoginStatus 컴포넌트 번역 적용

### Phase 4: 아티스트 관련 컴포넌트
- [ ] 14. ArtistSearch 컴포넌트 번역 적용
- [ ] 15. CareerCard 컴포넌트 번역 적용
- [ ] 16. CareerSearch 컴포넌트 번역 적용
- [ ] 17. CareerVideoModal 컴포넌트 번역 적용
- [ ] 18. TeamCard 컴포넌트 번역 적용
- [ ] 19. ArtistTeamOrderManager 컴포넌트 번역 적용

### Phase 5: 제안 관련 컴포넌트
- [ ] 20. ProposalButton 컴포넌트 번역 적용
- [ ] 21. ProposalForm 컴포넌트 번역 적용
- [ ] 22. ProposalModal 컴포넌트 번역 적용
- [ ] 23. TeamProposalButton 컴포넌트 번역 적용
- [ ] 24. TeamProposalForm 컴포넌트 번역 적용
- [ ] 25. TeamProposalModal 컴포넌트 번역 적용
- [ ] 26. AnonymousProposalForm 컴포넌트 번역 적용
- [ ] 27. AnonymousProposalModal 컴포넌트 번역 적용
- [ ] 28. AnonymousTeamProposalForm 컴포넌트 번역 적용
- [ ] 29. AnonymousTeamProposalModal 컴포넌트 번역 적용
- [ ] 30. ClaimRequestModal 컴포넌트 번역 적용
- [ ] 31. DirectLinkModal 컴포넌트 번역 적용
- [ ] 32. ProjectMessages 컴포넌트 번역 적용
- [ ] 33. ProjectStatusBadge 컴포넌트 번역 적용
- [ ] 34. ProjectStatusUpdate 컴포넌트 번역 적용
- [ ] 35. ProjectTimeline 컴포넌트 번역 적용
- [ ] 36. ProposalTypeInfo 컴포넌트 번역 적용

### Phase 6: 대시보드 컴포넌트
- [ ] 37. UserDashboard 컴포넌트 번역 적용
- [ ] 38. DancerDashboard 컴포넌트 번역 적용
- [ ] 39. AdminDashboard 컴포넌트 번역 적용
- [ ] 40. SEOSettingsManager 컴포넌트 번역 적용

### Phase 7: 알림 관련 컴포넌트
- [ ] 41. NotificationBell 컴포넌트 번역 적용
- [ ] 42. NotificationDropdown 컴포넌트 번역 적용

### Phase 8: UI 컴포넌트
- [ ] 43. ProfileImageUpload 컴포넌트 번역 적용
- [ ] 44. BudgetInput 컴포넌트 번역 적용
- [ ] 45. ImageCropper 컴포넌트 번역 적용

### Phase 9: 페이지 컴포넌트
- [ ] 46. 메인 페이지 (page.tsx) 번역 적용
- [ ] 47. 아티스트 페이지 (artists/page.tsx) 번역 적용
- [ ] 48. 팀 페이지 (teams/page.tsx) 번역 적용
- [ ] 49. 팀 생성 페이지 (teams/create/page.tsx) 번역 적용
- [ ] 50. 팀 상세 페이지 (teams/[slug]/page.tsx) 번역 적용
- [ ] 51. 아티스트 상세 페이지 ([slug]/page.tsx) 번역 적용
- [ ] 52. 로그인 페이지 (signin/page.tsx) 번역 적용
- [ ] 53. 회원가입 페이지 (signup/page.tsx) 번역 적용
- [ ] 54. 마이페이지 (mypage/page.tsx) 번역 적용
- [ ] 55. 연동 신청 페이지 (mypage/claim/page.tsx) 번역 적용
- [ ] 56. 제안 페이지 (proposals/page.tsx) 번역 적용
- [ ] 57. 일반 제안 페이지 (proposals/general/page.tsx) 번역 적용
- [ ] 58. 관리자 페이지 (admin/page.tsx) 번역 적용
- [ ] 59. 관리자 제안 관리 페이지 (admin/claims/page.tsx) 번역 적용

### Phase 10: 검증 및 테스트
- [ ] 60. 모든 페이지에서 언어 전환 테스트
- [ ] 61. 번역 누락된 텍스트 확인 및 추가
- [ ] 62. 언어 전환 시 상태 유지 확인
- [ ] 63. 모바일 반응형에서 언어 전환 확인

## 🎯 현재 진행 상황
- Phase 1 완료 ✅
- Phase 2 완료 ✅
- Phase 3 시작 예정

## 📝 작업 방법
1. 각 컴포넌트/페이지를 하나씩 선택
2. 해당 파일에서 하드코딩된 텍스트 찾기
3. LanguageContext의 t() 함수로 교체
4. 번역 키가 없는 경우 LanguageContext에 추가
5. 테스트 후 다음 항목으로 진행

## ⚠️ 주의사항
- 한 번에 하나씩만 작업
- 각 작업 후 테스트 필수
- 번역 키는 의미있게 명명
- 한국어와 영어 번역 모두 확인 