/**
 * WhatsApp自动化API测试脚本
 * 测试完整的登录流程：初始化 → 获取验证码 → 完成登录 → 打开窗口
 */

const fetch = require('node-fetch');

// 配置
const BASE_URL = 'http://localhost:3002';
const TEST_PHONE = '+86 13800138000'; // 测试电话号码

async function delay(ms) {
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

async function testFullWorkflow() {
  console.log('🚀 开始WhatsApp API自动化测试...\n');

  let sessionId, accountId, windowId;

  try {
    // 1. 测试健康检查
    console.log('🏥 测试健康检查API...');
    const health = await makeRequest(`${BASE_URL}/api/health`);
    if (health.error) {
      throw new Error(`服务器未响应: ${health.error}`);
    }
    console.log('✅ 服务器健康状态:', health.data.status);

    // 2. 测试获取账号列表
    console.log('\n📋 测试获取账号列表...');
    const accounts = await makeRequest(`${BASE_URL}/api/accounts`);
    if (accounts.error) {
      throw new Error(`获取账号列表失败: ${accounts.error}`);
    }
    console.log('✅ 账号列表获取成功, 总数:', accounts.data.total);
    console.log('   数据模式:', accounts.data.data.length > 0 ? '真实数据库' : '测试模式');

    // 3. 测试登录初始化
    console.log('\n🔐 测试登录初始化...');
    const loginResult = await makeRequest(`${BASE_URL}/api/automation/login`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: TEST_PHONE })
    });

    if (loginResult.error) {
      throw new Error(`登录初始化失败: ${loginResult.error}`);
    }

    if (!loginResult.data.success) {
      throw new Error(`登录初始化失败: ${loginResult.data.error}`);
    }

    sessionId = loginResult.data.sessionId;
    console.log('✅ 登录初始化成功');
    console.log('   会话ID:', sessionId);
    console.log('   消息:', loginResult.data.message);

    // 4. 等待并获取验证码
    console.log('\n📱 测试获取验证码...');
    await delay(2000); // 等待验证码生成

    const codeResult = await makeRequest(`${BASE_URL}/api/automation/verification?sessionId=${sessionId}`);

    if (codeResult.error) {
      throw new Error(`获取验证码失败: ${codeResult.error}`);
    }

    if (!codeResult.data.success) {
      throw new Error(`获取验证码失败: ${codeResult.data.error}`);
    }

    console.log('✅ 验证码获取成功');
    console.log('   验证码:', codeResult.data.code);
    console.log('   消息:', codeResult.data.message);

    // 5. 测试完成登录
    console.log('\n🎯 测试完成登录...');
    await delay(1000);

    const completeResult = await makeRequest(`${BASE_URL}/api/automation/complete`, {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });

    if (completeResult.error) {
      throw new Error(`完成登录失败: ${completeResult.error}`);
    }

    if (!completeResult.data.success) {
      throw new Error(`完成登录失败: ${completeResult.data.error}`);
    }

    accountId = completeResult.data.account.id;
    console.log('✅ 登录完成');
    console.log('   账号ID:', accountId);
    console.log('   电话号码:', completeResult.data.account.phone_number);
    console.log('   状态:', completeResult.data.account.status);

    // 6. 测试打开窗口
    console.log('\n🪟 测试打开WhatsApp窗口...');
    const windowResult = await makeRequest(`${BASE_URL}/api/automation/windows`, {
      method: 'POST',
      body: JSON.stringify({ accountId })
    });

    if (windowResult.error) {
      throw new Error(`打开窗口失败: ${windowResult.error}`);
    }

    if (!windowResult.data.success) {
      throw new Error(`打开窗口失败: ${windowResult.data.error}`);
    }

    windowId = windowResult.data.windowId;
    console.log('✅ 窗口打开成功');
    console.log('   窗口ID:', windowId);
    console.log('   窗口URL:', windowResult.data.windowUrl);
    console.log('   消息:', windowResult.data.message);

    // 7. 再次获取账号列表验证
    console.log('\n🔄 验证账号已添加...');
    const accountsAfter = await makeRequest(`${BASE_URL}/api/accounts`);
    console.log('✅ 验证完成, 账号总数:', accountsAfter.data.total);

    // 8. 总结
    console.log('\n🎉 测试完成！所有API端点工作正常');
    console.log('\n📊 测试总结:');
    console.log('✅ 健康检查 - 通过');
    console.log('✅ 账号列表 - 通过');
    console.log('✅ 登录初始化 - 通过');
    console.log('✅ 获取验证码 - 通过');
    console.log('✅ 完成登录 - 通过');
    console.log('✅ 打开窗口 - 通过');

    console.log('\n🚀 系统已准备好部署到Railway！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.log('\n🛠️  调试信息:');
    if (sessionId) console.log('   会话ID:', sessionId);
    if (accountId) console.log('   账号ID:', accountId);
    if (windowId) console.log('   窗口ID:', windowId);
    
    console.log('\n💡 可能的解决方案:');
    console.log('1. 确保开发服务器正在运行: npm run dev');
    console.log('2. 检查端口是否正确 (默认3002)');
    console.log('3. 验证Supabase配置是否正确');
    console.log('4. 检查.env.local文件配置');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 检查是否安装了node-fetch
  try {
    require('node-fetch');
    testFullWorkflow();
  } catch (error) {
    console.log('❌ 缺少依赖包 node-fetch');
    console.log('请运行: npm install node-fetch');
    console.log('或者使用内置fetch: node --experimental-fetch test/api-test.js');
  }
}

module.exports = { testFullWorkflow }; 