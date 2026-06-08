-- Add content_zh column to reviews table for bilingual support
-- 2026-06-07

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS content_zh TEXT;

SELECT 'content_zh column added to reviews' as status;
