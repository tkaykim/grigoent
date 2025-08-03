import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmi1NzQhs5B_XNG17EI74qQPYfeHefDhEnR2wuclLqqt1DYN1-FvqVDT4UVIkXUbEM/exec'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Google Apps Script로 요청 전달
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()
    
    return NextResponse.json(result, { status: response.status })
    
  } catch (error) {
    console.error('Email webhook proxy error:', error)
    return NextResponse.json({ 
      error: '이메일 전송 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 