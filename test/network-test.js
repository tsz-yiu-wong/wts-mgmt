/**
 * 网络连接测试脚本
 * 专门用来诊断浏览器无法访问网址的问题
 */

const { chromium } = require('playwright');

async function testNetwork() {
  console.log('🌐 开始网络连接测试...\n');

  let browser, page;

  try {
    // 1. 启动最简单的浏览器配置
    console.log('🚀 启动浏览器（简化配置）...');
    browser = await chromium.launch({
      headless: false,
      timeout: 30000
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'en-US', // 设置英文语言
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    page = await context.newPage();
    console.log('✅ 浏览器启动成功');

    // 2. 测试基本网络连接
    console.log('\n🔍 测试网络连接...');
    
    const testSites = [
      { name: 'Google', url: 'https://www.google.com' },
      { name: 'Baidu', url: 'https://www.baidu.com' },
      { name: 'WhatsApp Web', url: 'https://web.whatsapp.com' }
    ];

    for (const site of testSites) {
      try {
        console.log(`   测试 ${site.name}: ${site.url}`);
        const startTime = Date.now();
        
        await page.goto(site.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 20000 
        });
        
        const loadTime = Date.now() - startTime;
        const title = await page.title();
        
        console.log(`   ✅ ${site.name} - 加载成功 (${loadTime}ms)`);
        console.log(`      标题: ${title}`);
        console.log(`      URL: ${page.url()}`);
        
      } catch (error) {
        console.log(`   ❌ ${site.name} - 失败: ${error.message}`);
      }
      
      console.log(''); // 空行分隔
    }

    // 3. 特别测试WhatsApp Web
    console.log('📱 详细测试WhatsApp Web...');
    try {
      console.log('   访问WhatsApp Web（英文界面）...');
      
      await page.goto('https://web.whatsapp.com/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });

      console.log('✅ WhatsApp Web页面加载成功');
      
      // 等待页面完全加载
      console.log('   等待页面完全加载...');
      await page.waitForTimeout(8000);
      
      // 检查页面标题
      const title = await page.title();
      console.log(`   页面标题: "${title}"`);
      
      // 检查页面元素
      const bodyContent = await page.textContent('body');
      if (bodyContent.includes('WhatsApp')) {
        console.log('✅ 页面内容正常，包含WhatsApp相关文本');
      } else {
        console.log('⚠️  页面内容异常，可能被重定向');
      }

      // 检查是否还显示浏览器升级提示
      if (bodyContent.includes('Safari 11') || bodyContent.includes('更新 Safari')) {
        console.log('❌ 仍显示浏览器升级提示，User-Agent可能需要进一步调整');
      } else {
        console.log('✅ 已通过浏览器兼容性检查');
      }

      // 检查页面语言
      if (bodyContent.includes('Log in with phone number') || bodyContent.includes('Link with phone number')) {
        console.log('✅ 页面显示为英文');
      } else if (bodyContent.includes('用电话号码登录')) {
        console.log('⚠️  页面仍为中文，可能需要清除cookie或设置地理位置');
      }

      // 检查常见元素（专注于登录按钮）
      console.log('   查找登录按钮...');
      
      const loginButtonSelectors = [
        'text=Log in with phone number',
        'text="Log in with phone number"',
        '[data-testid*="phone"], button:has-text("Log in with phone number")',
        'button:has-text("phone number")',
        'div:has-text("Log in with phone number")',
        '[role="button"]:has-text("Log in")'
      ];

      let loginButtonFound = false;
      for (const selector of loginButtonSelectors) {
        try {
          console.log(`     尝试选择器: ${selector}`);
          const element = await page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            console.log(`✅ 找到登录按钮！选择器: ${selector}`);
            loginButtonFound = true;
            
            // 获取按钮文本内容
            const buttonText = await element.textContent();
            console.log(`     按钮文本: "${buttonText}"`);
            
            // 获取按钮位置
            const box = await element.boundingBox();
            if (box) {
              console.log(`     按钮位置: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
            }
            break;
          }
        } catch (error) {
          console.log(`     ❌ 选择器失败: ${selector}`);
        }
      }

      if (!loginButtonFound) {
        console.log('❌ 未找到登录按钮，尝试查找页面所有按钮...');
        
        try {
          // 获取所有按钮
          const allButtons = await page.$$('button, [role="button"], div[tabindex]');
          console.log(`     页面共有 ${allButtons.length} 个可点击元素`);
          
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            const button = allButtons[i];
            const text = await button.textContent();
            const tag = await button.evaluate(el => el.tagName);
            console.log(`     按钮 ${i + 1}: <${tag}> "${text?.trim() || '无文本'}"`);
            
            if (text && text.toLowerCase().includes('phone')) {
              console.log(`     ⭐ 可能的目标按钮: "${text}"`);
            }
          }
        } catch (error) {
          console.log('     获取页面按钮失败:', error.message);
        }
      }

      // 截图保存（用于调试）
      console.log('   保存页面截图到 whatsapp-test.png');
      await page.screenshot({ path: 'whatsapp-test.png', fullPage: true });

    } catch (error) {
      console.log('❌ WhatsApp Web访问失败:', error.message);
    }

    console.log('\n🎯 测试完成！浏览器窗口将保持打开，请检查页面状态');
    console.log('💡 如果页面仍为中文，可以尝试：');
    console.log('   1. 清除浏览器数据');
    console.log('   2. 手动在页面设置中更改语言');
    console.log('   3. 使用VPN切换地理位置');
    console.log('按 Ctrl+C 关闭测试');

    // 保持运行
    process.on('SIGINT', async () => {
      console.log('\n🛑 关闭浏览器...');
      await browser.close();
      process.exit(0);
    });

    // 防止脚本退出
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ 网络测试失败:', error.message);
    
    console.log('\n🛠️  诊断信息:');
    console.log('1. 检查您的网络连接');
    console.log('2. 确认防火墙没有阻止Chromium');
    console.log('3. 尝试关闭VPN或代理');
    console.log('4. 检查DNS设置');
    
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
if (require.main === module) {
  testNetwork();
}

module.exports = { testNetwork }; 