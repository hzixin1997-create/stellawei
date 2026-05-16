-- Migration: Add missing columns to bookings table
-- Date: 2026-05-15

-- Add expires_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'expires_at') THEN
        ALTER TABLE bookings ADD COLUMN expires_at timestamptz;
    END IF;
END $$;

-- Add deleted_at column if not exists (for soft delete)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
        ALTER TABLE bookings ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Add stripe_payment_intent_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id text;
    END IF;
END $$;

-- Add stripe_refund_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'stripe_refund_id') THEN
        ALTER TABLE bookings ADD COLUMN stripe_refund_id text;
    END IF;
END $$;

-- Add refunded_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'refunded_at') THEN
        ALTER TABLE bookings ADD COLUMN refunded_at timestamptz;
    END IF;
END $$;

-- Update existing rows: set expires_at for pending bookings without it
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- Update existing rows: mark old pending bookings as expired
UPDATE bookings 
SET status = 'expired',
    payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND (expires_at IS NOT NULL AND expires_at < NOW())
  AND (status != 'cancelled' AND status != 'refunded' AND status != 'paid');

SELECT 'bookings columns migration complete' as status;
