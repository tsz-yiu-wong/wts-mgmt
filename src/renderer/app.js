// 应用状态管理
class AppState {
  constructor() {
    this.accounts = [];
    this.isLoading = false;
    this.runningAccounts = new Set();
  }

  setAccounts(accounts) {
    this.accounts = accounts;
    this.updateUI();
  }

  addAccount(account) {
    this.accounts.push(account);
    this.updateUI();
  }

  updateAccount(accountId, updates) {
    const index = this.accounts.findIndex(acc => acc.id === accountId);
    if (index !== -1) {
      this.accounts[index] = { ...this.accounts[index], ...updates };
      this.updateUI();
    }
  }

  removeAccount(accountId) {
    this.accounts = this.accounts.filter(acc => acc.id !== accountId);
    this.updateUI();
  }

  setLoading(loading, text = '正在处理...') {
    this.isLoading = loading;
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loading) {
      loadingText.textContent = text;
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
  }

  updateUI() {
    this.renderAccountsList();
    this.updateStats();
  }

  renderAccountsList() {
    const accountsList = document.getElementById('accountsList');
    const emptyState = document.getElementById('emptyState');

    if (this.accounts.length === 0) {
      accountsList.style.display = 'none';
      emptyState.classList.add('show');
      return;
    }

    emptyState.classList.remove('show');
    accountsList.style.display = 'block';

    accountsList.innerHTML = this.accounts.map(account => `
      <div class="account-item" data-account-id="${account.id}">
        <div class="status-badge ${this.getStatusClass(account.status)}">
          ${account.status}
        </div>
        <div class="phone-number">${account.phone_number}</div>
        <div class="last-login">${account.last_login_at}</div>
        <div class="account-actions">
          <button class="btn btn-sm btn-primary" onclick="openAccount('${account.id}')" 
                  ${account.status !== '就绪' ? 'disabled' : ''}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            打开
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteAccount('${account.id}')">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
            删除
          </button>
        </div>
      </div>
    `).join('');
  }

  getStatusClass(status) {
    switch (status) {
      case '就绪': return 'ready';
      case '需要同步': return 'syncing';
      case '正在添加...': return 'syncing';
      case '添加成功': return 'ready';
      case '添加失败': return 'error';
      default: return 'syncing';
    }
  }

  updateStats() {
    const totalAccounts = document.getElementById('totalAccounts');
    const onlineAccounts = document.getElementById('onlineAccounts');
    
    totalAccounts.textContent = this.accounts.length;
    onlineAccounts.textContent = this.accounts.filter(acc => acc.status === '就绪').length;
  }
}

