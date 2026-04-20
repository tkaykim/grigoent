'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'ko' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 번역 데이터
const translations = {
  ko: {
    // 네비게이션
    'nav.home': 'Home',
    'nav.about': 'About us',
    'nav.artists': 'Artists',
    'nav.works': 'Our Works',
    'nav.contact': 'Contact us',
    'nav.dancerApply': 'Agency',

    // 댄서 에이전시 풀 모집
    'applyDancer.pageTitle': '그리고 엔터테인먼트 댄서 에이전시 풀 모집',
    'applyDancer.title': '지원서 작성',
    'applyDancer.subtitle':
      '프로필·포트폴리오를 등록해 주시면 데이터베이스에 반영되며, 프로젝트 성격에 맞춰 개별 연락드립니다.',
    'applyDancer.noticeIntro':
      '그동안 전속 매니지먼트 형태로만 운영되던 그리고 엔터테인먼트가 쌓아온 인프라를 바탕으로 에이전시 사업 영역을 확장하게 되었습니다.\n\n광고, 방송, 안무 제작, 공연 섭외 등 다양한 프로젝트에서 함께 시너지를 낼 역량 있는 댄스팀·댄서분들의 프로필을 모집합니다.\n\n제출해 주신 정보는 데이터베이스로 구축되어, 각 프로젝트에 최적화된 매칭을 통해 개별적으로 연락드릴 예정입니다.',
    'applyDancer.noticeClosing':
      '현장의 목소리를 이해하고 댄서의 가치를 잘 아는 파트너로서, 여러분의 비즈니스 기회를 함께 만들어가고자 합니다.\n\n많은 관심과 지원 부탁드립니다.',
    'applyDancer.areaTitle': '1. 모집 영역',
    'applyDancer.areaAds': '광고 및 캠페인: 브랜드 CF, 바이럴 영상, 룩북 및 지면 모델 등',
    'applyDancer.areaBroadcast': '방송 및 미디어: TV 프로그램, 웹 예능, 뮤직비디오 출연 등',
    'applyDancer.areaChoreo': '안무 제작: 아티스트 안무 및 광고·기업 프로모션 안무 디렉팅',
    'applyDancer.areaLive': '공연 및 행사 섭외: 기업 행사, 페스티벌, 국내외 공연 프로젝트 등',
    'applyDancer.howTitle': '2. 지원 방법',
    'applyDancer.howBody':
      '접수처: 아래 양식의 프로필(포트폴리오) 링크와 본인·팀의 주요 경력(안무 제작, 출연 내역 등)을 기재해 주세요.',
    'applyDancer.processTitle': '3. 매칭 프로세스',
    'applyDancer.process1': '프로필 접수: 상시 데이터베이스 등록',
    'applyDancer.process2': '프로젝트 매칭: 클라이언트(제작사·광고주) 요청에 따른 매칭',
    'applyDancer.process3': '개별 연락: 프로젝트별 조건·일정 협의 후 섭외 연락',
    'applyDancer.signoff': '그리고 엔터테인먼트는 댄서분들이 본연의 퍼포먼스에 집중할 수 있는 환경을 제공하겠습니다. 감사합니다.',
    'applyDancer.privacy':
      '수집·이용 목적: 에이전시 풀 등록, 프로젝트 매칭 및 섭외 연락. 보유 기간: 목적 달성 후 지체 없이 파기하되, 관계 법령에 따라 보관이 필요한 경우 해당 기간까지 보관합니다. 동의하지 않을 경우 지원이 제한될 수 있습니다.',
    'applyDancer.fullName': '이름',
    'applyDancer.stageName': '활동명',
    'applyDancer.phone': '연락처',
    'applyDancer.birthDate': '생년월일',
    'applyDancer.gender': '성별',
    'applyDancer.genderMale': '남성',
    'applyDancer.genderFemale': '여성',
    'applyDancer.genderOther': '기타',
    'applyDancer.genderPreferNot': '비공개',
    'applyDancer.genderPlaceholder': '선택',
    'applyDancer.height': '키 (cm)',
    'applyDancer.heightHint': '숫자만 입력해 주세요.',
    'applyDancer.portfolio': '포트폴리오',
    'applyDancer.portfolioUrlLabel': '포트폴리오 링크 (선택)',
    'applyDancer.portfolioFileLabel': '포트폴리오 파일 첨부 (선택)',
    'applyDancer.portfolioHint': '노션, 구글 드라이브, SNS 등 접근 가능한 URL. https:// 가 없으면 자동으로 붙습니다.',
    'applyDancer.portfolioFileHint':
      'PDF, JPG, JPEG, PNG만 가능합니다. 최대 4MB입니다. 용량이 더 큰 경우 포트폴리오를 contact@grigoent.co.kr 로 메일로 보내 주세요.',
    'applyDancer.portfolioEitherHint': '링크와 파일 중 하나 이상을 제출해 주세요.',
    'applyDancer.errorPortfolioRequired': '포트폴리오 링크 또는 파일 중 하나는 필수입니다.',
    'applyDancer.errorPortfolioFileType': '허용 형식은 PDF, JPG, PNG만 가능합니다.',
    'applyDancer.errorPortfolioFileSize':
      '첨부 파일은 4MB 이하여야 합니다. 용량이 초과되는 경우 포트폴리오를 contact@grigoent.co.kr 로 보내 주세요.',
    'applyDancer.errorPortfolioUpload': '파일 업로드에 실패했습니다. 잠시 후 다시 시도하거나 링크만으로 제출해 보세요.',
    'applyDancer.instagram': '인스타그램 아이디',
    'applyDancer.instagramHint': '@ 없이 입력하거나 @를 포함해도 됩니다.',
    'applyDancer.agency': '소속사',
    'applyDancer.agencyHint': '소속이 없으면 비워 두시면 됩니다.',
    'applyDancer.nationalityLabel': '국적',
    'applyDancer.koreanNational': '대한민국 국적입니다',
    'applyDancer.foreignCountry': '국적(국가명)',
    'applyDancer.foreignCountryHint': '대한민국 국적이 아닌 경우 입력해 주세요.',
    'applyDancer.visaQuestion': '비자 유무',
    'applyDancer.visaYes': '있음',
    'applyDancer.visaNo': '없음',
    'applyDancer.visaDetails': '비자 정보 및 만료일',
    'applyDancer.visaDetailsHint': '비자 종류, 번호(선택), 만료일 등을 적어 주세요.',
    'applyDancer.careers': '주요 경력 사항',
    'applyDancer.careersHint':
      '안무 제작, 수업, 댄서 참여, 공연, 심사, 워크샵, 방송 출연, 광고 등 줄바꿈으로 구분해 적어 주세요.',
    'applyDancer.privacyConsent': '개인정보 수집·이용에 동의합니다',
    'applyDancer.termsTitle': '개인정보 수집·이용 안내',
    'applyDancer.termsBody':
      '수집 항목: 활동명, 이름, 연락처, 생년월일, 성별, 키, 경력, 포트폴리오 URL, 인스타그램, 소속사, 국적, 비자 관련 정보(해당 시). 이용 목적: 에이전시 풀 DB 구축, 프로젝트 매칭·섭외, 본인 확인 및 연락. 제3자 제공: 당사가 진행하는 프로젝트의 클라이언트(제작사·광고주 등)에게 매칭 목적으로 필요한 범위 내에서 제공될 수 있습니다. 이용 기간: 목적 달성 시까지이며, 관련 법령에 따른 보관 기간이 있는 경우 그에 따릅니다. 귀하는 동의를 거부할 수 있으나, 미동의 시 지원 접수가 불가합니다.',
    'applyDancer.cancel': '취소',
    'applyDancer.submit': '지원서 제출',
    'applyDancer.sending': '제출 중...',
    'applyDancer.success': '지원서가 접수되었습니다. 매칭 시 연락드리겠습니다.',
    'applyDancer.errorRequired': '필수 항목, 경력, 동의를 확인해 주세요. 외국 국적인 경우 비자 정보도 입력해 주세요.',
    'applyDancer.errorSubmit': '제출에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    'applyDancer.emailWarn': '접수는 완료되었으나 안내 메일 발송에 실패했을 수 있습니다.',
    'applyDancer.errorHeight': '키는 120~220 사이 숫자로 입력해 주세요.',
    'applyDancer.errorPortfolioUrl': '올바른 포트폴리오 URL을 입력해 주세요.',
    'applyDancer.errorForeignCountry': '국적(국가명)을 입력해 주세요.',
    'applyDancer.errorVisaDetails': '비자가 있는 경우 정보·만료일을 입력해 주세요.',
    'applyDancer.heroKicker': 'GRIGO ENTERTAINMENT',
    'applyDancer.sectionBasic': '기본 정보',
    'applyDancer.sectionProfile': '프로필 · 링크',
    'applyDancer.sectionVisa': '국적 · 비자',
    'applyDancer.sectionCareer': '경력',
    'applyDancer.requiredHint': '* 표시는 필수 항목입니다.',
    
    // 헤더
    'header.signin': 'Sign In',
    'header.signup': 'Sign Up',
    'header.mypage': 'My Page',
    'header.signout': 'Sign Out',
    'header.admin': 'Admin',
    
    // Hero Section
    'hero.main1': 'DANCE',
    'hero.main2': 'WITH',
    'hero.main3': 'PASSION',
    'hero.subtitle': '그리고 엔터테인먼트 // A GLOBAL DANCE COMPANY',
    
    // About Section
    'about.title': 'About Us',
    'about.subtitle': '글로벌 댄스 컴퍼니',
    'about.mission': '우리는 세계적인 안무가들과 댄서들을 연결하여\n혁신적이고 감동적인 공연을 만들어갑니다.',
    'about.stats.title': 'Our Numbers',
    'about.stats.projects': '프로젝트',
    'about.stats.artists': '아티스트',
    'about.stats.countries': '국가',
    'about.stats.years': '년 경력',
    'about.services.title': 'Our Services',
    'about.services.choreography': '안무 제작',
    'about.services.choreography.desc': '창의적이고 혁신적인 안무 제작',
    'about.services.casting': '댄서 섭외',
    'about.services.casting.desc': '최고의 댄서들과의 협업',
    'about.services.production': '공연 제작',
    'about.services.production.desc': '완벽한 공연 제작 및 연출',
    
    // Artists Section
    'artists.title': 'Our Artists',
    'artists.subtitle': '세계적인 안무가들과 댄서들',
    'artists.description': '최고의 실력과 창의성을 가진 아티스트들과 함께\n특별한 순간을 만들어보세요.',
    'artists.viewall': '전체 보기',
    'artists.loading': '로딩 중...',
    
    // Works Section
    'works.title': 'Our Works',
    'works.subtitle': '우리 댄서들이 참여한 다양한 프로젝트들을 확인해보세요.\n각각의 작품은 열정과 창의성이 담긴 결과물입니다.',
    'works.recently': 'Recently',
    'works.error.title': '데이터를 불러올 수 없습니다',
    'works.error.retry': '다시 시도',
    'works.refresh.loading': '새로고침 중...',
    'works.refresh.button': '새로고침',
    'works.services.kpop.title': 'K-POP & 앨범 안무제작',
    'works.services.kpop.desc': '아이돌 그룹, 솔로 아티스트의 타이틀곡 및 수록곡 안무 제작',
    'works.services.movie.title': '영화 & 광고 안무',
    'works.services.movie.desc': '영화, 드라마, 광고 CF 안무 제작 및 출연',
    'works.services.broadcast.title': '방송 & 행사 출연',
    'works.services.broadcast.desc': 'TV 프로그램, 콘서트, 행사 댄서 및 팀 섭외',
    'works.services.workshop.title': '해외 & 국내 워크샵',
    'works.services.workshop.desc': '전 세계 K-POP 댄스 레슨 및 워크샵 진행',
    'works.services.challenge.title': '댄스 챌린지',
    'works.services.challenge.desc': '제품, 공간, 앨범 홍보를 위한 댄스 챌린지 제작',
    'works.services.competition.title': '댄스 대회 & 행사',
    'works.services.competition.desc': '댄스 대회 주최, 운영 및 다양한 행사 기획',
    'works.empty.title': '아직 등록된 대표작이 없습니다',
    'works.empty.description': '댄서들이 대표작을 등록하면 여기에 표시됩니다.',
    
    // Contact Section
    'contact.title': 'Contact Us',
    'contact.subtitle': '프로젝트에 대해 문의하거나 댄서와의 협업을 원하시면\n언제든지 연락주세요.',
    'contact.getintouch': 'Get in Touch',
    'contact.address': '서울특별시 마포구 성지3길 55, 3층',
    'contact.company': '(주) 그리고 엔터테인먼트',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.businesshours': 'Business Hours',
    'contact.businesshours.weekday': '월-금: 9:00 AM - 6:00 PM',
    'contact.businesshours.weekend': '토-일: 10:00 AM - 4:00 PM',
    'contact.sendmessage': 'Send Message',
    'contact.form.title': '문의하기',
    'contact.form.name': '이름',
    'contact.form.contact': '이메일 또는 전화번호',
    'contact.form.inquiry': '문의사항',
    'contact.form.send': '문의 보내기',
    'contact.form.sending': '전송 중...',
    'contact.form.error.required': '모든 필드를 입력해주세요',
    'contact.form.error.invalid': '올바른 이메일 또는 전화번호를 입력해주세요',
    'contact.form.error.submission': '문의 제출에 실패했습니다',
    'contact.form.success': '문의가 성공적으로 전송되었습니다',
    'contact.form.error.general': '문의 전송 중 오류가 발생했습니다',
    
    // Footer
    'footer.company.name': '(주) 그리고 엔터테인먼트',
    'footer.description': '글로벌 댄스 컴퍼니로, 안무제작부터 댄서섭외까지 모든 것을 담당합니다.\n최고의 안무가들과 댄서들을 연결하여 세계적인 공연을 만들어갑니다.',
    'footer.quicklinks': 'Quick Links',
    'footer.report': '미수·정산 제보',
    'footer.contact': 'Contact',
    'footer.contact.email': 'contact@grigoent.co.kr',
    'footer.contact.phone': '+82) 02-6229-9229',
    'footer.contact.address2': '(주) 그리고 엔터테인먼트',
    'footer.copyright': '© 2024 (주) 그리고 엔터테인먼트. All rights reserved.',
    
    // Proposal
    'proposal.title': '프로젝트 제안',
    'proposal.subtitle': '프로젝트에 대한 제안을 보내주세요',
    'proposal.form.title': '프로젝트 제목',
    'proposal.form.description': '프로젝트 설명',
    'proposal.form.budget': '예산',
    'proposal.form.deadline': '마감일',
    'proposal.form.submit': '제안 보내기',
    'proposal.anonymous.title': '익명 제안',
    'proposal.anonymous.subtitle': '로그인 없이 제안을 보낼 수 있습니다',
    'proposal.anonymous.name': '이름',
    'proposal.anonymous.email': '이메일',
    'proposal.anonymous.phone': '전화번호',
    'proposal.anonymous.submit': '익명으로 제안하기',
    
    // General Proposal Section
    'proposal.general.title': '프로젝트 제안',
    'proposal.general.subtitle': '프로젝트 유형에 따라 적절한 제안 방법을 선택하세요',
    'proposal.general.individual.title': '개인 댄서',
    'proposal.general.individual.desc': '개인 댄서와의 협업을 원하시는 경우',
    'proposal.general.individual.button': '댄서 찾기',
    'proposal.general.team.title': '댄스 팀',
    'proposal.general.team.desc': '댄스 팀과의 협업을 원하시는 경우',
    'proposal.general.team.button': '팀 찾기',
    'proposal.general.general.title': '일반 제안',
    'proposal.general.general.desc': '기타 프로젝트 제안을 원하시는 경우',
    'proposal.general.general.button': '제안하기',
    
    // Common
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.success': '성공적으로 처리되었습니다',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About us',
    'nav.artists': 'Artists',
    'nav.works': 'Our Works',
    'nav.contact': 'Contact us',
    'nav.dancerApply': 'Agency',

    // Dancer agency pool
    'applyDancer.pageTitle': 'GRIGO Entertainment — dancer agency pool',
    'applyDancer.title': 'Application form',
    'applyDancer.subtitle':
      'Register your profile and portfolio for our database. We will contact you individually when projects match your profile.',
    'applyDancer.noticeIntro':
      'GRIGO Entertainment is expanding its agency services on the infrastructure we have built through exclusive management.\n\nWe are collecting profiles from capable dance teams and dancers for advertising, broadcast, choreography, and performance casting.\n\nSubmissions are stored in a database and used for optimized matching per project, and we will contact you individually.',
    'applyDancer.noticeClosing':
      'We understand the field and the value of dancers, and we want to build business opportunities together.\n\nThank you for your interest and applications.',
    'applyDancer.areaTitle': '1. Areas',
    'applyDancer.areaAds': 'Advertising & campaigns: brand CF, viral content, lookbooks, print, etc.',
    'applyDancer.areaBroadcast': 'Broadcast & media: TV, web shows, music videos, etc.',
    'applyDancer.areaChoreo': 'Choreography: artist choreography, commercial and corporate promo direction',
    'applyDancer.areaLive': 'Shows & events: corporate events, festivals, domestic and international performances',
    'applyDancer.howTitle': '2. How to apply',
    'applyDancer.howBody':
      'Submit a portfolio/profile link and your key credits (choreography, appearances, etc.) in the form below.',
    'applyDancer.processTitle': '3. Matching process',
    'applyDancer.process1': 'Profile intake: ongoing database registration',
    'applyDancer.process2': 'Project matching: based on client (production/advertiser) needs',
    'applyDancer.process3': 'Individual outreach: terms and schedule per project',
    'applyDancer.signoff':
      'GRIGO Entertainment will support an environment where dancers can focus on performance. Thank you.',
    'applyDancer.privacy':
      'Purpose: agency pool registration, matching, and casting contact. Data is deleted when no longer needed unless law requires retention.',
    'applyDancer.fullName': 'Legal name',
    'applyDancer.stageName': 'Stage / activity name',
    'applyDancer.phone': 'Phone',
    'applyDancer.birthDate': 'Date of birth',
    'applyDancer.gender': 'Gender',
    'applyDancer.genderMale': 'Male',
    'applyDancer.genderFemale': 'Female',
    'applyDancer.genderOther': 'Other',
    'applyDancer.genderPreferNot': 'Prefer not to say',
    'applyDancer.genderPlaceholder': 'Select',
    'applyDancer.height': 'Height (cm)',
    'applyDancer.heightHint': 'Numbers only.',
    'applyDancer.portfolio': 'Portfolio',
    'applyDancer.portfolioUrlLabel': 'Portfolio link (optional)',
    'applyDancer.portfolioFileLabel': 'Portfolio file (optional)',
    'applyDancer.portfolioHint':
      'A reachable URL (Notion, Drive, social, etc.). https:// will be added if missing.',
    'applyDancer.portfolioFileHint':
      'PDF, JPG, JPEG, or PNG only. Max 4MB. If your file is larger, email your portfolio to contact@grigoent.co.kr.',
    'applyDancer.portfolioEitherHint': 'Please provide at least one of a link or a file.',
    'applyDancer.errorPortfolioRequired': 'A portfolio link or file is required.',
    'applyDancer.errorPortfolioFileType': 'Only PDF, JPG, and PNG files are allowed.',
    'applyDancer.errorPortfolioFileSize':
      'Attachments must be 4MB or smaller. If the file exceeds the limit, send your portfolio to contact@grigoent.co.kr.',
    'applyDancer.errorPortfolioUpload': 'File upload failed. Try again later, or submit with a link only.',
    'applyDancer.instagram': 'Instagram handle',
    'applyDancer.instagramHint': 'With or without the @ symbol.',
    'applyDancer.agency': 'Agency',
    'applyDancer.agencyHint': 'Leave blank if independent.',
    'applyDancer.nationalityLabel': 'Nationality',
    'applyDancer.koreanNational': 'I am a national of the Republic of Korea',
    'applyDancer.foreignCountry': 'Nationality (country)',
    'applyDancer.foreignCountryHint': 'Required if you are not a Korean national.',
    'applyDancer.visaQuestion': 'Visa status',
    'applyDancer.visaYes': 'I have a valid visa',
    'applyDancer.visaNo': 'No visa',
    'applyDancer.visaDetails': 'Visa type and expiry',
    'applyDancer.visaDetailsHint': 'Visa category, expiry date, etc.',
    'applyDancer.careers': 'Key credits',
    'applyDancer.careersHint':
      'Choreography, teaching, dance credits, shows, judging, workshops, broadcast, ads — one item per line.',
    'applyDancer.privacyConsent': 'I agree to the collection and use of personal data',
    'applyDancer.termsTitle': 'Privacy notice',
    'applyDancer.termsBody':
      'Items collected: stage name, legal name, phone, DOB, gender, height, credits, portfolio URL, Instagram, agency, nationality, visa details if applicable. Purpose: agency pool, matching, casting, contact. Recipients: clients (production companies, advertisers, etc.) within the scope needed for matching. Retention: until the purpose is fulfilled or as required by law. You may refuse consent; without it, we cannot accept your application.',
    'applyDancer.cancel': 'Cancel',
    'applyDancer.submit': 'Submit application',
    'applyDancer.sending': 'Submitting...',
    'applyDancer.success': 'Your application has been received. We will contact you when there is a match.',
    'applyDancer.errorRequired':
      'Please complete required fields, credits, and consent. If not a Korean national, complete visa information.',
    'applyDancer.errorSubmit': 'Submission failed. Please try again shortly.',
    'applyDancer.emailWarn': 'Your application was saved, but the notification email may not have been sent.',
    'applyDancer.errorHeight': 'Please enter height between 120 and 220 cm.',
    'applyDancer.errorPortfolioUrl': 'Please enter a valid portfolio URL.',
    'applyDancer.errorForeignCountry': 'Please enter your nationality (country).',
    'applyDancer.errorVisaDetails': 'If you have a visa, please enter details including expiry.',
    'applyDancer.heroKicker': 'GRIGO ENTERTAINMENT',
    'applyDancer.sectionBasic': 'Basic information',
    'applyDancer.sectionProfile': 'Profile & links',
    'applyDancer.sectionVisa': 'Nationality & visa',
    'applyDancer.sectionCareer': 'Credits',
    'applyDancer.requiredHint': 'Fields marked with * are required.',
    
    // Header
    'header.signin': 'Sign In',
    'header.signup': 'Sign Up',
    'header.mypage': 'My Page',
    'header.signout': 'Sign Out',
    'header.admin': 'Admin',
    
    // Hero Section
    'hero.main1': 'DANCE',
    'hero.main2': 'WITH',
    'hero.main3': 'PASSION',
    'hero.subtitle': 'GRIGO ENTERTAINMENT // A GLOBAL DANCE COMPANY',
    
    // About Section
    'about.title': 'About Us',
    'about.subtitle': 'Global Dance Company',
    'about.mission': 'We connect world-class choreographers and dancers\nto create innovative and inspiring performances.',
    'about.stats.title': 'Our Numbers',
    'about.stats.projects': 'Projects',
    'about.stats.artists': 'Artists',
    'about.stats.countries': 'Countries',
    'about.stats.years': 'Years Experience',
    'about.services.title': 'Our Services',
    'about.services.choreography': 'Choreography',
    'about.services.choreography.desc': 'Creative and innovative choreography',
    'about.services.casting': 'Dancer Casting',
    'about.services.casting.desc': 'Collaboration with the best dancers',
    'about.services.production': 'Performance Production',
    'about.services.production.desc': 'Perfect performance production and direction',
    
    // Artists Section
    'artists.title': 'Our Artists',
    'artists.subtitle': 'World-class Choreographers and Dancers',
    'artists.description': 'Create special moments with artists who have\nthe best skills and creativity.',
    'artists.viewall': 'View All',
    'artists.loading': 'Loading...',
    
    // Works Section
    'works.title': 'Our Works',
    'works.subtitle': 'Discover various projects our dancers have participated in.\nEach work is a result filled with passion and creativity.',
    'works.recently': 'Recently',
    'works.error.title': 'Unable to load data',
    'works.error.retry': 'Try Again',
    'works.refresh.loading': 'Refreshing...',
    'works.refresh.button': 'Refresh',
    'works.services.kpop.title': 'K-POP & Album Choreography',
    'works.services.kpop.desc': 'Choreography for idol groups and solo artists\' title tracks and album songs',
    'works.services.movie.title': 'Film & Advertisement Choreography',
    'works.services.movie.desc': 'Choreography production and performance for films, dramas, and commercials',
    'works.services.broadcast.title': 'Broadcasting & Event Appearances',
    'works.services.broadcast.desc': 'Dancer and team casting for TV programs, concerts, and events',
    'works.services.workshop.title': 'International & Domestic Workshops',
    'works.services.workshop.desc': 'K-POP dance lessons and workshops worldwide',
    'works.services.challenge.title': 'Dance Challenges',
    'works.services.challenge.desc': 'Dance challenge production for product, space, and album promotion',
    'works.services.competition.title': 'Dance Competitions & Events',
    'works.services.competition.desc': 'Dance competition hosting, operation, and various event planning',
    'works.empty.title': 'No featured works yet',
    'works.empty.description': 'Featured works will appear here once dancers register them.',
    
    // Contact Section
    'contact.title': 'Contact Us',
    'contact.subtitle': 'Contact us anytime for project inquiries\nor collaboration with dancers.',
    'contact.getintouch': 'Get in Touch',
    'contact.address': '3F, 55, Seongji 3-gil, Mapo-gu, Seoul, Republic of Korea',
    'contact.company': 'GRIGO Entertainment Co., Ltd.',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.businesshours': 'Business Hours',
    'contact.businesshours.weekday': 'Mon-Fri: 9:00 AM - 6:00 PM',
    'contact.businesshours.weekend': 'Sat-Sun: 10:00 AM - 4:00 PM',
    'contact.sendmessage': 'Send Message',
    'contact.form.title': 'Contact Us',
    'contact.form.name': 'Name',
    'contact.form.contact': 'Email or Phone',
    'contact.form.inquiry': 'Inquiry',
    'contact.form.send': 'Send Inquiry',
    'contact.form.sending': 'Sending...',
    'contact.form.error.required': 'Please fill in all fields',
    'contact.form.error.invalid': 'Please enter a valid email or phone number',
    'contact.form.error.submission': 'Failed to submit inquiry',
    'contact.form.success': 'Inquiry sent successfully',
    'contact.form.error.general': 'An error occurred while sending the inquiry',
    
    // Footer
    'footer.company.name': 'GRIGO Entertainment Co., Ltd.',
    'footer.description': 'As a global dance company, we handle everything from choreography to dancer casting.\nWe connect the best choreographers and dancers to create world-class performances.',
    'footer.quicklinks': 'Quick Links',
    'footer.report': 'Unpaid settlement report',
    'footer.contact': 'Contact',
    'footer.contact.email': 'contact@grigoent.co.kr',
    'footer.contact.phone': '+82) 02-6229-9229',
    'footer.contact.address2': 'GRIGO Entertainment Co., Ltd.',
    'footer.copyright': '© 2024 GRIGO Entertainment. All rights reserved.',
    
    // Proposal
    'proposal.title': 'Project Proposal',
    'proposal.subtitle': 'Send us your project proposal',
    'proposal.form.title': 'Project Title',
    'proposal.form.description': 'Project Description',
    'proposal.form.budget': 'Budget',
    'proposal.form.deadline': 'Deadline',
    'proposal.form.submit': 'Send Proposal',
    'proposal.anonymous.title': 'Anonymous Proposal',
    'proposal.anonymous.subtitle': 'Send a proposal without logging in',
    'proposal.anonymous.name': 'Name',
    'proposal.anonymous.email': 'Email',
    'proposal.anonymous.phone': 'Phone',
    'proposal.anonymous.submit': 'Send Anonymous Proposal',
    
    // General Proposal Section
    'proposal.general.title': 'Project Proposal',
    'proposal.general.subtitle': 'Choose the appropriate proposal method based on your project type',
    'proposal.general.individual.title': 'Individual Dancer',
    'proposal.general.individual.desc': 'For collaboration with individual dancers',
    'proposal.general.individual.button': 'Find Dancer',
    'proposal.general.team.title': 'Dance Team',
    'proposal.general.team.desc': 'For collaboration with dance teams',
    'proposal.general.team.button': 'Find Team',
    'proposal.general.general.title': 'General Proposal',
    'proposal.general.general.desc': 'For other project proposals',
    'proposal.general.general.button': 'Send Proposal',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Successfully processed',
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ko')

  const t = (key: string): string => {
    return (translations[language] as Record<string, string>)[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
} 