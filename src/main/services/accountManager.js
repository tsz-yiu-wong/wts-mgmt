const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class AccountManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.localDataPath = path.join(os.homedir(), '.whatsapp-manager');
    this.ensureLocalDataDir();
  }

  // 确保本地数据目录存在
  async ensureLocalDataDir() {
    await fs.ensureDir(this.localDataPath);
    await fs.ensureDir(path.join(this.localDataPath, 'accounts'));
  }

  // 获取所有账号列表
  async getAccounts() {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 检查本地文件状态
      const accountsWithStatus = await Promise.all(
        data.map(async (account) => {
          const localPath = path.join(this.localDataPath, 'accounts', account.id);
          const hasLocalData = await fs.pathExists(localPath);
          
          return {
            ...account,
            status: hasLocalData ? '就绪' : '需要同步',
            last_login_at: account.last_login_at ? new Date(account.last_login_at).toLocaleString('zh-CN') : '从未登录'
          };
        })
      );

      return { data: accountsWithStatus };
    } catch (error) {
      console.error('获取账号列表失败:', error);
      throw error;
    }
  }

  // 添加新账号
  async addAccount(phoneNumber, userDataPath) {
    try {
      const accountId = uuidv4();
      
      // 压缩用户数据目录
      const zipPath = await this.compressUserData(userDataPath, accountId);
      
      // 上传到Supabase Storage
      const storageKey = await this.uploadToStorage(zipPath, accountId);
      
      // 保存账号信息到数据库
      const { data, error } = await this.supabase
        .from('accounts')
        .insert({
          id: accountId,
          phone_number: phoneNumber,
          storage_key: storageKey,
          status: '就绪',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          is_deleted: false
        })
        .select()
        .single();

      if (error) throw error;

      // 保存到本地
      await this.saveToLocal(zipPath, accountId);
      
      // 清理临时文件
      await fs.remove(zipPath);

      return { data };
    } catch (error) {
      console.error('添加账号失败:', error);
      throw error;
    }
  }

  // 压缩用户数据目录
  async compressUserData(userDataPath, accountId) {
    const zipPath = path.join(this.localDataPath, `${accountId}_temp.zip`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });

      output.on('close', () => {
        console.log(`压缩完成: ${archive.pointer()} total bytes`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(userDataPath, false);
      archive.finalize();
    });
  }

  // 上传到Supabase Storage
  async uploadToStorage(zipPath, accountId) {
    const fileName = `accounts/${accountId}/userdata.zip`;
    const fileBuffer = await fs.readFile(zipPath);

    const { data, error } = await this.supabase.storage
      .from('whatsapp-userdata')
      .upload(fileName, fileBuffer, {
        contentType: 'application/zip',
        upsert: true
      });

    if (error) throw error;

    return data.path;
  }

  // 保存到本地
  async saveToLocal(zipPath, accountId) {
    const localDir = path.join(this.localDataPath, 'accounts', accountId);
    await fs.ensureDir(localDir);
    
    // 解压到本地目录
    await extract(zipPath, { dir: localDir });
  }

  // 同步所有账号
  async syncAccounts() {
    try {
      const { data: accounts } = await this.getAccounts();
      
      let syncedCount = 0;
      let errors = [];

      for (const account of accounts.data) {
        try {
          if (account.status === '需要同步') {
            await this.syncSingleAccount(account);
            syncedCount++;
          }
        } catch (error) {
          errors.push(`${account.phone_number}: ${error.message}`);
        }
      }

      return {
        success: true,
        syncedCount,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      console.error('同步账号失败:', error);
      throw error;
    }
  }

  // 同步单个账号
  async syncSingleAccount(account) {
    // 从Supabase Storage下载
    const { data, error } = await this.supabase.storage
      .from('whatsapp-userdata')
      .download(account.storage_key);

    if (error) throw error;

    // 保存临时文件
    const tempZipPath = path.join(this.localDataPath, `${account.id}_sync.zip`);
    await fs.writeFile(tempZipPath, Buffer.from(await data.arrayBuffer()));

    // 解压到本地
    await this.saveToLocal(tempZipPath, account.id);

    // 清理临时文件
    await fs.remove(tempZipPath);
  }

  // 删除账号（软删除）
  async deleteAccount(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .update({ 
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;

      // 删除本地文件
      const localPath = path.join(this.localDataPath, 'accounts', accountId);
      if (await fs.pathExists(localPath)) {
        await fs.remove(localPath);
      }

      return { data };
    } catch (error) {
      console.error('删除账号失败:', error);
      throw error;
    }
  }

  // 更新账号最后登录时间
  async updateLastLogin(accountId) {
    try {
      const { data, error } = await this.supabase
        .from('accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('更新登录时间失败:', error);
      throw error;
    }
  }

  // 获取账号本地路径
  getAccountLocalPath(accountId) {
    return path.join(this.localDataPath, 'accounts', accountId);
  }
}

module.exports = AccountManager; 