// 通知系统
class NotificationManager {
  constructor() {
    this.container = document.getElementById('notificationContainer');
  }

  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: currentColor; cursor: pointer; padding: 0 0 0 10px;">
          ×
        </button>
      </div>
    `;

    this.container.appendChild(notification);

    // 显示动画
    setTimeout(() => notification.classList.add('show'), 100);

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }

    return notification;
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// 全局实例
const appState = new AppState();
const notifications = new NotificationManager();

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  loadAccounts();
});

// 初始化应用
function initializeApp() {
  console.log('初始化 WhatsApp 多账号管理器...');
  
  // 监听来自主进程的状态更新
  if (window.electronAPI) {
    window.electronAPI.onAccountStatusUpdate((data) => {
      console.log('收到账号状态更新:', data);
      appState.updateAccount(data.accountId, { status: data.status });
      
      if (data.status === '添加成功') {
        notifications.success(`账号 ${data.phoneNumber} 添加成功！`);
        loadAccounts(); // 重新加载账号列表
      } else if (data.status === '添加失败') {
        notifications.error(`账号 ${data.phoneNumber} 添加失败`);
      }
    });
  }
}

// 设置事件监听器
function setupEventListeners() {
  // 窗口控制按钮
  document.getElementById('minimizeBtn').addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  });

  document.getElementById('maximizeBtn').addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  });

  document.getElementById('closeBtn').addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  });

  // 工具栏按钮
  document.getElementById('addAccountBtn').addEventListener('click', openAddAccountModal);
  document.getElementById('syncAccountsBtn').addEventListener('click', syncAccounts);

  // 添加账号表单
  document.getElementById('addAccountForm').addEventListener('submit', handleAddAccount);

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          openAddAccountModal();
          break;
        case 'r':
          e.preventDefault();
          syncAccounts();
          break;
      }
    }
    
    if (e.key === 'Escape') {
      closeAddAccountModal();
    }
  });
}

// 加载账号列表
async function loadAccounts() {
  if (!window.electronAPI) {
    console.error('Electron API 不可用');
    return;
  }

  try {
    appState.setLoading(true, '正在加载账号列表...');
    const result = await window.electronAPI.getAccounts();
    
    if (result.error) {
      throw new Error(result.error);
    }

    appState.setAccounts(result.data || []);
    console.log('账号列表加载完成:', result.data);
  } catch (error) {
    console.error('加载账号列表失败:', error);
    notifications.error(`加载账号列表失败: ${error.message}`);
  } finally {
    appState.setLoading(false);
  }
}

// 打开添加账号模态框
function openAddAccountModal() {
  const modal = document.getElementById('addAccountModal');
  const phoneInput = document.getElementById('phoneNumber');
  
  modal.classList.add('show');
  phoneInput.focus();
  phoneInput.value = '';
}

// 关闭添加账号模态框
function closeAddAccountModal() {
  const modal = document.getElementById('addAccountModal');
  modal.classList.remove('show');
}

// 处理添加账号
async function handleAddAccount(e) {
  e.preventDefault();
  
  if (!window.electronAPI) {
    notifications.error('Electron API 不可用');
    return;
  }

  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  
  if (!phoneNumber) {
    notifications.error('请输入手机号码');
    return;
  }

  // 简单的手机号格式验证
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  if (!phoneRegex.test(phoneNumber)) {
    notifications.error('请输入有效的手机号码格式');
    return;
  }

  try {
    closeAddAccountModal();
    appState.setLoading(true, '正在添加账号，请在浏览器中完成登录...');
    
    const result = await window.electronAPI.addAccount(phoneNumber);
    
    if (result.error) {
      throw new Error(result.error);
    }

    notifications.success('账号添加流程已启动，请在浏览器中扫码登录');
    
    // 添加临时账号到列表中显示进度
    const tempAccount = {
      id: 'temp_' + Date.now(),
      phone_number: phoneNumber,
      status: '正在添加...',
      last_login_at: '正在处理中...'
    };
    appState.addAccount(tempAccount);
    
  } catch (error) {
    console.error('添加账号失败:', error);
    notifications.error(`添加账号失败: ${error.message}`);
  } finally {
    appState.setLoading(false);
  }
}

// 同步账号
async function syncAccounts() {
  if (!window.electronAPI) {
    notifications.error('Electron API 不可用');
    return;
  }

  try {
    appState.setLoading(true, '正在同步账号数据...');
    const result = await window.electronAPI.syncAccounts();
    
    if (result.error) {
      throw new Error(result.error);
    }

    if (result.syncedCount > 0) {
      notifications.success(`成功同步 ${result.syncedCount} 个账号`);
    } else {
      notifications.info('所有账号都已是最新状态');
    }

    if (result.errors && result.errors.length > 0) {
      notifications.error(`部分账号同步失败: ${result.errors.join(', ')}`);
    }

    // 重新加载账号列表
    await loadAccounts();
    
  } catch (error) {
    console.error('同步账号失败:', error);
    notifications.error(`同步账号失败: ${error.message}`);
  } finally {
    appState.setLoading(false);
  }
}

// 打开账号
async function openAccount(accountId) {
  if (!window.electronAPI) {
    notifications.error('Electron API 不可用');
    return;
  }

  try {
    const account = appState.accounts.find(acc => acc.id === accountId);
    appState.setLoading(true, `正在打开账号 ${account?.phone_number || accountId}...`);
    
    const result = await window.electronAPI.openAccount(accountId);
    
    if (result.error) {
      throw new Error(result.error);
    }

    notifications.success(`账号 ${account?.phone_number || accountId} 已成功打开`);
    appState.runningAccounts.add(accountId);
    
  } catch (error) {
    console.error('打开账号失败:', error);
    notifications.error(`打开账号失败: ${error.message}`);
  } finally {
    appState.setLoading(false);
  }
}

// 删除账号
async function deleteAccount(accountId) {
  const account = appState.accounts.find(acc => acc.id === accountId);
  
  if (!confirm(`确定要删除账号 ${account?.phone_number || accountId} 吗？\n\n此操作将删除该账号的所有本地数据，删除后可以通过同步功能重新获取。`)) {
    return;
  }

  if (!window.electronAPI) {
    notifications.error('Electron API 不可用');
    return;
  }

  try {
    appState.setLoading(true, '正在删除账号...');
    const result = await window.electronAPI.deleteAccount(accountId);
    
    if (result.error) {
      throw new Error(result.error);
    }

    notifications.success(`账号 ${account?.phone_number || accountId} 已删除`);
    appState.removeAccount(accountId);
    appState.runningAccounts.delete(accountId);
    
  } catch (error) {
    console.error('删除账号失败:', error);
    notifications.error(`删除账号失败: ${error.message}`);
  } finally {
    appState.setLoading(false);
  }
}

// 工具函数：格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '从未登录';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // 1分钟内
    return '刚刚';
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) { // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleString('zh-CN');
  }
}

// 错误处理
window.addEventListener('error', (e) => {
  console.error('全局错误:', e.error);
  notifications.error('发生未知错误，请查看控制台获取详细信息');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('未处理的Promise拒绝:', e.reason);
  notifications.error('操作失败，请重试');
});

// 导出主要函数以供HTML调用
window.openAddAccountModal = openAddAccountModal;
window.closeAddAccountModal = closeAddAccountModal;
window.openAccount = openAccount;
window.deleteAccount = deleteAccount;
window.syncAccounts = syncAccounts; 