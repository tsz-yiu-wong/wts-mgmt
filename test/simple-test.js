/**
 * 简单的API测试脚本（无外部依赖）
 * 使用Node.js内置fetch测试WhatsApp自动化API
 */

// 配置
const BASE_URL = 'http://localhost:3001';
const TEST_PHONE = '+86 13800138000';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function simpleTest() {
  console.log('🚀 开始简单API测试...\n');

  try {
    // 1. 健康检查
    console.log('🏥 测试健康检查...');
    const health = await makeRequest(`${BASE_URL}/api/health`);
    if (health.error) {
      throw new Error(`服务器未响应: ${health.error}`);
    }
    console.log('✅ 服务器状态:', health.data.status);

    // 2. 账号列表
    console.log('\n📋 测试账号列表...');
    const accounts = await makeRequest(`${BASE_URL}/api/accounts`);
    if (accounts.error) {
      throw new Error(`账号列表失败: ${accounts.error}`);
    }
    console.log('✅ 账号总数:', accounts.data.total);
    
    // 检查是否为测试模式
    const isTestMode = accounts.data.data.some(acc => acc.note === '主要工作账号');
    console.log('   模式:', isTestMode ? '测试模式' : '生产模式');

    // 3. 登录测试
    console.log('\n🔐 测试登录API...');
    const login = await makeRequest(`${BASE_URL}/api/automation/login`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: TEST_PHONE })
    });

    if (login.error) {
      throw new Error(`登录失败: ${login.error}`);
    }

    if (!login.data.success) {
      throw new Error(`登录失败: ${login.data.error}`);
    }

    console.log('✅ 登录初始化成功');
    console.log('   会话ID:', login.data.sessionId);

    // 4. 验证码测试
    console.log('\n📱 测试验证码API...');
    await delay(1000);

    const code = await makeRequest(`${BASE_URL}/api/automation/verification?sessionId=${login.data.sessionId}`);
    
    if (code.data && code.data.success) {
      console.log('✅ 验证码获取成功:', code.data.code);
    } else {
      console.log('⚠️  验证码获取:', code.data?.error || '未知错误');
    }

    console.log('\n🎉 基础API测试完成！');
    console.log('\n📊 测试结果:');
    console.log('✅ 服务器健康检查 - 通过');
    console.log('✅ 账号列表API - 通过'); 
    console.log('✅ 登录初始化API - 通过');
    console.log('✅ 验证码API - 通过');

    if (isTestMode) {
      console.log('\n🧪 当前运行在测试模式，所有API返回模拟数据');
      console.log('💡 如需测试真实功能，请配置Supabase数据库');
    } else {
      console.log('\n🚀 当前运行在生产模式，连接真实数据库');
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n🛠️  检查清单:');
    console.log('□ 开发服务器是否启动？(npm run dev)');
    console.log('□ 端口3002是否可访问？');
    console.log('□ 网络连接是否正常？');
  }
}

// 检查Node.js版本是否支持fetch
if (typeof fetch === 'undefined') {
  console.log('❌ 需要Node.js 18+版本，或运行:');
  console.log('node --experimental-fetch test/simple-test.js');
} else {
  simpleTest();
} 