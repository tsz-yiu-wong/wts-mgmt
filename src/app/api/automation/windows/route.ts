import { NextRequest, NextResponse } from 'next/server'
import { whatsAppAutomation } from '@/lib/automation/whatsapp'
import { supabase, isTestMode } from '@/lib/supabase'

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
      // 测试模式：返回模拟的窗口信息
      console.log(`[测试模式] 模拟打开账号 ${accountId} 的窗口`)
      
      return NextResponse.json({
        success: true,
        message: '窗口已打开 (测试模式)',
        windowUrl: `https://web.whatsapp.com/?test=${accountId}`,
        contextId: `test-context-${accountId}`,
        remoteUrl: `http://localhost:9222/devtools/inspector.html?ws=localhost:9222/devtools/page/test-${accountId}`
      })
    }

    // 生产模式：使用真实的浏览器自动化
    console.log(`🌐 打开账号 ${accountId} 的WhatsApp窗口`)

    // 打开浏览器窗口
    const windowInfo = await whatsAppAutomation.openWindow(accountId)

    // 更新数据库记录
    await supabase
      .from('whatsapp_windows')
      .upsert({
        account_id: accountId,
        browser_context_id: windowInfo.contextId,
        is_active: true,
        last_activity: new Date().toISOString()
      }, {
        onConflict: 'account_id'
      })

    return NextResponse.json({
      success: true,
      message: '窗口已成功打开',
      windowUrl: 'https://web.whatsapp.com/',
      contextId: windowInfo.contextId,
      remoteUrl: windowInfo.remoteUrl,
      debugPort: windowInfo.debugPort,
      directUrl: windowInfo.directUrl,
      accessUrl: windowInfo.accessUrl,
      proxyUrl: windowInfo.proxyUrl,
      debugInfo: {
        message: '浏览器已在后台启动',
        debugPortUrl: `http://localhost:${windowInfo.debugPort}`,
        debugJsonUrl: `http://localhost:${windowInfo.debugPort}/json`,
        inspectorUrl: windowInfo.remoteUrl,
        directAccessUrl: windowInfo.accessUrl,
        proxyAccessUrl: windowInfo.proxyUrl
      }
    })

  } catch (error) {
    console.error('Open window error:', error)
    return NextResponse.json(
      { success: false, error: `打开窗口失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '账号ID不能为空' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      return NextResponse.json({
        success: true,
        remoteAccess: {
          url: `ws://localhost:9222/devtools/page/test-${accountId}`,
          pages: [
            {
              id: `test-${accountId}`,
              url: `https://web.whatsapp.com/?account=${accountId}`,
              title: 'WhatsApp Web'
            }
          ]
        }
      })
    }

    // 获取远程访问信息
    const remoteAccess = await whatsAppAutomation.getRemoteAccess(accountId)
    
    if (!remoteAccess) {
      return NextResponse.json(
        { success: false, error: '未找到活跃的浏览器会话' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      remoteAccess
    })

  } catch (error) {
    console.error('Get remote access error:', error)
    return NextResponse.json(
      { success: false, error: `获取远程访问失败: ${error instanceof Error ? error.message : '未知错误'}` },
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