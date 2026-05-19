-- Add reminder_sent column to bookings table
-- 2026-05-17

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_sent ON bookings(reminder_sent);

SELECT 'reminder_sent added to bookings' as status;
