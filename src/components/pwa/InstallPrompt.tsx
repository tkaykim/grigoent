'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed-at'
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7 // 7일

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
}

function wasRecentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY)
    if (!v) return false
    return Date.now() - Number(v) < DISMISS_WINDOW_MS
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {}
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari fallback (no beforeinstallprompt)
    if (isIOS()) {
      const t = setTimeout(() => {
        if (isStandalone() || wasRecentlyDismissed()) return
        toast('홈 화면에 추가하기', {
          description: '공유 버튼 → "홈 화면에 추가"를 눌러 앱으로 설치하세요.',
          duration: 8000,
          action: {
            label: '닫기',
            onClick: () => markDismissed(),
          },
        })
        markDismissed()
      }, 3000)
      return () => {
        clearTimeout(t)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !evt) return null

  const onInstall = async () => {
    try {
      await evt.prompt()
      const { outcome } = await evt.userChoice
      if (outcome !== 'accepted') markDismissed()
    } finally {
      setEvt(null)
      setVisible(false)
    }
  }

  const onClose = () => {
    markDismissed()
    setVisible(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 shadow-lg">
      <div className="flex-1">
        <p className="text-sm font-semibold text-black">앱으로 설치</p>
        <p className="text-xs text-black/60">홈 화면에 추가하고 더 빠르게 사용하세요.</p>
      </div>
      <button
        type="button"
        onClick={onInstall}
        className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80"
      >
        설치
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="text-black/40 hover:text-black"
      >
        ✕
      </button>
    </div>
  )
}
