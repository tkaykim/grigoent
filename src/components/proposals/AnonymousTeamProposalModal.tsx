'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnonymousTeamProposalForm } from './AnonymousTeamProposalForm'

interface AnonymousTeamProposalModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  teamName: string
}

export function AnonymousTeamProposalModal({ isOpen, onClose, teamId, teamName }: AnonymousTeamProposalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>익명 팀 섭외 제안</DialogTitle>
        </DialogHeader>
        <AnonymousTeamProposalForm
          teamId={teamId}
          teamName={teamName}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}