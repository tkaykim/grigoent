'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface ArtistSearchProps {
  onSearch: (query: string, category: string) => void
  onClear: () => void
  className?: string
}

export function ArtistSearch({ onSearch, onClear, className = '' }: ArtistSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isExpanded, setIsExpanded] = useState(false)

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'choreography', label: '안무' },
    { value: 'performance', label: '공연' },
    { value: 'advertisement', label: '광고' },
    { value: 'tv', label: '방송' },
    { value: 'workshop', label: '워크샵' }
  ]

  useEffect(() => {
    // 검색어나 카테고리가 변경될 때마다 검색 실행
    if (searchQuery.trim() || selectedCategory !== 'all') {
      onSearch(searchQuery.trim(), selectedCategory)
    } else {
      onClear()
    }
  }, [searchQuery, selectedCategory, onSearch, onClear])

  const handleClear = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    onClear()
  }

  const hasActiveFilters = searchQuery.trim() || selectedCategory !== 'all'

  return (
    <Card className={`mb-6 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 검색 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-white/60" />
              <h3 className="text-lg font-semibold text-white">아티스트 검색</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 border-white/20 text-white hover:bg-white/10"
            >
              <Filter className="w-4 h-4" />
              <span>필터</span>
            </Button>
          </div>

          {/* 검색 입력 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="아티스트 이름 또는 영어 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-white/60 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* 확장된 필터 */}
          {isExpanded && (
            <div className="space-y-3 pt-4 border-t border-white/20">
              <div>
                <label className="text-sm font-medium text-white/80 mb-2 block">
                  카테고리별 필터
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category.value}
                      variant={selectedCategory === category.value ? 'default' : 'outline'}
                      className={`cursor-pointer transition-colors ${
                        selectedCategory === category.value 
                          ? 'bg-white text-black' 
                          : 'border-white/30 text-white hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedCategory(category.value)}
                    >
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 활성 필터 표시 */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-white/20">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white/60">활성 필터:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                    검색어: "{searchQuery}"
                  </Badge>
                )}
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                    카테고리: {categories.find(c => c.value === selectedCategory)?.label}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-white/60 hover:text-white"
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