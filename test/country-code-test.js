/**
 * 专门测试国家代码选择流程的脚本
 * 用于调试下拉选择框和电话号码输入的完整流程
 */

const { chromium } = require('playwright');

async function testCountryCodeFlow() {
  console.log('🌍 开始国家代码选择流程测试...\n');

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

    // 第二步：分析页面结构，寻找国家代码相关元素
    console.log('\n🔍 第二步：分析国家代码选择区域...');
    
    // 查找可能的国家代码按钮/下拉选择器
    const countryCodeSelectors = [
      // 按钮类型的下拉选择器
      'button[data-testid*="country"]',
      'button[data-testid*="code"]', 
      'button[aria-label*="country"]',
      'button[aria-label*="code"]',
      '[role="button"][data-testid*="country"]',
      '[role="button"][data-testid*="code"]',
      
      // 通用按钮选择器（可能包含国家代码相关文本）
      'button:has-text("+")',
      'button:has-text("China")',
      'button:has-text("86")',
      'button',
      '[role="button"]',
      
      // 原来的输入框选择器（兜底）
      '[data-testid="cc-input"]',
      'input[placeholder*="Country"]',
      'input[placeholder*="code"]',
      'select',
      '[role="combobox"]'
    ];

    console.log('   查找国家代码下拉按钮...');
    let countryCodeButton = null;
    let foundSelector = '';

    for (const selector of countryCodeSelectors) {
      try {
        console.log(`     尝试: ${selector}`);
        const elements = await page.$$(selector);
        
        if (elements.length > 0) {
          console.log(`     找到 ${elements.length} 个元素`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const tagName = await element.evaluate(el => el.tagName);
            const type = await element.evaluate(el => el.type || 'N/A');
            const textContent = await element.textContent();
            const ariaLabel = await element.evaluate(el => el.ariaLabel || '');
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            console.log(`       元素 ${i + 1}: <${tagName}> type="${type}" text="${textContent?.trim() || '无文本'}" aria-label="${ariaLabel}" (可见: ${isVisible}, 可用: ${isEnabled})`);
            
            // 判断是否为国家代码按钮
            const isCountryButton = isVisible && isEnabled && (
              textContent?.includes('+') ||
              textContent?.includes('86') ||
              textContent?.includes('China') ||
              ariaLabel?.toLowerCase().includes('country') ||
              ariaLabel?.toLowerCase().includes('code') ||
              (tagName === 'BUTTON' && selector.includes('button'))
            );
            
            if (isCountryButton && !countryCodeButton) {
              countryCodeButton = element;
              foundSelector = selector;
              console.log(`       ⭐ 选中此元素作为国家代码下拉按钮`);
              
              // 高亮显示
              await element.evaluate(el => {
                el.style.border = '3px solid blue';
                el.style.backgroundColor = 'lightblue';
              });
            }
          }
        }
      } catch (error) {
        console.log(`     ❌ 选择器失败: ${selector}`);
      }
    }

    if (!countryCodeButton) {
      console.log('❌ 未找到国家代码下拉按钮，显示所有按钮元素...');
      
      const allButtons = await page.$$('button, [role="button"]');
      console.log(`   页面共有 ${allButtons.length} 个按钮元素：`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const button = allButtons[i];
        const tagName = await button.evaluate(el => el.tagName);
        const textContent = await button.textContent();
        const ariaLabel = await button.evaluate(el => el.ariaLabel || '');
        const className = await button.evaluate(el => el.className || '');
        const isVisible = await button.isVisible();
        
        console.log(`     按钮 ${i + 1}: <${tagName}> text="${textContent?.trim() || '无文本'}" aria-label="${ariaLabel}" class="${className.substring(0, 50)}..." (可见: ${isVisible})`);
        
        // 如果文本包含可能的国家代码信息，标记出来
        if (textContent && (textContent.includes('+') || textContent.includes('86') || textContent.includes('China'))) {
          console.log(`     ⭐ 可能的国家代码按钮: "${textContent}"`);
        }
      }
      return;
    }

    // 第三步：点击下拉按钮打开选择列表
    console.log('\n📋 第三步：点击下拉按钮打开选择列表...');
    console.log(`   使用选择器: ${foundSelector}`);
    
    try {
      console.log('   点击国家代码下拉按钮...');
      await countryCodeButton.click();
      console.log('✅ 下拉按钮点击成功');
      await page.waitForTimeout(2000);
      
      // 检查是否有下拉列表/搜索框出现
      console.log('   检查下拉列表和搜索框...');
      const dropdownElements = [
        // 下拉列表容器
        '[role="listbox"]',
        '[role="menu"]',
        '[data-testid*="dropdown"]',
        '[data-testid*="list"]',
        '.dropdown',
        '.options',
        '.country-list',
        '.menu',
        
        // 搜索输入框
        'input[placeholder*="Search"]',
        'input[placeholder*="search"]',
        'input[placeholder*="Country"]',
        'input[placeholder*="country"]',
        'input[type="search"]',
        'input[role="searchbox"]',
        '[role="searchbox"]'
      ];
      
      let dropdownContainer = null;
      let searchInput = null;
      
      for (const selector of dropdownElements) {
        try {
          const element = await page.$(selector);
          if (element && await element.isVisible()) {
            const tagName = await element.evaluate(el => el.tagName);
            const role = await element.evaluate(el => el.role || el.getAttribute('role') || '');
            const placeholder = await element.evaluate(el => el.placeholder || '');
            
            console.log(`   ✅ 找到下拉元素: ${selector} <${tagName}> role="${role}" placeholder="${placeholder}"`);
            
            if (tagName === 'INPUT' || role === 'searchbox' || placeholder.toLowerCase().includes('search')) {
              searchInput = element;
              console.log(`     ⭐ 这是搜索输入框`);
              
              // 高亮搜索框
              await element.evaluate(el => {
                el.style.border = '3px solid orange';
                el.style.backgroundColor = 'lightyellow';
              });
            } else {
              dropdownContainer = element;
              console.log(`     ⭐ 这是下拉列表容器`);
              
              // 高亮下拉容器
              await element.evaluate(el => {
                el.style.border = '3px solid green';
              });
            }
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      // 第四步：在搜索框中输入国家代码
      if (searchInput) {
        console.log('\n🔍 第四步：在搜索框中输入"China"或"86"...');
        try {
          await searchInput.fill('China');
          console.log('✅ 搜索词输入成功: China');
          await page.waitForTimeout(2000);
          
          // 查找搜索结果选项
          console.log('   查找搜索结果选项...');
          const optionSelectors = [
            '[role="option"]',
            '[data-testid*="option"]',
            '.option',
            '.country-option',
            'li',
            'div[role="button"]'
          ];
          
          let optionFound = false;
          for (const selector of optionSelectors) {
            try {
              const options = await page.$$(selector);
              if (options.length > 0) {
                console.log(`   找到 ${options.length} 个选项`);
                
                for (let i = 0; i < Math.min(options.length, 8); i++) {
                  const option = options[i];
                  const text = await option.textContent();
                  const isVisible = await option.isVisible();
                  
                  console.log(`     选项 ${i + 1}: "${text?.trim()}" (可见: ${isVisible})`);
                  
                  if (text && isVisible && (text.includes('China') || text.includes('86') || text.includes('+86'))) {
                    console.log(`     ⭐ 找到中国选项，尝试点击...`);
                    
                    // 高亮选项
                    await option.evaluate(el => {
                      el.style.border = '3px solid red';
                      el.style.backgroundColor = 'lightcoral';
                    });
                    
                    await option.click();
                    console.log('✅ 中国选项点击成功');
                    optionFound = true;
                    await page.waitForTimeout(1000);
                    break;
                  }
                }
                
                if (optionFound) break;
              }
            } catch (error) {
              // 继续尝试下一个选择器
            }
          }
          
          if (!optionFound) {
            console.log('⚠️  未找到匹配的中国选项');
          }
          
        } catch (error) {
          console.log('❌ 搜索框输入失败:', error.message);
        }
      } else {
        console.log('⚠️  未找到搜索输入框，可能需要直接在下拉列表中选择');
      }
      
    } catch (error) {
      console.log('❌ 下拉按钮点击失败:', error.message);
    }

    // 第五步：查找电话号码输入框（国家代码选择后应该出现）
    console.log('\n📱 第五步：查找电话号码输入框...');
    
    const phoneNumberSelectors = [
      '[data-testid="phone-number-input"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="Phone"]',
      'input[placeholder*="number"]',
      'input[placeholder*="Number"]',
      'input[type="tel"]',
      '[data-testid*="phone"]',
      'input[inputmode="numeric"]'
    ];
    
    let phoneNumberElement = null;
    for (const selector of phoneNumberSelectors) {
      try {
        console.log(`   尝试: ${selector}`);
        const element = await page.$(selector);
        if (element && await element.isVisible() && await element.isEnabled()) {
          const placeholder = await element.evaluate(el => el.placeholder || '');
          phoneNumberElement = element;
          console.log(`   ✅ 找到电话号码输入框: ${selector} placeholder="${placeholder}"`);
          
          // 高亮显示
          await element.evaluate(el => {
            el.style.border = '3px solid purple';
            el.style.backgroundColor = 'lavender';
          });
          break;
        }
      } catch (error) {
        console.log(`   ❌ 选择器失败: ${selector}`);
      }
    }

    if (phoneNumberElement) {
      console.log('\n📞 第六步：输入电话号码...');
      try {
        await phoneNumberElement.fill('13800138000');
        console.log('✅ 电话号码输入成功: 13800138000');
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('❌ 电话号码输入失败:', error.message);
      }
    } else {
      console.log('❌ 未找到电话号码输入框');
    }

    // 第七步：查找"下一步"按钮
    console.log('\n➡️ 第七步：查找下一步按钮...');
    
    const nextButtonSelectors = [
      'button[data-testid="phone-number-continue"]',
      'text=Next',
      'text=Continue',
      'text=下一步',
      '[role="button"]:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Next")'
    ];
    
    for (const selector of nextButtonSelectors) {
      try {
        console.log(`   尝试: ${selector}`);
        const button = await page.$(selector);
        if (button && await button.isVisible() && await button.isEnabled()) {
          console.log(`   ✅ 找到下一步按钮: ${selector}`);
          
          // 高亮显示
          await button.evaluate(el => {
            el.style.border = '3px solid darkred';
            el.style.backgroundColor = 'pink';
          });
          
          const buttonText = await button.textContent();
          console.log(`   按钮文本: "${buttonText}"`);
          break;
        }
      } catch (error) {
        console.log(`   ❌ 选择器失败: ${selector}`);
      }
    }

    // 截图保存
    console.log('\n📸 保存调试截图...');
    await page.screenshot({ path: 'country-code-test.png', fullPage: true });
    console.log('   已保存到: country-code-test.png');

    console.log('\n🎯 测试完成！浏览器窗口保持打开，请检查页面状态');
    console.log('💡 高亮说明：');
    console.log('   🔵 蓝色边框 = 国家代码下拉按钮');
    console.log('   🟢 绿色边框 = 下拉列表容器');
    console.log('   🟠 橙色边框 = 搜索输入框');
    console.log('   🔴 红色边框 = 电话号码输入框');
    console.log('   🟣 紫色边框 = 电话号码输入框');
    console.log('   🟤 粉色边框 = 下一步按钮');
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
  testCountryCodeFlow();
}

module.exports = { testCountryCodeFlow }; 