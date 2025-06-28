"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Activity, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "总账号数",
      value: stats.totalAccounts,
      icon: Users,
      description: "已配置的账号总数",
      trend: "+2 本月",
    },
    {
      title: "在线账号",
      value: stats.onlineAccounts,
      icon: Activity,
      description: "当前活跃的账号",
      trend: `${Math.round((stats.onlineAccounts / stats.totalAccounts) * 100)}% 在线率`,
    },
    {
      title: "活跃窗口",
      value: stats.activeWindows,
      icon: MessageSquare,
      description: "正在运行的窗口",
      trend: "实时更新",
    },
    {
      title: "消息总数",
      value: stats.totalMessages.toLocaleString(),
      icon: TrendingUp,
      description: "今日处理消息",
      trend: "+156 今日",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-white/60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-white/60 mt-1">
                {card.description}
              </p>
              <p className="text-xs text-green-400 mt-1">
                {card.trend}
              </p>
            </CardContent>
            <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/5" />
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/[0.02]" />
          </Card>
        );
      })}
    </div>
  );
} 