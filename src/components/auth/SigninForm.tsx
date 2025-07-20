'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SigninForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    const messageParam = searchParams.get('message')
    if (messageParam) {
      setMessage(messageParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('로그인 시도:', formData.email)
      await signIn(formData.email, formData.password)
      router.push('/mypage')
    } catch (error: unknown) {
      console.error('로그인 오류:', error)
      let errorMessage = '로그인 중 오류가 발생했습니다.'
      
      if (error instanceof Error) {
        errorMessage = error.message
        // Supabase 오류 메시지 한글화
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">로그인</CardTitle>
          <CardDescription>
            댄서-클라이언트 플랫폼에 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
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
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {message && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                {message}
              </div>
            )}

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
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-zinc-900 hover:underline">
                회원가입하기
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 