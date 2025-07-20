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
    
    // Contact Section
    'contact.title': 'Contact Us',
    'contact.subtitle': '프로젝트에 대해 문의하거나 댄서와의 협업을 원하시면\n언제든지 연락주세요.',
    'contact.getintouch': 'Get in Touch',
    'contact.address': 'Address',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.businesshours': 'Business Hours',
    'contact.businesshours.weekday': '월-금: 9:00 AM - 6:00 PM',
    'contact.businesshours.weekend': '토-일: 10:00 AM - 4:00 PM',
    'contact.sendmessage': 'Send Message',
    'contact.form.name': '이름',
    'contact.form.contact': '이메일 또는 전화번호',
    'contact.form.inquiry': '문의사항',
    'contact.form.send': '문의 보내기',
    'contact.form.sending': '전송 중...',
    
    // Footer
    'footer.description': '글로벌 댄스 컴퍼니로, 안무제작부터 댄서섭외까지 모든 것을 담당합니다.\n최고의 안무가들과 댄서들을 연결하여 세계적인 공연을 만들어갑니다.',
    'footer.quicklinks': 'Quick Links',
    'footer.contact': 'Contact',
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
    
    // Contact Section
    'contact.title': 'Contact Us',
    'contact.subtitle': 'Contact us anytime for project inquiries\nor collaboration with dancers.',
    'contact.getintouch': 'Get in Touch',
    'contact.address': 'Address',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.businesshours': 'Business Hours',
    'contact.businesshours.weekday': 'Mon-Fri: 9:00 AM - 6:00 PM',
    'contact.businesshours.weekend': 'Sat-Sun: 10:00 AM - 4:00 PM',
    'contact.sendmessage': 'Send Message',
    'contact.form.name': 'Name',
    'contact.form.contact': 'Email or Phone',
    'contact.form.inquiry': 'Inquiry',
    'contact.form.send': 'Send Inquiry',
    'contact.form.sending': 'Sending...',
    
    // Footer
    'footer.description': 'As a global dance company, we handle everything from choreography to dancer casting.\nWe connect the best choreographers and dancers to create world-class performances.',
    'footer.quicklinks': 'Quick Links',
    'footer.contact': 'Contact',
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