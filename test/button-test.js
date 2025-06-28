/**
 * 专门测试登录按钮查找的脚本
 * 用于调试"Log in with phone number"按钮定位问题
 */

const { chromium } = require('playwright');

async function testLoginButton() {
  console.log('🔍 开始登录按钮测试...\n');

  let browser, page;

  try {
    // 启动浏览器
    console.log('🚀 启动浏览器...');
    browser = await chromium.launch({
      headless: false,
      timeout: 30000
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    page = await context.newPage();
    console.log('✅ 浏览器启动成功');

    // 访问WhatsApp Web
    console.log('\n📱 访问WhatsApp Web...');
    await page.goto('https://web.whatsapp.com/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    // 等待页面加载
    console.log('⏳ 等待页面加载...');
    await page.waitForTimeout(8000);

    // 获取页面标题和URL确认
    const title = await page.title();
    const url = page.url();
    console.log(`✅ 页面加载完成:`);
    console.log(`   标题: "${title}"`);
    console.log(`   URL: ${url}`);

    // 检查页面是否包含特定文本
    console.log('\n🔍 检查页面内容...');
    const bodyText = await page.textContent('body');
    
    if (bodyText.includes('Log in with phone number')) {
      console.log('✅ 页面包含"Log in with phone number"文本');
    } else {
      console.log('❌ 页面不包含"Log in with phone number"文本');
    }

    if (bodyText.includes('WhatsApp')) {
      console.log('✅ 页面包含"WhatsApp"文本');
    }

    // 尝试多种方法查找登录按钮
    console.log('\n🎯 测试登录按钮选择器...');

    const selectors = [
      // Playwright text选择器
      'text=Log in with phone number',
      'text="Log in with phone number"',
      
      // CSS选择器
      'button:has-text("Log in with phone number")',
      'div:has-text("Log in with phone number")',
      '[role="button"]:has-text("Log in")',
      
      // 包含phone的按钮
      'button:has-text("phone")',
      'div:has-text("phone")',
      
      // 更宽泛的选择器
      'button',
      '[role="button"]',
      '[data-testid*="login"]',
      '[data-testid*="phone"]'
    ];

    for (const selector of selectors) {
      try {
        console.log(`\n   尝试: ${selector}`);
        const elements = await page.$$(selector);
        console.log(`   找到 ${elements.length} 个元素`);
        
        if (elements.length > 0) {
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            const element = elements[i];
            const text = await element.textContent();
            const tagName = await element.evaluate(el => el.tagName);
            const isVisible = await element.isVisible();
            
            console.log(`     元素 ${i + 1}: <${tagName}> "${text?.trim() || '无文本'}" (可见: ${isVisible})`);
            
            if (text && text.includes('Log in with phone number')) {
              console.log(`     ⭐ 这就是目标按钮！`);
              
              // 尝试点击测试
              try {
                const box = await element.boundingBox();
                console.log(`     位置: x=${box?.x}, y=${box?.y}, width=${box?.width}, height=${box?.height}`);
                
                // 高亮显示按钮
                await element.evaluate(el => {
                  el.style.border = '3px solid red';
                  el.style.backgroundColor = 'yellow';
                });
                
                console.log(`     ✅ 按钮已高亮显示（红色边框，黄色背景）`);
              } catch (error) {
                console.log(`     ❌ 无法高亮按钮: ${error.message}`);
              }
            }
          }
        }
        
        // 如果找到了包含目标文本的元素，就不需要继续测试其他选择器
        if (elements.length > 0) {
          const hasTargetText = await Promise.all(
            elements.slice(0, 3).map(el => 
              el.textContent().then(text => text?.includes('Log in with phone number'))
            )
          );
          
          if (hasTargetText.some(Boolean)) {
            console.log('\n🎉 找到目标按钮，停止测试其他选择器');
            break;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ 失败: ${error.message}`);
      }
    }

    // 截图保存
    console.log('\n📸 保存调试截图...');
    await page.screenshot({ path: 'login-button-test.png', fullPage: true });
    console.log('   已保存到: login-button-test.png');

    console.log('\n🎯 测试完成！浏览器窗口保持打开，请检查页面状态');
    console.log('按 Ctrl+C 关闭测试');

    // 保持运行
    process.on('SIGINT', async () => {
      console.log('\n🛑 关闭浏览器...');
      await browser.close();
      process.exit(0);
    });

    await new Promise(() => {});

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
if (require.main === module) {
  testLoginButton();
}

module.exports = { testLoginButton }; 