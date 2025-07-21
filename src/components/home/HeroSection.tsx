'use client'

import { useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronDown } from 'lucide-react'

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
  const { t } = useLanguage()

  useEffect(() => {
    // YouTube IFrame API 로드
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    // YouTube API 준비되면 플레이어 생성
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: 'ktWrP16ZpTk',
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

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [])

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* YouTube 비디오 배경 */}
      <div className="absolute inset-0 w-full h-full">
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
            <h1 className="text-7xl md:text-9xl font-black tracking-tight uppercase text-white font-space-grotesk leading-tight">
              {t('hero.main1')}
            </h1>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight uppercase text-white font-space-grotesk leading-tight">
              {t('hero.main2')}
            </h1>
            <h1 className="text-7xl md:text-9xl font-black tracking-tight uppercase text-white font-space-grotesk leading-tight">
              {t('hero.main3')}
            </h1>
          </div>

          {/* 구분선 - 더 과감한 스타일 */}
          <div className="w-40 h-0.5 bg-white/80 mx-auto my-8" />

          {/* 보조 텍스트 - 깔끔한 폰트 */}
          <p className="text-lg md:text-xl font-medium tracking-[0.15em] whitespace-pre-line text-white/80 font-outfit">
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