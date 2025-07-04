-- WhatsApp 多账号管理系统数据库表结构
-- 适用于 Supabase PostgreSQL

-- 1. 创建账号表
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    storage_key TEXT,
    status VARCHAR(20) DEFAULT '需要同步',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_accounts_phone_number ON accounts(phone_number);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_is_deleted ON accounts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);

-- 3. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 创建触发器
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. 启用RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 6. 创建RLS策略
CREATE POLICY "Enable read access for all users" ON accounts
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Enable insert access for all users" ON accounts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON accounts
    FOR UPDATE USING (true); 