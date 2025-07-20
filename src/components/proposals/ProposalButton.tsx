'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, UserCheck, User, LogIn } from 'lucide-react'
import { ProposalModal } from './ProposalModal'
import { AnonymousProposalModal } from './AnonymousProposalModal'
import { supabase } from '@/lib/supabase'

interface ProposalButtonProps {
  dancerId: string
  dancerName: string
  className?: string
}

export function ProposalButton({ dancerId, dancerName, className = '' }: ProposalButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false)
  const [isAnonymousModalOpen, setIsAnonymousModalOpen] = useState(false)

  useEffect(() => {
    checkAuthStatus()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    } catch (error) {
      console.error('Auth check error:', error)
      setIsLoggedIn(false)
    }
  }

  const handleProposalClick = () => {
    if (isLoggedIn) {
      setIsProposalModalOpen(true)
    } else {
      setIsAnonymousModalOpen(true)
    }
  }

  const handleLoginClick = () => {
    window.location.href = '/signin'
  }

  // 로딩 중
  if (isLoggedIn === null) {
    return (
      <Button disabled className={`${className}`}>
        <Send className="w-4 h-4 mr-2 animate-spin" />
        로딩 중...
      </Button>
    )
  }

  // 로그인된 경우
  if (isLoggedIn) {
    return (
      <>
        <Button
          onClick={handleProposalClick}
          className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
        >
          <Send className="w-4 h-4 mr-2" />
          섭외 제안하기
          <Badge variant="secondary" className="ml-2 text-xs">
            로그인됨
          </Badge>
        </Button>

        <ProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          dancerId={dancerId}
          dancerName={dancerName}
        />
      </>
    )
  }

  // 로그인되지 않은 경우
  return (
    <>
      <div className="flex space-x-2">
        <Button
          onClick={handleProposalClick}
          className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
        >
          <Send className="w-4 h-4 mr-2" />
          익명 제안하기
          <Badge variant="secondary" className="ml-2 text-xs">
            로그인 불필요
          </Badge>
        </Button>
        
        <Button
          onClick={handleLoginClick}
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
        >
          <LogIn className="w-4 h-4 mr-1" />
          로그인
        </Button>
      </div>

      <AnonymousProposalModal
        isOpen={isAnonymousModalOpen}
        onClose={() => setIsAnonymousModalOpen(false)}
        dancerId={dancerId}
        dancerName={dancerName}
      />
    </>
  )
} 