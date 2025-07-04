import puppeteer, { Browser, Page, BrowserContext } from 'puppeteer'
import path from 'path'
import { promises as fs } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { AutomationSession, VerificationCodeResponse } from '@/types/automation'
import express from 'express'
import http from 'http'

class WhatsAppAutomation {
  private sessions = new Map<string, AutomationSession>()
  private windows = new Map<string, { browser: Browser, page: Page, debugPort: number, accountId: string, proxyPort: number }>() // 存储窗口上下文
  private userDataBasePath: string

  constructor() {
    this.userDataBasePath = process.env.USER_DATA_PATH || './user-data'
  }

  /**
   * 设置自定义浏览器指纹
   */
  private async setupCustomFingerprint(page: Page, customDeviceName: string) {
    try {
      // 在页面加载前注入自定义脚本，修改浏览器指纹
      await page.evaluateOnNewDocument((deviceName: string) => {
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
      
      console.log(`🎭 浏览器指纹自定义完成: ${customDeviceName}`);
    } catch (error) {
      console.log('⚠️  浏览器指纹自定义失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 获取自定义浏览器配置
   */
  private getBrowserConfig(userDataPath: string) {
    // 自定义设备名称
    const customDeviceName = process.env.CUSTOM_DEVICE_NAME || 'WhatsApp Security Center'
    
    // 使用标准的User-Agent来确保通过浏览器兼容性检查
    const standardUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

    return {
      headless: false,
      userDataDir: userDataPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // 设置自定义应用名称，这会影响在WhatsApp移动端显示的设备名称
        `--app-name=${customDeviceName}`,
        // 设置窗口标题
        `--title=${customDeviceName} - WhatsApp Web`,
        // 设置进程标题
        `--force-device-scale-factor=1`,
        // 更多自定义参数
        '--disable-default-apps',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--remote-debugging-port=0', // 启用远程调试但使用随机端口
        // 设置语言为英文
        '--lang=en-US',
        '--accept-lang=en-US,en;q=0.9'
      ],
      defaultViewport: { width: 1200, height: 800 },
      // locale: 'en-US', // Puppeteer does not have a direct 'locale' option like Playwright
      // extraHTTPHeaders: { // This needs to be set per-page in Puppeteer
      //   'Accept-Language': 'en-US,en;q=0.9'
      // },
      // userAgent: standardUserAgent // This needs to be set per-page in Puppeteer
    }
  }

  /**
   * 设置自定义图标
   */
  private async setupCustomIcon(userDataPath: string) {
    try {
      const customDeviceName = process.env.CUSTOM_DEVICE_NAME || 'WhatsApp Manager Pro'
      console.log(`🎨 设置自定义设备标识: ${customDeviceName}`)

      // 创建浏览器首选项目录
      const defaultDir = path.join(userDataPath, 'Default')
      await fs.mkdir(defaultDir, { recursive: true })

      // 创建自定义首选项配置
      const preferences = {
        browser: {
          show_home_button: true,
          show_toolbar: true
        },
        profile: {
          name: customDeviceName,
          avatar_icon: 'chrome://theme/IDR_PROFILE_AVATAR_26'
        },
        session: {
          restore_on_startup: 4,
          startup_urls: ['https://web.whatsapp.com/']
        }
      }

      const preferencesPath = path.join(defaultDir, 'Preferences')
      await fs.writeFile(preferencesPath, JSON.stringify(preferences, null, 2))

      console.log('✅ 自定义浏览器配置已设置')

    } catch (error) {
      console.log('⚠️  设置自定义配置失败:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * 初始化登录会话
   */
  async initiateLogin(phoneNumber: string): Promise<string> {
    const sessionId = uuidv4()
    const userDataPath = path.join(this.userDataBasePath, sessionId)

    try {
      // 确保用户数据目录存在
      await fs.mkdir(userDataPath, { recursive: true })

      // 设置自定义图标
      await this.setupCustomIcon(userDataPath)

      // 启动浏览器上下文
      const browser = await puppeteer.launch(this.getBrowserConfig(userDataPath))
      const page = (await browser.pages())[0] || await browser.newPage()

      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
      });
      
      // 创建会话对象
      const session: AutomationSession = {
        sessionId,
        phoneNumber,
        userDataPath,
        browserContext: browser, // Storing browser instance here
        page,
        status: 'initializing'
      }

      this.sessions.set(sessionId, session)

      // 开始登录流程
      await this.startLoginProcess(session)

      return sessionId
    } catch (error) {
      console.error('Error initiating login:', error)
      throw new Error(`登录初始化失败: ${error}`)
    }
  }

  /**
   * 开始登录流程
   */
  private async startLoginProcess(session: AutomationSession): Promise<void> {
    const { page, phoneNumber } = session

    try {
      // 设置自定义浏览器指纹
      const customDeviceName = process.env.CUSTOM_DEVICE_NAME || 'WhatsApp Security Center'
      await this.setupCustomFingerprint(page, customDeviceName)

      // 访问WhatsApp Web
      await page.goto('https://web.whatsapp.com/', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      })

      // 等待页面加载
      await new Promise(r => setTimeout(r, 3000))

      // 移除初始登录检测，直接进入登录流程

      // 查找并点击"通过电话号码登录"按钮
      try {
        // 优先尝试英文版本（DIV或BUTTON元素都支持）
        const loginButtonSelector = '::-p-text(Log in with phone number)'
        await page.waitForSelector(loginButtonSelector, { timeout: 10000 })
        const loginButton = await page.$(loginButtonSelector)
        await loginButton?.click()
        console.log('Found and clicked English login button')
        await new Promise(r => setTimeout(r, 2000))
      } catch (error) {
        // 尝试中文版本
        try {
          const loginButtonSelector = '::-p-text(用电话号码登录)'
          await page.waitForSelector(loginButtonSelector, { timeout: 5000 })
          const loginButton = await page.$(loginButtonSelector)
          await loginButton?.click()
          console.log('Found and clicked Chinese login button')
          await new Promise(r => setTimeout(r, 2000))
        } catch (error2) {
          // 如果找不到按钮，可能已经在登录页面
          console.log('Phone login button not found, assuming already on login page')
        }
      }

      // 解析电话号码并直接输入完整格式
      console.log(`📱 输入电话号码: ${phoneNumber}`)

      // 直接输入完整的国际格式电话号码
      const phoneInput = await page.waitForSelector('form input[type="text"]', { timeout: 10000 })
      if (phoneInput) {
        // 模拟真实用户操作，确保清空生效
        await phoneInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        // 再输入完整号码
        await phoneInput.type(phoneNumber)
      }
      await new Promise(r => setTimeout(r, 2000))

      // 点击下一步
      const nextButton = await page.waitForSelector('::-p-text(Next)', { timeout: 5000 })
      await nextButton?.click()
      
      console.log('📱 等待验证码页面加载...')
      // 移除所有固定延迟，将等待逻辑移入 getVerificationCode
      
      session.status = 'waiting_code'
    } catch (error) {
      session.status = 'error'
      throw new Error(`登录流程失败: ${error}`)
    }
  }

  /**
   * 获取验证码并启动后台登录状态监听
   */
  async getVerificationCode(sessionId: string): Promise<VerificationCodeResponse> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: '会话不存在' }
    }

    const { page } = session

    try {
      console.log('🔍 开始使用智能等待策略查找9位验证码...');

      // XPath 表达式，用于查找不包含子元素且只含单个字符（字母、数字或连字符）的 <span> 或 <div>
      const xpath = `//span[not(*) and string-length(normalize-space(text())) = 1] | //div[not(*) and string-length(normalize-space(text())) = 1]`;
      
      // 使用 page.waitForFunction 实现智能等待，直到找到符合格式的9位验证码
      const verificationCodeHandle = await page.waitForFunction((xpath_str: string) => {
        const result = document.evaluate(xpath_str, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const chars = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i);
          if (node && node.textContent) {
            const char = node.textContent.trim();
            if (char.length === 1 && /^[a-zA-Z0-9-]$/.test(char)) {
              chars.push(char);
          }
          }
        }
        if (chars.length >= 9) {
          const code = chars.slice(0, 9).join('');
          // 检查格式是否为 XXXX-XXXX
          if (/^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/.test(code)) {
            return code; // 返回找到的验证码
        }
      }
        return false; // 继续等待
      }, { timeout: 30000 }, xpath); // 超时时间30秒

      if (verificationCodeHandle) {
        const verificationCode = await verificationCodeHandle.jsonValue() as string;
        if (verificationCode) {
            console.log(`✅ 找到验证码: ${verificationCode}`);
            
            // 启动后台登录状态监听
            this.startLoginStatusMonitoring(sessionId);
            
            return { success: true, code: verificationCode.replace('-', '') }; // 返回去掉连字符的8位验证码
        }
      }
      return { success: false, error: '未能提取到完整的验证码' };
      
    } catch (error) {
      console.error('智能等待超时或失败:', error);
      return { success: false, error: `获取验证码失败: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  /**
   * 启动后台登录状态监听
   */
  private startLoginStatusMonitoring(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session || session.loginMonitoringActive) {
      return; // 避免重复启动监听
    }

    session.loginMonitoringActive = true;
    console.log('🔄 开始后台监听登录状态...');

    const checkInterval = setInterval(async () => {
      try {
        const isLoggedIn = await this.checkIfLoggedIn(session.page);
        if (isLoggedIn) {
          console.log('🎉 检测到登录成功！');
          session.status = 'logged_in';
          session.loginMonitoringActive = false;
          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error('登录状态检测出错:', error);
        session.loginMonitoringActive = false;
        clearInterval(checkInterval);
      }
    }, 2000); // 每2秒检查一次

    // 设置30秒超时
    setTimeout(() => {
      if (session.loginMonitoringActive) {
        console.log('⏰ 登录状态监听超时');
        session.loginMonitoringActive = false;
        clearInterval(checkInterval);
      }
    }, 30000);
  }

  /**
   * 获取当前登录状态（供前端轮询）
   */
  async getLoginStatus(sessionId: string): Promise<{ status: string; isLoggedIn: boolean }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { status: 'not_found', isLoggedIn: false };
    }

    return { 
      status: session.status, 
      isLoggedIn: session.status === 'logged_in' 
    };
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    const { page } = session

    try {
      const isLoggedIn = await this.checkIfLoggedIn(page)
      if (isLoggedIn) {
        session.status = 'logged_in'
        return true
      }
      return false
    } catch (error) {
      console.error('Error checking login status:', error)
      return false
    }
  }

  /**
   * 检查是否已登录 - 简化版本，检测聊天列表过滤器元素
   */
  private async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      console.log('🔍 开始检查登录状态...')
      
      // 检查是否存在聊天列表过滤器元素：All, unread, Favorites
      const filterElements = ['All', 'unread', 'Favorites']
      let foundElements = 0
      
      for (const filterText of filterElements) {
        try {
          const element = await page.$(`div ::-p-text("${filterText}")`)
          if (element) {
            foundElements++
            console.log(`✅ 找到过滤器元素: ${filterText}`)
          }
        } catch (error) {
          // 继续检查下一个
        }
      }
      
      console.log(`📊 检测结果: 找到 ${foundElements}/${filterElements.length} 个过滤器元素`)
      
      // 如果找到至少2个过滤器元素，认为已登录
      const isLoggedIn = foundElements >= 2
      
      console.log(`🎯 最终判断: ${isLoggedIn ? '已登录' : '未登录'}`)
      
      return isLoggedIn
      
    } catch (error) {
      console.error('检查登录状态时出错:', error)
      return false
    }
  }

  /**
   * 完成登录并保存会话
   */
  async completeLogin(sessionId: string, accountId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error('会话不存在')
    }

    const { browserContext: browser, userDataPath } = session

    try {
      // 等待登录完成
      const isLoggedIn = await this.checkLoginStatus(sessionId)
      if (!isLoggedIn) {
        throw new Error('登录未完成')
      }

      // 重命名用户数据目录
      const accountDataPath = path.join(this.userDataBasePath, accountId)
      await fs.rename(userDataPath, accountDataPath)

      // 关闭临时浏览器上下文
      await browser.close()

      // 清理会话
      this.sessions.delete(sessionId)

    } catch (error) {
      throw new Error(`完成登录失败: ${error}`)
    }
  }

  /**
   * 打开WhatsApp窗口，返回远程访问URL
   */
  async openWindow(accountId: string): Promise<{ contextId: string, remoteUrl: string, debugPort: number, directUrl: string, accessUrl: string, proxyUrl: string }> {
    const accountDataPath = path.join(this.userDataBasePath, accountId)

    try {
      // 检查账号数据目录是否存在，如果不存在则创建
      try {
      await fs.access(accountDataPath)
        console.log(`✅ 找到账号 ${accountId} 的用户数据目录。`)
      } catch (error) {
        console.log(`⚠️ 账号 ${accountId} 的用户数据目录不存在，将创建新目录。`)
        await fs.mkdir(accountDataPath, { recursive: true })
        console.log(`✅ 已为账号 ${accountId} 创建新的用户数据目录。`)
      }

      // 确保自定义图标已设置
      await this.setupCustomIcon(accountDataPath)

      // 检查是否已有该账号的窗口在运行
      let existingWindow = null
      for (const [contextId, info] of this.windows.entries()) {
        if (info.accountId === accountId) {
          existingWindow = { contextId, ...info }
          break
        }
      }

      if (existingWindow && existingWindow.browser) {
        console.log(`🔄 账号 ${accountId} 已有窗口在运行，代理端口: ${existingWindow.proxyPort}`)
        
        // 检查浏览器是否还在运行
        if (existingWindow.browser.isConnected()) {
            console.log('✅ 现有浏览器会话仍然活跃')
            return {
              contextId: existingWindow.contextId,
              remoteUrl: `http://localhost:${existingWindow.debugPort}`, // DevTools URL
              debugPort: existingWindow.debugPort,
              directUrl: await existingWindow.page.url(),
              accessUrl: `http://localhost:${existingWindow.proxyPort}`, // URL to access the proxied window
              proxyUrl: `http://localhost:${existingWindow.proxyPort}`
            }
        } else {
          console.log('🗑️ 现有会话已失效，创建新会话')
          this.windows.delete(existingWindow.contextId)
        }
      }

