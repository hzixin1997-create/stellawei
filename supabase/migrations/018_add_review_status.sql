-- Migration: Add status column to reviews table for admin approval workflow
-- 2026-05-18

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing reviews to approved (they were submitted before the approval system)
UPDATE reviews SET status = 'approved' WHERE status IS NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_master_status ON reviews(master_id, status);
