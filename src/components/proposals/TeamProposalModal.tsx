'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TeamProposalForm } from './TeamProposalForm'

interface TeamProposalModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  teamName: string
}

export function TeamProposalModal({ isOpen, onClose, teamId, teamName }: TeamProposalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>팀 섭외 제안</DialogTitle>
        </DialogHeader>
        <TeamProposalForm
          teamId={teamId}
          teamName={teamName}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}