'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { MapPin, Mail, Phone, Clock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ContactFormData {
  name: string
  contact: string
  inquiry: string
}

export function ContactSection() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    contact: '',
    inquiry: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 필수 필드 검증
      if (!formData.name || !formData.contact || !formData.inquiry) {
        toast.error('모든 항목을 입력해주세요.')
        return
      }

      // 연락처 형식 검증 (이메일 또는 전화번호)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const phoneRegex = /^[0-9+\-\s()]+$/
      
      if (!emailRegex.test(formData.contact) && !phoneRegex.test(formData.contact)) {
        toast.error('올바른 이메일 또는 전화번호를 입력해주세요.')
        return
      }

      // Proposal 데이터 준비
      const proposalData = {
        title: `문의: ${formData.name}`,
        description: `문의 내용:\n${formData.inquiry}\n\n연락처 정보:\n이름: ${formData.name}\n연락처: ${formData.contact}`,
        project_type: 'inquiry',
        status: 'pending',
        client_id: null,
        dancer_id: null
      }

      // API 호출
      const response = await fetch('/api/proposals/anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalData),
      })

      if (!response.ok) {
        throw new Error('문의 전송에 실패했습니다.')
      }

      toast.success('문의가 성공적으로 전송되었습니다! 빠른 시일 내에 연락드리겠습니다.')
      
      // 폼 초기화
      setFormData({
        name: '',
        contact: '',
        inquiry: ''
      })

    } catch (error) {
      console.error('Contact form error:', error)
      toast.error('문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact" className="py-20 bg-zinc-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('contact.title')}
          </h2>
          <p className="text-xl text-zinc-300 max-w-3xl mx-auto whitespace-pre-line">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* 연락처 정보 */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-semibold mb-6">{t('contact.getintouch')}</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t('contact.address')}</h4>
                  <p className="text-zinc-300">
                    서울특별시 마포구 성지3길 55, 3층<br />
                    (주) 그리고 엔터테인먼트
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Mail className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t('contact.email')}</h4>
                  <p className="text-zinc-300">
                    contact@grigoent.co.kr
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Phone className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t('contact.phone')}</h4>
                  <p className="text-zinc-300">
                    +82) 02-6229-9229
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{t('contact.businesshours')}</h4>
                  <p className="text-zinc-300">
                    {t('contact.businesshours.weekday')}<br />
                    {t('contact.businesshours.weekend')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 간단한 문의 폼 */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-semibold mb-6">간단한 문의</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="이름 *"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  required
                />
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="이메일 또는 전화번호 *"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              {/* 문의사항 */}
              <textarea
                name="inquiry"
                value={formData.inquiry}
                onChange={handleInputChange}
                placeholder="문의사항을 간단히 작성해주세요 *"
                rows={6}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500 resize-none"
                required
              />

              {/* 제출 버튼 */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-zinc-900 py-3 px-6 rounded-lg font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>전송 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>문의 보내기</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
} 