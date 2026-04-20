'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Language = 'ko' | 'en' | 'ja'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'grigo:lang'
const SUPPORTED: Language[] = ['ko', 'en', 'ja']

function readInitialLang(): Language {
  if (typeof window === 'undefined') return 'ko'
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v && (SUPPORTED as string[]).includes(v)) return v as Language
  } catch {
    /* ignore */
  }
  return 'ko'
}

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
      '안무 제작, 수업, 댄서 참여, 공연, 심사, 워크샵, 방송 출연, 광고 등 자유롭게 적어 주세요. 줄바꿈으로 구분하거나 한 번에 붙여 넣어도 됩니다.',
    'applyDancer.portfolioOptional': '(선택)',
    'applyDancer.privacyConsent': '위 이용약관 및 개인정보 처리방침 전체 내용을 확인하였으며 이에 모두 동의합니다',
    'applyDancer.termsTitle': '이용약관 및 개인정보처리방침',
    'applyDancer.termsBody': '본 약관과 개인정보처리방침은 그리고 엔터테인먼트가 제공하는 댄서 에이전시 풀 서비스에 적용됩니다.',
    'applyDancer.tosTitle': '이용약관',
    'applyDancer.tosShort':
      '본 약관은 그리고 엔터테인먼트가 제공하는 댄서 에이전시 풀 서비스 이용 조건을 규정합니다. 지원서 제출 시 본 약관에 동의한 것으로 간주되며, 허위 정보 기재 및 서비스 정보의 무단 상업적 이용은 금지됩니다. 에이전시 풀 등록은 특정 프로젝트 계약 또는 보수를 보장하지 않습니다.',
    'applyDancer.tosFull':
      '제1조 (목적)\n본 약관은 그리고 엔터테인먼트(이하 "회사")가 운영하는 댄서 에이전시 풀 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무에 관한 사항을 규정함을 목적으로 합니다.\n\n제2조 (서비스 내용)\n① 회사는 지원자의 프로필을 에이전시 풀 데이터베이스에 등록하고, 적합한 프로젝트(공연, MV, 광고, 방송 등)와 매칭하는 서비스를 제공합니다.\n② 에이전시 풀 등록이 특정 프로젝트 계약 또는 보수를 보장하지 않습니다.\n③ 회사는 서비스 내용 및 운영 방식을 14일 전 사전 고지 후 변경하거나 종료할 수 있습니다.\n\n제3조 (이용자의 의무)\n① 이용자는 지원서에 사실에 부합하는 정확한 정보를 기재하여야 합니다. 허위 또는 타인의 정보를 사용한 경우 발생하는 불이익에 대한 책임은 이용자 본인에게 있습니다.\n② 이용자는 회사의 사전 서면 동의 없이 서비스를 통해 얻은 정보를 상업적 목적으로 이용하거나 제3자에게 제공하여서는 안 됩니다.\n③ 이용자는 관련 법령, 본 약관, 서비스 이용 가이드를 준수하여야 합니다.\n\n제4조 (제출 자료의 권리)\n① 이용자가 제출한 프로필 사진, 포트폴리오 등의 저작권은 이용자 본인에게 귀속됩니다.\n② 이용자는 회사에게 서비스 운영 및 프로젝트 매칭 목적으로 해당 자료를 사용·저장·전시·전송할 수 있는 비독점적 무상 라이선스를 부여합니다.\n③ 이용자가 개인정보 삭제를 요청하면 회사는 관련 법령이 정한 보유 기간 만료 후 해당 자료를 삭제합니다.\n\n제5조 (면책조항)\n① 회사는 천재지변, 시스템 오류, 기타 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.\n② 회사는 이용자와 클라이언트 간 계약 이행, 분쟁 또는 손해에 대해 직접적인 책임을 지지 않습니다.\n\n제6조 (준거법 및 분쟁해결)\n본 약관은 대한민국 법률에 따라 해석됩니다. 서비스 이용과 관련하여 분쟁이 발생할 경우 서울중앙지방법원을 제1심 합의관할 법원으로 합니다.\n\n시행일: 2025년 1월 1일',
    'applyDancer.ppTitle': '개인정보처리방침',
    'applyDancer.ppShort':
      '활동명·이름·연락처·경력 등 지원 관련 정보를 수집하여 에이전시 풀 등록 및 프로젝트 매칭 목적으로 이용합니다. 수집일로부터 3년간 보유하며, 이용자는 언제든지 열람·수정·삭제·동의 철회를 요청할 수 있습니다 (contact@grigoent.co.kr).',
    'applyDancer.ppFull':
      '그리고 엔터테인먼트(이하 "회사")는 「개인정보 보호법」 및 관계 법령에 따라 이용자의 개인정보를 보호합니다.\n\n1. 수집하는 개인정보 항목\n[필수] 활동명, 성명, 이메일, 휴대폰 번호, 생년월일, 성별, 신장(cm), 거주 지역, 전문 장르, 프로필 사진, 포트폴리오(URL 또는 파일), 인스타그램 아이디, 경력 사항\n[선택] 소속사명, 국적, 비자 정보(외국 국적인 경우)\n\n2. 개인정보의 수집·이용 목적\n· 에이전시 풀 데이터베이스 구축 및 관리\n· 공고·프로젝트 매칭 및 섭외 연락\n· 계약 체결 시 본인 확인\n· 서비스 공지사항 및 업데이트 안내\n· 통계 분석 및 서비스 개선 (비식별 처리 후 활용)\n\n3. 개인정보 보유 및 이용 기간\n수집일로부터 3년 또는 이용자의 삭제 요청 시까지 보유합니다. 관계 법령에 별도 규정이 있는 경우 해당 기간 동안 보유합니다.\n· 전자상거래 소비자보호법: 계약·청약철회 기록 5년\n· 통신비밀보호법: 서비스 이용 로그 3개월\n\n4. 개인정보의 제3자 제공\n회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 아래의 경우는 예외입니다.\n· 이용자가 사전에 동의한 경우\n· 관계 법령에 따라 기관이 요청한 경우\n· 프로젝트 매칭 시 해당 클라이언트(제작사, 광고주 등)에게 활동명·경력·포트폴리오를 한정 제공하며, 제공 전 이용자에게 고지합니다.\n\n5. 개인정보 처리 위탁\n· 데이터 저장·인프라: Supabase Inc. (미국)\n· 이메일 발송: 이메일 서비스 제공업체\n\n6. 정보 주체의 권리\n이용자는 언제든지 다음 권리를 행사할 수 있습니다.\n· 개인정보 열람·정정·삭제 요청\n· 처리 정지 요청 및 동의 철회\n→ 요청 방법: contact@grigoent.co.kr 또는 홈페이지 문의\n처리 기한: 요청 접수 후 10영업일 이내\n\n7. 개인정보 보호 책임자\n담당: GRIGO ENTERTAINMENT 개인정보 보호팀\n이메일: contact@grigoent.co.kr\n개인정보 침해 신고·상담: 개인정보침해신고센터 118 (privacy.kisa.or.kr)\n\n시행일: 2025년 1월 1일',
    'applyDancer.showMore': '더보기',
    'applyDancer.showLess': '간단히 보기',
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
    'applyDancer.email': '이메일',
    'applyDancer.emailHint': '계약·공고 안내는 이메일로 발송됩니다.',
    'applyDancer.errorEmail': '올바른 이메일을 입력해 주세요.',
    'applyDancer.residenceRegion': '거주 지역',
    'applyDancer.residenceRegionHint': '촬영·리허설 위치 매칭에 사용됩니다.',
    'applyDancer.residenceRegionPlaceholder': '시/도 선택',
    'applyDancer.specialties': '전문 장르',
    'applyDancer.specialtiesHint': '1개 이상 선택해 주세요. (최대 10개)',
    'applyDancer.errorSpecialties': '전문 장르를 1개 이상 선택해 주세요.',
    'applyDancer.profilePhoto': '프로필 사진',
    'applyDancer.profilePhotoHint': 'JPG/PNG/WebP · 3MB 이하. 얼굴이 명확히 보이는 사진을 권장합니다.',
    'applyDancer.profilePhotoReplace': '사진 변경',
    'applyDancer.profilePhotoSelect': '사진 선택',
    'applyDancer.errorProfilePhoto': '프로필 사진을 선택해 주세요.',
    'applyDancer.errorProfilePhotoSize': '프로필 사진은 3MB 이하여야 합니다.',
    'applyDancer.errorProfilePhotoType': '프로필 사진은 JPG/PNG/WebP 형식만 가능합니다.',
    'applyDancer.stepLabel': '단계',
    'applyDancer.step1': '기본',
    'applyDancer.step2': '프로필',
    'applyDancer.step3': '국적·비자',
    'applyDancer.step4': '경력·제출',
    'applyDancer.careerAdd': '+ 경력 항목 추가',
    'applyDancer.careerRemove': '삭제',
    'applyDancer.careerPlaceholder': '예) 2024 · SM Ent. 신곡 MV 메인 댄서',
    'applyDancer.portfolioTabUrl': '링크',
    'applyDancer.portfolioTabFile': '파일',
    'applyDancer.privacyViewDetail': '전문 보기',
    'applyDancer.summarySaving': '제출 중입니다. 잠시만 기다려 주세요…',
    'applyDancer.successTitle': '지원서 접수가 완료되었습니다',
    'applyDancer.successBody': '프로필이 데이터베이스에 등록되었습니다. 매칭 시 등록하신 이메일·연락처로 개별 안내드립니다.',
    'applyDancer.successTicket': '접수 번호',
    'applyDancer.backHome': '홈으로',
    'applyDancer.viewAgain': '다시 지원하기',
    'applyDancer.portfolioFilePlaceholder': '클릭해서 파일 선택 — PDF / PNG / JPG · 4MB 이하',
    'applyDancer.remove': '제거',
    'applyDancer.readyToSubmit': '제출 준비 완료',
    'applyDancer.missingFields': '누락된 항목 있음',
    'applyDancer.nationalityKorea': '대한민국',
    'applyDancer.regionOverseas': '해외',

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
      'Choreography, teaching, dance credits, shows, judging, workshops, broadcast, ads — feel free to paste a full block of text or write line by line.',
    'applyDancer.portfolioOptional': '(optional)',
    'applyDancer.privacyConsent': 'I have read and agree to the Terms of Service and Privacy Policy above',
    'applyDancer.termsTitle': 'Terms of Service & Privacy Policy',
    'applyDancer.termsBody': 'These terms and privacy policy apply to the GRIGO ENTERTAINMENT dancer agency pool service.',
    'applyDancer.tosTitle': 'Terms of Service',
    'applyDancer.tosShort':
      'These terms govern your use of the GRIGO ENTERTAINMENT dancer agency pool service. By submitting your application you agree to these terms. Misrepresentation of information and unauthorised commercial use of service content are prohibited. Registration in the agency pool does not guarantee any project contract or remuneration.',
    'applyDancer.tosFull':
      'Article 1 (Purpose)\nThese terms govern the conditions, procedures, and rights and obligations of users of the dancer agency pool service (the "Service") operated by GRIGO ENTERTAINMENT (the "Company").\n\nArticle 2 (Service Content)\n① The Company registers applicant profiles in the agency pool database and provides matching to suitable projects (performances, MVs, advertisements, broadcasts, etc.).\n② Registration in the agency pool does not guarantee any specific project contract or remuneration.\n③ The Company may modify or discontinue the Service with 14 days prior notice.\n\nArticle 3 (User Obligations)\n① Users must provide accurate and truthful information in their application. Users are solely responsible for any disadvantage arising from false or third-party information.\n② Users may not use information obtained through the Service for commercial purposes or share it with third parties without prior written consent from the Company.\n③ Users must comply with applicable laws, these terms, and service usage guidelines.\n\nArticle 4 (Rights in Submitted Materials)\n① Copyright in submitted materials (profile photos, portfolios, etc.) remains with the user.\n② Users grant the Company a non-exclusive, royalty-free licence to use, store, display, and transmit such materials for service operation and project matching purposes.\n③ Upon a deletion request the Company will delete such materials after the legally mandated retention period expires.\n\nArticle 5 (Disclaimers)\n① The Company is not liable for service interruptions caused by natural disasters, system failures, or other force majeure events.\n② The Company is not directly liable for contract performance, disputes, or damages between users and clients.\n\nArticle 6 (Governing Law and Disputes)\nThese terms are governed by the laws of the Republic of Korea. Disputes arising from use of the Service shall be subject to the exclusive jurisdiction of the Seoul Central District Court as the court of first instance.\n\nEffective date: 1 January 2025',
    'applyDancer.ppTitle': 'Privacy Policy',
    'applyDancer.ppShort':
      'We collect essential information such as stage name, legal name, contact details, and credits to build our agency pool and match you with projects. Data is retained for 3 years or until you request deletion. You may request access, correction, deletion, or withdrawal of consent at any time (contact@grigoent.co.kr).',
    'applyDancer.ppFull':
      'GRIGO ENTERTAINMENT (the "Company") processes personal data in compliance with applicable data protection laws.\n\n1. Data Collected\n[Required] Stage name, legal name, email address, mobile phone, date of birth, gender, height (cm), region of residence, dance specialties, profile photo, portfolio (URL or file), Instagram handle, career credits\n[Optional] Agency name, nationality, visa information (non-Korean nationals)\n\n2. Purposes of Processing\n· Building and managing the agency pool database\n· Project matching, casting, and contact\n· Identity verification upon contracting\n· Service notices and updates\n· Statistical analysis and service improvement (anonymised)\n\n3. Retention Period\nData is retained for 3 years from the date of collection, or until a deletion request is submitted. Where statutory retention periods apply, those periods govern.\n\n4. Sharing with Third Parties\nWe do not share personal data with third parties as a rule. Exceptions include:\n· Where the user has given prior consent\n· Where required by law or government authority\n· For project matching: stage name, credits, and portfolio may be shared with the relevant client (production company, advertiser, etc.) on a need-to-know basis; users will be notified before sharing.\n\n5. Sub-processors\n· Data storage / infrastructure: Supabase Inc. (USA)\n· Email delivery: email service provider\n\n6. Your Rights\nYou may exercise the following rights at any time:\n· Access, rectification, or erasure of your data\n· Restriction of processing and withdrawal of consent\n→ How to request: contact@grigoent.co.kr or via the website contact form\nResponse time: within 10 business days of receipt\n\n7. Data Protection Contact\nTeam: GRIGO ENTERTAINMENT Privacy Team\nEmail: contact@grigoent.co.kr\nYou may also report data protection concerns to the Korea Internet & Security Agency (KISA): 118 / privacy.kisa.or.kr\n\nEffective date: 1 January 2025',
    'applyDancer.showMore': 'See more',
    'applyDancer.showLess': 'Show less',
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
    'applyDancer.email': 'Email',
    'applyDancer.emailHint': 'We send contract and project updates by email.',
    'applyDancer.errorEmail': 'Please enter a valid email address.',
    'applyDancer.residenceRegion': 'Residence',
    'applyDancer.residenceRegionHint': 'Used for location-based matching on shoots and rehearsals.',
    'applyDancer.residenceRegionPlaceholder': 'Select region',
    'applyDancer.specialties': 'Specialties',
    'applyDancer.specialtiesHint': 'Choose at least one (up to 10).',
    'applyDancer.errorSpecialties': 'Please select at least one specialty.',
    'applyDancer.profilePhoto': 'Profile photo',
    'applyDancer.profilePhotoHint': 'JPG/PNG/WebP · under 3MB. A clear face photo is recommended.',
    'applyDancer.profilePhotoReplace': 'Replace photo',
    'applyDancer.profilePhotoSelect': 'Select photo',
    'applyDancer.errorProfilePhoto': 'Please select a profile photo.',
    'applyDancer.errorProfilePhotoSize': 'Profile photo must be 3MB or smaller.',
    'applyDancer.errorProfilePhotoType': 'Profile photo must be JPG, PNG, or WebP.',
    'applyDancer.stepLabel': 'Step',
    'applyDancer.step1': 'Basic',
    'applyDancer.step2': 'Profile',
    'applyDancer.step3': 'Nationality & visa',
    'applyDancer.step4': 'Credits & submit',
    'applyDancer.careerAdd': '+ Add credit',
    'applyDancer.careerRemove': 'Remove',
    'applyDancer.careerPlaceholder': 'e.g. 2024 · Lead dancer, SM Ent. new release MV',
    'applyDancer.portfolioTabUrl': 'Link',
    'applyDancer.portfolioTabFile': 'File',
    'applyDancer.privacyViewDetail': 'View full policy',
    'applyDancer.summarySaving': 'Submitting, please wait…',
    'applyDancer.successTitle': 'Your application has been received',
    'applyDancer.successBody': 'Your profile is now in our database. When there is a match, we will contact you by email or phone.',
    'applyDancer.successTicket': 'Ticket number',
    'applyDancer.backHome': 'Back to home',
    'applyDancer.viewAgain': 'Submit another',
    'applyDancer.portfolioFilePlaceholder': 'Click to select — PDF / PNG / JPG · up to 4MB',
    'applyDancer.remove': 'Remove',
    'applyDancer.readyToSubmit': 'Ready to submit',
    'applyDancer.missingFields': 'Missing fields',
    'applyDancer.nationalityKorea': 'Republic of Korea',
    'applyDancer.regionOverseas': 'Overseas',

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
    'works.services.kpop.desc': "Choreography for idol groups and solo artists' title tracks and album songs",
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
  },
  ja: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About us',
    'nav.artists': 'Artists',
    'nav.works': 'Our Works',
    'nav.contact': 'Contact us',
    'nav.dancerApply': 'Agency',

    // Dancer agency pool
    'applyDancer.pageTitle': 'GRIGO Entertainment ダンサーエージェンシープール募集',
    'applyDancer.title': '応募フォーム',
    'applyDancer.subtitle':
      'プロフィール・ポートフォリオをご登録いただくとデータベースに反映され、プロジェクトの内容に合わせて個別にご連絡いたします。',
    'applyDancer.noticeIntro':
      '専属マネジメント中心で運営してまいりましたGRIGO Entertainmentが、これまで築いてきたインフラを基にエージェンシー事業へと領域を拡大いたします。\n\n広告・放送・振付制作・公演キャスティングなど、さまざまなプロジェクトでご一緒できる実力あるダンスチーム／ダンサーの皆さまのプロフィールを募集いたします。\n\nご提出いただいた情報はデータベースとして構築し、各プロジェクトに最適なマッチングを行ったうえで個別にご連絡差し上げます。',
    'applyDancer.noticeClosing':
      '現場のリアルを理解し、ダンサーの価値を知るパートナーとして、皆さまのビジネス機会をともに育ててまいります。\n\n多くのご関心・ご応募をお待ちしております。',
    'applyDancer.areaTitle': '1. 募集領域',
    'applyDancer.areaAds': '広告・キャンペーン: ブランドCM、バイラル映像、ルックブック、紙面モデル 等',
    'applyDancer.areaBroadcast': '放送・メディア: テレビ番組、ウェブ番組、ミュージックビデオ出演 等',
    'applyDancer.areaChoreo': '振付制作: アーティスト振付、広告・企業プロモーションの振付ディレクション',
    'applyDancer.areaLive': '公演・イベントキャスティング: 企業イベント、フェス、国内外の公演プロジェクト 等',
    'applyDancer.howTitle': '2. 応募方法',
    'applyDancer.howBody':
      '下記フォームにプロフィール（ポートフォリオ）リンクと、ご自身／チームの主な実績（振付制作、出演歴 等）をご記入ください。',
    'applyDancer.processTitle': '3. マッチングプロセス',
    'applyDancer.process1': 'プロフィール受付: 随時データベース登録',
    'applyDancer.process2': 'プロジェクトマッチング: クライアント（制作会社・広告主）の要望に応じたマッチング',
    'applyDancer.process3': '個別連絡: プロジェクトごとの条件・スケジュール調整後にキャスティングご連絡',
    'applyDancer.signoff':
      'GRIGO Entertainmentは、ダンサーの皆さまが本来のパフォーマンスに集中できる環境づくりに努めてまいります。ありがとうございます。',
    'applyDancer.privacy':
      '収集・利用目的: エージェンシープール登録、プロジェクトマッチングおよびキャスティングご連絡。保有期間: 目的達成後は速やかに破棄します（法令上保管が必要な場合はその期間まで保管）。同意されない場合は応募ができない場合があります。',
    'applyDancer.fullName': '氏名',
    'applyDancer.stageName': '活動名',
    'applyDancer.phone': '電話番号',
    'applyDancer.birthDate': '生年月日',
    'applyDancer.gender': '性別',
    'applyDancer.genderMale': '男性',
    'applyDancer.genderFemale': '女性',
    'applyDancer.genderOther': 'その他',
    'applyDancer.genderPreferNot': '回答しない',
    'applyDancer.genderPlaceholder': '選択',
    'applyDancer.height': '身長 (cm)',
    'applyDancer.heightHint': '数字のみご入力ください。',
    'applyDancer.portfolio': 'ポートフォリオ',
    'applyDancer.portfolioUrlLabel': 'ポートフォリオリンク（任意)',
    'applyDancer.portfolioFileLabel': 'ポートフォリオファイル添付（任意)',
    'applyDancer.portfolioHint':
      'Notion・Google Drive・SNSなどアクセス可能なURL。https:// がない場合は自動で付与されます。',
    'applyDancer.portfolioFileHint':
      'PDF・JPG・JPEG・PNGのみ。最大4MBまで。容量が大きい場合は contact@grigoent.co.kr までメールでお送りください。',
    'applyDancer.portfolioEitherHint': 'リンクまたはファイルのいずれか1つ以上をご提出ください。',
    'applyDancer.errorPortfolioRequired': 'ポートフォリオのリンクまたはファイルのいずれか1つは必須です。',
    'applyDancer.errorPortfolioFileType': '許可されている形式は PDF・JPG・PNG のみです。',
    'applyDancer.errorPortfolioFileSize':
      '添付ファイルは4MB以下にしてください。容量超過の場合は contact@grigoent.co.kr までお送りください。',
    'applyDancer.errorPortfolioUpload': 'ファイルのアップロードに失敗しました。しばらくしてから再度お試しいただくか、リンクのみでご提出ください。',
    'applyDancer.instagram': 'Instagram ID',
    'applyDancer.instagramHint': '@ の有無どちらでも入力可能です。',
    'applyDancer.agency': '所属事務所',
    'applyDancer.agencyHint': '所属がない場合は空欄のままで構いません。',
    'applyDancer.nationalityLabel': '国籍',
    'applyDancer.koreanNational': '大韓民国籍です',
    'applyDancer.foreignCountry': '国籍（国名)',
    'applyDancer.foreignCountryHint': '韓国籍以外の方はご入力ください。',
    'applyDancer.visaQuestion': 'ビザの有無',
    'applyDancer.visaYes': 'あり',
    'applyDancer.visaNo': 'なし',
    'applyDancer.visaDetails': 'ビザ情報および有効期限',
    'applyDancer.visaDetailsHint': 'ビザの種類・番号（任意）・有効期限などをご記入ください。',
    'applyDancer.careers': '主な経歴',
    'applyDancer.careersHint':
      '振付制作、レッスン、ダンサー出演、公演、審査、ワークショップ、放送出演、広告など、まとめて貼り付けるか、改行区切りで自由にご記入ください。',
    'applyDancer.portfolioOptional': '（任意）',
    'applyDancer.privacyConsent': '上記の利用規約およびプライバシーポリシーの全内容を確認し、すべてに同意します',
    'applyDancer.termsTitle': '利用規約・プライバシーポリシー',
    'applyDancer.termsBody': '本規約とプライバシーポリシーは、グリゴ・エンターテインメントが提供するダンサーエージェンシープールサービスに適用されます。',
    'applyDancer.tosTitle': '利用規約',
    'applyDancer.tosShort':
      '本規約は、グリゴ・エンターテインメントが提供するダンサーエージェンシープールサービスの利用条件を定めるものです。応募書類の送信をもって本規約に同意いただいたものとみなします。虚偽情報の記載およびサービス情報の無断商業利用は禁止されています。エージェンシープールへの登録は、特定のプロジェクト契約または報酬を保証するものではありません。',
    'applyDancer.tosFull':
      '第1条（目的）\n本規約は、グリゴ・エンターテインメント（以下「当社」）が運営するダンサーエージェンシープールサービス（以下「サービス」）の利用条件、手続き、ならびに当社と利用者の権利・義務に関する事項を定めることを目的とします。\n\n第2条（サービス内容）\n① 当社は、応募者のプロフィールをエージェンシープールデータベースに登録し、適合するプロジェクト（公演、MV、広告、放送等）とのマッチングサービスを提供します。\n② エージェンシープールへの登録は、特定のプロジェクト契約または報酬を保証するものではありません。\n③ 当社は、14日前の事前告知をもってサービス内容の変更または終了を行うことができます。\n\n第3条（利用者の義務）\n① 利用者は応募書類に正確な情報を記載する義務を負います。虚偽または他人の情報を使用した場合に生じる不利益については、利用者本人が責任を負うものとします。\n② 利用者は、当社の事前書面による同意なく、サービスを通じて取得した情報を商業目的で利用し、または第三者に提供してはなりません。\n③ 利用者は、関係法令、本規約、およびサービス利用ガイドラインを遵守するものとします。\n\n第4条（提出資料の権利）\n① 利用者が提出したプロフィール写真、ポートフォリオ等の著作権は利用者本人に帰属します。\n② 利用者は、当社に対し、サービス運営およびプロジェクトマッチングを目的として当該資料を使用・保存・表示・送信する非独占的かつ無償のライセンスを付与します。\n③ 利用者から個人情報の削除要請を受けた場合、当社は関係法令に定める保管期間満了後に当該資料を削除します。\n\n第5条（免責事項）\n① 当社は、天災、システム障害その他不可抗力によるサービス中断について責任を負いません。\n② 当社は、利用者とクライアント間の契約履行、紛争または損害について直接の責任を負いません。\n\n第6条（準拠法および紛争解決）\n本規約は大韓民国法に準拠します。サービスの利用に関して紛争が生じた場合、ソウル中央地方裁判所を第一審の専属的合意管轄裁判所とします。\n\n施行日：2025年1月1日',
    'applyDancer.ppTitle': 'プライバシーポリシー',
    'applyDancer.ppShort':
      '当社は、エージェンシープールの構築およびプロジェクトマッチングのために、活動名・氏名・連絡先・経歴等の必要な情報を収集します。情報は収集日から3年間保持され、利用者はいつでも開示・訂正・削除・同意の撤回を請求できます（contact@grigoent.co.kr）。',
    'applyDancer.ppFull':
      'グリゴ・エンターテインメント（以下「当社」）は、個人情報保護法その他の関係法令に従い、以下のとおり個人情報の取り扱いについてご案内いたします。\n\n1. 収集する個人情報の項目\n【必須】活動名、氏名、メールアドレス、携帯電話番号、生年月日、性別、身長（cm）、居住地域、得意ジャンル、プロフィール写真、ポートフォリオ（URLまたはファイル）、Instagramアカウント、経歴\n【任意】所属事務所名、国籍、ビザ情報（外国籍の方）\n\n2. 個人情報の利用目的\n· エージェンシープールデータベースの構築・管理\n· プロジェクトマッチングおよびキャスティング連絡\n· 契約締結時の本人確認\n· サービスに関するお知らせおよびアップデートの配信\n· 統計分析およびサービス改善（匿名化処理後に使用）\n\n3. 保有・利用期間\n収集日から3年間、またはご本人からの削除依頼があるまで保有します。関係法令に別途定めがある場合は当該期間に従います。\n\n4. 第三者への提供\n当社は原則として個人情報を外部に提供しません。ただし、以下の場合はこの限りではありません。\n· ご本人の事前同意がある場合\n· 関係法令または行政機関からの要請がある場合\n· プロジェクトマッチングの際、対象クライアント（制作会社、広告主等）に活動名・経歴・ポートフォリオを限定的に提供する場合（提供前にご本人へ告知します）\n\n5. 委託先\n· データ保存・インフラ：Supabase Inc.（米国）\n· メール配信：メールサービスプロバイダー\n\n6. ご本人の権利\n利用者はいつでも以下の権利を行使できます。\n· 個人情報の開示・訂正・削除の請求\n· 処理の停止および同意の撤回\n→ 請求方法：contact@grigoent.co.kr またはウェブサイトのお問い合わせフォーム\n対応期限：受付から10営業日以内\n\n7. 個人情報保護担当\n担当：GRIGO ENTERTAINMENT プライバシーチーム\nメール：contact@grigoent.co.kr\n\n施行日：2025年1月1日',
    'applyDancer.showMore': 'もっと見る',
    'applyDancer.showLess': '簡単に見る',
    'applyDancer.cancel': 'キャンセル',
    'applyDancer.submit': '応募書類を送信',
    'applyDancer.sending': '送信中...',
    'applyDancer.success': '応募書類を受け付けました。マッチングが発生次第ご連絡いたします。',
    'applyDancer.errorRequired':
      '必須項目・経歴・同意をご確認ください。外国籍の方はビザ情報も入力が必要です。',
    'applyDancer.errorSubmit': '送信に失敗しました。しばらくしてから再度お試しください。',
    'applyDancer.emailWarn': '受付は完了しましたが、ご案内メールの送信に失敗している可能性があります。',
    'applyDancer.errorHeight': '身長は120〜220の範囲で数字を入力してください。',
    'applyDancer.errorPortfolioUrl': '有効なポートフォリオURLを入力してください。',
    'applyDancer.errorForeignCountry': '国籍（国名）をご入力ください。',
    'applyDancer.errorVisaDetails': 'ビザがある場合は情報・有効期限をご入力ください。',
    'applyDancer.heroKicker': 'GRIGO ENTERTAINMENT',
    'applyDancer.sectionBasic': '基本情報',
    'applyDancer.sectionProfile': 'プロフィール・リンク',
    'applyDancer.sectionVisa': '国籍・ビザ',
    'applyDancer.sectionCareer': '経歴',
    'applyDancer.requiredHint': '* は必須項目です。',
    'applyDancer.email': 'メールアドレス',
    'applyDancer.emailHint': '契約・募集のご案内はメールでお送りします。',
    'applyDancer.errorEmail': '有効なメールアドレスを入力してください。',
    'applyDancer.residenceRegion': '居住地域',
    'applyDancer.residenceRegionHint': '撮影・リハーサル場所のマッチングに利用します。',
    'applyDancer.residenceRegionPlaceholder': '市・道を選択',
    'applyDancer.specialties': '得意ジャンル',
    'applyDancer.specialtiesHint': '1つ以上選択してください（最大10個）。',
    'applyDancer.errorSpecialties': '得意ジャンルを1つ以上選択してください。',
    'applyDancer.profilePhoto': 'プロフィール写真',
    'applyDancer.profilePhotoHint': 'JPG/PNG/WebP · 3MB以下。顔がはっきりと写った写真を推奨します。',
    'applyDancer.profilePhotoReplace': '写真を変更',
    'applyDancer.profilePhotoSelect': '写真を選択',
    'applyDancer.errorProfilePhoto': 'プロフィール写真を選択してください。',
    'applyDancer.errorProfilePhotoSize': 'プロフィール写真は3MB以下にしてください。',
    'applyDancer.errorProfilePhotoType': 'プロフィール写真はJPG/PNG/WebP形式のみです。',
    'applyDancer.stepLabel': 'ステップ',
    'applyDancer.step1': '基本',
    'applyDancer.step2': 'プロフィール',
    'applyDancer.step3': '国籍・ビザ',
    'applyDancer.step4': '経歴・送信',
    'applyDancer.careerAdd': '+ 経歴項目を追加',
    'applyDancer.careerRemove': '削除',
    'applyDancer.careerPlaceholder': '例）2024 · SM Ent. 新曲MV メインダンサー',
    'applyDancer.portfolioTabUrl': 'リンク',
    'applyDancer.portfolioTabFile': 'ファイル',
    'applyDancer.privacyViewDetail': '全文を見る',
    'applyDancer.summarySaving': '送信中です。しばらくお待ちください…',
    'applyDancer.successTitle': '応募書類を受け付けました',
    'applyDancer.successBody': 'プロフィールをデータベースに登録いたしました。マッチングが発生次第、ご登録いただいたメールアドレス・電話番号へ個別にご案内いたします。',
    'applyDancer.successTicket': '受付番号',
    'applyDancer.backHome': 'ホームへ',
    'applyDancer.viewAgain': 'もう一度応募する',
    'applyDancer.portfolioFilePlaceholder': 'クリックしてファイルを選択 — PDF / PNG / JPG · 4MB以下',
    'applyDancer.remove': '削除',
    'applyDancer.readyToSubmit': '送信の準備ができました',
    'applyDancer.missingFields': '未入力の項目があります',
    'applyDancer.nationalityKorea': '大韓民国',
    'applyDancer.regionOverseas': '海外',

    // Header
    'header.signin': 'サインイン',
    'header.signup': 'サインアップ',
    'header.mypage': 'マイページ',
    'header.signout': 'サインアウト',
    'header.admin': '管理者',

    // Hero Section
    'hero.main1': 'DANCE',
    'hero.main2': 'WITH',
    'hero.main3': 'PASSION',
    'hero.subtitle': 'GRIGO ENTERTAINMENT // A GLOBAL DANCE COMPANY',

    // About Section
    'about.title': 'About Us',
    'about.subtitle': 'グローバルダンスカンパニー',
    'about.mission': '私たちは世界的な振付師とダンサーをつなぎ\n革新的で感動的なパフォーマンスを生み出します。',
    'about.stats.title': 'Our Numbers',
    'about.stats.projects': 'プロジェクト',
    'about.stats.artists': 'アーティスト',
    'about.stats.countries': 'カ国',
    'about.stats.years': '年の実績',
    'about.services.title': 'Our Services',
    'about.services.choreography': '振付制作',
    'about.services.choreography.desc': 'クリエイティブで革新的な振付制作',
    'about.services.casting': 'ダンサーキャスティング',
    'about.services.casting.desc': '一流ダンサーとのコラボレーション',
    'about.services.production': '公演プロデュース',
    'about.services.production.desc': '完成度の高い公演の制作と演出',

    // Artists Section
    'artists.title': 'Our Artists',
    'artists.subtitle': '世界的な振付師とダンサー',
    'artists.description': '最高の実力と創造性を備えたアーティストとともに\n特別な瞬間を生み出しましょう。',
    'artists.viewall': 'すべて見る',
    'artists.loading': '読み込み中...',

    // Works Section
    'works.title': 'Our Works',
    'works.subtitle': '当社のダンサーが参加した多彩なプロジェクトをご覧ください。\nそれぞれの作品には情熱と創造性が込められています。',
    'works.recently': 'Recently',
    'works.error.title': 'データを読み込めませんでした',
    'works.error.retry': '再試行',
    'works.refresh.loading': '更新中...',
    'works.refresh.button': '更新',
    'works.services.kpop.title': 'K-POP・アルバム振付制作',
    'works.services.kpop.desc': 'アイドルグループ、ソロアーティストのタイトル曲および収録曲の振付制作',
    'works.services.movie.title': '映画・広告振付',
    'works.services.movie.desc': '映画・ドラマ・CMの振付制作および出演',
    'works.services.broadcast.title': '放送・イベント出演',
    'works.services.broadcast.desc': 'テレビ番組・コンサート・イベントへのダンサー／チームキャスティング',
    'works.services.workshop.title': '海外・国内ワークショップ',
    'works.services.workshop.desc': '世界各地でのK-POPダンスレッスン・ワークショップ',
    'works.services.challenge.title': 'ダンスチャレンジ',
    'works.services.challenge.desc': '商品・空間・アルバムのプロモーション用ダンスチャレンジ制作',
    'works.services.competition.title': 'ダンスコンペティション・イベント',
    'works.services.competition.desc': 'ダンス大会の主催・運営および各種イベントの企画',
    'works.empty.title': 'まだ登録された代表作がありません',
    'works.empty.description': 'ダンサーが代表作を登録するとここに表示されます。',

    // Contact Section
    'contact.title': 'Contact Us',
    'contact.subtitle': 'プロジェクトのお問い合わせやダンサーとのコラボレーションをご希望の方は\nお気軽にご連絡ください。',
    'contact.getintouch': 'Get in Touch',
    'contact.address': 'ソウル特別市麻浦区城池3キル55、3階',
    'contact.company': '株式会社グリゴエンターテインメント',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.businesshours': 'Business Hours',
    'contact.businesshours.weekday': '月〜金: 9:00 AM - 6:00 PM',
    'contact.businesshours.weekend': '土〜日: 10:00 AM - 4:00 PM',
    'contact.sendmessage': 'Send Message',
    'contact.form.title': 'お問い合わせ',
    'contact.form.name': 'お名前',
    'contact.form.contact': 'メールアドレス または 電話番号',
    'contact.form.inquiry': 'お問い合わせ内容',
    'contact.form.send': '送信する',
    'contact.form.sending': '送信中...',
    'contact.form.error.required': 'すべての項目を入力してください',
    'contact.form.error.invalid': '正しいメールアドレスまたは電話番号を入力してください',
    'contact.form.error.submission': 'お問い合わせの送信に失敗しました',
    'contact.form.success': 'お問い合わせを送信しました',
    'contact.form.error.general': '送信中にエラーが発生しました',

    // Footer
    'footer.company.name': '株式会社グリゴエンターテインメント',
    'footer.description': 'グローバルダンスカンパニーとして、振付制作からダンサーキャスティングまでを担います。\n一流の振付師とダンサーをつなぎ、世界水準の公演を生み出します。',
    'footer.quicklinks': 'Quick Links',
    'footer.report': '未払い・精算の通報',
    'footer.contact': 'Contact',
    'footer.contact.email': 'contact@grigoent.co.kr',
    'footer.contact.phone': '+82) 02-6229-9229',
    'footer.contact.address2': '株式会社グリゴエンターテインメント',
    'footer.copyright': '© 2024 株式会社グリゴエンターテインメント. All rights reserved.',

    // Proposal
    'proposal.title': 'プロジェクト提案',
    'proposal.subtitle': 'プロジェクトのご提案をお送りください',
    'proposal.form.title': 'プロジェクト名',
    'proposal.form.description': 'プロジェクト詳細',
    'proposal.form.budget': '予算',
    'proposal.form.deadline': '希望納期',
    'proposal.form.submit': '提案を送信',
    'proposal.anonymous.title': '匿名での提案',
    'proposal.anonymous.subtitle': 'ログインなしで提案できます',
    'proposal.anonymous.name': 'お名前',
    'proposal.anonymous.email': 'メールアドレス',
    'proposal.anonymous.phone': '電話番号',
    'proposal.anonymous.submit': '匿名で提案する',

    // General Proposal Section
    'proposal.general.title': 'プロジェクト提案',
    'proposal.general.subtitle': 'プロジェクトの種類に合わせて提案方法を選んでください',
    'proposal.general.individual.title': '個人ダンサー',
    'proposal.general.individual.desc': '個人ダンサーとのコラボレーションをご希望の方',
    'proposal.general.individual.button': 'ダンサーを探す',
    'proposal.general.team.title': 'ダンスチーム',
    'proposal.general.team.desc': 'ダンスチームとのコラボレーションをご希望の方',
    'proposal.general.team.button': 'チームを探す',
    'proposal.general.general.title': '一般提案',
    'proposal.general.general.desc': 'その他のプロジェクト提案をご希望の方',
    'proposal.general.general.button': '提案する',

    // Common
    'common.loading': '読み込み中...',
    'common.error': 'エラーが発生しました',
    'common.success': '正常に処理されました',
  },
} as const

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLang)

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }

  // SSR과 첫 클라이언트 렌더링 hydration 후 동기화
  useEffect(() => {
    const stored = readInitialLang()
    if (stored !== language) setLanguageState(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = (key: string): string => {
    const current = translations[language] as Record<string, string>
    const en = translations.en as Record<string, string>
    const ko = translations.ko as Record<string, string>
    return current[key] ?? en[key] ?? ko[key] ?? key
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
