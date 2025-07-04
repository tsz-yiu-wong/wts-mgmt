# WhatsApp 多账号管理器

一个基于 Electron + Playwright 的轻量化 WhatsApp 多账号指纹浏览器管理应用。

## 功能特点

- 🚀 **轻量化设计** - 简洁的界面，专注核心功能
- 🎨 **毛玻璃UI** - 现代化的毛玻璃界面设计
- 🔒 **指纹隔离** - 每个账号使用独立的浏览器环境
- ☁️ **云端同步** - 使用 Supabase 存储用户数据
- 🤖 **自动化登录** - Playwright 自动化登录流程
- 💾 **持久化存储** - 无需频繁重新登录
- 🔄 **多账号切换** - 支持同时运行多个 WhatsApp 实例
- 🌐 **跨平台支持** - macOS 和 Windows 兼容

## 技术栈

- **前端框架**: Electron + HTML/CSS/JavaScript
- **自动化**: Playwright (Chromium)
- **数据库**: Supabase (PostgreSQL)
- **文件存储**: Supabase Storage
- **构建工具**: Vite
- **UI风格**: 毛玻璃效果 (Glassmorphism)

## 项目结构

```
wts-mgmt/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.js             # 主进程入口
│   │   ├── preload.js          # 预加载脚本
│   │   └── services/           # 服务层
│   │       ├── accountManager.js    # 账号管理服务
│   │       └── playwrightService.js # 自动化服务
│   └── renderer/               # 渲染进程
│       ├── index.html          # 主页面
│       ├── styles.css          # 样式文件
│       └── app.js              # 前端逻辑
├── database/
│   └── schema.sql              # 数据库表结构
├── config/
│   └── env.example             # 环境变量模板
├── package.json                # 项目依赖
├── vite.config.js              # Vite 配置
└── README.md                   # 项目说明
```

## 安装设置

### 1. 环境要求

- Node.js 18+ 
- npm 或 yarn
- Supabase 账号

### 2. 克隆项目

```bash
git clone <项目地址>
cd wts-mgmt
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置 Supabase

1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置 -> API 中获取：
   - Project URL
   - Anon key
3. 复制环境配置文件：
   ```bash
   cp config/env.example .env.local
   ```
4. 编辑 `.env.local` 文件，填入 Supabase 配置：
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 5. 初始化数据库

1. 在 Supabase 控制台的 SQL Editor 中执行 `database/schema.sql`
2. 在 Storage 中创建名为 `whatsapp-userdata` 的存储桶
3. 设置存储桶为私有，并配置适当的访问策略

### 6. 启动应用

开发模式：
```bash
npm run dev
```

生产构建：
```bash
npm run build
```

启动应用：
```bash
npm start
```

## 使用说明

### 添加账号

1. 点击 "添加账号" 按钮
2. 输入完整的国际格式手机号（如：+86 138 8888 8888）
3. 系统会自动打开 WhatsApp Web，使用手机扫描二维码登录
4. 登录成功后，账号数据会自动保存到云端

### 同步账号

- 点击 "同步账号" 按钮从云端下载所有账号数据到本地
- 适用于新设备或重新安装应用的情况

### 打开账号

- 点击账号列表中的 "打开" 按钮
- 系统会使用独立的浏览器实例打开该账号的 WhatsApp Web
- 支持同时打开多个账号

### 删除账号

- 点击 "删除" 按钮进行软删除
- 本地数据会被清理，但云端数据保留
- 可通过同步功能重新获取

## 核心流程

### 添加账号流程
```
用户输入手机号 → Playwright启动浏览器 → 用户扫码登录 → 
保存userDataDir → 压缩上传到Supabase → 更新数据库记录
```

### 同步账号流程
```
从Supabase查询账号列表 → 下载userDataDir.zip → 
解压到本地目录 → 更新本地状态
```

### 打开账号流程
```
检查本地userDataDir → 启动独立Chrome实例 → 
加载用户数据 → 打开WhatsApp Web → 验证登录状态
```

## 开发指南

### 主要组件

- **AccountManager**: 负责账号数据管理和云端同步
- **PlaywrightService**: 处理浏览器自动化和账号打开
- **AppState**: 前端状态管理
- **NotificationManager**: 通知系统

### 自定义自动化流程

目前 Playwright 服务包含了基本的登录检测逻辑。如需自定义：

1. 编辑 `src/main/services/playwrightService.js`
2. 修改 `waitForLogin` 方法中的检测逻辑
3. 可以添加更多的元素检测或交互步骤

### 添加新功能

1. 后端逻辑：在 `src/main/` 中添加服务或修改现有服务
2. 前端界面：修改 `src/renderer/` 中的文件
3. 数据库：在 `database/schema.sql` 中添加新表或字段
4. IPC通信：在 `main.js` 和 `preload.js` 中添加新的通信方法

## 注意事项

1. **数据安全**: 用户数据通过 Supabase 加密存储，建议配置适当的 RLS 策略
2. **资源使用**: 每个打开的账号会占用一个 Chrome 实例，注意内存使用
3. **网络要求**: 需要稳定的网络连接用于 Supabase 同步
4. **WhatsApp限制**: 遵守 WhatsApp 的使用条款，避免过度自动化

## 故障排除

### 常见问题

**Q: 启动时提示 Electron API 不可用**
A: 检查 preload.js 是否正确加载，确认 contextIsolation 设置

**Q: 无法连接 Supabase**
A: 验证 .env.local 中的配置是否正确，检查网络连接

**Q: 浏览器启动失败**
A: 确认 Playwright 依赖已正确安装：`npx playwright install chromium`

**Q: 账号登录后仍显示二维码**
A: 检查 WhatsApp Web 的元素选择器是否更新，可能需要调整检测逻辑

### 调试技巧

1. 开启开发者工具查看控制台日志
2. 检查 Supabase 控制台的实时日志
3. 使用 `npm run dev` 启动开发模式进行调试

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**免责声明**: 本项目仅供学习和个人使用。请遵守 WhatsApp 的服务条款，不要用于商业或大规模自动化用途。
