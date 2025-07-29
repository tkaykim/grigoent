'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CareerEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { extractYouTubeVideoId, isValidYouTubeUrl } from '@/lib/youtube'
import { getInstagramEmbedUrl, isValidInstagramUrl } from '@/lib/instagram'

interface CareerVideoModalProps {
  careers: CareerEntry[]
  initialIndex: number
  onClose: () => void
  onIndexChange: (index: number) => void
  isAdmin?: boolean
  onEdit?: (career: CareerEntry) => void
  onDelete?: (career: CareerEntry) => void
}

export function CareerVideoModal({
  careers,
  initialIndex,
  onClose,
  onIndexChange,
  isAdmin = false,
  onEdit,
  onDelete
}: CareerVideoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      onIndexChange(newIndex)
    }
  }

  const handleNext = () => {
    if (currentIndex < careers.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      onIndexChange(newIndex)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        handlePrevious()
        break
      case 'ArrowRight':
        handleNext()
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  if (!mounted) return null

  const currentCareer = careers[currentIndex]
  
  if (!currentCareer) return null

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      choreography: '안무',
      performance: '공연',
      advertisement: '광고',
      tv: '방송',
      workshop: '워크샵',
    }
    return labels[category] || category
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  // YouTube URL을 임베드 URL로 변환
  const getEmbedUrl = (url: string) => {
    if (!url) return null
    
    if (isValidYouTubeUrl(url)) {
      const videoId = extractYouTubeVideoId(url)
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`
      }
    }
    
    if (isValidInstagramUrl(url)) {
      return getInstagramEmbedUrl(url)
    }
    
    // YouTube나 인스타그램이 아닌 경우 null 반환 (iframe에서 직접 재생 불가)
    return null
  }

  const embedUrl = getEmbedUrl(currentCareer.video_url || '')
  const isYouTube = isValidYouTubeUrl(currentCareer.video_url || '')
  const isInstagram = isValidInstagramUrl(currentCareer.video_url || '')

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 career-video-modal">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* 닫기 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/70 text-white hover:bg-black/90 border border-white/20"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* 메인 콘텐츠 */}
        <div className="relative w-full max-w-6xl max-h-full">
          {/* 비디오 플레이어 */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            {embedUrl ? (
              <div className="relative w-full h-full">
                {isYouTube ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentCareer.title}
                  />
                ) : isInstagram ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentCareer.title}
                  />
                ) : (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentCareer.title}
                  />
                )}
                {/* YouTube 컨트롤 영역을 완전히 보호 */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* 상단 영역 - YouTube 컨트롤과 겹치지 않도록 */}
                  <div className="absolute top-0 left-0 right-0 h-16"></div>
                  {/* 하단 영역 - YouTube 컨트롤과 겹치지 않도록 */}
                  <div className="absolute bottom-0 left-0 right-0 h-20"></div>
                  {/* 좌측 영역 - YouTube 컨트롤과 겹치지 않도록 */}
                  <div className="absolute top-0 left-0 w-20 h-full"></div>
                  {/* 우측 영역 - YouTube 컨트롤과 겹치지 않도록 */}
                  <div className="absolute top-0 right-0 w-20 h-full"></div>
                </div>
              </div>
            ) : currentCareer.video_url ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <p className="mb-4">YouTube나 인스타그램이 아닌 영상은 팝업에서 재생할 수 없습니다.</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(currentCareer.video_url, '_blank')}
                  className="text-white border-white hover:bg-white/20"
                >
                  새 탭에서 보기
                </Button>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <p>영상이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 경력 정보 - YouTube 컨트롤과 겹치지 않도록 조정 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white pointer-events-none">
            <div className="flex items-start justify-between max-w-[calc(100%-40px)] mx-auto">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{currentCareer.title}</h3>
                {currentCareer.description && (
                  <p className="text-sm text-gray-300 mb-2 line-clamp-2">{currentCareer.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{getCategoryLabel(currentCareer.category)}</Badge>
                  {currentCareer.country && <span>{currentCareer.country}</span>}
                  {currentCareer.start_date && (
                    <span>{formatDate(currentCareer.start_date)}</span>
                  )}
                </div>
              </div>
              
              {/* 관리자 액션 - pointer-events-auto로 클릭 가능하게 */}
              {isAdmin && (
                <div className="flex gap-2 pointer-events-auto ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(currentCareer)}
                    className="text-white border-white hover:bg-white/20"
                  >
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete?.(currentCareer)}
                  >
                    삭제
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 네비게이션 버튼 - YouTube 컨트롤과 겹치지 않도록 위치 조정 */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute left-8 top-1/2 -translate-y-1/2 bg-black/70 text-white hover:bg-black/90 border border-white/20 z-20"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
        )}

        {currentIndex < careers.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-8 top-1/2 -translate-y-1/2 bg-black/70 text-white hover:bg-black/90 border border-white/20 z-20"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        )}

        {/* 인디케이터 - YouTube 컨트롤과 겹치지 않도록 위치 조정 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {careers.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                onIndexChange(index)
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}