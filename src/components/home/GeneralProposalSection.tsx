'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Users, User, Building } from 'lucide-react'
import Link from 'next/link'

export function GeneralProposalSection() {
  return (
    <section className="py-16 bg-zinc-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">프로젝트 의뢰하기</h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            특정 댄서나 팀을 지정하지 않고 프로젝트를 의뢰하세요. 
            적절한 댄서나 팀이 확인 후 연락드리겠습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">개별 댄서</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">
                특정 댄서에게 직접 제안을 보내세요.
              </p>
              <Link href="/artists">
                <Button className="w-full">
                  댄서 찾기
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">팀</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">
                댄스 팀에게 제안을 보내세요.
              </p>
              <Link href="/teams">
                <Button className="w-full">
                  팀 찾기
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">일반 의뢰</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">
                특정 대상 없이 프로젝트를 의뢰하세요.
              </p>
              <Link href="/proposals/general">
                <Button className="w-full">
                  의뢰하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}