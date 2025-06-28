import { AccountStatus, WindowStatus } from "@/lib/constants";

export interface Account {
  id: string;
  display_name?: string;
  phone_number: string;
  note?: string;
  status: AccountStatus;
  last_seen?: string; // ISO datetime
  is_deleted?: boolean;
  created_at?: string; // ISO datetime
  updated_at?: string;
}

export interface LoginSession {
  id: string;
  phone_number: string;
  verification_code?: string;
  status: 'pending' | 'code_sent' | 'completed' | 'failed' | 'expired';
  expires_at: string;
  created_at?: string;
}

export interface WhatsAppWindow {
  id: string;
  account_id: string;
  browser_context_id?: string;
  is_active?: boolean;
  last_activity?: string;
  created_at?: string;
}

export interface DashboardStats {
  totalAccounts: number;
  onlineAccounts: number;
  activeWindows: number;
  totalMessages: number;
} 