#!/bin/bash

echo "🚀 WhatsApp Web 账号管理系统设置脚本"
echo "======================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18 或更高版本"
    exit 1
fi

# 检查版本
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18 或更高版本"
    exit 1
fi

echo "✅ Node.js 版本检查通过"

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 安装Playwright浏览器
echo "🌐 安装Playwright浏览器..."
npx playwright install chromium

# 创建用户数据目录
echo "📁 创建用户数据目录..."
mkdir -p user-data
chmod 755 user-data

# 创建环境变量文件
if [ ! -f .env.local ]; then
    echo "📝 创建环境变量文件..."
    cat > .env.local << 'EOL'
# Supabase配置 - 请替换为您的实际值
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 自动化服务配置
AUTOMATION_SECRET=your_automation_secret_key
USER_DATA_PATH=./user-data

# 本地开发环境
NODE_ENV=development
PORT=3000
EOL
    echo "⚠️  请编辑 .env.local 文件并填入正确的 Supabase 配置"
else
    echo "✅ 环境变量文件已存在"
fi

echo ""
echo "🎉 设置完成！"
echo ""
echo "下一步："
echo "1. 编辑 .env.local 文件，填入 Supabase 配置"
echo "2. 在 Supabase 中执行 db/schema.sql 创建数据库表"
echo "3. 运行 npm run dev 启动开发服务器"
echo ""
echo "部署到 Railway:"
echo "1. 推送代码到 GitHub"
echo "2. 在 Railway 中连接仓库"
echo "3. 配置环境变量"
echo "4. 部署应用"
echo ""
echo "详细说明请参考 DEPLOYMENT.md 文件" 