import { NextRequest, NextResponse } from 'next/server'
import { whatsAppAutomation } from '@/lib/automation/whatsapp'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少 sessionId 参数' },
        { status: 400 }
      )
    }

    const result = await whatsAppAutomation.getLoginStatus(sessionId)
    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Error getting login status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取登录状态失败' 
      },
      { status: 500 }
    )
  }
} 