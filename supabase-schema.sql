-- Supabase 数据库架构
-- 用于轻松阅读应用的多端同步

-- 创建用户数据表（支持设备ID和用户ID两种方式）
CREATE TABLE IF NOT EXISTS user_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- 可以是 UUID 或设备ID
    data JSONB NOT NULL,
    device_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_updated_at ON user_data(updated_at DESC);
CREATE INDEX idx_user_data_device_id ON user_data(device_id);

-- 暂时禁用行级安全策略，允许匿名访问
-- 生产环境建议启用并配置适当的策略
ALTER TABLE user_data DISABLE ROW LEVEL SECURITY;

-- 如果需要启用 RLS，可以使用以下策略（基于设备ID）：
-- ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public access" ON user_data FOR ALL USING (true);

-- 创建同步日志表（可选，用于调试和审计）
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- 可以是 UUID 或设备ID
    action TEXT NOT NULL,
    device_id TEXT,
    data_size INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 同步日志索引
CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- 暂时禁用同步日志的行级安全策略
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_data_updated_at 
    BEFORE UPDATE ON user_data 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- 创建清理旧日志的函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM sync_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- 注意事项：
-- 1. 需要在 Supabase Dashboard 中执行这些 SQL 语句
-- 2. 确保已启用 Realtime 功能
-- 3. 在 Authentication 设置中配置 Magic Link 登录
-- 4. 获取项目的 URL 和 anon key 用于客户端连接