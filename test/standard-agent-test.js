/**
 * 标准化代理测试脚本
 * 测试新的浏览器指纹自定义和远程访问功能
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

async function testStandardAgent() {
  console.log('🔬 开始标准化代理测试...\n');

  const userDataPath = path.join(__dirname, '../user-data/standard-agent-test');
  
  try {
    // 1. 清理并创建测试目录
    console.log('📁 准备测试环境...');
    try {
      await fs.rm(userDataPath, { recursive: true, force: true });
    } catch (error) {
      // 目录不存在，忽略
    }
    await fs.mkdir(userDataPath, { recursive: true });

    // 2. 设置配置
    console.log('🔧 设置浏览器配置...');
    
    const customDeviceName = 'WhatsApp Security Center';
    const debugPort = 9222;
    
    const browserConfig = {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        `--app-name=${customDeviceName}`,
        `--title=${customDeviceName} - WhatsApp Web`,
        '--disable-default-apps',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        `--remote-debugging-port=${debugPort}`
      ],
      viewport: { width: 1200, height: 800 },
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    };

    console.log(`   设备名称: ${customDeviceName}`);
    console.log(`   调试端口: ${debugPort}`);

    // 3. 启动浏览器
    console.log('\n🚀 启动浏览器...');
    const browserContext = await chromium.launchPersistentContext(userDataPath, browserConfig);
    const page = await browserContext.newPage();

    // 4. 设置自定义浏览器指纹
    console.log('\n🎭 设置自定义浏览器指纹...');
    await page.addInitScript((deviceName) => {
      // 修改navigator.appName
      Object.defineProperty(navigator, 'appName', {
        get: () => deviceName
      });
      
      // 修改navigator.product
      Object.defineProperty(navigator, 'product', {
        get: () => deviceName
      });
      
      // 修改navigator.appCodeName  
      Object.defineProperty(navigator, 'appCodeName', {
        get: () => deviceName
      });
      
      // 修改navigator.appVersion
      Object.defineProperty(navigator, 'appVersion', {
        get: () => `5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${deviceName}/1.0.0`
      });

      // 添加自定义属性
      Object.defineProperty(navigator, 'deviceName', {
        get: () => deviceName
      });
      
    }, customDeviceName);

    // 5. 验证浏览器指纹
    console.log('\n🔍 验证浏览器指纹...');
    const fingerprint = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        appName: navigator.appName,
        product: navigator.product,
        appCodeName: navigator.appCodeName,
        appVersion: navigator.appVersion,
        deviceName: navigator.deviceName
      };
    });

    console.log('   指纹信息:');
    Object.entries(fingerprint).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });

    if (fingerprint.deviceName === customDeviceName) {
      console.log('✅ 自定义指纹设置成功！');
    } else {
      console.log('❌ 自定义指纹设置失败');
    }

    // 6. 访问WhatsApp Web
    console.log('\n📱 访问WhatsApp Web...');
    await page.goto('https://web.whatsapp.com/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    console.log('⏳ 等待页面加载...');
    await page.waitForTimeout(5000);

    // 7. 检查页面状态
    const title = await page.title();
    const url = page.url();
    console.log(`   页面标题: ${title}`);
    console.log(`   当前URL: ${url}`);

    // 8. 检查是否通过浏览器检测
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Browser not supported') || bodyText.includes('WhatsApp works with')) {
      console.log('❌ 仍然显示浏览器不支持的提示');
      console.log('🔧 需要进一步调整User-Agent或其他设置');
    } else {
      console.log('✅ 成功通过浏览器兼容性检查');
    }

    // 9. 测试远程调试访问
    console.log('\n🌐 测试远程调试访问...');
    try {
      const response = await fetch(`http://localhost:${debugPort}/json`);
      const pages = await response.json();
      
      console.log(`   调试端口响应: ${response.status}`);
      console.log(`   可用页面数量: ${pages.length}`);
      
      const whatsappPage = pages.find(p => p.url.includes('web.whatsapp.com'));
      if (whatsappPage) {
        console.log('✅ 找到WhatsApp Web页面');
        console.log(`   页面ID: ${whatsappPage.id}`);
        console.log(`   调试URL: ${whatsappPage.devtoolsFrontendUrl}`);
      } else {
        console.log('⚠️  未找到WhatsApp Web页面');
      }
    } catch (error) {
      console.log('❌ 远程调试端口访问失败:', error.message);
    }

    // 10. 测试指导
    console.log('\n📋 测试结果:');
    console.log('1. 浏览器指纹自定义:', fingerprint.deviceName === customDeviceName ? '✅ 成功' : '❌ 失败');
    console.log('2. 浏览器兼容性检查:', bodyText.includes('Browser not supported') ? '❌ 失败' : '✅ 成功');
    console.log('3. 远程调试端口:', `http://localhost:${debugPort}`);
    
    console.log('\n💡 下一步测试:');
    console.log('1. 在浏览器中完成WhatsApp登录');
    console.log('2. 检查手机端设备列表中的设备名称');
    console.log('3. 测试前端"打开"按钮的远程访问功能');

    console.log('\n⏰ 浏览器将保持打开，按 Ctrl+C 关闭测试');

    // 保持运行
    process.on('SIGINT', async () => {
      console.log('\n🛑 关闭测试...');
      await browserContext.close();
      console.log('✅ 测试结束');
      process.exit(0);
    });

    // 防止脚本退出
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testStandardAgent().catch(console.error);
}

module.exports = { testStandardAgent }; 