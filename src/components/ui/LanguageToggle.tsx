'use client'

import { useLanguage, type Language } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OPTIONS: { value: Language; short: string; full: string }[] = [
  { value: 'ko', short: 'KO', full: '한국어' },
  { value: 'en', short: 'EN', full: 'English' },
  { value: 'ja', short: 'JA', full: '日本語' },
]

const FULL_LABEL: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
      <SelectTrigger
        aria-label={`Language: ${FULL_LABEL[language]}`}
        className="h-8 w-auto gap-1 border-0 bg-transparent px-2 text-xs font-medium shadow-none focus-visible:ring-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 [&>svg]:opacity-60"
      >
        <Globe className="h-4 w-4 opacity-80" aria-hidden />
        <SelectValue>{OPTIONS.find((o) => o.value === language)?.short ?? 'KO'}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[10rem]">
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="font-mono text-[10px] text-zinc-500 mr-2">{o.short}</span>
            {o.full}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
