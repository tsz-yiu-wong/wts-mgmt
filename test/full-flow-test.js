const { chromium } = require('playwright');

async function testFullFlow() {
  console.log('🧪 测试完整流程: 登录 -> 验证码 -> 完成 -> 打开窗口...\n');

  let sessionId = null;
  let accountId = null;

  try {
    // 1. 健康检查
    console.log('📡 1. 测试API健康检查...');
    const healthResponse = await fetch('http://localhost:3002/api/health');
    const healthData = await healthResponse.json();
    console.log('健康检查结果:', healthData);

    if (healthData.status !== 'healthy') {
      throw new Error('API服务不健康');
    }

    // 2. 初始化登录
    console.log('\n🚀 2. 初始化登录...');
    const loginResponse = await fetch('http://localhost:3002/api/automation/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: '+44 7453903960'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`登录初始化失败: ${loginResponse.status} - ${errorText}`);
    }

    const loginData = await loginResponse.json();
    console.log('登录初始化结果:', loginData);

    if (!loginData.success) {
      throw new Error(`登录初始化失败: ${loginData.error}`);
    }

    sessionId = loginData.sessionId;
    console.log(`✅ 登录会话创建成功: ${sessionId}`);

    // 3. 等待并获取验证码
    console.log('\n⏳ 3. 等待验证码生成...');
    
    let verificationCode = null;
    let retryCount = 0;
    const maxRetries = 15; // 最多等待30秒

    while (retryCount < maxRetries && !verificationCode) {
      console.log(`尝试获取验证码 ${retryCount + 1}/${maxRetries}...`);
      
      const codeResponse = await fetch(`http://localhost:3002/api/automation/verification?sessionId=${sessionId}`, {
        method: 'GET'
      });

      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        
        if (codeData.success && codeData.code) {
          verificationCode = codeData.code;
          console.log(`✅ 验证码获取成功: ${verificationCode}`);
          break;
        } else {
          console.log(`等待验证码... (${codeData.error || '尚未生成'})`);
        }
      } else {
        console.log('验证码API调用失败');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      retryCount++;
    }

    if (!verificationCode) {
      throw new Error('验证码获取超时');
    }

    // 4. 等待用户在手机上输入验证码
    console.log('\n📱 4. 请在手机WhatsApp上输入验证码:', verificationCode);
    console.log('等待登录完成...(按回车键继续测试窗口功能)');
    
    // 简单等待，实际应用中用户会在手机上输入验证码
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    // 5. 完成登录 (创建一个账号ID)
    console.log('\n✅ 5. 完成登录...');
    accountId = 'account-' + Date.now();
    
    const completeResponse = await fetch('http://localhost:3002/api/automation/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        accountId: accountId
      })
    });

    if (completeResponse.ok) {
      const completeData = await completeResponse.json();
      console.log('登录完成结果:', completeData);
      
      if (completeData.success) {
        console.log(`✅ 登录完成，账号已保存: ${accountId}`);
      } else {
        console.log(`⚠️  登录完成但有警告: ${completeData.error}`);
      }
    } else {
      console.log('⚠️  登录完成API调用失败，但继续测试...');
    }

    // 6. 打开WhatsApp窗口
    console.log('\n🖥️  6. 打开WhatsApp窗口...');
    
    const windowResponse = await fetch('http://localhost:3002/api/automation/windows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: accountId
      })
    });

    if (!windowResponse.ok) {
      const errorText = await windowResponse.text();
      throw new Error(`窗口API调用失败: ${windowResponse.status} - ${errorText}`);
    }

    const windowData = await windowResponse.json();
    console.log('窗口创建结果:', windowData);

    if (!windowData.success) {
      throw new Error(`窗口创建失败: ${windowData.error}`);
    }

    const { debugPort, remoteUrl, directUrl, accessUrl } = windowData.data;

    console.log(`✅ WhatsApp窗口创建成功!`);
    console.log(`   调试端口: ${debugPort}`);
    console.log(`   远程调试URL: ${remoteUrl}`);
    console.log(`   直接访问URL: ${directUrl}`);
    console.log(`   访问URL: ${accessUrl}`);

    // 7. 验证远程调试端口
    console.log('\n🔍 7. 验证远程调试访问...');
    
    let debugResponse;
    retryCount = 0;
    const debugMaxRetries = 10;

    while (retryCount < debugMaxRetries) {
      try {
        debugResponse = await fetch(`http://localhost:${debugPort}/json`);
        if (debugResponse.ok) {
          break;
        }
      } catch (error) {
        console.log(`调试端口连接失败，重试 ${retryCount + 1}/${debugMaxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retryCount++;
      }
    }

    if (debugResponse && debugResponse.ok) {
      const debugInfo = await debugResponse.json();
      console.log(`✅ 调试端口可访问，找到 ${debugInfo.length} 个页面`);
      
      const whatsappPages = debugInfo.filter(page => 
        page.url.includes('web.whatsapp.com') && page.type === 'page'
      );
      
      console.log(`📱 WhatsApp页面数量: ${whatsappPages.length}`);
      
      if (whatsappPages.length > 0) {
        console.log('页面详情:');
        whatsappPages.forEach((page, index) => {
          console.log(`   ${index + 1}. ${page.title || '无标题'}`);
          console.log(`      URL: ${page.url}`);
        });
      }
    } else {
      console.log('⚠️  无法访问调试端口');
    }

    console.log('\n🎉 完整流程测试完成!');
    console.log('\n💡 访问方式:');
    console.log(`   1. 远程调试 (推荐): ${remoteUrl}`);
    console.log(`   2. 直接访问: ${directUrl}`);
    console.log('\n注意: 你可以在浏览器中打开远程调试URL来直接控制WhatsApp Web');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    // 清理会话
    if (sessionId) {
      console.log('\n🧹 清理会话...');
      try {
        await fetch(`http://localhost:3002/api/automation/login?sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } catch (cleanupError) {
        console.log('清理失败:', cleanupError.message);
      }
    }
  }
}

// 运行测试
testFullFlow(); 