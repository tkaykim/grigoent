'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProposalForm } from './ProposalForm'

interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  dancerId: string
  dancerName: string
}

export function ProposalModal({ isOpen, onClose, dancerId, dancerName }: ProposalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>섭외 제안</DialogTitle>
        </DialogHeader>
        <ProposalForm
          dancerId={dancerId}
          dancerName={dancerName}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
} 