import { NextResponse } from "next/server";
import { supabase, isTestMode } from "@/lib/supabase";
import { mockAccounts } from "@/lib/mock-data";

export async function GET() {
  try {
    if (isTestMode()) {
      // 测试模式：返回模拟数据
      console.log('[测试模式] 返回模拟账号列表');
      
      return NextResponse.json({
        success: true,
        data: mockAccounts,
        total: mockAccounts.length
      });
    }

    // 生产模式：从数据库获取未删除的账号
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        {
          success: false,
          error: '获取账号列表失败'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: accounts || [],
      total: accounts?.length || 0
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `获取账号列表失败: ${error instanceof Error ? error.message : '未知错误'}`
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone_number, display_name, note } = body;

    if (!phone_number) {
      return NextResponse.json(
        {
          success: false,
          error: '电话号码不能为空'
        },
        { status: 400 }
      );
    }

    if (isTestMode()) {
      // 测试模式：返回模拟创建结果
      const newAccount = {
        id: `acc_${Date.now()}`,
        phone_number,
        display_name: display_name || phone_number,
        note: note || '',
        status: "offline" as const,
        is_deleted: false,
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      };

      console.log(`[测试模式] 模拟创建账号: ${phone_number}`);

      return NextResponse.json({
        success: true,
        data: newAccount,
        message: "账号创建成功 (测试模式)"
      });
    }

    // 生产模式：创建真实账号
    // 检查电话号码是否已存在
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('phone_number', phone_number)
      .eq('is_deleted', false)
      .single();

    if (existingAccount) {
      return NextResponse.json(
        {
          success: false,
          error: '该电话号码已存在'
        },
        { status: 409 }
      );
    }

    // 创建新账号
    const { data: newAccount, error } = await supabase
      .from('accounts')
      .insert({
        phone_number,
        display_name: display_name || phone_number,
        note: note || '',
        status: 'offline',
        is_deleted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        {
          success: false,
          error: '创建账号失败'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newAccount,
      message: "账号创建成功"
    });

  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `创建账号失败: ${error instanceof Error ? error.message : '未知错误'}`
      },
      { status: 500 }
    );
  }
} 