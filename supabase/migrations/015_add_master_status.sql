-- Migration 015: Add master status field
-- online = 在线, offline = 离线, rest = 休息中

ALTER TABLE masters ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'online';

-- Update existing masters to online
UPDATE masters SET status = 'online' WHERE status IS NULL;

-- Add check constraint
ALTER TABLE masters DROP CONSTRAINT IF EXISTS masters_status_check;
ALTER TABLE masters ADD CONSTRAINT masters_status_check CHECK (status IN ('online', 'offline', 'rest'));
