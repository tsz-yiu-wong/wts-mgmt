import { Account, WhatsAppWindow, DashboardStats } from "@/types";
import { ACCOUNT_STATUS, WINDOW_STATUS } from "./constants";

export const mockAccounts: Account[] = [
  {
    id: "acc_1",
    display_name: "+86 13812345678",
    phone_number: "+86 13812345678",
    note: "主要工作账号",
    status: ACCOUNT_STATUS.ONLINE,
    last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_deleted: false,
  },
  {
    id: "acc_2",
    display_name: "+86 13923456789",
    phone_number: "+86 13923456789",
    note: "客服专用",
    status: ACCOUNT_STATUS.CONNECTING,
    last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    is_deleted: false,
  },
  {
    id: "acc_3",
    display_name: "+86 13634567890",
    phone_number: "+86 13634567890",
    note: "",
    status: ACCOUNT_STATUS.OFFLINE,
    last_seen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    is_deleted: false,
  },
  {
    id: "acc_4",
    display_name: "+86 13745678901",
    phone_number: "+86 13745678901",
    note: "测试账号",
    status: ACCOUNT_STATUS.ERROR,
    last_seen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    is_deleted: false,
  },
];

export const mockWindows: WhatsAppWindow[] = [
  {
    id: "win_1",
    account_id: "acc_1",
    browser_context_id: "context_1",
    is_active: true,
    last_activity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "win_2",
    account_id: "acc_2",
    browser_context_id: "context_2",
    is_active: false,
    last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

export const mockStats: DashboardStats = {
  totalAccounts: mockAccounts.length,
  onlineAccounts: mockAccounts.filter(acc => acc.status === ACCOUNT_STATUS.ONLINE).length,
  activeWindows: mockWindows.filter(win => win.is_active).length,
  totalMessages: 1247,
}; 