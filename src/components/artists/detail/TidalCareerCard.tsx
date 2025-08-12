'use client'

import { CareerEntry } from '@/lib/types'
import { getThumbnailFromUrl, isValidYouTubeUrl } from '@/lib/youtube'
import { isValidInstagramUrl } from '@/lib/instagram'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Heart, Star } from 'lucide-react'
import { useState, useEffect } from 'react'

interface TidalCareerCardProps {
  career: CareerEntry
  onCardClick?: (career: CareerEntry) => void
  onLike?: (career: CareerEntry) => void
  className?: string
  isAdmin?: boolean
  isEditMode?: boolean
  onEdit?: (career: CareerEntry) => void
  onDelete?: (career: CareerEntry) => void
}

export function TidalCareerCard({ 
  career, 
  onCardClick, 
  onLike,
  className = '',
  isAdmin = false,
  isEditMode = false,
  onEdit,
  onDelete,
}: TidalCareerCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)

  const getCareerThumbnail = (career: CareerEntry) => {
    if (career.poster_url) {
      return career.poster_url
    }
    
    if (career.video_url && isValidYouTubeUrl(career.video_url)) {
      return getThumbnailFromUrl(career.video_url)
    }
    
    return null
  }

  useEffect(() => {
    const thumb = getCareerThumbnail(career)
    setThumbnail(thumb)
  }, [career])





  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
    onLike?.(career)
  }

  const handleCardClick = () => {
    onCardClick?.(career)
  }

  return (
    <div 
      className={`
        group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer
        hover:bg-gray-700 transition-all duration-300 hover:scale-105
        shadow-lg hover:shadow-xl w-64 h-80 flex-shrink-0 flex flex-col
        ${className}
      `}
      onClick={handleCardClick}
    >
      {/* 썸네일 */}
      <div className="relative w-full h-40 bg-gray-900 overflow-hidden flex-none">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={career.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Play 버튼 오버레이 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button
            size="lg"
            className="bg-black hover:bg-gray-900 text-white border-2 border-white rounded-full w-16 h-16 shadow-lg"
          >
            <Play className="w-8 h-8 fill-current" />
          </Button>
        </div>

        {/* Like 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white border-0 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
        </Button>

        {/* Edit/Delete 버튼 (수정모드 전용) */}
        {isAdmin && isEditMode && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit?.(career) }}
              className="bg-black/50 hover:bg-black/70 text-white border-0 p-2 rounded-full"
            >
              {/* reuse Play icon area; small pencil via unicode not available; keep minimal; using Heart not right; better import Edit but already not imported here. We'll avoid new imports; use Button label */}
              <span className="text-xs">편집</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete?.(career) }}
              className="bg-red-600/50 hover:bg-red-700/60 text-white border-0 p-2 rounded-full"
            >
              <span className="text-xs">삭제</span>
            </Button>
          </div>
        )}
      </div>

      {/* 카드 내용 */}
      <div className="p-4 flex-1 flex flex-col justify-start">
        {/* 제목 */}
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 leading-tight min-h-[44px]">
          {career.title}
        </h3>

        {/* 안무 설명 */}
        {career.description && (
          <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed min-h-[40px]">
            {career.description}
          </p>
        )}
      </div>
    </div>
  )
} 