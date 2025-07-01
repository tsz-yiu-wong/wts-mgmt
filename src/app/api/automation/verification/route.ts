import { NextRequest, NextResponse } from 'next/server'
import { whatsAppAutomation } from '@/lib/automation/whatsapp'
import { supabase, isTestMode } from '@/lib/supabase'

// Mock 数据存储（仅用于测试）
const mockSessions = new Map()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '会话ID不能为空' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      // 测试模式：返回模拟验证码
      const mockCode = Math.floor(10000000 + Math.random() * 90000000).toString() // 8位数字
      
      console.log(`[测试模式] 生成验证码: ${mockCode}`)

      return NextResponse.json({
        success: true,
        code: mockCode,
        message: '验证码获取成功 (测试模式)'
      })
    }

    // 生产模式：使用真实数据库
    // 验证会话是否存在且未过期
    const { data: session, error } = await supabase
      .from('login_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { success: false, error: '会话不存在或已过期' },
        { status: 404 }
      )
    }

    // 检查会话是否过期
    if (new Date(session.expires_at) < new Date()) {
      await whatsAppAutomation.cleanupSession(sessionId)
      return NextResponse.json(
        { success: false, error: '会话已过期' },
        { status: 410 }
      )
    }

    // 获取验证码
    const result = await whatsAppAutomation.getVerificationCode(sessionId)

    if (result.success && result.code) {
      // 更新数据库中的验证码
      await supabase
        .from('login_sessions')
        .update({
          verification_code: result.code,
          status: 'code_sent'
        })
        .eq('id', sessionId)

      return NextResponse.json({
        success: true,
        code: result.code,
        message: '验证码获取成功'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || '验证码获取失败'
      })
    }

  } catch (error) {
    console.error('Verification code error:', error)
    return NextResponse.json(
      { success: false, error: `获取验证码失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, action } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '会话ID不能为空' },
        { status: 400 }
      )
    }

    if (action === 'regenerate') {
      if (isTestMode()) {
        // 测试模式：返回新的模拟验证码
        const mockCode = Math.floor(10000000 + Math.random() * 90000000).toString()
        
        console.log(`[测试模式] 重新生成验证码: ${mockCode}`)

        return NextResponse.json({
          success: true,
          code: mockCode,
          message: '验证码重新获取成功 (测试模式)'
        })
      }

      // 生产模式：调用重新获取验证码方法
      const result = await whatsAppAutomation.regenerateVerificationCode(sessionId)

      if (result.success && result.code) {
        // 更新数据库中的验证码
        await supabase
          .from('login_sessions')
          .update({
            verification_code: result.code,
            status: 'code_sent'
          })
          .eq('id', sessionId)

        return NextResponse.json({
          success: true,
          code: result.code,
          message: '验证码重新获取成功'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || '重新获取验证码失败'
        })
      }
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Regenerate verification code error:', error)
    return NextResponse.json(
      { success: false, error: `重新获取验证码失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
} 