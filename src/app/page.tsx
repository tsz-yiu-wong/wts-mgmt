"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/dashboard/nav-bar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AccountList } from "@/components/dashboard/account-list";
import { useAccountStore } from "@/stores/account-store";
import { mockStats } from "@/lib/mock-data";

export default function Home() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { accounts } = useAccountStore();

  // 添加点击外部关闭菜单的功能
  useEffect(() => {
    const handleClickOutside = () => {
      // 这里可以添加关闭打开菜单的逻辑
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleViewFullList = () => {
    setCurrentPage("accounts");
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">仪表板概览</h2>
            </div>
            
            <StatsCards stats={mockStats} />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <AccountList 
                accounts={accounts.slice(0, 4)} 
                showAddButton={true}
                onViewFullList={handleViewFullList}
                isTableView={false}
              />
              
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-white mb-4">最近活动</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">+86 13812345678 已连接</p>
                      <p className="text-xs text-white/60">2分钟前</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">+86 13745678901 已断开</p>
                      <p className="text-xs text-white/60">5分钟前</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">+86 13923456789 已连接</p>
                      <p className="text-xs text-white/60">10分钟前</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 glass rounded-lg">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-white">+86 13634567890 已断开</p>
                      <p className="text-xs text-white/60">1小时前</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "accounts":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">账号管理</h2>
            </div>
            <AccountList accounts={accounts} showAddButton={false} isTableView={true} />
          </div>
        );
      
      case "windows":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">窗口管理</h2>
            </div>
            <div className="glass-card p-8 text-center">
              <p className="text-white/70">窗口管理功能正在开发中...</p>
            </div>
          </div>
        );
      
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">设置</h2>
              <p className="text-white/70">
                配置应用程序设置和偏好
              </p>
            </div>
            <div className="glass-card p-8 text-center">
              <p className="text-white/70">设置页面正在开发中...</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative">
      <NavBar currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <main className="container mx-auto px-6 py-8">
        {renderPageContent()}
      </main>
      
      {/* 装饰性背景元素 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl"></div>
        <div className="absolute top-80 -left-40 w-80 h-80 bg-slate-500/[0.03] rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-blue-500/[0.02] rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
