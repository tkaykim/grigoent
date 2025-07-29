'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { Edit, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectStatusUpdateProps {
  proposalId: string
  currentStatus: string
  onStatusUpdate: (proposalId: string, newStatus: string, message?: string) => Promise<void>
  disabled?: boolean
}

export function ProjectStatusUpdate({ 
  proposalId, 
  currentStatus, 
  onStatusUpdate, 
  disabled = false 
}: ProjectStatusUpdateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newStatus, setNewStatus] = useState(currentStatus)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const statusOptions = [
    { value: 'pending', label: '대기중' },
    { value: 'consulting', label: '상담중' },
    { value: 'scheduled', label: '진행예정' },
    { value: 'in_progress', label: '진행중' },
    { value: 'completed', label: '완료' },
    { value: 'cancelled', label: '취소됨' },
    { value: 'rejected', label: '거절됨' },
    { value: 'expired', label: '만료됨' }
  ]

  const handleStatusUpdate = async () => {
    if (newStatus === currentStatus) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      await onStatusUpdate(proposalId, newStatus, message.trim() || undefined)
      toast.success('프로젝트 상태가 업데이트되었습니다.')
      setIsOpen(false)
      setMessage('')
    } catch (error) {
      toast.error('상태 업데이트에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setNewStatus(currentStatus)
    setMessage('')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          상태 변경
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로젝트 상태 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">현재 상태</Label>
            <div className="mt-2">
              <ProjectStatusBadge status={currentStatus} />
            </div>
          </div>
          
          <div>
            <Label htmlFor="new-status" className="text-sm font-medium">
              새로운 상태
            </Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newStatus !== currentStatus && (
            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                상태 변경 메시지 (선택사항)
              </Label>
              <Textarea
                id="message"
                placeholder="상태 변경 이유나 추가 정보를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={isLoading || newStatus === currentStatus}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? '업데이트 중...' : '업데이트'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}