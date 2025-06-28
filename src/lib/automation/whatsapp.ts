import { chromium, BrowserContext, Page } from 'playwright'
import path from 'path'
import { promises as fs } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { AutomationSession, VerificationCodeResponse } from '@/types/automation'

class WhatsAppAutomation {
  private sessions = new Map<string, AutomationSession>()
  private windows = new Map<string, BrowserContext>() // 存储窗口上下文
  private userDataBasePath: string

  constructor() {
    this.userDataBasePath = process.env.USER_DATA_PATH || './user-data'
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

      // 启动浏览器上下文
      const browserContext = await chromium.launchPersistentContext(userDataPath, {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        viewport: { width: 1200, height: 800 },
        locale: 'en-US', // 设置英文语言
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9'
        },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      })

      const page = await browserContext.newPage()
      
      // 创建会话对象
      const session: AutomationSession = {
        sessionId,
        phoneNumber,
        userDataPath,
        browserContext,
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
      // 访问WhatsApp Web
      await page.goto('https://web.whatsapp.com/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      })

      // 等待页面加载
      await page.waitForTimeout(3000)

      // 检查是否已经登录
      const isLoggedIn = await this.checkIfLoggedIn(page)
      if (isLoggedIn) {
        session.status = 'logged_in'
        return
      }

      // 查找并点击"通过电话号码登录"按钮
      try {
        // 优先尝试英文版本（DIV或BUTTON元素都支持）
        await page.waitForSelector('text=Log in with phone number', { timeout: 10000 })
        await page.click('text=Log in with phone number')
        console.log('Found and clicked English login button')
        await page.waitForTimeout(2000)
      } catch (error) {
        // 尝试中文版本
        try {
          await page.waitForSelector('text=用电话号码登录', { timeout: 5000 })
          await page.click('text=用电话号码登录')
          console.log('Found and clicked Chinese login button')
          await page.waitForTimeout(2000)
        } catch (error2) {
          // 如果找不到按钮，可能已经在登录页面
          console.log('Phone login button not found, assuming already on login page')
        }
      }

      // 解析电话号码（假设格式为+86 13812345678）
      const phoneMatch = phoneNumber.match(/^\+(\d+)\s(.+)$/)
      if (!phoneMatch) {
        throw new Error('电话号码格式不正确，应为：+86 13812345678')
      }

      const countryCode = phoneMatch[1]
      const number = phoneMatch[2].replace(/\s/g, '')

      // 输入国家代码
      const countryInput = await page.waitForSelector('input[data-testid="cc-input"]', { timeout: 10000 })
      await countryInput.fill(countryCode)
      await page.waitForTimeout(1000)

      // 输入电话号码
      const phoneInput = await page.waitForSelector('input[data-testid="phone-number-input"]', { timeout: 10000 })
      await phoneInput.fill(number)
      await page.waitForTimeout(1000)

      // 点击下一步
      await page.click('button[data-testid="phone-number-continue"]')
      
      // 等待验证码页面出现
      await page.waitForSelector('[data-testid="code-display"]', { timeout: 60000 })
      
      session.status = 'waiting_code'
    } catch (error) {
      session.status = 'error'
      throw new Error(`登录流程失败: ${error}`)
    }
  }

  /**
   * 获取验证码
   */
  async getVerificationCode(sessionId: string): Promise<VerificationCodeResponse> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: '会话不存在' }
    }

    const { page } = session

    try {
      // 查找验证码显示元素
      const codeElement = await page.waitForSelector('[data-testid="code-display"]', { timeout: 30000 })
      const verificationCode = await codeElement.textContent()

      if (verificationCode) {
        return { success: true, code: verificationCode.trim() }
      } else {
        return { success: false, error: '验证码未生成' }
      }
    } catch (error) {
      return { success: false, error: `获取验证码失败: ${error}` }
    }
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
   * 检查是否已登录
   */
  private async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      // 检查是否存在聊天界面
      await page.waitForSelector('[data-testid="chat-list"]', { timeout: 5000 })
      return true
    } catch {
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

    const { browserContext, userDataPath } = session

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
      await browserContext.close()

      // 清理会话
      this.sessions.delete(sessionId)

    } catch (error) {
      throw new Error(`完成登录失败: ${error}`)
    }
  }

  /**
   * 打开WhatsApp窗口，返回browser context ID
   */
  async openWindow(accountId: string): Promise<string> {
    const accountDataPath = path.join(this.userDataBasePath, accountId)

    try {
      // 检查账号数据目录是否存在
      await fs.access(accountDataPath)

      // 启动浏览器上下文
      const browserContext = await chromium.launchPersistentContext(accountDataPath, {
        headless: false, // 显示浏览器窗口
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ],
        viewport: { width: 1200, height: 800 },
        locale: 'en-US', // 设置英文语言
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9'
        },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      })

      const page = await browserContext.newPage()
      await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle' })

      // 生成browser context ID
      const contextId = uuidv4()
      this.windows.set(contextId, browserContext)

      return contextId
    } catch (error) {
      throw new Error(`打开窗口失败: ${error}`)
    }
  }

  /**
   * 关闭窗口
   */
  async closeWindow(contextId: string): Promise<void> {
    const browserContext = this.windows.get(contextId)
    if (browserContext) {
      try {
        await browserContext.close()
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
}

export const whatsAppAutomation = new WhatsAppAutomation() 