# 📊 Supabase 数据库配置指南

## 🚀 快速开始

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/dashboard)
2. 点击 "New project"
3. 选择组织和区域（推荐选择离用户最近的区域）
4. 输入项目名称：`wts-mgmt` 
5. 输入数据库密码（请记住此密码）
6. 点击 "Create new project"

### 2. 获取项目配置信息

项目创建完成后：

1. 进入项目仪表板
2. 点击左侧 **Settings** → **API**
3. 复制以下信息：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**注意**: 
- 将 `your-project` 替换为你的实际项目ID
- 将 `your_anon_key_here` 替换为实际的 anon key
- **只使用 anon key**，无需 service role key

### 4. 创建数据库表

1. 在 Supabase 仪表板中，点击左侧 **SQL Editor**
2. 复制 `db/schema.sql` 文件的全部内容
3. 粘贴到 SQL 编辑器中
4. 点击 "Run" 执行 SQL

### 5. 验证配置

启动开发服务器：

```bash
npm run dev
```

如果配置正确：
- 控制台不会显示 `[测试模式]` 日志
- 可以正常添加和查看账号
- 数据会保存到 Supabase 数据库

如果配置错误，系统会自动回退到测试模式。

## 🔒 安全说明

### RLS (行级安全) 

当前配置为**匿名用户模式**，所有用户共享相同数据。

如需启用用户隔离：
1. 在 Supabase 中启用 Authentication
2. 修改数据库表添加 `user_id` 字段
3. 配置 RLS 策略

### 推荐安全设置

1. **生产环境**：启用 RLS 和用户认证
2. **开发环境**：可使用当前的匿名模式
3. **Railway 部署**：确保环境变量正确配置

## 🛠️ 故障排除

### 常见问题

1. **"获取账号列表失败"**
   - 检查环境变量是否正确
   - 确认 Supabase 项目状态正常
   - 查看浏览器开发者工具的 Network 面板

2. **"无法连接到数据库"**
   - 检查 Project URL 格式是否正确
   - 确认 anon key 完整无误
   - 验证项目是否处于活跃状态

3. **表不存在错误**
   - 确认已运行 `db/schema.sql`
   - 检查表是否创建成功

### 测试模式检查

如果不确定是否在测试模式，查看浏览器控制台：

- **测试模式**: 显示 `[测试模式] xxx`
- **生产模式**: 没有测试模式标识

## 📈 数据库监控

在 Supabase 仪表板中可以：

1. **Table Editor**: 查看和编辑表数据
2. **SQL Editor**: 运行自定义 SQL 查询  
3. **Logs**: 查看数据库操作日志
4. **Metrics**: 监控数据库性能

## 🚀 Railway 部署

部署到 Railway 时：

1. 在 Railway 项目中添加环境变量
2. 使用相同的 Supabase 配置
3. 确保生产环境数据库稳定性

---

**下一步**: 配置完成后，可以开始 [本地测试](./TEST_GUIDE.md) 或 [部署到 Railway](./DEPLOYMENT.md) 