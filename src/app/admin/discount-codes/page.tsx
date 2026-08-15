'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

// 할인코드 등록·관리.
// 사용 횟수는 사용 이력 행 수로 표시한다(예약분 포함) — 결제 완료 건은 따로 센다.

type Usage = { total: number; confirmed: number }

type Code = {
  id: string
  code: string
  display_name: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_discount_amount: number | null
  min_order_amount: number
  max_uses: number | null
  product_slugs: string[] | null
  is_active: boolean
  expires_at: string | null
  created_at: string
  usage: Usage
}

const PRODUCT_LABEL: Record<string, string> = {
  'training-and-placement': '트레이닝 패키지',
  'audition-fee': '오디션 참가비',
}

function krw(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`
}

function describe(code: Code): string {
  if (code.discount_type === 'percentage') {
    return code.max_discount_amount
      ? `${code.discount_value}% (최대 ${krw(code.max_discount_amount)})`
      : `${code.discount_value}%`
  }
  return krw(code.discount_value)
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('no_session')
  return { Authorization: `Bearer ${session.access_token}` }
}

const EMPTY_FORM = {
  code: '',
  displayName: '',
  description: '',
  discountType: 'fixed_amount' as 'percentage' | 'fixed_amount',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  maxUses: '1',
  productSlugs: [] as string[],
  expiresAt: '',
}

export default function AdminDiscountCodesPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = profile?.type === 'admin'

  const [items, setItems] = useState<Code[]>([])
  const [productSlugs, setProductSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/discount-codes', {
        cache: 'no-store',
        headers: await authHeaders(),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      setItems(json.items || [])
      setProductSlugs(json.productSlugs || [])
      setError('')
    } catch {
      setError('목록을 불러오지 못했습니다. 관리자 계정으로 로그인했는지 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    load()
  }, [authLoading, isAdmin, load])

  const create = async () => {
    setSaving(true)
    setNotice('')
    try {
      const res = await fetch('/api/admin/discount-codes', {
        method: 'POST',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          displayName: form.displayName,
          description: form.description,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          productSlugs: form.productSlugs.length > 0 ? form.productSlugs : null,
          expiresAt: form.expiresAt || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '등록에 실패했습니다.')
      setNotice(`${json.item.code} 등록 완료`)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (code: Code) => {
    try {
      const res = await fetch('/api/admin/discount-codes', {
        method: 'PATCH',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: code.id, isActive: !code.is_active }),
      })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      window.alert('변경에 실패했습니다.')
    }
  }

  if (!authLoading && !isAdmin) {
    return (
      <div>
        <Header />
        <main className="flex min-h-screen items-center justify-center px-4 pt-16">
          <p className="text-zinc-600">관리자만 접근할 수 있습니다.</p>
        </main>
        <Footer />
      </div>
    )
  }

  const labelClass = 'mb-1.5 block text-xs font-semibold text-zinc-700'
  const inputClass =
    'min-h-10 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-950'

  return (
    <div>
      <Header />
      <main className="min-h-screen bg-zinc-50 pt-16">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-zinc-900">할인코드</h1>
            <Button variant="outline" onClick={() => router.push('/admin')}>
              관리자 홈
            </Button>
          </div>

          {notice ? (
            <p className="mb-4 border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="mb-4 border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}

          <section className="mb-10 border border-zinc-200 bg-white p-5">
            <h2 className="mb-4 text-base font-bold text-zinc-900">새 할인코드 등록</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>코드 *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="PEACEMAKER2026"
                  className={`${inputClass} uppercase tracking-wide`}
                />
              </div>
              <div>
                <label className={labelClass}>표시 이름 *</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="파트너 특별 할인"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>할인 방식 *</label>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed_amount' })
                  }
                  className={inputClass}
                >
                  <option value="fixed_amount">금액 할인 (원)</option>
                  <option value="percentage">퍼센트 할인 (%)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  할인 값 * {form.discountType === 'percentage' ? '(%)' : '(원)'}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === 'percentage' ? '10' : '3000000'}
                  className={inputClass}
                />
              </div>
              {form.discountType === 'percentage' ? (
                <div>
                  <label className={labelClass}>최대 할인 금액 (원, 선택)</label>
                  <input
                    type="number"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                    className={inputClass}
                  />
                </div>
              ) : null}
              <div>
                <label className={labelClass}>사용 가능 횟수 (비우면 무제한)</label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>최소 결제 금액 (원, 선택)</label>
                <input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>만료일 (선택)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>적용 상품 (선택 안 하면 전 상품)</label>
                <div className="flex flex-wrap gap-2">
                  {productSlugs.map((slug) => {
                    const on = form.productSlugs.includes(slug)
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            productSlugs: on
                              ? form.productSlugs.filter((s) => s !== slug)
                              : [...form.productSlugs, slug],
                          })
                        }
                        className={`border px-3 py-2 text-xs font-semibold transition ${
                          on
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 text-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        {PRODUCT_LABEL[slug] ?? slug}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>메모 (선택)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <Button className="mt-5" onClick={create} disabled={saving}>
              {saving ? '등록 중…' : '할인코드 등록'}
            </Button>
          </section>

          <h2 className="mb-3 text-base font-bold text-zinc-900">등록된 코드</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">등록된 할인코드가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {items.map((code) => (
                <div key={code.id} className="border border-zinc-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-zinc-900">{code.code}</p>
                      <p className="mt-1 text-sm text-zinc-700">
                        {code.display_name} · {describe(code)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {code.product_slugs
                          ? code.product_slugs.map((s) => PRODUCT_LABEL[s] ?? s).join(', ')
                          : '전 상품'}
                        {' · '}
                        사용 {code.usage.total}
                        {code.max_uses ? ` / ${code.max_uses}` : ' (무제한)'}
                        {code.usage.confirmed > 0 ? ` · 결제완료 ${code.usage.confirmed}` : ''}
                        {code.min_order_amount > 0 ? ` · ${krw(code.min_order_amount)} 이상` : ''}
                        {code.expires_at ? ` · ~${code.expires_at.slice(0, 10)}` : ''}
                      </p>
                      {code.description ? (
                        <p className="mt-1 text-xs text-zinc-500">{code.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold ${
                          code.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {code.is_active ? '사용 중' : '중지'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggle(code)}
                        className="border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-500"
                      >
                        {code.is_active ? '중지' : '재개'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
