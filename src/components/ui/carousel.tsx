'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface CarouselProps {
  children: React.ReactNode
  className?: string
  showArrows?: boolean
  showDots?: boolean
  autoPlay?: boolean
  interval?: number
}

export function Carousel({
  children,
  className,
  showArrows = true,
  showDots = false,
  autoPlay = false,
  interval = 5000
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const scrollAmount = container.clientWidth * 0.8 // 80%씩 스크롤

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollPosition)
      checkScrollPosition()

      return () => {
        container.removeEventListener('scroll', checkScrollPosition)
      }
    }
  }, [])

  useEffect(() => {
    if (!autoPlay) return

    const timer = setInterval(() => {
      if (canScrollRight) {
        scrollTo('right')
      } else {
        // 끝에 도달하면 처음으로
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        }
      }
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, canScrollRight])

  return (
    <div className={cn('relative group', className)}>
      {/* 스크롤 컨테이너 */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* 화살표 버튼 */}
      {showArrows && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity',
              !canScrollLeft && 'hidden'
            )}
            onClick={() => scrollTo('left')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity',
              !canScrollRight && 'hidden'
            )}
            onClick={() => scrollTo('right')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* 점 표시 */}
      {showDots && (
        <div className="flex justify-center mt-4 space-x-2">
          {/* 점 로직은 필요시 구현 */}
        </div>
      )}
    </div>
  )
}

// 스크롤바 숨기기 CSS
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`

// 스타일 태그 추가
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = scrollbarHideStyles
  document.head.appendChild(style)
} 