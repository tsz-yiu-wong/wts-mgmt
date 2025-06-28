/**
 * 本地WhatsApp自动化测试脚本
 * 用于在部署到Railway之前测试自动化功能
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

async function testWhatsAppAutomation() {
  console.log('🚀 开始WhatsApp Web自动化测试...\n');

  const userDataPath = path.join(__dirname, '../user-data/test-session');
  
  try {
    // 1. 创建用户数据目录
    console.log('📁 创建用户数据目录...');
    await fs.mkdir(userDataPath, { recursive: true });
    
    // 2. 启动浏览器（使用更宽松的配置）
    console.log('🌐 启动Chromium浏览器...');
    const browserContext = await chromium.launchPersistentContext(userDataPath, {
      headless: false, // 显示浏览器窗口以便观察
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--override-plugin-power-saver-for-testing=never'
      ],
      viewport: { width: 1200, height: 800 },
      timeout: 60000, // 增加超时时间
      ignoreHTTPSErrors: true, // 忽略HTTPS错误
      javaScriptEnabled: true,
      locale: 'en-US', // 设置英文语言
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });

    const page = await browserContext.newPage();
    
    // 3. 配置浏览器环境
    console.log('🔧 配置浏览器环境...');
    // User-Agent已在context中设置，不需要再次设置
    // await page.setUserAgent(
    //   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    // );

    // 设置额外超时
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // 4. 测试网络连接
    console.log('🌍 测试网络连接...');
    try {
      console.log('   正在访问Google以测试网络...');
      await page.goto('https://www.google.com', { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      console.log('✅ 网络连接正常');
    } catch (error) {
      console.log('⚠️  网络连接可能有问题:', error.message);
      console.log('   继续尝试访问WhatsApp Web...');
    }

    // 5. 访问WhatsApp Web
    console.log('📱 访问WhatsApp Web...');
    console.log('   URL: https://web.whatsapp.com/');
    console.log('   请等待，这可能需要一些时间...');
    
    try {
      await page.goto('https://web.whatsapp.com/', { 
        waitUntil: 'domcontentloaded', // 改为更宽松的等待条件
        timeout: 60000 
      });
      console.log('✅ 页面导航成功');
    } catch (error) {
      console.log('⚠️  页面导航超时，尝试重新加载...');
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('✅ 页面重新加载成功');
      } catch (reloadError) {
        throw new Error(`无法访问WhatsApp Web: ${reloadError.message}`);
      }
    }

    console.log('⏳ 等待页面完全加载...');
    await page.waitForTimeout(5000);

    // 6. 检查页面内容
    console.log('🔍 检查页面状态...');
    
    // 获取页面标题
    const title = await page.title();
    console.log('   页面标题:', title);
    
    // 获取页面URL
    const url = await page.url();
    console.log('   当前URL:', url);
    
    // 检查页面是否正常加载
    const bodyExists = await page.$('body');
    if (!bodyExists) {
      throw new Error('页面body元素未找到，页面可能没有正常加载');
    }
    
    // 检查是否已经登录
    try {
      await page.waitForSelector('[data-testid="chat-list"]', { timeout: 8000 });
      console.log('✅ 检测到已登录状态！');
      console.log('🎉 可以直接使用现有会话');
    } catch {
      console.log('📲 未登录，检查登录界面...');
      
      // 检查二维码是否存在
      try {
        const qrExists = await page.waitForSelector('[data-ref="qr-code"], canvas', { timeout: 8000 });
        if (qrExists) {
          console.log('📷 检测到二维码，请用手机扫描');
        }
      } catch {
        console.log('📞 可能需要通过电话号码登录');
        
        // 检查是否有登录按钮
        try {
          const loginButton = await page.$('text=Log in with phone number');
          if (loginButton) {
            console.log('📱 发现电话号码登录按钮');
          }
        } catch {
          console.log('❓ 页面状态未明确，请手动检查浏览器窗口');
        }
      }
    }

    console.log('\n🎯 自动化功能测试结果:');
    console.log('✅ Playwright浏览器启动成功');
    console.log('✅ WhatsApp Web页面访问成功');
    console.log('✅ 用户数据目录创建成功');
    console.log('✅ 浏览器环境配置成功');
    
    console.log('\n📋 测试完成！浏览器将保持打开状态，您可以：');
    console.log('1. 如看到二维码，用手机扫描完成登录');
    console.log('2. 如看到登录界面，可以测试电话号码登录');
    console.log('3. 关闭浏览器窗口结束测试');
    console.log('4. 按 Ctrl+C 停止脚本');

    // 保持脚本运行，让用户观察浏览器
    process.on('SIGINT', async () => {
      console.log('\n🛑 正在关闭浏览器...');
      await browserContext.close();
      console.log('✅ 测试结束');
      process.exit(0);
    });

    // 监听页面变化
    let loginChecked = false;
    setInterval(async () => {
      try {
        const isLoggedIn = await page.$('[data-testid="chat-list"]');
        if (isLoggedIn && !loginChecked) {
          console.log('\n🎉 登录成功！现在可以测试窗口管理功能');
          loginChecked = true;
        }
      } catch (error) {
        // 忽略检查错误
      }
    }, 5000);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n🛠️  故障排除步骤:');
    console.log('1. 检查网络连接是否正常');
    console.log('2. 尝试手动访问 https://web.whatsapp.com/');
    console.log('3. 检查防火墙设置');
    console.log('4. 重新安装Playwright: npx playwright install chromium');
    console.log('5. 尝试使用VPN或更换网络');
    console.log('\n🔧 调试命令:');
    console.log('   DEBUG=pw:* node test/local-test.js  # 详细调试信息');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testWhatsAppAutomation();
}

module.exports = { testWhatsAppAutomation }; 