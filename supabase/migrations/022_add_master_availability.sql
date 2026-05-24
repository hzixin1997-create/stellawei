-- Migration 022: Add master availability table
-- 用于师傅设置自己的可用时段

CREATE TABLE IF NOT EXISTS master_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_slots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_id, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_master_availability_master_date ON master_availability(master_id, date);

-- RLS策略（通过service role绕过）
ALTER TABLE master_availability ENABLE ROW LEVEL SECURITY;

-- 注释
COMMENT ON TABLE master_availability IS '师傅可用时段设置';
COMMENT ON COLUMN master_availability.available_slots IS '可用时段列表，如 ["09:00", "10:00"]';