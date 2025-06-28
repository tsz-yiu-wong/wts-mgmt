import { NextRequest, NextResponse } from 'next/server'
import { whatsAppAutomation } from '@/lib/automation/whatsapp'
import { supabase, isTestMode } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// 共享的Mock数据存储（需要与login API同步）
const mockSessions = new Map()

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '会话ID不能为空' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      // 测试模式：模拟完成登录
      // 从login API获取电话号码（通过全局变量）
      const phoneNumber = (globalThis as any).testSessionPhone || '+86 13800138000'
      
      const accountId = uuidv4()
      const mockAccount = {
        id: accountId,
        phone_number: phoneNumber,
        display_name: phoneNumber,
        note: '测试账号',
        status: 'online',
        last_seen: new Date().toISOString(),
        is_deleted: false,
        created_at: new Date().toISOString()
      }

      console.log(`[测试模式] 模拟账号创建成功: ${mockAccount.phone_number}`)

      return NextResponse.json({
        success: true,
        account: mockAccount,
        message: '账号添加成功 (测试模式)'
      })
    }

    // 生产模式：使用真实数据库
    // 获取登录会话信息
    const { data: session, error: sessionError } = await supabase
      .from('login_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: '会话不存在' },
        { status: 404 }
      )
    }

    // 检查登录状态
    const isLoggedIn = await whatsAppAutomation.checkLoginStatus(sessionId)
    
    if (!isLoggedIn) {
      return NextResponse.json(
        { success: false, error: '登录未完成，请在手机上输入验证码' },
        { status: 400 }
      )
    }

    // 创建新账号
    const accountId = uuidv4()
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        id: accountId,
        phone_number: session.phone_number,
        display_name: session.phone_number,
        note: '', // 默认空备注
        status: 'online',
        last_seen: new Date().toISOString(),
        is_deleted: false
      })
      .select()
      .single()

    if (accountError) {
      console.error('Account creation error:', accountError)
      return NextResponse.json(
        { success: false, error: '创建账号失败' },
        { status: 500 }
      )
    }

    try {
      // 完成登录流程（保存会话数据）
      await whatsAppAutomation.completeLogin(sessionId, accountId)

      // 更新登录会话状态
      await supabase
        .from('login_sessions')
        .update({
          status: 'completed'
        })
        .eq('id', sessionId)

      return NextResponse.json({
        success: true,
        account,
        message: '账号添加成功'
      })

    } catch (error) {
      // 如果完成登录失败，删除已创建的账号（软删除）
      await supabase
        .from('accounts')
        .update({ is_deleted: true })
        .eq('id', accountId)

      throw error
    }

  } catch (error) {
    console.error('Complete login error:', error)
    return NextResponse.json(
      { success: false, error: `完成登录失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
} 