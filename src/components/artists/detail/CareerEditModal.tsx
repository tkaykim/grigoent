'use client'

import { useEffect, useState } from 'react'
import { CareerEntry } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface CareerEditModalProps {
  open: boolean
  career: CareerEntry | null
  onClose: () => void
  onSave: (updates: Partial<CareerEntry>) => Promise<void> | void
  defaultCategory?: string
  defaultIsFeatured?: boolean
}

export function CareerEditModal({ open, career, onClose, onSave, defaultCategory = 'choreography', defaultIsFeatured = false }: CareerEditModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('choreography')
  const [videoUrl, setVideoUrl] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [country, setCountry] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [dateType, setDateType] = useState<'single' | 'range'>('single')
  const [singleDate, setSingleDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    // 초기화
    if (!open) return
    if (career) {
      setTitle(career.title || '')
      setDescription(career.description || '')
      setCategory(career.category || 'choreography')
      setVideoUrl(career.video_url || '')
      setPosterUrl(career.poster_url || '')
      setCountry(career.country || '')
      setIsFeatured(!!career.is_featured)
      if (career.date_type === 'range' || (career.start_date || career.end_date)) {
        setDateType('range')
        setStartDate(career.start_date || '')
        setEndDate(career.end_date || '')
        setSingleDate('')
      } else {
        setDateType('single')
        setSingleDate(career.single_date || '')
        setStartDate('')
        setEndDate('')
      }
    } else {
      // 생성 모드 기본값
      setTitle('')
      setDescription('')
      setCategory(defaultCategory)
      setVideoUrl('')
      setPosterUrl('')
      setCountry('')
      setIsFeatured(!!defaultIsFeatured)
      setDateType('single')
      setSingleDate('')
      setStartDate('')
      setEndDate('')
    }
  }, [open, career, defaultCategory, defaultIsFeatured])

  const handleSave = async () => {
    if (!career) return
    const updates: Partial<CareerEntry> = {
      title: title.trim(),
      description: description.trim() || null || undefined,
      category,
      video_url: videoUrl.trim() || null || undefined,
      poster_url: posterUrl.trim() || null || undefined,
      country: country.trim() || null || undefined,
      is_featured: isFeatured,
      date_type: dateType,
      single_date: dateType === 'single' ? (singleDate || null || undefined) : null || undefined,
      start_date: dateType === 'range' ? (startDate || null || undefined) : null || undefined,
      end_date: dateType === 'range' ? (endDate || null || undefined) : null || undefined,
    }
    await onSave(updates)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl bg-black text-white border border-white/20">
        <DialogHeader>
          <DialogTitle>경력 수정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">제목</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-black/50 text-white border-white/30" />
          </div>
          <div>
            <label className="block text-sm mb-1">설명</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-black/50 text-white border-white/30" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black/50 text-white border border-white/30 rounded px-3 py-2">
                <option value="choreography">안무</option>
                <option value="performance">공연</option>
                <option value="advertisement">광고</option>
                <option value="tv">방송</option>
                <option value="workshop">워크샵</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">국가</label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-black/50 text-white border-white/30" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">영상 URL (YouTube)</label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="bg-black/50 text-white border-white/30" />
            </div>
            <div>
              <label className="block text-sm mb-1">포스터 이미지 URL</label>
              <Input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} className="bg-black/50 text-white border-white/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2">날짜 유형</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={dateType === 'single'} onChange={() => setDateType('single')} /> 단일 날짜
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={dateType === 'range'} onChange={() => setDateType('range')} /> 기간
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> 대표작
              </label>
            </div>
          </div>
          {dateType === 'single' ? (
            <div>
              <label className="block text-sm mb-1">날짜</label>
              <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="bg-black/50 text-white border-white/30" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">시작일</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-black/50 text-white border-white/30" />
              </div>
              <div>
                <label className="block text-sm mb-1">종료일</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-black/50 text-white border-white/30" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={onClose} variant="outline" className="bg-black text-white border-white/40 hover:bg-black/70">취소</Button>
          <Button onClick={handleSave} className="bg-white text-black hover:bg-gray-100 border border-white">저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

