'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
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

  // 로딩 중
  if (isLoggedIn === null) {
    return (
      <Button disabled className={`${className}`}>
        <Send className="w-4 h-4 mr-2 animate-spin" />
        로딩 중...
      </Button>
    )
  }

  return (
    <>
      <Button
        onClick={handleProposalClick}
        className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
      >
        <Send className="w-4 h-4 mr-2" />
        제안하기
      </Button>

      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        dancerId={dancerId}
        dancerName={dancerName}
      />

      <AnonymousProposalModal
        isOpen={isAnonymousModalOpen}
        onClose={() => setIsAnonymousModalOpen(false)}
        dancerId={dancerId}
        dancerName={dancerName}
      />
    </>
  )
} 