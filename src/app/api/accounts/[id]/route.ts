import { NextRequest, NextResponse } from 'next/server'
import { supabase, isTestMode } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: '账号ID不能为空' },
        { status: 400 }
      )
    }

    if (isTestMode()) {
      console.log(`[测试模式] 模拟删除账号: ${accountId}`)
      return NextResponse.json({
        success: true,
        message: '账号删除成功 (测试模式)'
      })
    }

    // 软删除账号
    const { error } = await supabase
      .from('accounts')
      .update({ is_deleted: true })
      .eq('id', accountId)

    if (error) {
      console.error('Delete account error:', error)
      return NextResponse.json(
        { success: false, error: '删除账号失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '账号删除成功'
    })

  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { success: false, error: `删除账号失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
} 