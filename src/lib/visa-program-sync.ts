import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyVisaProgramEnrollment } from '@/lib/visa-payment-ref'

const QUALIFYING_PRODUCTS = new Set([
  'training-and-placement',
  'monthly-training',
  'monthly-training-100',
])

export async function syncPaidProgramOrderToDeetz(
  supabase: SupabaseClient,
  input: {
    id: string
    orderNo: string
    productId: string
    visaApplicationId: string | null
    customerName: string | null
    customerEmail: string | null
    customerPhone: string | null
    customerNationality: string | null
    preferredLang: string | null
    provider: 'toss' | 'paypal'
    amountKrw: number
    occurredAt: string
    meta?: Record<string, unknown>
  },
): Promise<string | null> {
  if (input.visaApplicationId || !input.customerName || !input.customerEmail) {
    return input.visaApplicationId
  }
  const { data: product, error } = await supabase
    .from('training_products')
    .select('slug')
    .eq('id', input.productId)
    .maybeSingle()
  if (error || !product || !QUALIFYING_PRODUCTS.has(product.slug as string)) return null

  const visaApplicationId = await notifyVisaProgramEnrollment({
    externalTrainingOrderId: input.id,
    orderNo: input.orderNo,
    provider: input.provider,
    amountKrw: input.amountKrw,
    occurredAt: input.occurredAt,
    productSlug: product.slug as 'training-and-placement' | 'monthly-training' | 'monthly-training-100',
    customer: {
      name: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      nationality: input.customerNationality,
      preferredLang: input.preferredLang === 'ko' || input.preferredLang === 'ja' ? input.preferredLang : 'en',
    },
    meta: input.meta,
  })
  if (!visaApplicationId) return null
  const { error: updateError } = await supabase
    .from('training_orders')
    .update({ visa_application_id: visaApplicationId, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .is('visa_application_id', null)
  if (updateError) {
    console.error('[visa-program-sync] order link failed', input.orderNo, updateError.code)
  }
  return visaApplicationId
}
