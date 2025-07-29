'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, Team } from '@/lib/types'
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
import { GripVertical, Save, RotateCcw, Users, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'

interface SortableItem {
  id: string
  type: 'artist' | 'team'
  data: User | Team
  display_order: number
}

interface SortableItemCardProps {
  item: SortableItem
}

function SortableItemCard({ item }: SortableItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isArtist = item.type === 'artist'
  const artist = isArtist ? item.data as User : null
  const team = !isArtist ? item.data as Team : null

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
            
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {isArtist ? (
                  <>
                    <AvatarImage src={artist?.profile_image} alt={artist?.name} />
                    <AvatarFallback className="bg-blue-100">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src={team?.logo_url} alt={team?.name} />
                    <AvatarFallback className="bg-green-100">
                      <Users className="w-6 h-6 text-green-600" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              
              <div className="flex items-center gap-2">
                {isArtist ? (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    아티스트
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    팀
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {isArtist ? artist?.name : team?.name}
              </h3>
              {isArtist ? (
                <>
                  {artist?.name_en && (
                    <p className="text-sm text-gray-600">{artist.name_en}</p>
                  )}
                  {artist?.introduction && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {artist.introduction}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {team?.name_en && (
                    <p className="text-sm text-gray-600">{team.name_en}</p>
                  )}
                  {team?.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {team.description}
                    </p>
                  )}
                </>
              )}
            </div>
            
            <div className="text-sm text-gray-400">
              순서: {item.display_order || 0}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ArtistTeamOrderManager() {
  const { profile } = useAuth()
  const [items, setItems] = useState<SortableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalOrder, setOriginalOrder] = useState<SortableItem[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (profile?.type === 'admin') {
      fetchItems()
    }
  }, [profile])

  const fetchItems = async () => {
    try {
      // 통합 순서 테이블에서 데이터 가져오기
      const { data: orderItems, error: orderError } = await supabase
        .from('display_order_items')
        .select('*')
        .order('display_order', { ascending: true })

      if (orderError) {
        console.error('순서 데이터 로드 오류:', orderError)
        toast.error('순서 데이터를 불러오는데 실패했습니다.')
        return
      }

      if (!orderItems || orderItems.length === 0) {
        // 통합 순서 테이블이 비어있으면 기존 방식으로 데이터 가져오기
        await initializeOrderTable()
        return
      }

      // 아티스트와 팀 데이터 가져오기
      const artistIds = orderItems
        .filter(item => item.item_type === 'artist')
        .map(item => item.item_id)
      
      const teamIds = orderItems
        .filter(item => item.item_type === 'team')
        .map(item => item.item_id)

      const [artistsResult, teamsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('type', 'dancer')
          .in('id', artistIds),
        supabase
          .from('teams')
          .select('*')
          .eq('status', 'active')
          .in('id', teamIds)
      ])

      if (artistsResult.error) {
        console.error('아티스트 로드 오류:', artistsResult.error)
        toast.error('아티스트 목록을 불러오는데 실패했습니다.')
        return
      }

      if (teamsResult.error) {
        console.error('팀 로드 오류:', teamsResult.error)
        toast.error('팀 목록을 불러오는데 실패했습니다.')
        return
      }

      // 순서 테이블의 순서대로 아이템 구성
      const allItems: SortableItem[] = orderItems.map(orderItem => {
        if (orderItem.item_type === 'artist') {
          const artist = artistsResult.data?.find(a => a.id === orderItem.item_id)
          if (artist) {
            return {
              id: `artist-${artist.id}`,
              type: 'artist' as const,
              data: artist,
              display_order: orderItem.display_order
            }
          }
        } else if (orderItem.item_type === 'team') {
          const team = teamsResult.data?.find(t => t.id === orderItem.item_id)
          if (team) {
            return {
              id: `team-${team.id}`,
              type: 'team' as const,
              data: team,
              display_order: orderItem.display_order
            }
          }
        }
        return null
      }).filter(Boolean) as SortableItem[]

      setItems(allItems)
      setOriginalOrder(allItems)
      setLoading(false)
    } catch (error) {
      console.error('아이템 로드 오류:', error)
      toast.error('목록을 불러오는데 실패했습니다.')
    }
  }

  const initializeOrderTable = async () => {
    try {
      // 기존 아티스트와 팀 데이터 가져오기
      const [artistsResult, teamsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('type', 'dancer')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('teams')
          .select('*')
          .eq('status', 'active')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true })
      ])

      if (artistsResult.error || teamsResult.error) {
        throw new Error('데이터 로드 실패')
      }

      // 통합 순서 테이블에 데이터 삽입
      const orderItems = []
      let order = 1

      // 아티스트 먼저 추가
      for (const artist of artistsResult.data || []) {
        orderItems.push({
          item_type: 'artist',
          item_id: artist.id,
          display_order: order++
        })
      }

      // 팀 추가
      for (const team of teamsResult.data || []) {
        orderItems.push({
          item_type: 'team',
          item_id: team.id,
          display_order: order++
        })
      }

      // 통합 순서 테이블에 삽입
      const { error: insertError } = await supabase
        .from('display_order_items')
        .insert(orderItems)

      if (insertError) {
        console.error('순서 테이블 초기화 오류:', insertError)
        throw new Error('순서 테이블 초기화 실패')
      }

      // 다시 데이터 로드
      await fetchItems()
    } catch (error) {
      console.error('순서 테이블 초기화 오류:', error)
      toast.error('순서 테이블 초기화에 실패했습니다.')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(item => item.id === active.id)
        const newIndex = currentItems.findIndex(item => item.id === over?.id)
        
        const newItems = arrayMove(currentItems, oldIndex, newIndex)
        
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

      // 통합 순서 테이블 업데이트
      const orderUpdates = items.map(item => ({
        item_type: item.type,
        item_id: item.type === 'artist' ? (item.data as User).id : (item.data as Team).id,
        display_order: item.display_order
      }))

      console.log('업데이트할 순서 데이터:', orderUpdates)

      // 기존 순서 데이터 삭제
      const { error: deleteError } = await supabase
        .from('display_order_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 데이터 삭제

      if (deleteError) {
        console.error('기존 순서 데이터 삭제 오류:', deleteError)
        throw new Error(`기존 순서 데이터 삭제 중 오류가 발생했습니다: ${deleteError.message}`)
      }

      // 새로운 순서 데이터 삽입
      const { error: insertError } = await supabase
        .from('display_order_items')
        .insert(orderUpdates)

      if (insertError) {
        console.error('새 순서 데이터 삽입 오류:', insertError)
        throw new Error(`새 순서 데이터 삽입 중 오류가 발생했습니다: ${insertError.message}`)
      }

      toast.success('아티스트와 팀 순서가 저장되었습니다.')
      setHasChanges(false)
      setOriginalOrder([...items])
    } catch (error) {
      console.error('순서 저장 오류:', error)
      toast.error(error instanceof Error ? error.message : '순서 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setItems([...originalOrder])
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
          <h2 className="text-2xl font-bold mb-2">아티스트 & 팀 순서 관리</h2>
          <p className="text-gray-600">드래그 앤 드롭으로 아티스트와 팀 순서를 변경할 수 있습니다.</p>
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
        <h2 className="text-2xl font-bold mb-2">아티스트 & 팀 순서 관리</h2>
        <p className="text-gray-600 mb-4">
          드래그 앤 드롭으로 아티스트와 팀 순서를 변경할 수 있습니다. 
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

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">등록된 아티스트와 팀이 없습니다.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {items.map((item) => (
                <SortableItemCard key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}