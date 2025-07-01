"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Account } from "@/types";
import { formatDate } from "@/lib/utils";
import { Circle, Phone, Clock, MoreVertical, Play, Trash2, Plus, User } from "lucide-react";
import { useAccountStore } from "@/stores/account-store";
import { useAccounts } from "@/hooks/use-accounts";
import { STATUS_LABELS } from "@/lib/constants";

interface AccountListProps {
  showAddButton?: boolean;
  onViewFullList?: () => void;
  isTableView?: boolean;
  onAddAccount?: () => void;
}

export function AccountList({ 
  showAddButton = true, 
  onViewFullList, 
  isTableView = false,
  onAddAccount
}: AccountListProps) {
  const { selectAccount } = useAccountStore();
  const { accounts, deleteAccount, isLoading } = useAccounts();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  const getStatusConfig = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || { label: "未知", color: "gray" };
  };

  const getStatusColorClass = (status: string) => {
    const config = getStatusConfig(status);
    switch (config.color) {
      case "green": return "status-online";
      case "gray": return "status-offline";
      case "yellow": return "status-connecting";
      case "red": return "status-error";
      default: return "status-offline";
    }
  };

  const handleOpenAccount = async (account: Account) => {
    selectAccount(account);
    
    try {
      console.log("正在打开账号:", account.phone_number);
      
      const response = await fetch('/api/automation/windows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accountId: account.id
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log("窗口打开成功:", data.windowUrl);
        console.log("窗口ID:", data.windowId);
        
        // 可以在这里添加用户反馈
        // 例如：toast通知或状态更新
        
        // 如果需要在新标签页打开
        // window.open(data.windowUrl, '_blank');
        
      } else {
        console.error("打开窗口失败:", data.error);
        // 可以在这里添加错误处理
        // 例如：显示错误toast
      }
    } catch (error) {
      console.error("网络错误:", error);
      // 处理网络错误
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteAccount(accountId);
      setOpenMenuId(null);
    } catch (error) {
      console.error("删除账号失败:", error);
    }
  };

  const toggleMenu = (accountId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === accountId ? null : accountId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>账号列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-white/70 py-8">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  // 表格视图
  if (isTableView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>账号列表</span>
            <Button size="sm" variant="outline" onClick={onAddAccount}>
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
                {accounts.map((account) => {
                  const statusConfig = getStatusConfig(account.status);
                  return (
                    <tr key={account.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium glass ${getStatusColorClass(
                            account.status
                          )}`}
                        >
                          <Circle className="w-2 h-2 mr-2" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full glass flex items-center justify-center">
                            <User className="h-5 w-5 text-white/60" />
                          </div>
                          <div>
                            <span className="text-white font-medium">{account.phone_number}</span>
                            {account.display_name && (
                              <div className="text-sm text-white/60">{account.display_name}</div>
                            )}
                          </div>
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
                            className="flex items-center space-x-1 whitespace-nowrap"
                          >
                            <Play className="h-3 w-3" />
                            <span>打开</span>
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
                  );
                })}
              </tbody>
            </table>
          </div>
          {accounts.length === 0 && (
            <div className="text-center text-white/70 py-8">
              暂无账号数据
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 卡片视图（概览页面使用）
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>账号列表</span>
          {showAddButton && onViewFullList ? (
            <Button size="sm" variant="outline" onClick={onViewFullList}>
              查看完整列表
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onAddAccount}>
              <Plus className="h-4 w-4 mr-2" />
              添加账号
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.slice(0, 4).map((account) => {
          const statusConfig = getStatusConfig(account.status);
          return (
            <div
              key={account.id}
              className="flex items-center space-x-4 p-4 glass rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-full glass flex items-center justify-center">
                  <User className="h-6 w-6 text-white/60" />
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full shadow-lg ${getStatusColorClass(
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
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium glass ${getStatusColorClass(
                      account.status
                    )}`}
                  >
                    <Circle className="w-2 h-2 mr-1" />
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  {account.display_name && (
                    <span className="text-white/60 text-xs">{account.display_name}</span>
                  )}
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
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>打开</span>
              </Button>
            </div>
          );
        })}
        
        {accounts.length === 0 && (
          <div className="text-center text-white/70 py-8">
            暂无账号数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 添加默认导出以支持默认导入语法
export default AccountList 