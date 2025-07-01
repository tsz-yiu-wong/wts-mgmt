/**
 * 清理浏览器进程脚本
 * 关闭所有Playwright启动的Chromium进程，解决ProcessSingleton错误
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function cleanupBrowsers() {
  console.log('🧹 开始清理浏览器进程...\n');

  try {
    // 在macOS上查找并关闭Chromium进程
    console.log('🔍 查找Chromium进程...');
    
    const { stdout } = await execAsync('ps aux | grep -i chromium | grep -v grep');
    
    if (stdout.trim()) {
      console.log('📋 发现的Chromium进程:');
      console.log(stdout);
      
      // 提取进程ID
      const lines = stdout.trim().split('\n');
      const pids = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[1]; // PID是第二列
      }).filter(pid => pid && !isNaN(pid));
      
      if (pids.length > 0) {
        console.log(`\n💀 准备关闭 ${pids.length} 个进程: ${pids.join(', ')}`);
        
        // 尝试温和关闭
        for (const pid of pids) {
          try {
            await execAsync(`kill ${pid}`);
            console.log(`✅ 已发送TERM信号给进程 ${pid}`);
          } catch (error) {
            console.log(`⚠️  无法关闭进程 ${pid}: ${error.message}`);
          }
        }
        
        // 等待进程关闭
        console.log('\n⏳ 等待进程关闭...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查是否还有残留进程
        try {
          const { stdout: remainingProcs } = await execAsync('ps aux | grep -i chromium | grep -v grep');
          if (remainingProcs.trim()) {
            console.log('🔄 发现残留进程，尝试强制关闭...');
            const remainingLines = remainingProcs.trim().split('\n');
            const remainingPids = remainingLines.map(line => {
              const parts = line.trim().split(/\s+/);
              return parts[1];
            }).filter(pid => pid && !isNaN(pid));
            
            for (const pid of remainingPids) {
              try {
                await execAsync(`kill -9 ${pid}`);
                console.log(`💀 强制关闭进程 ${pid}`);
              } catch (error) {
                console.log(`⚠️  无法强制关闭进程 ${pid}: ${error.message}`);
              }
            }
          } else {
            console.log('✅ 所有Chromium进程已成功关闭');
          }
        } catch (error) {
          console.log('✅ 没有发现残留的Chromium进程');
        }
        
      } else {
        console.log('⚠️  未能提取有效的进程ID');
      }
      
    } else {
      console.log('✅ 没有发现运行中的Chromium进程');
    }
    
    // 清理可能的锁文件
    console.log('\n🔒 清理用户数据目录中的锁文件...');
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const userDataPath = './user-data';
      
      // 遍历所有账号目录
      const accounts = await fs.readdir(userDataPath).catch(() => []);
      
      for (const account of accounts) {
        const accountPath = path.join(userDataPath, account);
        const lockFile = path.join(accountPath, 'SingletonLock');
        
        try {
          await fs.access(lockFile);
          await fs.unlink(lockFile);
          console.log(`🗑️  删除锁文件: ${lockFile}`);
        } catch (error) {
          // 锁文件不存在，跳过
        }
      }
      
      console.log('✅ 锁文件清理完成');
      
    } catch (error) {
      console.log('⚠️  清理锁文件时出错:', error.message);
    }
    
    console.log('\n🎉 浏览器进程清理完成！');
    console.log('💡 现在可以重新启动应用程序了');
    
  } catch (error) {
    if (error.stdout === '' || error.message.includes('No such process')) {
      console.log('✅ 没有发现运行中的Chromium进程');
    } else {
      console.error('❌ 清理过程中出错:', error.message);
    }
  }
}

// 运行清理
if (require.main === module) {
  cleanupBrowsers().catch(console.error);
}

module.exports = { cleanupBrowsers }; 