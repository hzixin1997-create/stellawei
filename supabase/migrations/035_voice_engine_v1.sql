DROP FUNCTION IF EXISTS create_audio_bucket(text);

-- Create the audio bucket if it doesn't exist (run via Supabase SQL Editor)
-- Note: This is a best-effort migration. If the chat-audio bucket already exists or creation fails, manual creation may be needed.

-- 1. Add voice_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_status') THEN
        CREATE TYPE voice_status AS ENUM ('uploading', 'uploaded', 'sending', 'sent', 'failed');
    END IF;
END $$;

-- 2. Add audio-related columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS audio_size INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS audio_format TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voice_status voice_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcript TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transcript_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS listened_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upload_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Create voice_upload_logs table for monitoring
CREATE TABLE IF NOT EXISTS voice_upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  audio_size INT DEFAULT NULL,
  audio_duration INT DEFAULT NULL,
  audio_format TEXT DEFAULT NULL,
  browser_type TEXT DEFAULT NULL,
  upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  upload_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  upload_duration_ms INT DEFAULT NULL,
  status TEXT NOT NULL,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_booking_id ON voice_upload_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_status ON voice_upload_logs(status);
CREATE INDEX IF NOT EXISTS idx_voice_upload_logs_created_at ON voice_upload_logs(created_at);
