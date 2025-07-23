'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

export default function CreateTeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    description: '',
    logo_url: '',
    cover_image: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.name_en.trim()) {
      setMessage('팀 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 로그인 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setMessage('로그인이 필요합니다.')
        setTimeout(() => {
          router.push('/signin')
        }, 2000)
        return
      }

      // API 호출을 위한 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('인증 토큰을 가져올 수 없습니다.')
        return
      }

      // 팀 생성 API 호출
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '팀 생성에 실패했습니다.')
      }

      setMessage('팀이 성공적으로 생성되었습니다!')
      
      // 생성된 팀 페이지로 이동
      setTimeout(() => {
        router.push(`/teams/${result.team.slug}`)
      }, 1500)

    } catch (error) {
      console.error('팀 생성 오류:', error)
      setMessage(`팀 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <Link href="/teams" className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4">
              <ArrowLeft className="h-4 w-4" />
              팀 목록으로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">새 팀 생성</h1>
            <p className="text-zinc-600">새로운 댄스 팀을 만들어보세요</p>
          </div>

          {/* 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                팀 정보 입력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 팀 이름 (한국어) */}
                <div className="space-y-2">
                  <Label htmlFor="name">팀 이름 (한국어) *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="예: 댄스 크루 A"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                {/* 팀 이름 (영어) */}
                <div className="space-y-2">
                  <Label htmlFor="name_en">팀 이름 (영어) *</Label>
                  <Input
                    id="name_en"
                    type="text"
                    placeholder="예: Dance Crew A"
                    value={formData.name_en}
                    onChange={(e) => handleInputChange('name_en', e.target.value)}
                    required
                  />
                </div>

                {/* 팀 설명 */}
                <div className="space-y-2">
                  <Label htmlFor="description">팀 설명</Label>
                  <Textarea
                    id="description"
                    placeholder="팀에 대한 간단한 설명을 입력해주세요..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                {/* 로고 URL */}
                <div className="space-y-2">
                  <Label htmlFor="logo_url">로고 이미지 URL</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  />
                </div>

                {/* 커버 이미지 URL */}
                <div className="space-y-2">
                  <Label htmlFor="cover_image">커버 이미지 URL</Label>
                  <Input
                    id="cover_image"
                    type="url"
                    placeholder="https://example.com/cover.png"
                    value={formData.cover_image}
                    onChange={(e) => handleInputChange('cover_image', e.target.value)}
                  />
                </div>

                {/* 메시지 */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.includes('성공') 
                      ? 'bg-green-50 border border-green-200 text-green-600' 
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    {message}
                  </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? '생성 중...' : '팀 생성하기'}
                  </Button>
                  <Link href="/teams">
                    <Button type="button" variant="outline">
                      취소
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 안내사항 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">팀 생성 안내</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 팀을 생성하면 자동으로 팀 리더가 됩니다</li>
              <li>• 팀 이름은 한글과 영문 모두 입력해주세요</li>
              <li>• 팀 설명은 선택사항이지만 팀을 소개하는데 도움이 됩니다</li>
              <li>• 로고와 커버 이미지는 나중에 수정할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
} 