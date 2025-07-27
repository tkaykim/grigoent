'use client'

import React, { useState, useRef } from 'react'
import { Button } from './button'
import { ImageCropper } from './image-cropper'
import { Upload, X, User as UserIcon } from 'lucide-react'

interface ProfileImageUploadProps {
  currentImage?: string
  onImageChange: (imageUrl: string) => void
  onImageRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  cropShape?: 'circle' | 'square'
  disabled?: boolean
  uploading?: boolean
  className?: string
}

export function ProfileImageUpload({
  currentImage,
  onImageChange,
  onImageRemove,
  size = 'md',
  cropShape = 'circle',
  disabled = false,
  uploading = false,
  className = ''
}: ProfileImageUploadProps) {
  const [showCropper, setShowCropper] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 크기별 스타일 설정
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  // 파일 선택 핸들러
  const handleFileSelect = (file: File) => {
    if (!file) return

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setSelectedFile(file)
    setShowCropper(true)
  }

  // 크롭 완료 핸들러
  const handleCropComplete = (croppedImageUrl: string) => {
    onImageChange(croppedImageUrl)
    setSelectedFile(null)
    setShowCropper(false)
  }

  // 크롭 취소 핸들러
  const handleCropCancel = () => {
    setSelectedFile(null)
    setShowCropper(false)
  }

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    if (onImageRemove) {
      onImageRemove()
    } else {
      onImageChange('')
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 현재 이미지 표시 */}
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {currentImage ? (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200`}>
              <img
                src={currentImage}
                alt="프로필 이미지"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  console.error('이미지 로드 실패:', e)
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300`}>
              <UserIcon className={`${iconSizes[size]} text-gray-400`} />
            </div>
          )}
        </div>

        {/* 업로드 버튼들 */}
        <div className="flex flex-col space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? '업로드 중...' : '이미지 선택'}
          </Button>

          {currentImage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              disabled={disabled || uploading}
            >
              <X className="w-4 h-4 mr-2" />
              이미지 제거
            </Button>
          )}
        </div>
      </div>

      {/* 이미지 크롭 모달 */}
      <ImageCropper
        isOpen={showCropper}
        onClose={handleCropCancel}
        onCrop={handleCropComplete}
        imageFile={selectedFile}
        cropShape={cropShape}
        aspectRatio={1}
      />
    </div>
  )
} 