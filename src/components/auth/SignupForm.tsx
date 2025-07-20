'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    pending_type: 'general' as 'general' | 'dancer' | 'client'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 유효성 검사
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    try {
      console.log('회원가입 시도:', formData.email)
      await signUp(formData.email, formData.password, {
        name: formData.name,
        name_en: formData.name_en,
        phone: formData.phone,
        pending_type: formData.pending_type === 'general' ? undefined : formData.pending_type,
      })

      console.log('회원가입 성공')
      setLoading(false) // 성공 시 로딩 해제
      router.push('/signin?message=회원가입이 완료되었습니다. 로그인해주세요.')
    } catch (error: unknown) {
      console.error('회원가입 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      setError(errorMessage)
      setLoading(false) // 오류 발생 시 즉시 로딩 해제
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <CardDescription>
            댄서-클라이언트 플랫폼에 가입하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="홍길동"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_en">영어 이름 *</Label>
              <Input
                id="name_en"
                type="text"
                value={formData.name_en}
                onChange={(e) => handleInputChange('name_en', e.target.value)}
                required
                placeholder="Hong Gil-dong"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="010-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pending_type">회원 구분</Label>
              <Select
                value={formData.pending_type}
                onValueChange={(value) => handleInputChange('pending_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="회원 구분을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">일반 회원</SelectItem>
                  <SelectItem value="dancer">댄서</SelectItem>
                  <SelectItem value="client">클라이언트</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                placeholder="최소 6자 이상"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/signin" className="text-zinc-900 hover:underline">
                로그인하기
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 