'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'ko' ? 'en' : 'ko')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-1"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium">
        {language === 'ko' ? 'KO' : 'EN'}
      </span>
    </Button>
  )
} 