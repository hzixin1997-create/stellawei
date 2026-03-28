-- Chuhai Database Schema - Migration 004
-- 添加沟通方式支持

-- =====================================================
-- 1. 创建沟通方式枚举类型
-- =====================================================

CREATE TYPE communication_method_type AS ENUM ('email', 'whatsapp', 'telegram', 'feishu');

-- =====================================================
-- 2. appointments 表添加沟通方式字段
-- =====================================================

ALTER TABLE appointments 
  ADD COLUMN communication_method communication_method_type NOT NULL DEFAULT 'email';

-- 索引：按沟通方式查询
CREATE INDEX idx_appointments_communication_method ON appointments(communication_method);

-- =====================================================
-- 3. masters 表添加支持的沟通方式字段
-- =====================================================

ALTER TABLE masters 
  ADD COLUMN supported_communication_methods communication_method_type[] NOT NULL DEFAULT ARRAY['email'::communication_method_type];

-- =====================================================
-- 4. 创建用户沟通设置表
-- =====================================================

CREATE TABLE user_communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method communication_method_type NOT NULL,
  contact_info TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 每个用户的每种沟通方式只能有一条记录
  UNIQUE(user_id, method)
);

-- 索引
CREATE INDEX idx_user_communication_settings_user_id ON user_communication_settings(user_id);
CREATE INDEX idx_user_communication_settings_method ON user_communication_settings(method);

-- =====================================================
-- 5. RLS 策略
-- =====================================================

ALTER TABLE user_communication_settings ENABLE ROW LEVEL SECURITY;

-- 用户只能看到自己的沟通设置
CREATE POLICY "Users can view own communication settings" ON user_communication_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own communication settings" ON user_communication_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own communication settings" ON user_communication_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own communication settings" ON user_communication_settings
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 6. 触发器：自动更新时间戳
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_communication_settings_updated_at
  BEFORE UPDATE ON user_communication_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 注释说明
-- =====================================================

COMMENT ON COLUMN appointments.communication_method IS '用户选择的沟通方式：email, whatsapp, telegram, feishu';
COMMENT ON COLUMN masters.supported_communication_methods IS '师傅支持的沟通方式列表';
COMMENT ON TABLE user_communication_settings IS '用户各平台的联系信息设置';
