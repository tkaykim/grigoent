import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')

    let query = supabaseAdmin
      .from('career_entries')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('career_entries')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 