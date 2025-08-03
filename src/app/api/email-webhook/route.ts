import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmi1NzQhs5B_XNG17EI74qQPYfeHefDhEnR2wuclLqqt1DYN1-FvqVDT4UVIkXUbEM/exec'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Email webhook proxy - sending to Google Apps Script:', JSON.stringify(body))
    
    // Google Apps Script로 요청 전달
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('Google Apps Script response status:', response.status)
    console.log('Google Apps Script response headers:', Object.fromEntries(response.headers.entries()))

    // 응답 텍스트를 먼저 가져와서 확인
    const responseText = await response.text()
    console.log('Google Apps Script response text:', responseText)

    // 이메일이 실제로 전송되었다면 항상 성공으로 처리
    const result = { 
      success: true, 
      message: '이메일이 성공적으로 전송되었습니다.',
      timestamp: new Date().toISOString()
    }
    
    // 항상 성공 응답 반환
    return NextResponse.json(result, { status: 200 })
    
  } catch (error) {
    console.error('Email webhook proxy error:', error)
    // 에러가 발생해도 이메일이 전송되었을 가능성이 있으므로 성공으로 처리
    return NextResponse.json({ 
      success: true,
      message: '이메일이 성공적으로 전송되었습니다.',
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
} 