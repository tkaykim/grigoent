'use client'

import { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ProposalButton } from '@/components/proposals/ProposalButton'
import { Instagram, Twitter, Youtube, Share2, Play, Edit, Upload } from 'lucide-react'
import { ProfileImageUpload } from '@/components/ui/profile-image-upload'
import { useState } from 'react'

interface ArtistHeroProps {
  artist: User
  onShare?: () => void
  onPlay?: () => void
  isAdmin?: boolean
  onEditMode?: () => void
  isEditMode?: boolean
  onUpdateArtist?: (updates: Partial<User>) => Promise<void> | void
  onUploadProfileImage?: (imageUrl: string) => Promise<void> | void
  onOpenPermissionManager?: () => void
}

export function ArtistHero({ 
  artist, 
  onShare, 
  onPlay, 
  isAdmin = false,
  onEditMode,
  isEditMode = false,
  onUpdateArtist,
  onUploadProfileImage,
  onOpenPermissionManager
}: ArtistHeroProps) {
  const [showImageUploader, setShowImageUploader] = useState(false)

  const handleEditNameKo = () => {
    if (!isEditMode || !onUpdateArtist) return
    const value = window.prompt('한글 이름 수정', artist.name || '')
    if (value !== null) onUpdateArtist({ name: value })
  }

  const handleEditNameEn = () => {
    if (!isEditMode || !onUpdateArtist) return
    const value = window.prompt('영문 이름 수정', artist.name_en || '')
    if (value !== null) onUpdateArtist({ name_en: value })
  }

  const handleEditIntroduction = () => {
    if (!isEditMode || !onUpdateArtist) return
    const value = window.prompt('소개 수정', artist.introduction || '')
    if (value !== null) onUpdateArtist({ introduction: value })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${artist.name} - 아티스트 프로필`,
        url: window.location.href,
      })
    } else {
      onShare?.()
    }
  }

  return (
    <div className="relative h-[70vh] min-h-[500px] md:h-[520px] md:min-h-[520px] md:max-h-[520px] rounded-none overflow-hidden mb-0">
      {/* 배경 이미지 */}
      <div className="absolute inset-0">
        {artist.profile_image ? (
          <img
            src={artist.profile_image}
            alt={artist.name}
            className="w-full h-full object-cover md:object-contain object-center"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
            <span className="text-white text-8xl font-bold opacity-20">
              {artist.name.charAt(0)}
            </span>
          </div>
        )}
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
      </div>
      
             {/* 아티스트 이름과 액션 버튼 오버레이 - 이미지 바로 아래 중앙 */}
       <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20 pb-8">
         <div className="text-center text-white">
           <div className="flex items-center justify-center gap-2 mb-1">
             <h1 className="text-4xl md:text-6xl font-bold text-shadow-lg">
               {artist.name}
             </h1>
             {isAdmin && isEditMode && (
               <button onClick={handleEditNameKo} className="p-1 rounded bg-black/50 border border-white/30 hover:bg-black/70">
                 <Edit className="w-4 h-4" />
               </button>
             )}
           </div>
           <div className="flex items-center justify-center gap-2 mb-6">
             <h2 className="text-2xl md:text-3xl font-medium text-gray-200 text-shadow-md">
               {artist.name_en}
             </h2>
             {isAdmin && isEditMode && (
               <button onClick={handleEditNameEn} className="p-1 rounded bg-black/50 border border-white/30 hover:bg-black/70">
                 <Edit className="w-4 h-4" />
               </button>
             )}
           </div>
           
           {/* 액션 버튼들 - 이름 아래에 나란히 배치 */}
           <div className="flex items-center justify-center gap-4">
             <Button
               onClick={onPlay}
               className="bg-white hover:bg-gray-100 text-black font-bold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
             >
               <Play className="w-6 h-6 mr-2 fill-current" />
               프로필 보기
             </Button>
             
                           <ProposalButton
                dancerId={artist.id}
                dancerName={artist.name}
                className="bg-black hover:bg-gray-900 text-white font-bold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white"
              />
             
             <Button
               onClick={handleShare}
               className="bg-black hover:bg-gray-900 text-white font-bold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-white"
             >
               <Share2 className="w-5 h-5 mr-2" />
               공유
             </Button>
           </div>
         </div>
       </div>
      
      {/* 콘텐츠 오버레이 */}
      <div className="relative z-10 h-full flex flex-col justify-between p-8">
        {/* 상단 정보 */}
        <div className="flex items-start justify-between">
          <div className="text-white flex items-start gap-2">
            {artist.introduction && (
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl leading-relaxed text-shadow-md">
                {artist.introduction}
              </p>
            )}
            {isAdmin && isEditMode && (
              <button onClick={handleEditIntroduction} className="p-1 rounded bg-black/50 border border-white/30 hover:bg-black/70 mt-1">
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
          
                     {/* 관리자 수정모드 버튼 */}
           {isAdmin && (
             <div className="flex items-center gap-2">
               <Button
                 onClick={onEditMode}
                 variant={isEditMode ? 'default' : 'outline'}
                 size="sm"
                 className={isEditMode
                   ? 'bg-white text-black hover:bg-gray-100 border border-white'
                   : 'bg-black/50 hover:bg-black/70 text-white border-white/30 hover:border-white/50 backdrop-blur-sm'}
               >
                 <Edit className={`w-4 h-4 mr-2 ${isEditMode ? 'text-black' : ''}`} />
                 {isEditMode ? '수정모드 종료' : '수정모드'}
               </Button>
               {isEditMode && (
                 <Button
                   onClick={onOpenPermissionManager}
                   variant="outline"
                   size="sm"
                   className="bg-black/50 hover:bg-black/70 text-white border-white/30 hover:border-white/50"
                 >
                   권한
                 </Button>
               )}
             </div>
           )}
        </div>
        {/* 사진 변경 토글 버튼 및 업로더 (수정모드 전용, 레이아웃 영향 최소화) */}
        {isAdmin && isEditMode && (
          <div className="absolute top-4 right-4 z-30">
            <Button
              size="sm"
              variant="outline"
              className="bg-black/60 text-white border-white/40 hover:bg-black/80"
              onClick={() => setShowImageUploader((v) => !v)}
            >
              <Upload className="w-4 h-4 mr-2" /> 사진 변경
            </Button>
          </div>
        )}
        {isAdmin && isEditMode && showImageUploader && (
          <div className="absolute top-16 right-4 z-30 bg-black/80 backdrop-blur-sm p-4 rounded-lg border border-white/20">
            <ProfileImageUpload
              currentImage={artist.profile_image}
              onImageChange={(url) => onUploadProfileImage?.(url)}
              cropShape="circle"
              size="md"
            />
          </div>
        )}
                 {/* 하단 SNS 링크 */}
         <div className="flex items-center justify-center text-white/90">
           {(artist.instagram_url || artist.twitter_url || artist.youtube_url) && (
             <div className="flex space-x-4">
               {artist.instagram_url && (
                 <a
                   href={artist.instagram_url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                 >
                   <Instagram className="w-6 h-6" />
                 </a>
               )}
               {artist.twitter_url && (
                 <a
                   href={artist.twitter_url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                 >
                   <Twitter className="w-6 h-6" />
                 </a>
               )}
               {artist.youtube_url && (
                 <a
                   href={artist.youtube_url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                 >
                   <Youtube className="w-6 h-6" />
                 </a>
               )}
             </div>
           )}
         </div>
      </div>
    </div>
  )
} 