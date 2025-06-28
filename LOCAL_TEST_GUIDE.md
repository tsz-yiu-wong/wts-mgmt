# 🧪 本地测试指南

## 📋 测试目标

在部署到Railway之前，验证WhatsApp Web自动化功能的完整性：

1. **Playwright浏览器自动化**
2. **WhatsApp Web登录流程**
3. **API端点响应**
4. **数据库连接**
5. **窗口管理功能**

## 🚀 开始测试

### 1. 环境准备

```bash
# 安装依赖
npm install

# 安装Playwright浏览器
npx playwright install chromium

# 启动开发服务器
npm run dev
```

### 2. 强制英文界面（推荐）

为了获得最佳测试体验，建议清除旧的浏览器数据并强制使用英文界面：

```bash
# 清除所有浏览器会话数据
node test/clear-data.js

# 重新运行测试（将使用英文界面）
node test/network-test.js
```

**为什么使用英文界面？**
- ✅ 更稳定的自动化测试
- ✅ 界面元素定位更准确
- ✅ 与生产环境保持一致

### 3. 基础浏览器测试

测试Playwright是否能正常启动WhatsApp Web：

```bash
# 运行浏览器自动化测试
node test/local-test.js
```

**预期结果：**
- ✅ 自动打开Chromium浏览器
- ✅ 访问https://web.whatsapp.com/
- ✅ 显示英文版二维码或登录界面
- ✅ 用户数据目录创建成功

### 4. 网络连接测试

专门测试网络连接和浏览器兼容性：

```bash
# 运行网络测试
node test/network-test.js
```

**预期结果（修复后）：**
```
🌐 开始网络连接测试...

🚀 启动浏览器（简化配置）...
✅ 浏览器启动成功

🔍 测试网络连接...
   测试 WhatsApp Web: https://web.whatsapp.com
   ✅ WhatsApp Web - 加载成功
      标题: WhatsApp Web
      URL: https://web.whatsapp.com/

📱 详细测试WhatsApp Web...
   访问WhatsApp Web（英文界面）...
✅ WhatsApp Web页面加载成功
✅ 页面内容正常，包含WhatsApp相关文本
✅ 已通过浏览器兼容性检查
✅ 页面显示为英文
✅ 找到二维码区域 或 ✅ 找到英文登录按钮
```

### 5. 完整API流程测试

测试完整的自动化API流程：

```bash
# 运行API测试
node test/api-test.js
```

**测试流程：**
1. 🏥 健康检查API
2. 📋 获取账号列表  
3. 🔐 登录初始化
4. 📱 获取验证码
5. 🎯 完成登录
6. 🪟 打开窗口

**预期结果（测试模式）：**
```
🚀 开始WhatsApp API自动化测试...

🏥 测试健康检查API...
✅ 服务器健康状态: healthy

📋 测试获取账号列表...
✅ 账号列表获取成功, 总数: 4
   数据模式: 测试模式

🔐 测试登录初始化...
✅ 登录初始化成功
   会话ID: xxx-xxx-xxx
   消息: 登录流程已启动，请等待验证码 (测试模式)

📱 测试获取验证码...
✅ 验证码获取成功
   验证码: 12345678
   消息: 验证码获取成功 (测试模式)

🎯 测试完成登录...
✅ 登录完成
   账号ID: xxx-xxx-xxx
   电话号码: +86 13800138000
   状态: online

🪟 测试打开WhatsApp窗口...
✅ 窗口打开成功
   窗口ID: xxx-xxx-xxx
   窗口URL: https://web.whatsapp.com/
   消息: WhatsApp窗口已打开 (测试模式)

🔄 验证账号已添加...
✅ 验证完成, 账号总数: 4

🎉 测试完成！所有API端点工作正常
🚀 系统已准备好部署到Railway！
```

### 6. 前端界面测试

在浏览器中访问：http://localhost:3002

**测试功能：**
1. ✅ 查看账号列表
2. ✅ 点击"添加账号"
3. ✅ 输入电话号码
4. ✅ 获取验证码显示
5. ✅ 完成登录流程
6. ✅ 点击"打开"按钮

## 🎯 生产模式测试

如果已配置Supabase，可以测试生产模式：

### 1. 配置环境变量

在`.env.local`中设置：
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 2. 创建数据库表

在Supabase SQL编辑器中执行`db/schema.sql`

### 3. 重新运行测试

```bash
# 重启服务器
npm run dev

# 再次运行API测试
node test/api-test.js
```

**生产模式特征：**
- 控制台无`[测试模式]`标识
- 数据保存到Supabase数据库
- 真实的Playwright浏览器启动

## 🌍 语言设置问题

### 强制英文界面

如果WhatsApp Web仍显示中文，尝试以下方法：

1. **清除浏览器数据**（推荐）：
   ```bash
   node test/clear-data.js
   ```

2. **手动设置**：
   - 打开浏览器窗口
   - 点击右上角设置菜单
   - 选择 Settings > Language > English

3. **使用VPN**：
   - 连接到美国/英国服务器
   - 清除数据后重新测试

### 配置改进

所有测试脚本现在都包含：
- ✅ `locale: 'en-US'` - 浏览器语言设置
- ✅ `Accept-Language: 'en-US,en;q=0.9'` - HTTP请求语言偏好
- ✅ 最新Chrome 131 User-Agent - 通过兼容性检查
- ✅ 双语界面元素检测 - 支持英文和中文界面

## 🐛 故障排除

### 常见问题

1. **"服务器未响应"**
   ```bash
   # 检查服务器是否启动
   lsof -ti :3002
   # 或重新启动
   npm run dev
   ```

2. **"浏览器升级提示"**
   ```bash
   # 已修复：现在使用Chrome 131 User-Agent
   # 如果仍有问题，清除数据重试
   node test/clear-data.js
   ```

3. **"页面显示中文"**
   ```bash
   # 清除浏览器数据，强制英文
   node test/clear-data.js
   node test/network-test.js
   ```

4. **"Playwright安装失败"**
   ```bash
   # 手动安装浏览器
   npx playwright install chromium
   # 或安装所有浏览器
   npx playwright install
   ```

5. **"数据库连接失败"**
   - 检查`.env.local`配置
   - 验证Supabase项目状态
   - 确认数据库表已创建

6. **"浏览器无法启动"**
   ```bash
   # 检查系统依赖
   npx playwright install-deps chromium
   ```

### 调试模式

如果需要详细调试信息：

```bash
# 启用Playwright调试
DEBUG=pw:* node test/local-test.js

# 或者启用Next.js调试
DEBUG=next:* npm run dev
```

## 📊 测试完成标志

当所有测试通过时，您会看到：

```
🎉 测试完成！所有API端点工作正常

📊 测试总结:
✅ 健康检查 - 通过
✅ 账号列表 - 通过  
✅ 登录初始化 - 通过
✅ 获取验证码 - 通过
✅ 完成登录 - 通过
✅ 打开窗口 - 通过

🚀 系统已准备好部署到Railway！
```

## 🚀 下一步

测试通过后，您可以：

1. **部署到Railway** - 按照`DEPLOYMENT.md`指南
2. **配置生产环境** - 设置环境变量和数据库
3. **监控系统** - 查看日志和性能指标

---

**注意**：
- 首次运行测试时，Playwright会下载Chromium浏览器（约100MB），请确保网络连接稳定
- 推荐使用英文界面进行测试，可提供更稳定的自动化体验
- 如遇到语言问题，优先使用`node test/clear-data.js`清除数据 