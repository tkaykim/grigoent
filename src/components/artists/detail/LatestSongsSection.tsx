'use client'

import { CareerEntry } from '@/lib/types'
import { getThumbnailFromUrl, isValidYouTubeUrl } from '@/lib/youtube'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Play } from 'lucide-react'
import { useState } from 'react'

interface LatestSongsSectionProps {
  careers: CareerEntry[]
  onVideoOpen: (career: CareerEntry) => void
  className?: string
  isAdmin?: boolean
  isEditMode?: boolean
  onEdit?: (career: CareerEntry) => void
  onDelete?: (career: CareerEntry) => void
  title?: string
}

export function LatestSongsSection({ careers, onVideoOpen, className = '', isAdmin = false, isEditMode = false, onEdit, onDelete, title = 'Latest Songs' }: LatestSongsSectionProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 4
  const totalPages = Math.ceil(careers.length / itemsPerPage)

  const getCareerThumbnail = (career: CareerEntry) => {
    if (career.poster_url) return career.poster_url
    if (career.video_url && isValidYouTubeUrl(career.video_url)) {
      return getThumbnailFromUrl(career.video_url)
    }
    return null
  }

  const nextPage = () => setCurrentPage((prev) => (prev + 1) % totalPages)
  const prevPage = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)

  const currentCareers = careers.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  if (careers.length === 0) return null

  return (
    <div className={`mb-12 ${className}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        </div>
        
        
      </div>

             <div className="relative">
         <div className="overflow-x-auto scrollbar-hide">
           <div className="flex space-x-6">
             {Array.from({ length: totalPages }, (_, pageIndex) => {
               const pageCareers = careers.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage)
               
               return (
                 <div key={pageIndex} className="flex-shrink-0">
                   <div className="space-y-4">
                      {pageCareers.map((career) => (
                        <div key={career.id} className="group flex items-center space-x-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all duration-300 cursor-pointer w-96" onClick={() => { if (!isEditMode) onVideoOpen(career) }}>
                         <div className="flex-shrink-0 w-16 h-16 bg-gray-900 rounded-lg overflow-hidden">
                           {getCareerThumbnail(career) ? (
                             <img src={getCareerThumbnail(career)!} alt={career.title} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                               <Play className="w-6 h-6 text-gray-400" />
                             </div>
                           )}
                         </div>

                         <div className="flex-1 min-w-0">
                           <div className="flex items-center space-x-2 mb-1">
                             <h3 className="text-white font-semibold text-lg truncate">{career.title}</h3>
                             {career.description && career.description.length > 50 && (
                               <Badge className="bg-gray-600 text-white text-xs px-1 py-0">E</Badge>
                             )}
                           </div>
                           <p className="text-gray-300 text-sm truncate">{career.description || '설명 없음'}</p>
                         </div>

                          {isAdmin && isEditMode ? (
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit?.(career) }} className="flex-shrink-0 bg-black/40 hover:bg-black/60 text-white px-2 py-1 rounded">
                                편집
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete?.(career) }} className="flex-shrink-0 bg-red-600/60 hover:bg-red-700/70 text-white px-2 py-1 rounded">
                                삭제
                              </Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onVideoOpen(career); }} className="flex-shrink-0 bg-transparent hover:bg-black/20 text-white p-2 rounded-full">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          )}
                       </div>
                     ))}

                     {pageCareers.length < itemsPerPage && Array.from({ length: itemsPerPage - pageCareers.length }).map((_, index) => (
                       <div key={`empty-${index}`} className="flex items-center space-x-4 p-4 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600 w-96">
                         <div className="w-16 h-16 bg-gray-700 rounded-lg"></div>
                         <div className="flex-1">
                           <div className="h-5 bg-gray-700 rounded w-32 mb-2"></div>
                           <div className="h-4 bg-gray-700 rounded w-24"></div>
                         </div>
                         <div className="w-10 h-10"></div>
                       </div>
                     ))}
                   </div>
                 </div>
               )
             })}
           </div>
         </div>

        
      </div>
    </div>
  )
} 