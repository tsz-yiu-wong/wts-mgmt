const { chromium } = require('playwright');

async function testWindowAccess() {
  console.log('🧪 测试窗口访问功能...\n');

  try {
    // 1. 测试健康检查
    console.log('📡 1. 测试API健康检查...');
    const healthResponse = await fetch('http://localhost:3002/api/health');
    const healthData = await healthResponse.json();
    console.log('健康检查结果:', healthData);

    if (healthData.status !== 'healthy') {
      throw new Error('API服务不健康');
    }

    // 2. 模拟创建账号并打开窗口
    console.log('\n🎯 2. 测试打开窗口...');
    
    // 使用一个测试账号ID
    const testAccountId = 'test-account-' + Date.now();
    console.log(`使用测试账号ID: ${testAccountId}`);

    // 调用窗口API
    const windowResponse = await fetch('http://localhost:3002/api/automation/windows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: testAccountId
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

    console.log(`✅ 窗口创建成功!`);
    console.log(`   调试端口: ${debugPort}`);
    console.log(`   远程调试URL: ${remoteUrl}`);
    console.log(`   直接访问URL: ${directUrl}`);
    console.log(`   访问URL: ${accessUrl}`);

    // 3. 测试远程调试端口是否可访问
    console.log('\n🔍 3. 测试远程调试端口...');
    
    let retryCount = 0;
    const maxRetries = 10;
    let debugResponse;

    while (retryCount < maxRetries) {
      try {
        debugResponse = await fetch(`http://localhost:${debugPort}/json`);
        if (debugResponse.ok) {
          break;
        }
      } catch (error) {
        console.log(`调试端口连接失败，重试 ${retryCount + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retryCount++;
      }
    }

    if (!debugResponse || !debugResponse.ok) {
      throw new Error('无法连接到调试端口');
    }

    const debugInfo = await debugResponse.json();
    console.log(`✅ 调试端口可访问，找到 ${debugInfo.length} 个页面`);

    // 4. 查找WhatsApp页面
    const whatsappPages = debugInfo.filter(page => 
      page.url.includes('web.whatsapp.com') && page.type === 'page'
    );

    console.log(`🔍 找到 ${whatsappPages.length} 个WhatsApp页面`);

    if (whatsappPages.length > 0) {
      const mainPage = whatsappPages[0];
      console.log(`📱 主页面信息:`);
      console.log(`   标题: ${mainPage.title}`);
      console.log(`   URL: ${mainPage.url}`);
      console.log(`   页面ID: ${mainPage.id}`);
      
      // 5. 测试页面是否响应
      console.log('\n📡 5. 测试页面响应...');
      
      const pageEvalUrl = `http://localhost:${debugPort}/json/runtime/evaluate`;
      const evalPayload = {
        expression: 'document.title',
        includeCommandLineAPI: true,
        objectGroup: 'console',
        returnByValue: true
      };

      try {
        const evalResponse = await fetch(pageEvalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evalPayload)
        });

        if (evalResponse.ok) {
          const evalResult = await evalResponse.json();
          console.log(`✅ 页面响应正常，标题: ${evalResult.result?.value || '无法获取'}`);
        } else {
          console.log('⚠️  页面评估请求失败');
        }
      } catch (error) {
        console.log('⚠️  页面评估出错:', error.message);
      }
    }

    console.log('\n✅ 窗口访问测试完成!');
    console.log('\n💡 使用说明:');
    console.log(`   1. 在浏览器中访问: ${remoteUrl}`);
    console.log(`   2. 这将打开Chrome DevTools，你可以直接控制WhatsApp Web`);
    console.log(`   3. 或者使用API直接控制页面: ${accessUrl}`);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testWindowAccess(); 