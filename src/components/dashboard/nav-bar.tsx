"use client";

import { MessageSquare, Settings, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavBarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  {
    id: "dashboard",
    label: "概览",
    icon: BarChart3,
  },
  {
    id: "accounts",
    label: "账号管理",
    icon: Users,
  },
  {
    id: "windows",
    label: "窗口管理",
    icon: MessageSquare,
  },
  {
    id: "settings",
    label: "设置",
    icon: Settings,
  },
];

export function NavBar({ currentPage, onPageChange }: NavBarProps) {
  return (
    <nav className="glass-nav p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-green-400" />
            <h1 className="text-xl font-bold text-white">WhatsApp 多开管理</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "flex items-center space-x-2",
                  currentPage === item.id && "bg-white/20"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 