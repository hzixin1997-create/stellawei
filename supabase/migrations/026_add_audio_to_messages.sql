-- 添加语音消息支持
-- 2026-05-23

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER; -- 时长（秒）

SELECT 'audio columns added' as status;
