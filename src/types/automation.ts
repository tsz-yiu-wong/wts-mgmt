export interface LoginSession {
  id: string
  accountId?: string
  phoneNumber: string
  verificationCode?: string
  status: 'pending' | 'code_sent' | 'completed' | 'failed' | 'expired'
  createdAt: Date
  expiresAt: Date
}

export interface WhatsAppWindow {
  id: string
  accountId: string
  browserContextId?: string
  windowUrl?: string
  isActive: boolean
  createdAt: Date
  lastActivity: Date
}

export interface AutomationSession {
  sessionId: string
  phoneNumber: string
  userDataPath: string
  browserContext?: any
  page?: any
  status: 'initializing' | 'waiting_code' | 'logged_in' | 'error'
}

export interface VerificationCodeResponse {
  success: boolean
  code?: string
  error?: string
}

export interface LoginResponse {
  success: boolean
  sessionId?: string
  error?: string
}

export interface WindowResponse {
  success: boolean
  windowUrl?: string
  windowId?: string
  error?: string
}

// 扩展现有Account类型
export interface AccountWithAutomation extends Account {
  sessionData?: any
  userDataPath?: string
  whatsappProfile?: any
  loginStatus?: 'pending' | 'logged_in' | 'failed' | 'expired'
  loginTimestamp?: Date
}

// 从现有types导入
import { Account } from '@/types' 