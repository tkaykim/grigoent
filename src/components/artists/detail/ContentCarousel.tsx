'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface ContentCarouselProps {
  title: string
  items: any[]
  renderItem: (item: any, index: number) => ReactNode
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

export function ContentCarousel({ 
  title, 
  items, 
  renderItem, 
  showViewAll = false, 
  onViewAll,
  className = ''
}: ContentCarouselProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  const scrollTo = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    checkScrollButtons()
    window.addEventListener('resize', checkScrollButtons)
    return () => window.removeEventListener('resize', checkScrollButtons)
  }, [items])

  if (items.length === 0) return null

  return (
    <div className={`mb-12 tidal-fade-in ${className}`}>
      {/* 섹션 헤더 - title이 있을 때만 표시 */}
      {title && (
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
          </div>
          {showViewAll && (
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="text-white hover:text-white hover:bg-black px-6 py-3 rounded-full transition-all duration-300 border border-white"
            >
              VIEW ALL
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* 캐러셀 컨테이너 */}
      <div className="relative group">
        {/* 좌우 스크롤 버튼 */}
        {canScrollLeft && (
          <Button
            onClick={() => scrollTo('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white rounded-full w-14 h-14 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 -ml-7 backdrop-blur-sm border border-white/20"
          >
            <ChevronLeft className="w-7 h-7" />
          </Button>
        )}
        
        {canScrollRight && (
          <Button
            onClick={() => scrollTo('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white rounded-full w-14 h-14 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 -mr-7 backdrop-blur-sm border border-white/20"
          >
            <ChevronRight className="w-7 h-7" />
          </Button>
        )}

        {/* 스크롤 컨테이너 */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-6 tidal-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <div key={index} className="flex-shrink-0 tidal-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>

        {/* 스크롤 인디케이터 */}
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(items.length / 4) }, (_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-600 transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </div>
  )
} 