/**
 * 重新获取验证码功能测试脚本
 */

const API_BASE = 'http://localhost:3001/api';

async function testRegenerateCode() {
  console.log('🔄 开始测试重新获取验证码功能...\n');

  try {
    // 第一步：启动登录流程
    console.log('🔐 第一步：启动登录流程...');
    const loginResponse = await fetch(`${API_BASE}/automation/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+44 7453903960' })
    });
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.log('❌ 登录启动失败:', loginData.error);
      return;
    }
    
    console.log(`✅ 登录启动成功，会话ID: ${loginData.sessionId}`);
    
    // 等待浏览器启动
    console.log('\n⏳ 等待浏览器启动...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 第二步：获取初始验证码
    console.log('\n🔢 第二步：获取初始验证码...');
    const codeResponse1 = await fetch(`${API_BASE}/automation/verification?sessionId=${loginData.sessionId}`);
    const codeData1 = await codeResponse1.json();
    
    if (codeData1.success && codeData1.code) {
      console.log(`✅ 初始验证码: ${codeData1.code}`);
    } else {
      console.log('⚠️  初始验证码尚未准备就绪');
      return;
    }

    // 第三步：等待一段时间
    console.log('\n⏳ 等待5秒...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 第四步：测试重新获取验证码
    console.log('\n🔄 第三步：测试重新获取验证码...');
    const regenerateResponse = await fetch(`${API_BASE}/automation/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: loginData.sessionId,
        action: 'regenerate'
      })
    });
    
    const regenerateData = await regenerateResponse.json();
    console.log('重新获取响应:', JSON.stringify(regenerateData, null, 2));
    
    if (regenerateData.success && regenerateData.code) {
      console.log(`✅ 新验证码: ${regenerateData.code}`);
      console.log(`🔍 验证码是否改变: ${regenerateData.code !== codeData1.code ? '是' : '否'}`);
    } else {
      console.log('❌ 重新获取验证码失败:', regenerateData.error);
    }

    // 第五步：再次尝试重新获取
    console.log('\n🔄 第四步：再次测试重新获取...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const regenerateResponse2 = await fetch(`${API_BASE}/automation/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: loginData.sessionId,
        action: 'regenerate'
      })
    });
    
    const regenerateData2 = await regenerateResponse2.json();
    
    if (regenerateData2.success && regenerateData2.code) {
      console.log(`✅ 第二次新验证码: ${regenerateData2.code}`);
      console.log(`🔍 与第一次重新获取的验证码是否不同: ${regenerateData2.code !== regenerateData.code ? '是' : '否'}`);
    } else {
      console.log('❌ 第二次重新获取失败:', regenerateData2.error);
    }

    console.log('\n🎯 测试完成！');
    console.log('💡 验证码序列：');
    console.log(`   1. 初始验证码: ${codeData1.code || '未获取'}`);
    console.log(`   2. 第一次重新获取: ${regenerateData.code || '失败'}`);
    console.log(`   3. 第二次重新获取: ${regenerateData2.code || '失败'}`);
    
    console.log('\n📝 提示：');
    console.log('   - 浏览器窗口应该保持打开');
    console.log('   - 每次重新获取都应该生成新的验证码');
    console.log('   - 观察浏览器中页面的变化');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  if (typeof fetch === 'undefined') {
    console.log('⚠️  此脚本需要Node.js 18+的内置fetch');
    process.exit(1);
  }

  testRegenerateCode().catch(console.error);
}

module.exports = { testRegenerateCode }; 