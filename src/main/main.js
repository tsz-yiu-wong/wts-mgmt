const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { createClient } = require('@supabase/supabase-js');
const AccountManager = require('./services/accountManager');
const PlaywrightService = require('./services/playwrightService');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Supabase配置 - 需要在.env.local中设置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('请在 .env.local 文件中配置 Supabase 环境变量');
    process.exit(1);
  }
const supabase = createClient(supabaseUrl, supabaseAnonKey);



let mainWindow;
let accountManager;
let playwrightService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // macOS 毛玻璃效果
    ...(process.platform === 'darwin' ? {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      transparent: true
    } : {}),
    frame: false
  });

  // 根据环境加载页面
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 初始化服务
  accountManager = new AccountManager(supabase);
  playwrightService = new PlaywrightService();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC通信处理
ipcMain.handle('get-accounts', async () => {
  try {
    return await accountManager.getAccounts();
  } catch (error) {
    console.error('获取账号列表失败:', error);
    return { error: error.message };
  }
});

ipcMain.handle('add-account', async (event, phoneNumber) => {
  try {
    // 显示加载状态
    mainWindow.webContents.send('account-status-update', { 
      phoneNumber, 
      status: '正在添加...' 
    });

    // 启动Playwright登录流程
    const userDataPath = await playwrightService.loginAccount(phoneNumber);
    
    // 保存账号信息到数据库
    const result = await accountManager.addAccount(phoneNumber, userDataPath);
    
    mainWindow.webContents.send('account-status-update', { 
      phoneNumber, 
      status: '添加成功' 
    });

    return result;
  } catch (error) {
    console.error('添加账号失败:', error);
    mainWindow.webContents.send('account-status-update', { 
      phoneNumber, 
      status: '添加失败' 
    });
    return { error: error.message };
  }
});

ipcMain.handle('sync-accounts', async () => {
  try {
    return await accountManager.syncAccounts();
  } catch (error) {
    console.error('同步账号失败:', error);
    return { error: error.message };
  }
});

ipcMain.handle('open-account', async (event, accountId) => {
  try {
    return await playwrightService.openAccount(accountId);
  } catch (error) {
    console.error('打开账号失败:', error);
    return { error: error.message };
  }
});

ipcMain.handle('delete-account', async (event, accountId) => {
  try {
    return await accountManager.deleteAccount(accountId);
  } catch (error) {
    console.error('删除账号失败:', error);
    return { error: error.message };
  }
});

// 窗口控制
ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
}); 