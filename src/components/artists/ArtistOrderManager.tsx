'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GripVertical, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface SortableArtistCardProps {
  artist: User
}

function SortableArtistCard({ artist }: SortableArtistCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: artist.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card className={`${isDragging ? 'shadow-lg' : ''} transition-all duration-200`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
            >
              <GripVertical className="w-5 h-5 text-gray-400" />
            </div>
            
            <Avatar className="w-12 h-12">
              <AvatarImage src={artist.profile_image} alt={artist.name} />
              <AvatarFallback className="bg-gray-200">
                {artist.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{artist.name}</h3>
              {artist.name_en && (
                <p className="text-sm text-gray-600">{artist.name_en}</p>
              )}
              {artist.introduction && (
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                  {artist.introduction}
                </p>
              )}
            </div>
            
            <div className="text-sm text-gray-400">
              순서: {artist.display_order || 0}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ArtistOrderManager() {
  const { profile } = useAuth()
  const [artists, setArtists] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalOrder, setOriginalOrder] = useState<User[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (profile?.type === 'admin') {
      fetchArtists()
    }
  }, [profile])

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('type', 'dancer')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('아티스트 로드 오류:', error)
        toast.error('아티스트 목록을 불러오는데 실패했습니다.')
        return
      }

      setArtists(data || [])
      setOriginalOrder(data || [])
      setLoading(false)
    } catch (error) {
      console.error('아티스트 로드 오류:', error)
      toast.error('아티스트 목록을 불러오는데 실패했습니다.')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setArtists((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // display_order 업데이트
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          display_order: index + 1
        }))
        
        setHasChanges(true)
        return updatedItems
      })
    }
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    try {
      // 관리자 권한 재확인
      if (profile?.type !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.')
      }

      // 배치 업데이트를 위한 데이터 준비
      const updates = artists.map(artist => ({
        id: artist.id,
        display_order: artist.display_order
      }))

      console.log('업데이트할 데이터:', updates)

      // 각 아티스트를 개별적으로 업데이트
      for (const update of updates) {
        const { error } = await supabase
          .from('users')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
          .eq('type', 'dancer')

        if (error) {
          console.error('개별 업데이트 오류:', error)
          throw new Error(`순서 업데이트 중 오류가 발생했습니다: ${error.message}`)
        }
      }

      toast.success('아티스트 순서가 저장되었습니다.')
      setHasChanges(false)
      setOriginalOrder([...artists])
    } catch (error) {
      console.error('순서 저장 오류:', error)
      toast.error(error instanceof Error ? error.message : '순서 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setArtists([...originalOrder])
    setHasChanges(false)
  }

  // 관리자가 아니면 렌더링하지 않음
  if (profile?.type !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">아티스트 순서 관리</h2>
          <p className="text-gray-600">드래그 앤 드롭으로 아티스트 순서를 변경할 수 있습니다.</p>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">아티스트 순서 관리</h2>
        <p className="text-gray-600 mb-4">
          드래그 앤 드롭으로 아티스트 순서를 변경할 수 있습니다. 
          변경사항은 홈페이지와 아티스트 페이지에 모두 반영됩니다.
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '저장 중...' : '변경사항 저장'}
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              변경사항 취소
            </Button>
          )}
        </div>
      </div>

      {artists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">등록된 아티스트가 없습니다.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={artists.map(artist => artist.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {artists.map((artist) => (
                <SortableArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}