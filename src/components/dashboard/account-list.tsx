"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Account } from "@/types";
import { formatDate } from "@/lib/utils";
import { Circle, Phone, Clock, MoreVertical, Play, Trash2, Plus } from "lucide-react";
import { useAccountStore } from "@/stores/account-store";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";

interface AccountListProps {
  accounts: Account[];
  showAddButton?: boolean;
  onViewFullList?: () => void;
  isTableView?: boolean; // 新增表格视图模式
}

export function AccountList({ 
  accounts, 
  showAddButton = true, 
  onViewFullList, 
  isTableView = false 
}: AccountListProps) {
  const { selectAccount, removeAccount } = useAccountStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "status-online";
      case "offline":
        return "status-offline";
      case "connecting":
        return "status-connecting";
      case "error":
        return "status-error";
      default:
        return "status-offline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "在线";
      case "offline":
        return "离线";
      case "connecting":
        return "连接中";
      case "error":
        return "错误";
      default:
        return "未知";
    }
  };

  const handleOpenAccount = async (account: Account) => {
    selectAccount(account);
    setIsOpening(account.id);

    try {
      const response = await fetch('/api/automation/windows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('🌐 WhatsApp窗口启动成功:', data);
        
        // 直接在新标签页中打开代理URL
        if (data.proxyUrl) {
          console.log('🚀 打开WhatsApp Web代理:', data.proxyUrl);
          const newWindow = window.open(data.proxyUrl, '_blank', 'width=1400,height=900');
          
          if (newWindow) {
            console.log('✅ WhatsApp Web已在新标签页打开');
          } else {
            alert('无法打开新窗口，请检查浏览器是否阻止了弹出窗口。\n您可以手动访问: ' + data.proxyUrl);
          }
        } else {
          console.error('未获取到代理URL');
          alert('启动失败：未获取到访问地址');
        }
      } else {
        console.error('打开窗口失败:', data.error);
        alert(`打开窗口失败: ${data.error}`);
      }
    } catch (error) {
      console.error('网络错误:', error);
      alert('网络错误，请重试');
    } finally {
      setIsOpening(null);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('确定要删除这个账号吗？这将删除所有相关数据。')) {
    removeAccount(accountId);
    setOpenMenuId(null);
    }
  };

  const toggleMenu = (accountId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === accountId ? null : accountId);
  };

  const handleAddAccount = () => {
    setIsAddDialogOpen(true);
  };

  // 表格视图
  if (isTableView) {
    return (
      <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>账号列表</span>
              <Button size="sm" variant="outline" onClick={handleAddAccount}>
                <Plus className="h-4 w-4 mr-2" />
              添加账号
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg glass">
            <table className="w-full min-w-[820px] table-fixed">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="w-[120px] text-left px-6 py-4 text-sm font-medium text-white/80">状态</th>
                  <th className="w-[240px] text-left px-6 py-4 text-sm font-medium text-white/80">账号</th>
                  <th className="w-[200px] text-left px-6 py-4 text-sm font-medium text-white/80">最后在线</th>
                  <th className="w-[100px] text-left px-6 py-4 text-sm font-medium text-white/80">端口</th>
                  <th className="w-[160px] text-right px-6 py-4 text-sm font-medium text-white/80">操作</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium glass ${getStatusColor(
                          account.status
                        )}`}
                      >
                        <Circle className="w-2 h-2 mr-2" />
                        {getStatusText(account.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full glass flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {account.phone_number?.slice(-1) || '#'}
                              </span>
                            </div>
                          <span className="text-white font-medium">{account.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-white/70 text-sm">{formatDate(new Date(account.last_seen || ''))}</span>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-white/70 text-sm">在线</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenAccount(account)}
                            disabled={isOpening === account.id}
                          className="flex items-center space-x-1 whitespace-nowrap"
                        >
                          <Play className="h-3 w-3" />
                            <span>{isOpening === account.id ? '打开中...' : '打开'}</span>
                        </Button>
                        
                        <div className="relative" ref={openMenuId === account.id ? menuRef : null}>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={(e) => toggleMenu(account.id, e)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          {openMenuId === account.id && (
                            <div className="absolute right-0 top-full mt-2 w-32 rounded-lg shadow-lg z-20"
                                 style={{
                                   backdropFilter: 'blur(24px)',
                                   WebkitBackdropFilter: 'blur(24px)',
                                   background: 'rgba(255, 255, 255, 0.15)',
                                   border: '1px solid rgba(255, 255, 255, 0.25)',
                                   boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                                 }}>
                              <div className="p-1">
                                <button
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>删除</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

        <AddAccountDialog 
          isOpen={isAddDialogOpen} 
          onClose={() => setIsAddDialogOpen(false)} 
        />
      </>
    );
  }

  // 卡片视图（概览页面使用）
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>账号列表</span>
          {showAddButton && onViewFullList ? (
            <Button size="sm" variant="outline" onClick={onViewFullList}>
              查看完整列表
            </Button>
          ) : (
              <Button size="sm" variant="outline" onClick={handleAddAccount}>
                <Plus className="h-4 w-4 mr-2" />
              添加账号
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center space-x-4 p-4 glass rounded-xl hover:bg-white/10 transition-all duration-300"
          >
            <div className="relative">
                <div className="h-12 w-12 rounded-full glass flex items-center justify-center">
                  <span className="text-white font-medium">
                    {account.phone_number?.slice(-1) || '#'}
                  </span>
                </div>

              <div
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full shadow-lg ${getStatusColor(
                  account.status
                )}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-white truncate">
                    {account.phone_number}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium glass ${getStatusColor(
                    account.status
                  )}`}
                >
                  <Circle className="w-2 h-2 mr-1" />
                  {getStatusText(account.status)}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1 text-white/60 text-xs">
                  <Clock className="w-3 h-3" />
                    <span>最后在线: {formatDate(new Date(account.last_seen || ''))}</span>
                </div>
              </div>
            </div>

            {/* 打开按钮 */}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleOpenAccount(account)}
                disabled={isOpening === account.id}
              className="flex items-center space-x-1"
            >
              <Play className="h-3 w-3" />
                <span>{isOpening === account.id ? '打开中...' : '打开'}</span>
            </Button>

            {/* 概览页面不显示三点菜单 */}
          </div>
        ))}
      </CardContent>
    </Card>

      <AddAccountDialog 
        isOpen={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
      />
    </>
  );
} 