-- WhatsApp 多账号管理系统数据库结构
-- 更新时间: 2024-12
-- 说明: 简化版架构，支持匿名用户，全局数据共享

-- 清理现有表（如果存在）
DROP TABLE IF EXISTS whatsapp_windows;
DROP TABLE IF EXISTS login_sessions;
DROP TABLE IF EXISTS automation_sessions;
DROP TABLE IF EXISTS accounts;

-- 账号状态枚举
CREATE TYPE account_status AS ENUM ('online', 'offline', 'connecting', 'error');

-- 登录状态枚举  
CREATE TYPE login_status AS ENUM ('pending', 'code_sent', 'completed', 'failed', 'expired');

-- 主账号表
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  display_name TEXT,
  note TEXT DEFAULT '', -- 备注字段
  status account_status DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false, -- 软删除标记
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 登录会话表
CREATE TABLE login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  verification_code TEXT,
  status login_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp窗口表
CREATE TABLE whatsapp_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  browser_context_id TEXT, -- Playwright浏览器上下文ID
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_accounts_phone ON accounts(phone_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_not_deleted ON accounts(is_deleted) WHERE is_deleted = false;

CREATE INDEX idx_login_sessions_phone ON login_sessions(phone_number);
CREATE INDEX idx_login_sessions_status ON login_sessions(status);
CREATE INDEX idx_login_sessions_expires ON login_sessions(expires_at);

CREATE INDEX idx_whatsapp_windows_account ON whatsapp_windows(account_id);
CREATE INDEX idx_whatsapp_windows_active ON whatsapp_windows(is_active) WHERE is_active = true;

-- 触发器：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at 
  BEFORE UPDATE ON accounts
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 创建清理过期会话的函数
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- 删除过期的登录会话
  DELETE FROM login_sessions 
  WHERE expires_at < NOW() AND status NOT IN ('completed');
  
  -- 清理非活动的窗口记录（超过24小时未活动）
  UPDATE whatsapp_windows 
  SET is_active = false 
  WHERE last_activity < NOW() - INTERVAL '24 hours' 
    AND is_active = true;
    
  -- 更新对应账号状态为离线
  UPDATE accounts 
  SET status = 'offline'
  WHERE id IN (
    SELECT DISTINCT account_id 
    FROM whatsapp_windows 
    WHERE is_active = false 
      AND last_activity < NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql;

-- 示例数据（可选）
-- INSERT INTO accounts (phone_number, display_name, note, status) VALUES
-- ('+86 13800138000', '测试账号1', '开发测试用', 'offline'),
-- ('+86 13800138001', '测试账号2', '演示账号', 'offline');

-- 注释说明
COMMENT ON TABLE accounts IS '主账号表，存储WhatsApp账号信息';
COMMENT ON TABLE login_sessions IS '登录会话表，管理验证码流程';
COMMENT ON TABLE whatsapp_windows IS 'WhatsApp窗口表，管理浏览器会话';
COMMENT ON COLUMN accounts.phone_number IS '电话号码，唯一标识';
COMMENT ON COLUMN accounts.note IS '用户备注';
COMMENT ON COLUMN accounts.is_deleted IS '软删除标记';
COMMENT ON COLUMN login_sessions.verification_code IS '登录验证码';
COMMENT ON COLUMN whatsapp_windows.browser_context_id IS 'Playwright浏览器上下文ID，用于会话隔离'; 