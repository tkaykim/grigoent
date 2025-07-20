'use client'

import { useState, useRef } from 'react'
import { User } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, User as UserIcon, Calendar, Mail, Edit, Save, X as CloseIcon } from 'lucide-react'

interface UserDashboardProps {
  profile: User
}

export function UserDashboard({ profile }: UserDashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: profile.name || '',
    name_en: profile.name_en || '',
    phone: profile.phone || '',
    profile_image: profile.profile_image || '',
    introduction: profile.introduction || '',
    instagram_url: profile.instagram_url || '',
    twitter_url: profile.twitter_url || '',
    youtube_url: profile.youtube_url || '',
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      console.log('프로필 업데이트 시작:', formData)
      
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          name_en: formData.name_en,
          phone: formData.phone,
          profile_image: formData.profile_image,
          introduction: formData.introduction,
          instagram_url: formData.instagram_url,
          twitter_url: formData.twitter_url,
          youtube_url: formData.youtube_url,
        })
        .eq('id', profile.id)

      if (error) {
        console.error('프로필 업데이트 오류:', error)
        setMessage(`프로필 업데이트 중 오류가 발생했습니다: ${error.message}`)
        return
      }

      console.log('프로필 업데이트 성공')
      setMessage('프로필이 성공적으로 업데이트되었습니다.')
      setIsEditMode(false)
    } catch (error) {
      console.error('프로필 업데이트 예외:', error)
      setMessage(`프로필 업데이트 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = async (file: File) => {
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)
    setMessage('')
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('업로드 오류:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, profile_image: publicUrl }))
      setMessage('이미지가 성공적으로 업로드되었습니다.')
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      setMessage(`이미지 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, profile_image: '' }))
  }

  const cancelEdit = () => {
    setFormData({
      name: profile.name || '',
      name_en: profile.name_en || '',
      phone: profile.phone || '',
      profile_image: profile.profile_image || '',
      introduction: profile.introduction || '',
      instagram_url: profile.instagram_url || '',
      twitter_url: profile.twitter_url || '',
      youtube_url: profile.youtube_url || '',
    })
    setIsEditMode(false)
    setMessage('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* 모드 토글 버튼 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900">프로필 정보</h3>
        {!isEditMode ? (
          <Button
            onClick={() => setIsEditMode(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>수정</span>
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button
              onClick={cancelEdit}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <CloseIcon className="w-4 h-4" />
              <span>취소</span>
            </Button>
            <Button
              onClick={() => document.getElementById('profile-form')?.dispatchEvent(new Event('submit', { bubbles: true }))}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? '저장 중...' : '저장'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* 프로필 정보 표시/수정 */}
      <div className="bg-white rounded-lg border p-6">
        {!isEditMode ? (
          // 열람모드
          <div className="space-y-6">
            {/* 프로필 이미지 */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {formData.profile_image ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                    <img
                      src={formData.profile_image}
                      alt={formData.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <UserIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-zinc-900 mb-1">
                  {formData.name}
                </h2>
                <p className="text-lg text-zinc-600 mb-2">
                  {formData.name_en}
                </p>
                <div className="flex items-center space-x-4 text-sm text-zinc-500">
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {profile.email}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(profile.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* 연락처 */}
            {formData.phone && (
              <div>
                <Label className="text-sm font-medium text-zinc-500">연락처</Label>
                <p className="text-zinc-900">{formData.phone}</p>
              </div>
            )}

            {/* 소개 */}
            {formData.introduction && (
              <div>
                <Label className="text-sm font-medium text-zinc-500">소개</Label>
                <p className="text-zinc-900 whitespace-pre-wrap">{formData.introduction}</p>
              </div>
            )}

            {/* SNS 링크 */}
            {(formData.instagram_url || formData.twitter_url || formData.youtube_url) && (
              <div>
                <Label className="text-sm font-medium text-zinc-500 mb-2 block">SNS 링크</Label>
                <div className="space-y-2">
                  {formData.instagram_url && (
                    <a href={formData.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                      Instagram: {formData.instagram_url}
                    </a>
                  )}
                  {formData.twitter_url && (
                    <a href={formData.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                      Twitter: {formData.twitter_url}
                    </a>
                  )}
                  {formData.youtube_url && (
                    <a href={formData.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                      YouTube: {formData.youtube_url}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 수정모드
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 프로필 이미지 업로드 */}
            <div className="space-y-4">
              <Label>프로필 이미지</Label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {formData.profile_image ? (
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <img
                        src={formData.profile_image}
                        alt={formData.name}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          console.error('이미지 로드 실패:', e)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? '업로드 중...' : '이미지 선택'}
                  </Button>
                  {formData.profile_image && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4 mr-2" />
                      이미지 제거
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">영어 이름 *</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => handleInputChange('name_en', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="introduction">소개</Label>
              <Textarea
                id="introduction"
                value={formData.introduction}
                onChange={(e) => handleInputChange('introduction', e.target.value)}
                placeholder="자신에 대해 소개해주세요..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                  placeholder="https://instagram.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter URL</Label>
                <Input
                  id="twitter_url"
                  value={formData.twitter_url}
                  onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                  placeholder="https://twitter.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube URL</Label>
                <Input
                  id="youtube_url"
                  value={formData.youtube_url}
                  onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                  placeholder="https://youtube.com/@username"
                />
              </div>
            </div>
          </form>
        )}

        {/* 메시지 표시 */}
        {message && (
          <div className={`p-3 rounded-md mt-4 ${
            message.includes('성공') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
} 