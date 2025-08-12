'use client'

import { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, User as UserIcon } from 'lucide-react'
import { useState } from 'react'

interface BiographySectionProps {
  artist: User
  className?: string
}

export function BiographySection({ artist, className = '' }: BiographySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!artist.introduction) return null

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={`mb-12 ${className}`}>
      <div className="bg-gray-800 rounded-lg p-8">
        {/* 헤더 */}
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">소개</h2>
            <p className="text-gray-400 text-sm">아티스트에 대해 알아보세요</p>
          </div>
        </div>

        {/* 소개 내용 */}
        <div className="relative">
          <div className={`text-gray-300 leading-relaxed ${isExpanded ? '' : 'line-clamp-4'}`}>
            {artist.introduction}
          </div>
          
          {/* 확장/축소 버튼 */}
          {artist.introduction.length > 200 && (
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={toggleExpanded}
                className="text-white hover:text-white hover:bg-black px-4 py-2 rounded-full transition-all duration-300 border border-white"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    더 보기
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* 추가 정보 */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">기본 정보</h3>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center">
                  <span className="font-medium w-20">이름:</span>
                  <span>{artist.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium w-20">영문명:</span>
                  <span>{artist.name_en}</span>
                </div>
                {artist.phone && (
                  <div className="flex items-center">
                    <span className="font-medium w-20">연락처:</span>
                    <span>{artist.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SNS 링크 */}
            {(artist.instagram_url || artist.twitter_url || artist.youtube_url) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">소셜 미디어</h3>
                <div className="space-y-2">
                  {artist.instagram_url && (
                    <div className="flex items-center">
                      <span className="font-medium w-20 text-gray-300">Instagram:</span>
                      <a 
                        href={artist.instagram_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        @{artist.instagram_url.split('/').pop()}
                      </a>
                    </div>
                  )}
                  {artist.twitter_url && (
                    <div className="flex items-center">
                      <span className="font-medium w-20 text-gray-300">Twitter:</span>
                      <a 
                        href={artist.twitter_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        @{artist.twitter_url.split('/').pop()}
                      </a>
                    </div>
                  )}
                  {artist.youtube_url && (
                    <div className="flex items-center">
                      <span className="font-medium w-20 text-gray-300">YouTube:</span>
                      <a 
                        href={artist.youtube_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        채널 보기
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 