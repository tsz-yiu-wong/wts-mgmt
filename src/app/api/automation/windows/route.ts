import { NextRequest, NextResponse } from 'next/server'
import { whatsAppAutomation } from '@/lib/automation/whatsapp'
import { supabase, isTestMode } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '账号ID不能为空' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      // 测试模式：返回模拟窗口URL
      const windowId = uuidv4()
      const windowUrl = `https://web.whatsapp.com/` // 直接返回WhatsApp Web
      
      console.log(`[测试模式] 模拟打开窗口: ${windowUrl}`)

      return NextResponse.json({
        success: true,
        windowUrl,
        windowId,
        message: 'WhatsApp窗口已打开 (测试模式)'
      })
    }

    // 生产模式：使用真实数据库
    // 验证账号是否存在且未删除
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('is_deleted', false)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      )
    }

    // 检查是否已有活动窗口
    const { data: existingWindow } = await supabase
      .from('whatsapp_windows')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    if (existingWindow) {
      // 返回标准的WhatsApp Web URL
      return NextResponse.json({
        success: true,
        windowUrl: 'https://web.whatsapp.com/',
        windowId: existingWindow.id,
        message: '窗口已存在'
      })
    }

    // 创建新的浏览器上下文并打开窗口
    const browserContextId = await whatsAppAutomation.openWindow(accountId)
    const windowId = uuidv4()

    // 在数据库中记录窗口会话
    const { data: window, error: windowError } = await supabase
      .from('whatsapp_windows')
      .insert({
        id: windowId,
        account_id: accountId,
        browser_context_id: browserContextId,
        is_active: true,
        last_activity: new Date().toISOString()
      })
      .select()
      .single()

    if (windowError) {
      console.error('Window creation error:', windowError)
      return NextResponse.json(
        { success: false, error: '创建窗口记录失败' },
        { status: 500 }
      )
    }

    // 更新账号状态
    await supabase
      .from('accounts')
      .update({
        status: 'online',
        last_seen: new Date().toISOString()
      })
      .eq('id', accountId)

    return NextResponse.json({
      success: true,
      windowUrl: 'https://web.whatsapp.com/',
      windowId,
      message: 'WhatsApp窗口已打开'
    })

  } catch (error) {
    console.error('Open window error:', error)
    return NextResponse.json(
      { success: false, error: `打开窗口失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const windowId = searchParams.get('windowId')

    if (!windowId) {
      return NextResponse.json(
        { success: false, error: '窗口ID不能为空' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      // 测试模式：模拟关闭窗口
      console.log(`[测试模式] 模拟关闭窗口: ${windowId}`)
      
      return NextResponse.json({
        success: true,
        message: '窗口已关闭 (测试模式)'
      })
    }

    // 生产模式：使用真实数据库
    // 获取窗口信息
    const { data: window, error: windowError } = await supabase
      .from('whatsapp_windows')
      .select('*')
      .eq('id', windowId)
      .single()

    if (windowError || !window) {
      return NextResponse.json(
        { success: false, error: '窗口不存在' },
        { status: 404 }
      )
    }

    // 标记窗口为非活动状态
    await supabase
      .from('whatsapp_windows')
      .update({
        is_active: false
      })
      .eq('id', windowId)

    // 更新账号状态
    await supabase
      .from('accounts')
      .update({
        status: 'offline'
      })
      .eq('id', window.account_id)

    return NextResponse.json({
      success: true,
      message: '窗口已关闭'
    })

  } catch (error) {
    console.error('Close window error:', error)
    return NextResponse.json(
      { success: false, error: `关闭窗口失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
} 