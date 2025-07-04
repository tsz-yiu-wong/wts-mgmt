const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

class PlaywrightService {
  constructor() {
    this.localDataPath = path.join(os.homedir(), '.whatsapp-manager');
    this.tempDataPath = path.join(this.localDataPath, 'temp');
    this.browsers = new Map(); // 存储正在运行的浏览器实例
  }

  // 登录新账号（自动化流程）
  async loginAccount(phoneNumber) {
    let browser = null;
    let context = null;
    
    try {
      console.log(`开始为 ${phoneNumber} 创建登录会话...`);
      
      // 创建临时用户数据目录
      const userDataDir = path.join(this.tempDataPath, `login_${Date.now()}_${phoneNumber.replace(/\+/g, '')}`);
      await fs.ensureDir(userDataDir);

      // 启动浏览器
      browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // 显示浏览器界面，方便用户扫码
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // 打开WhatsApp Web
      const page = browser.pages()[0] || await browser.newPage();
      await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle' });

      console.log('已打开WhatsApp Web，等待用户扫码登录...');

      // 等待登录完成的检测逻辑
      // TODO: 这里需要根据你后续提供的具体登录检测方法来实现
      await this.waitForLogin(page, phoneNumber);

      console.log(`${phoneNumber} 登录成功！`);

      // 关闭浏览器
      await browser.close();

      return userDataDir;
    } catch (error) {
      console.error(`${phoneNumber} 登录失败:`, error);
      
      if (browser) {
        await browser.close();
      }
      
      throw error;
    }
  }

  // 等待登录完成
  async waitForLogin(page, phoneNumber) {
    const timeout = 300000; // 5分钟超时
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // 方法1: 检测是否存在二维码（如果没有二维码，说明已经登录）
        const qrCodeExists = await page.$('[data-testid="qr-code"]') !== null;
        
        if (!qrCodeExists) {
          // 方法2: 检测聊天界面的存在
          const chatExists = await page.$('[data-testid="chat-list"]') !== null;
          
          if (chatExists) {
            console.log('检测到聊天界面，登录成功');
            // 等待页面完全加载
            await page.waitForTimeout(3000);
            return true;
          }
        }

        // 检测是否出现了需要手机号验证的页面
        const phoneVerification = await page.$('input[type="tel"]') !== null;
        if (phoneVerification) {
          console.log('检测到手机号验证页面');
          // TODO: 这里可以自动填入手机号
          // await page.fill('input[type="tel"]', phoneNumber);
        }

        await page.waitForTimeout(2000); // 等待2秒后重新检测
      } catch (error) {
        console.log('检测登录状态时出错:', error.message);
        await page.waitForTimeout(2000);
      }
    }

    throw new Error('登录超时，请检查网络连接或重新扫码');
  }

  // 打开已有账号
  async openAccount(accountId) {
    try {
      // 动态导入避免循环引用
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const AccountManager = require('./accountManager');
      const accountManager = new AccountManager(supabase);
      
      // 获取账号本地路径
      const userDataDir = accountManager.getAccountLocalPath(accountId);
      
      if (!await fs.pathExists(userDataDir)) {
        throw new Error('账号数据不存在，请先同步账号');
      }

      console.log(`正在打开账号 ${accountId}...`);

      // 启动浏览器实例
      const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      // 存储浏览器实例，用于后续管理
      this.browsers.set(accountId, browser);

      // 打开WhatsApp Web
      const page = browser.pages()[0] || await browser.newPage();
      await page.goto('https://web.whatsapp.com', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // 检测是否需要重新登录
      await this.checkLoginStatus(page, accountId);

      // 监听浏览器关闭事件
      browser.on('disconnected', () => {
        console.log(`账号 ${accountId} 的浏览器已关闭`);
        this.browsers.delete(accountId);
      });

      console.log(`账号 ${accountId} 已成功打开`);
      return { success: true, message: '账号已成功打开' };

    } catch (error) {
      console.error(`打开账号 ${accountId} 失败:`, error);
      throw error;
    }
  }

  // 检查登录状态
  async checkLoginStatus(page, accountId) {
    try {
      // 等待页面加载
      await page.waitForTimeout(5000);

      // 检测是否出现二维码（需要重新登录）
      const qrCodeExists = await page.$('[data-testid="qr-code"]') !== null;
      
      if (qrCodeExists) {
        console.log(`账号 ${accountId} 需要重新登录`);
        // 可以在这里触发重新登录流程或通知用户
        return false;
      }

      // 检测聊天界面
      const chatExists = await page.$('[data-testid="chat-list"]') !== null;
      
      if (chatExists) {
        console.log(`账号 ${accountId} 登录状态正常`);
        
        // 更新最后登录时间
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        const AccountManager = require('./accountManager');
        const accountManager = new AccountManager(supabase);
        await accountManager.updateLastLogin(accountId);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }

  // 关闭指定账号的浏览器
  async closeAccount(accountId) {
    const browser = this.browsers.get(accountId);
    if (browser) {
      await browser.close();
      this.browsers.delete(accountId);
      console.log(`账号 ${accountId} 的浏览器已关闭`);
    }
  }

  // 关闭所有浏览器实例
  async closeAllBrowsers() {
    for (const [accountId, browser] of this.browsers) {
      try {
        await browser.close();
        console.log(`关闭账号 ${accountId} 的浏览器`);
      } catch (error) {
        console.error(`关闭账号 ${accountId} 浏览器失败:`, error);
      }
    }
    this.browsers.clear();
  }

  // 获取当前运行的账号数量
  getRunningAccountsCount() {
    return this.browsers.size;
  }

  // 获取运行中的账号列表
  getRunningAccounts() {
    return Array.from(this.browsers.keys());
  }
}

module.exports = PlaywrightService; 