      // 生成唯一的调试和代理端口
      const debugPort = 9000 + Math.floor(Math.random() * 1000)
      const proxyPort = debugPort + 1
      
      // 修改浏览器配置，启用远程调试
      const config = this.getBrowserConfig(accountDataPath)
      config.args = config.args.map(arg => 
        arg.startsWith('--remote-debugging-port=') ? `--remote-debugging-port=${debugPort}` : arg
      )
      config.args.push(
        '--remote-allow-origins=*'
      )

      console.log(`🌐 启动账号 ${accountId} 的浏览器，调试端口: ${debugPort}`)

      // 启动浏览器
      const browser = await puppeteer.launch(config)
      const page = (await browser.pages())[0] || await browser.newPage()

      // 设置UA和Header
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
      
      // 设置自定义浏览器指纹
      const customDeviceName = process.env.CUSTOM_DEVICE_NAME || 'WhatsApp Security Center'
      await this.setupCustomFingerprint(page, customDeviceName)
      
      // 访问WhatsApp Web
      await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle0' })

      // 等待页面完全加载
      await new Promise(r => setTimeout(r, 3000))
      
      // ---- 启动简单的重定向服务器 ----
      const app = express()
      const server = http.createServer(app)

      // 主页路由 - 始终显示指导页面，不再自动重定向到DevTools
      app.get('/', async (req, res) => {
        res.send(`
          <html>
            <head>
              <title>WhatsApp Web - ${accountId}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; padding: 20px; 
                  background: #0b1426; color: white; 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                }
                .container { max-width: 800px; margin: 0 auto; }
                h1 { color: #25d366; text-align: center; margin-bottom: 30px; }
                .method { 
                  background: rgba(255,255,255,0.1); 
                  padding: 25px; border-radius: 15px; 
                  margin: 20px 0; border-left: 4px solid #25d366; 
                }
                .method h2 { color: #25d366; margin-top: 0; }
                .command { 
                  background: #1a1a1a; padding: 15px; 
                  border-radius: 8px; margin: 15px 0; 
                  font-family: 'Monaco', 'Consolas', monospace; 
                  font-size: 14px; overflow-x: auto; 
                  border: 1px solid #333;
                }
                .btn { 
                  background: #25d366; color: white; 
                  padding: 12px 25px; text-decoration: none; 
                  border-radius: 25px; display: inline-block; 
                  margin: 10px 5px; cursor: pointer; border: none;
                  font-size: 14px;
                }
                .btn:hover { background: #1ea952; }
                .btn.secondary { background: #424242; }
                .warning { 
                  background: rgba(255, 193, 7, 0.1); 
                  border-left: 4px solid #ffc107; 
                  padding: 15px; margin: 20px 0; border-radius: 8px; 
                }
                .success { 
                  background: rgba(76, 175, 80, 0.1); 
                  border-left: 4px solid #4caf50; 
                  padding: 15px; margin: 20px 0; border-radius: 8px; 
                }
                .steps { padding-left: 20px; }
                .steps li { margin: 10px 0; }
                .copy-btn { font-size: 12px; margin-left: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>📱 WhatsApp Web - ${accountId}</h1>
                
                <div class="success">
                  <strong>✅ WhatsApp 会话已就绪！</strong>
                  <p>后台浏览器已启动并保持登录状态。现在您可以用自己的Chrome浏览器直接访问，获得完整的输入法支持。</p>
                </div>

                <div class="method">
                  <h2>🚀 方法一：使用相同用户数据启动新Chrome（推荐）</h2>
                  <p><strong>最佳选择</strong> - 完美支持中文、越南文等所有输入法</p>
                  
                  <div class="warning">
                    <strong>⚠️ 重要：</strong>请先完全关闭所有Chrome窗口，然后执行以下命令
                  </div>

                  <p><strong>🖥️ macOS 用户：</strong></p>
                  <div class="command" id="mac-cmd">
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --user-data-dir="${accountDataPath}" --profile-directory=Default https://web.whatsapp.com/
                  </div>
                  <button class="btn copy-btn" onclick="copyToClipboard('mac-cmd')">📋 复制命令</button>

                  <p><strong>🖥️ Windows 用户：</strong></p>
                  <div class="command" id="win-cmd">
"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="${accountDataPath.replace(/\//g, '\\\\')}" --profile-directory=Default https://web.whatsapp.com/
                  </div>
                  <button class="btn copy-btn" onclick="copyToClipboard('win-cmd')">📋 复制命令</button>

                  <div class="steps">
                    <h3>📋 操作步骤：</h3>
                    <ol>
                      <li>完全关闭所有Chrome窗口</li>
                      <li>打开终端/命令提示符</li>
                      <li>复制并执行上面对应系统的命令</li>
                      <li>Chrome将自动打开已登录的WhatsApp Web</li>
                      <li>享受完整的输入法支持！</li>
                    </ol>
                  </div>
                </div>

                <div class="method">
                  <h2>🔧 方法二：Chrome远程调试（备用）</h2>
                  <p>如果方法一不可行，可以使用Chrome开发者工具访问</p>
                  <a href="http://localhost:${debugPort}" target="_blank" class="btn secondary">
                    🛠️ 打开Chrome DevTools页面列表
                  </a>
                  <p style="font-size: 14px; color: #888;">注意：此方式输入法支持有限</p>
                </div>

                <div class="method">
                  <h2>📂 高级用户信息</h2>
                  <p><strong>用户数据目录：</strong></p>
                  <div class="command" id="user-data-path">${accountDataPath}</div>
                  <button class="btn copy-btn" onclick="copyToClipboard('user-data-path')">📋 复制路径</button>
                  
                  <p><strong>调试端口：</strong> ${debugPort}</p>
                  <p><strong>调试API：</strong> <a href="http://localhost:${debugPort}/json" target="_blank" style="color: #25d366;">http://localhost:${debugPort}/json</a></p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <button class="btn" onclick="location.reload()">🔄 刷新页面</button>
                  <button class="btn secondary" onclick="window.close()">✖️ 关闭窗口</button>
                </div>
              </div>

              <script>
                function copyToClipboard(elementId) {
                  const element = document.getElementById(elementId);
                  const text = element.textContent.trim();
                  
                  navigator.clipboard.writeText(text).then(() => {
                    const btn = element.nextElementSibling;
                    const originalText = btn.textContent;
                    btn.textContent = '✅ 已复制！';
                    btn.style.background = '#4caf50';
                    
                    setTimeout(() => {
                      btn.textContent = originalText;
                      btn.style.background = '#25d366';
                    }, 2000);
                  }).catch(err => {
                    console.error('复制失败:', err);
                    // 备用方案：选择文本
                    const range = document.createRange();
                    range.selectNode(element);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    alert('请手动复制选中的文本');
                  });
                }

                console.log('✅ WhatsApp Web 访问页面已加载');
                console.log('📁 用户数据目录:', '${accountDataPath}');
                console.log('🔧 调试端口:', ${debugPort});
              </script>
            </body>
          </html>
        `)
      })

