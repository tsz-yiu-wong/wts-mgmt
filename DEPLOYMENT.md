# WhatsApp Web 账号管理系统部署指南

## 🚀 Railway + Supabase 部署

### 1. 准备工作

#### 1.1 创建Supabase项目
1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 获取项目URL和API密钥
4. 在SQL编辑器中执行 `db/schema.sql` 创建表结构

#### 1.2 配置环境变量
创建 `.env.local` 文件：
```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 自动化服务配置
AUTOMATION_SECRET=your_secret_key_here
USER_DATA_PATH=/app/user-data

# Railway环境
NODE_ENV=production
PORT=3000
```

### 2. Railway部署

#### 2.1 连接GitHub
1. 访问 [Railway](https://railway.app)
2. 使用GitHub登录
3. 创建新项目
4. 连接此GitHub仓库

#### 2.2 配置环境变量
在Railway项目设置中添加环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTOMATION_SECRET`
- `USER_DATA_PATH=/app/user-data`

#### 2.3 部署配置
Railway会自动检测 `Dockerfile` 并开始构建部署。

### 3. 验证部署

#### 3.1 健康检查
访问 `https://your-app.railway.app/api/health` 检查服务状态

#### 3.2 功能测试
1. 访问应用主页
2. 点击"添加账号"测试登录流程
3. 验证验证码获取功能
4. 测试"打开"窗口功能

### 4. 重要注意事项

#### 4.1 数据持久化
- Railway提供持久化存储卷
- 用户数据目录 `/app/user-data` 会被保留
- 建议定期备份重要数据

#### 4.2 资源限制
- Railway Hobby计划: $5/月，512MB RAM
- 推荐使用Pro计划获得更多资源
- 监控内存和CPU使用情况

#### 4.3 安全考虑
- 不要在代码中硬编码密钥
- 使用强密码作为 `AUTOMATION_SECRET`
- 定期轮换API密钥

### 5. 故障排除

#### 5.1 常见问题
```bash
# 查看日志
railway logs

# 重启服务
railway redeploy
```

#### 5.2 浏览器问题
如果Playwright无法启动：
1. 检查Docker构建日志
2. 确认所有依赖都已安装
3. 验证环境变量设置

### 6. 成本预估

| 服务 | 计划 | 月费用 |
|------|------|--------|
| Railway | Hobby | $5 |
| Supabase | Free | $0 |
| **总计** |  | **$5** |

### 7. 扩展选项

#### 7.1 升级Railway计划
- Pro: $20/月 (2GB RAM, 更快CPU)
- Team: $100/月 (企业级功能)

#### 7.2 Supabase Pro
- Pro: $25/月 (更大数据库，更多连接)

## 📞 技术支持

如果在部署过程中遇到问题，请检查：
1. 环境变量是否正确配置
2. Supabase数据库是否可访问
3. Railway构建日志中的错误信息 