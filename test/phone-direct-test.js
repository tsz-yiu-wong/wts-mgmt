/**
 * 测试直接输入完整国际格式电话号码的脚本
 * 跳过复杂的国家代码选择，直接输入 +44 7453903960
 */

const { chromium } = require('playwright');

async function testDirectPhoneInput() {
  console.log('📞 开始直接电话号码输入测试...\n');

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

    console.log('⏳ 等待页面加载...');
    await page.waitForTimeout(8000);

    // 第一步：点击登录按钮
    console.log('\n🔐 第一步：点击登录按钮...');
    try {
      await page.waitForSelector('text=Log in with phone number', { timeout: 10000 });
      await page.click('text=Log in with phone number');
      console.log('✅ 登录按钮点击成功');
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log('❌ 登录按钮点击失败:', error.message);
      return;
    }

    // 第二步：直接查找电话号码输入框，跳过国家代码选择
    console.log('\n📱 第二步：直接查找电话号码输入框...');
    
    const phoneInputSelectors = [
      'form input[type="text"]',
      'form input',
      'input[type="text"]',
      'input[type="tel"]',
      '[data-testid="phone-number-input"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="number"]'
    ];
    
    let phoneInput = null;
    for (const selector of phoneInputSelectors) {
      try {
        console.log(`   尝试选择器: ${selector}`);
        const elements = await page.$$(selector);
        
        if (elements.length > 0) {
          console.log(`   找到 ${elements.length} 个输入框`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const type = await element.evaluate(el => el.type || '');
            const placeholder = await element.evaluate(el => el.placeholder || '');
            const name = await element.evaluate(el => el.name || '');
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            console.log(`     输入框 ${i + 1}: type="${type}" placeholder="${placeholder}" name="${name}" (可见: ${isVisible}, 可用: ${isEnabled})`);
            
            if (isVisible && isEnabled && !phoneInput) {
              phoneInput = element;
              console.log(`     ⭐ 选择此输入框进行测试`);
              
              // 高亮显示
              await element.evaluate(el => {
                el.style.border = '4px solid blue';
                el.style.backgroundColor = 'lightblue';
              });
              break;
            }
          }
          
          if (phoneInput) break;
        }
      } catch (error) {
        console.log(`   ❌ 选择器失败: ${selector}`);
      }
    }

    if (!phoneInput) {
      console.log('❌ 未找到电话号码输入框');
      return;
    }

    // 第三步：测试不同的电话号码格式
    console.log('\n🌍 第三步：测试不同的电话号码格式...');
    
    const testNumbers = [
      { name: '英国号码', number: '+44 7453903960', description: '英国手机号码' },
      { name: '中国号码', number: '+86 13800138000', description: '中国手机号码' },
      { name: '美国号码', number: '+1 555 123 4567', description: '美国电话号码' }
    ];

    for (const testCase of testNumbers) {
      console.log(`\n📞 测试 ${testCase.name}: ${testCase.number}`);
      console.log(`   描述: ${testCase.description}`);
      
      try {
        // 清空输入框
        await phoneInput.fill('');
        await page.waitForTimeout(1000);
        
        // 输入完整号码
        await phoneInput.fill(testCase.number);
        console.log(`✅ 号码输入成功: ${testCase.number}`);
        await page.waitForTimeout(3000);
        
        // 检查页面是否有变化，可能显示国家代码
        console.log('   检查页面反应...');
        
        // 查找可能显示国家信息的元素
        const countryInfoSelectors = [
          'button:has-text("+")',
          '[data-testid*="country"]',
          'button[type="submit"]'
        ];
        
        for (const selector of countryInfoSelectors) {
          try {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const text = await element.textContent();
              if (text && (text.includes('+') || text.includes('China') || text.includes('United') || text.includes('UK'))) {
                console.log(`   📍 检测到国家信息: "${text.trim()}"`);
              }
            }
          } catch (error) {
            // 继续
          }
        }
        
        // 检查下一步按钮状态
        try {
          const nextButton = await page.$('text=Next');
          if (nextButton) {
            const isEnabled = await nextButton.isEnabled();
            const buttonText = await nextButton.textContent();
            console.log(`   🔘 下一步按钮: "${buttonText}" (可用: ${isEnabled})`);
            
            if (isEnabled) {
              console.log(`   ✅ ${testCase.name} 格式被接受！`);
            } else {
              console.log(`   ⚠️  ${testCase.name} 格式可能有问题，下一步按钮不可用`);
            }
          }
        } catch (error) {
          console.log('   ❌ 检查下一步按钮失败');
        }
        
        // 等待用户观察
        console.log('   ⏳ 等待3秒观察效果...');
        await page.waitForTimeout(3000);
        
      } catch (error) {
        console.log(`   ❌ ${testCase.name} 输入失败: ${error.message}`);
      }
    }

    // 第四步：尝试点击下一步
    console.log('\n➡️ 第四步：尝试继续下一步...');
    
    // 使用最后一个测试号码（美国号码）尝试继续
    console.log('   使用美国号码 +1 555 123 4567 继续测试...');
    await phoneInput.fill('+1 555 123 4567');
    await page.waitForTimeout(2000);
    
    try {
      const nextButton = await page.waitForSelector('text=Next', { timeout: 5000 });
      if (await nextButton.isEnabled()) {
        console.log('✅ 点击下一步按钮...');
        await nextButton.click();
        await page.waitForTimeout(3000);
        
        // 检查是否进入验证码页面
        console.log('   检查是否进入验证码页面...');
        try {
          const codeElement = await page.waitForSelector('[data-testid="code-display"], text=verification, text=code', { timeout: 10000 });
          if (codeElement) {
            console.log('🎉 成功进入验证码页面！');
            const pageText = await page.textContent('body');
            if (pageText.includes('verification') || pageText.includes('code')) {
              console.log('✅ 确认在验证码页面');
            }
          }
        } catch (error) {
          console.log('⚠️  可能没有进入验证码页面，或页面结构不同');
        }
      } else {
        console.log('❌ 下一步按钮不可用');
      }
    } catch (error) {
      console.log('❌ 下一步操作失败:', error.message);
    }

    // 截图保存
    console.log('\n📸 保存调试截图...');
    await page.screenshot({ path: 'phone-direct-test.png', fullPage: true });
    console.log('   已保存到: phone-direct-test.png');

    console.log('\n🎯 测试完成！浏览器窗口保持打开');
    console.log('💡 测试总结：');
    console.log('   - 英国号码: +44 7453903960');
    console.log('   - 中国号码: +86 13800138000'); 
    console.log('   - 美国号码: +1 555 123 4567');
    console.log('   请观察哪种格式被系统接受，下一步按钮是否可用');
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
  testDirectPhoneInput();
}

module.exports = { testDirectPhoneInput }; 