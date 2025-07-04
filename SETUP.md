# 项目设置完善指南

这份文档包含一些需要手动完善的代码细节和设置步骤。

## 1. 环境变量加载

在 `src/main/main.js` 的顶部添加环境变量加载：

```javascript
// 在文件开头添加
require('dotenv').config();

// 然后在现有的 Supabase 配置部分修改为：
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('请在 .env.local 文件中配置 Supabase 环境变量');
  process.exit(1);
}
```

## 2. 安装 dotenv 依赖

在 package.json 的 dependencies 中添加：

```json
"dotenv": "^16.3.1"
```

然后运行：
```bash
npm install dotenv
```

## 3. 修正 PlaywrightService 中的循环引用

在 `src/main/services/playwrightService.js` 中，将 AccountManager 的引用修改为：

```javascript
// 替换这些行：
// const AccountManager = require('./accountManager');
// const accountManager = new AccountManager();

// 改为在 openAccount 方法中：
async openAccount(accountId) {
  try {
    // 动态导入避免循环引用
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const AccountManager = require('./accountManager');
    const accountManager = new AccountManager(supabase);
    
    // ... 其余代码保持不变
  }
}

// 同样在 checkLoginStatus 方法中也要修改
```

## 4. 完善 Vite 配置

将 `vite.config.js` 修改为：

```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../dist-renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html')
    }
  },
  server: {
    port: 3000,
    cors: true
  },
  base: './'
});
```

## 5. 添加开发脚本

确保 package.json 中的 scripts 包含：

```json
{
  "scripts": {
    "start": "electron .",
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:main": "nodemon --exec electron . --watch src/main",
    "dev:renderer": "vite",
    "build": "npm run build:renderer && electron-builder",
    "build:renderer": "vite build"
  }
}
```

## 6. Playwright 浏览器安装

首次运行前需要安装 Playwright 浏览器：

```bash
npx playwright install chromium
```

## 7. 修正主进程的环境配置

在 `src/main/main.js` 中修改窗口创建部分：

```javascript
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
}
```

## 8. 添加错误处理

在主进程中添加全局错误处理：

```javascript
// 在 main.js 底部添加
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
```

## 9. Supabase 存储桶设置

在 Supabase 控制台中：

1. 进入 Storage 页面
2. 创建新的存储桶 `whatsapp-userdata`
3. 设置为私有存储桶
4. 添加以下存储策略：

```sql
-- 允许所有用户上传文件
CREATE POLICY "Allow uploads for all users" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'whatsapp-userdata');

-- 允许所有用户下载文件
CREATE POLICY "Allow downloads for all users" ON storage.objects
    FOR SELECT USING (bucket_id = 'whatsapp-userdata');

-- 允许所有用户删除文件
CREATE POLICY "Allow deletes for all users" ON storage.objects
    FOR DELETE USING (bucket_id = 'whatsapp-userdata');
```

## 10. 测试启动流程

1. 确保所有依赖已安装：
   ```bash
   npm install
   npx playwright install chromium
   ```

2. 配置环境变量：
   ```bash
   cp config/env.example .env.local
   # 编辑 .env.local 文件填入实际配置
   ```

3. 初始化数据库：
   - 在 Supabase 控制台执行 `database/schema.sql`
   - 创建存储桶和策略

4. 启动开发环境：
   ```bash
   npm run dev
   ```

## 11. 生产构建

如需构建生产版本：

```bash
npm run build
```

## 注意事项

- 确保 Node.js 版本 18+
- macOS 需要 Xcode Command Line Tools
- Windows 需要 Visual Studio Build Tools
- 网络环境需要能访问 Supabase 和 WhatsApp Web

## 后续自定义

根据你的具体需求，可能需要调整：

1. **WhatsApp 登录检测逻辑** - 在 `playwrightService.js` 中的 `waitForLogin` 方法
2. **UI 样式** - 修改 `styles.css` 中的毛玻璃效果
3. **存储策略** - 根据安全需求调整 Supabase 策略
4. **错误处理** - 添加更详细的错误处理和用户提示

完成这些步骤后，应用就可以正常运行了！ 