/**
 * 清除浏览器数据脚本
 * 用于重置WhatsApp Web的语言和其他设置
 */

const fs = require('fs').promises;
const path = require('path');

async function clearBrowserData() {
  console.log('🧹 开始清除浏览器数据...\n');

  const userDataPath = path.join(__dirname, '../user-data');

  try {
    // 检查用户数据目录是否存在
    try {
      await fs.access(userDataPath);
      console.log('📁 找到用户数据目录:', userDataPath);
    } catch {
      console.log('✅ 用户数据目录不存在，无需清除');
      return;
    }

    // 列出所有子目录
    const entries = await fs.readdir(userDataPath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    if (directories.length === 0) {
      console.log('✅ 没有找到浏览器会话数据');
      return;
    }

    console.log(`📋 找到 ${directories.length} 个浏览器会话:`);
    directories.forEach(dir => {
      console.log(`   - ${dir.name}`);
    });

    // 删除所有会话数据
    for (const dir of directories) {
      const dirPath = path.join(userDataPath, dir.name);
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`✅ 已删除: ${dir.name}`);
      } catch (error) {
        console.log(`❌ 删除失败: ${dir.name} - ${error.message}`);
      }
    }

    console.log('\n🎉 浏览器数据清除完成！');
    console.log('💡 现在运行测试将使用全新的英文界面设置');

  } catch (error) {
    console.error('❌ 清除数据失败:', error.message);
  }
}

// 运行清除脚本
if (require.main === module) {
  clearBrowserData();
}

module.exports = { clearBrowserData }; 