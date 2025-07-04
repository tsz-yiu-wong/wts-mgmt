const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 账号管理
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (phoneNumber) => ipcRenderer.invoke('add-account', phoneNumber),
  syncAccounts: () => ipcRenderer.invoke('sync-accounts'),
  openAccount: (accountId) => ipcRenderer.invoke('open-account', accountId),
  deleteAccount: (accountId) => ipcRenderer.invoke('delete-account', accountId),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),

  // 状态监听
  onAccountStatusUpdate: (callback) => {
    ipcRenderer.on('account-status-update', (event, data) => callback(data));
  },

  // 移除监听器
  removeAccountStatusListener: () => {
    ipcRenderer.removeAllListeners('account-status-update');
  }
}); 