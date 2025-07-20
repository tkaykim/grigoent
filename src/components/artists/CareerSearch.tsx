'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, Calendar, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CareerEntry } from '@/lib/types'

interface CareerSearchProps {
  careers: CareerEntry[]
  onFilteredCareers: (careers: CareerEntry[]) => void
  className?: string
}

export function CareerSearch({ careers, onFilteredCareers, className = '' }: CareerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [isExpanded, setIsExpanded] = useState(false)

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'choreography', label: '안무' },
    { value: 'performance', label: '공연' },
    { value: 'advertisement', label: '광고' },
    { value: 'tv', label: '방송' },
    { value: 'workshop', label: '워크샵' }
  ]

  // 연도 목록 생성 (최근 10년)
  const currentYear = new Date().getFullYear()
  const years = [
    { value: 'all', label: '전체 연도' },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString()
    }))
  ]

  useEffect(() => {
    filterCareers()
  }, [searchQuery, selectedCategory, selectedYear, careers])

  const filterCareers = () => {
    let filtered = careers

    // 텍스트 검색
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase()
      filtered = filtered.filter(career => 
        career.title.toLowerCase().includes(searchTerm) ||
        (career.description && career.description.toLowerCase().includes(searchTerm)) ||
        (career.country && career.country.toLowerCase().includes(searchTerm))
      )
    }

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(career => career.category === selectedCategory)
    }

    // 연도 필터
    if (selectedYear !== 'all') {
      filtered = filtered.filter(career => {
        if (!career.start_date) return false
        const careerYear = new Date(career.start_date).getFullYear().toString()
        return careerYear === selectedYear
      })
    }

    onFilteredCareers(filtered)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedYear('all')
  }

  const hasActiveFilters = searchQuery.trim() || selectedCategory !== 'all' || selectedYear !== 'all'

  const getCategoryLabel = (category: string) => {
    const found = categories.find(c => c.value === category)
    return found ? found.label : category
  }

  return (
    <Card className={`mb-6 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 검색 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-zinc-500" />
              <h3 className="text-lg font-semibold text-zinc-900">경력 검색</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1"
            >
              <Filter className="w-4 h-4" />
              <span>필터</span>
            </Button>
          </div>

          {/* 검색 입력 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="경력 제목, 설명, 국가로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* 확장된 필터 */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t border-zinc-200">
              {/* 카테고리 필터 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block flex items-center">
                  <Filter className="w-4 h-4 mr-1" />
                  카테고리별 필터
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category.value}
                      variant={selectedCategory === category.value ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-zinc-100 transition-colors"
                      onClick={() => setSelectedCategory(category.value)}
                    >
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 연도 필터 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  연도별 필터
                </label>
                <div className="flex flex-wrap gap-2">
                  {years.map((year) => (
                    <Badge
                      key={year.value}
                      variant={selectedYear === year.value ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-zinc-100 transition-colors"
                      onClick={() => setSelectedYear(year.value)}
                    >
                      {year.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 활성 필터 표시 */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-zinc-600">활성 필터:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    검색어: "{searchQuery}"
                  </Badge>
                )}
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    카테고리: {getCategoryLabel(selectedCategory)}
                  </Badge>
                )}
                {selectedYear !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    연도: {selectedYear}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <X className="w-4 h-4 mr-1" />
                필터 초기화
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 