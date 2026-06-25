'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronDown } from 'lucide-react'

const HERO_VIDEO_ID = 'ktWrP16ZpTk'
const HERO_POSTER_URL = `https://img.youtube.com/vi/${HERO_VIDEO_ID}/hqdefault.jpg`

// YouTube Player API 타입 정의
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement | string,
        config: {
          videoId: string
          playerVars: Record<string, string | number | boolean>
          events: {
            onReady: (event: { target: { playVideo: () => void } }) => void
          }
        }
      ) => {
        destroy: () => void
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

export function HeroSection() {
  const playerRef = useRef<{ destroy: () => void } | null>(null)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const loadVideo = () => setShouldLoadVideo(true)
    const requestIdleCallback = (window as any).requestIdleCallback
    const cancelIdleCallback = (window as any).cancelIdleCallback
    let idleId: number | null = null

    const timerId = window.setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        idleId = requestIdleCallback(loadVideo, { timeout: 1500 })
        return
      }

      loadVideo()
    }, 3500)

    return () => {
      window.clearTimeout(timerId)
      if (idleId !== null && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId)
      }
    }
  }, [])

  useEffect(() => {
    if (!shouldLoadVideo) return

    const createPlayer = () => {
      const playerElement = document.getElementById('youtube-player')
      if (!playerElement || !(window as any).YT?.Player) return

      playerRef.current = new window.YT.Player(playerElement, {
        videoId: HERO_VIDEO_ID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: 1,
          modestbranding: 1,
          mute: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          start: 0,
        },
        events: {
          onReady: (event: { target: { playVideo: () => void } }) => {
            event.target.playVideo()
          },
        },
      })
    }

    if ((window as any).YT?.Player) {
      createPlayer()
      return () => {
        if (playerRef.current) {
          playerRef.current.destroy()
          playerRef.current = null
        }
      }
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    window.onYouTubeIframeAPIReady = createPlayer

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [shouldLoadVideo])

  return (
    <section className="relative h-[66.67vh] flex items-center justify-center overflow-hidden">
      {/* YouTube 비디오 배경 */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={HERO_POSTER_URL}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {shouldLoadVideo && (
          <div
            id="youtube-player"
            className="w-full h-full"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100vw',
              height: '100vh',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* 더 강한 오버레이로 영상을 흐리게 */}
        <div className="absolute inset-0 bg-black/70" />
        {/* 추가 블러 효과 */}
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 text-center text-white px-4">
        <div className="space-y-2">
          {/* 메인 텍스트 - 이미지와 동일한 스타일 */}
          <div className="space-y-1">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white font-space-grotesk leading-tight">
              {t('hero.main1')}
            </h1>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase text-white font-space-grotesk leading-tight">
              {t('hero.main2')}
            </h1>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white font-space-grotesk leading-tight">
              {t('hero.main3')}
            </h1>
          </div>

          {/* 구분선 - 더 과감한 스타일 */}
          <div className="w-32 h-0.5 bg-white/80 mx-auto my-6" />

          {/* 보조 텍스트 - 깔끔한 폰트 */}
          <p className="text-sm md:text-lg font-medium tracking-[0.15em] whitespace-pre-line text-white/80 font-outfit">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* 스크롤 인디케이터 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/70" />
        </div>
      </div>
    </section>
  )
}