      server.listen(proxyPort, () => {
        console.log(`🚀 重定向服务已启动于 http://localhost:${proxyPort} for account ${accountId}`)
        console.log(`📱 访问 http://localhost:${proxyPort} 将自动跳转到WhatsApp Web`)
      })

      // 生成browser context ID
      const contextId = uuidv4()
      this.windows.set(contextId, { browser, page, debugPort, accountId, proxyPort })
        
      const remoteUrl = `http://localhost:${debugPort}`
      
      console.log(`✅ 浏览器已启动，调试端口: ${debugPort}`)
      console.log(`🔧 远程调试地址: ${remoteUrl}`)

      return { 
        contextId, 
        remoteUrl, 
        debugPort, 
        directUrl: await page.url(), 
        accessUrl: `http://localhost:${proxyPort}`, 
        proxyUrl: `http://localhost:${proxyPort}` 
      }
    } catch (error) {
      throw new Error(`打开窗口失败: ${error}`)
    }
  }

  /**
   * 获取账号的远程访问信息
   */
  async getRemoteAccess(accountId: string): Promise<{ url: string, pages: any[], debugPort: number } | null> {
    try {
      // 查找该账号对应的窗口信息
      let windowInfo = null
      for (const [contextId, info] of this.windows.entries()) {
        if (info.accountId === accountId) {
          windowInfo = info
          break
        }
      }

      if (!windowInfo) return null

      const debugPort = windowInfo.debugPort

      // 获取远程调试信息
      const response = await fetch(`http://localhost:${debugPort}/json`)
      const pages = await response.json()
      
      // 找到WhatsApp Web的页面
      const whatsappPage = pages.find((page: any) => 
        page.url.includes('web.whatsapp.com') && page.type === 'page'
      )

      if (whatsappPage) {
        const debugUrl = `http://localhost:${debugPort}/devtools/inspector.html?ws=localhost:${debugPort}/devtools/page/${whatsappPage.id}`
        
        return {
          url: debugUrl,
          pages: pages,
          debugPort: debugPort
        }
      }

      return null
    } catch (error) {
      console.error('获取远程访问信息失败:', error)
      return null
    }
  }

  /**
   * 关闭窗口
   */
  async closeWindow(contextId: string): Promise<void> {
    const windowInfo = this.windows.get(contextId)
    if (windowInfo) {
      try {
        await windowInfo.browser.close()
        this.windows.delete(contextId)
      } catch (error) {
        console.error('Error closing window:', error)
      }
    }
  }

  /**
   * 清理会话
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        await session.browserContext?.close()
      } catch (error) {
        console.error('Error closing browser context:', error)
      }
      this.sessions.delete(sessionId)
    }
  }

  /**
   * 清理所有会话和窗口
   */
  async cleanup(): Promise<void> {
    // 清理登录会话
    for (const sessionId of this.sessions.keys()) {
      await this.cleanupSession(sessionId)
    }

    // 清理窗口
    for (const contextId of this.windows.keys()) {
      await this.closeWindow(contextId)
    }
  }

  /**
   * 重新获取验证码
   */
  async regenerateVerificationCode(sessionId: string): Promise<VerificationCodeResponse> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: '会话不存在' }
    }

    const { page, phoneNumber } = session

    try {
      console.log('🔄 开始重新获取验证码...')
      
      // 第一步：查找并点击返回按钮（内容为"text"的button）
      console.log('   查找返回按钮...')
      
      const backButton = await page.$('button ::-p-text(text)')
      if (backButton) {
            console.log('   ✅ 找到返回按钮，点击中...')
        await backButton.click()
      } else {
        return { success: false, error: '未找到返回按钮' }
      }

      // 等待页面切换
      await new Promise(r => setTimeout(r, 3000))

      // 第二步：确认回到了输入号码页面
      console.log('   📱 确认回到号码输入页面...')
      try {
        await page.waitForSelector('form input[type="text"]', { timeout: 10000 })
        console.log('   ✅ 已回到号码输入页面')
      } catch (error) {
        return { success: false, error: '未能回到号码输入页面' }
      }

      // 第三步：确认号码已填入，如果没有则重新填入
      const phoneInput = await page.$('form input[type="text"]')
      if (phoneInput) {
        // 模拟真实用户操作，确保清空生效
        await phoneInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        // 再输入完整号码
        await phoneInput.type(phoneNumber)
        await new Promise(r => setTimeout(r, 1000))
      }

      // 第四步：点击Next按钮
      console.log('   ➡️ 点击Next按钮...')
      try {
        const nextButton = await page.waitForSelector('::-p-text(Next)', { timeout: 5000 })
        await nextButton?.click()
        console.log('   ✅ Next按钮点击成功')
        await new Promise(r => setTimeout(r, 5000))
      } catch (error) {
        return { success: false, error: '未找到或无法点击Next按钮' }
      }

      // 第五步：等待新验证码生成
      console.log('   ⏳ 等待新验证码生成...')
      await new Promise(r => setTimeout(r, 3000))

      // 第六步：获取新验证码
      console.log('   🔢 获取新验证码...')
      return await this.getVerificationCode(sessionId)

    } catch (error) {
      console.error('重新获取验证码失败:', error)
      return { success: false, error: `重新获取验证码失败: ${error}` }
    }
  }

  /**
   * 提交验证码并轮询登录状态
   */
  async verifyAndLogin(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: '会话不存在' };
    }
    const { page } = session;

    // 第一步: 获取验证码
    const codeResponse = await this.getVerificationCode(sessionId);
    if (!codeResponse.success || !codeResponse.code) {
      return { success: false, error: codeResponse.error || '无法获取验证码' };
    }

    // 第二步: 提交验证码
    try {
      console.log(`🖋️ 正在输入验证码: ${codeResponse.code}`);
      // 假设输入框已自动聚焦，直接模拟键盘输入，这比CSS选择器更可靠
      await page.keyboard.type(codeResponse.code, { delay: 150 });
      console.log('✅ 验证码输入完毕。');
    } catch (error) {
      console.error('输入验证码时出错:', error);
      return { success: false, error: '输入验证码时出错' };
    }

    // 第三步: 轮询登录状态
    try {
      console.log('🔄 等待登录确认...');
      const startTime = Date.now();
      const timeout = 45000; // 45秒超时

      while (Date.now() - startTime < timeout) {
        if (await this.checkIfLoggedIn(page)) {
          console.log('🎉 登录成功！');
          session.status = 'logged_in';
          return { success: true };
        }
        await new Promise(r => setTimeout(r, 2000)); // 每2秒检查一次
      }
      throw new Error('登录确认超时');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`登录确认失败: ${errorMessage}`);
      session.status = 'error';
      return { success: false, error: '登录确认失败，可能是验证码错误或已过期。' };
    }
  }
}

export const whatsAppAutomation = new WhatsAppAutomation() 