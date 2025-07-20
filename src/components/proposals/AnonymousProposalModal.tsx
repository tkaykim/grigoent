'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnonymousProposalForm } from './AnonymousProposalForm'

interface AnonymousProposalModalProps {
  isOpen: boolean
  onClose: () => void
  dancerId: string
  dancerName: string
}

export function AnonymousProposalModal({ isOpen, onClose, dancerId, dancerName }: AnonymousProposalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>익명 섭외 제안</DialogTitle>
        </DialogHeader>
        <AnonymousProposalForm
          dancerId={dancerId}
          dancerName={dancerName}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
} 