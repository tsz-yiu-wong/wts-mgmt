import { NextRequest, NextResponse } from 'next/server'
import { whatsAppAutomation } from '@/lib/automation/whatsapp'
import { supabase, isTestMode } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Mock 数据存储（仅用于测试）
const mockSessions = new Map()

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: '电话号码不能为空' },
        { status: 400 }
      )
    }

    // 验证电话号码格式
    const phoneRegex = /^\+\d{1,3}\s\d{8,15}$/
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: '电话号码格式不正确，应为：+86 13812345678' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      // 测试模式：模拟登录流程
      const sessionId = uuidv4()
      mockSessions.set(sessionId, {
        id: sessionId,
        phone_number: phoneNumber,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })

      // 存储电话号码到全局变量，供complete API使用
      ;(globalThis as any).testSessionPhone = phoneNumber

      console.log(`[测试模式] 模拟启动登录流程: ${phoneNumber}`)

      return NextResponse.json({
        success: true,
        sessionId,
        message: '登录流程已启动，请等待验证码 (测试模式)'
      })
    }

    // 生产模式：使用真实数据库
    // 检查是否已存在相同电话号码的账号（未删除的）
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('phone_number', phoneNumber)
      .eq('is_deleted', false)
      .single()

    if (existingAccount) {
      return NextResponse.json(
        { success: false, error: '该电话号码已存在' },
        { status: 409 }
      )
    }

    // 启动自动化登录流程
    const sessionId = await whatsAppAutomation.initiateLogin(phoneNumber)

    // 在数据库中创建登录会话记录
    const { data: loginSession, error } = await supabase
      .from('login_sessions')
      .insert({
        id: sessionId,
        phone_number: phoneNumber,
        status: 'pending',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      await whatsAppAutomation.cleanupSession(sessionId)
      return NextResponse.json(
        { success: false, error: '创建登录会话失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: '登录流程已启动，请等待验证码'
    })

  } catch (error) {
    console.error('Login automation error:', error)
    return NextResponse.json(
      { success: false, error: `登录失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
} 