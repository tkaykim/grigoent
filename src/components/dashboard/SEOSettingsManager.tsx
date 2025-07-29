'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, RotateCcw, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface SEOSetting {
  id: string
  setting_key: string
  setting_value: string
  setting_type: 'text' | 'textarea' | 'url' | 'image'
  description: string
}

export function SEOSettingsManager() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<SEOSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<SEOSetting[]>([])

  useEffect(() => {
    if (profile?.type === 'admin') {
      fetchSettings()
    }
  }, [profile])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_settings')
        .select('*')
        .order('setting_key', { ascending: true })

      if (error) {
        console.error('SEO 설정 로드 오류:', error)
        toast.error('SEO 설정을 불러오는데 실패했습니다.')
        return
      }

      setSettings(data || [])
      setOriginalSettings(data || [])
      setLoading(false)
    } catch (error) {
      console.error('SEO 설정 로드 오류:', error)
      toast.error('SEO 설정을 불러오는데 실패했습니다.')
    }
  }

  const handleSettingChange = (id: string, value: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, setting_value: value }
          : setting
      )
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    try {
      // 관리자 권한 재확인
      if (profile?.type !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.')
      }

      // 변경된 설정만 업데이트
      const changedSettings = settings.filter(setting => {
        const original = originalSettings.find(s => s.id === setting.id)
        return original && original.setting_value !== setting.setting_value
      })

      for (const setting of changedSettings) {
        const { error } = await supabase
          .from('seo_settings')
          .update({ 
            setting_value: setting.setting_value,
            updated_at: new Date().toISOString()
          })
          .eq('id', setting.id)

        if (error) {
          console.error('설정 업데이트 오류:', error)
          throw new Error(`설정 업데이트 중 오류가 발생했습니다: ${error.message}`)
        }
      }

      toast.success('SEO 설정이 저장되었습니다.')
      setHasChanges(false)
      setOriginalSettings([...settings])
    } catch (error) {
      console.error('설정 저장 오류:', error)
      toast.error(error instanceof Error ? error.message : '설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings([...originalSettings])
    setHasChanges(false)
  }

  const handleAddSetting = () => {
    const newSetting: SEOSetting = {
      id: `temp-${Date.now()}`,
      setting_key: '',
      setting_value: '',
      setting_type: 'text',
      description: ''
    }
    setSettings(prev => [...prev, newSetting])
    setHasChanges(true)
  }

  const handleDeleteSetting = async (id: string) => {
    try {
      const { error } = await supabase
        .from('seo_settings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('설정 삭제 오류:', error)
        toast.error('설정 삭제에 실패했습니다.')
        return
      }

      setSettings(prev => prev.filter(s => s.id !== id))
      setOriginalSettings(prev => prev.filter(s => s.id !== id))
      toast.success('설정이 삭제되었습니다.')
    } catch (error) {
      console.error('설정 삭제 오류:', error)
      toast.error('설정 삭제에 실패했습니다.')
    }
  }

  // 관리자가 아니면 렌더링하지 않음
  if (profile?.type !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">SEO 설정 관리</h2>
          <p className="text-gray-600">사이트의 SEO 설정을 관리할 수 있습니다.</p>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">SEO 설정 관리</h2>
        <p className="text-gray-600 mb-4">
          사이트의 제목, 설명, 키워드, 파비콘 등 SEO 관련 설정을 관리할 수 있습니다.
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

          <Button
            onClick={handleAddSetting}
            variant="outline"
            disabled={saving}
          >
            <Upload className="w-4 h-4 mr-2" />
            새 설정 추가
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {settings.map((setting) => (
          <Card key={setting.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{setting.description}</CardTitle>
                <Button
                  onClick={() => handleDeleteSetting(setting.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={`key-${setting.id}`}>설정 키</Label>
                <Input
                  id={`key-${setting.id}`}
                  value={setting.setting_key}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  placeholder="설정 키를 입력하세요"
                />
              </div>

              <div>
                <Label htmlFor={`value-${setting.id}`}>설정 값</Label>
                {setting.setting_type === 'textarea' ? (
                  <Textarea
                    id={`value-${setting.id}`}
                    value={setting.setting_value}
                    onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    placeholder="설정 값을 입력하세요"
                    rows={4}
                  />
                ) : (
                  <Input
                    id={`value-${setting.id}`}
                    value={setting.setting_value}
                    onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    placeholder="설정 값을 입력하세요"
                    type={setting.setting_type === 'url' ? 'url' : 'text'}
                  />
                )}
              </div>

              <div>
                <Label htmlFor={`type-${setting.id}`}>설정 타입</Label>
                <select
                  id={`type-${setting.id}`}
                  value={setting.setting_type}
                  onChange={(e) => {
                    setSettings(prev => 
                      prev.map(s => 
                        s.id === setting.id 
                          ? { ...s, setting_type: e.target.value as any }
                          : s
                      )
                    )
                    setHasChanges(true)
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="text">텍스트</option>
                  <option value="textarea">긴 텍스트</option>
                  <option value="url">URL</option>
                  <option value="image">이미지 URL</option>
                </select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">등록된 SEO 설정이 없습니다.</p>
        </div>
      )}
    </div>
  )
}