'use client'

import { CareerEntry } from '@/lib/types'
import { getThumbnailFromUrl, isValidYouTubeUrl } from '@/lib/youtube'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Calendar, MapPin, Star } from 'lucide-react'

interface CareerCardProps {
  career: CareerEntry
  showDetails?: boolean
  className?: string
}

export function CareerCard({ career, showDetails = true, className = '' }: CareerCardProps) {
  const getCareerThumbnail = (career: CareerEntry) => {
    // 1. 포스터 URL이 있으면 우선 사용
    if (career.poster_url) {
      return career.poster_url
    }
    
    // 2. YouTube URL이 있으면 썸네일 생성
    if (career.video_url && isValidYouTubeUrl(career.video_url)) {
      return getThumbnailFromUrl(career.video_url)
    }
    
    return null
  }

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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      choreography: 'bg-blue-100 text-blue-800',
      performance: 'bg-purple-100 text-purple-800',
      advertisement: 'bg-green-100 text-green-800',
      tv: 'bg-red-100 text-red-800',
      workshop: 'bg-yellow-100 text-yellow-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const thumbnail = getCareerThumbnail(career)

  return (
    <Card className={`w-80 flex-shrink-0 hover:shadow-lg transition-all duration-300 group ${className}`}>
      {/* 썸네일 */}
      <div className="aspect-video bg-zinc-100 relative overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={career.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.currentTarget as HTMLElement
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'flex'
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center text-zinc-400 ${thumbnail ? 'hidden' : ''}`}>
          <ExternalLink className="w-8 h-8" />
        </div>
        
        {/* 배지들 */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge className={getCategoryColor(career.category)}>
            {getCategoryLabel(career.category)}
          </Badge>
          {career.is_featured && (
            <Badge className="bg-yellow-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              대표작
            </Badge>
          )}
        </div>
      </div>

      {/* 내용 */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-zinc-900 mb-2 line-clamp-2">
          {career.title}
        </h3>
        
        {showDetails && career.description && (
          <p className="text-sm text-zinc-600 mb-3 line-clamp-2">
            {career.description}
          </p>
        )}

        {/* 메타 정보 */}
        <div className="space-y-1 mb-3">
          {career.country && (
            <div className="flex items-center text-xs text-zinc-500">
              <MapPin className="w-3 h-3 mr-1" />
              {career.country}
            </div>
          )}
          {career.start_date && (
            <div className="flex items-center text-xs text-zinc-500">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(career.start_date)}
              {career.end_date && ` ~ ${formatDate(career.end_date)}`}
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex gap-2">
          {career.video_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(career.video_url, '_blank')}
              className="flex-1 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              영상 보기
            </Button>
          )}
          {career.poster_url && career.poster_url !== thumbnail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(career.poster_url, '_blank')}
              className="flex-1 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              포스터
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 