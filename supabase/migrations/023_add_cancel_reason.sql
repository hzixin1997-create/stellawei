-- Migration 023: Add cancel_reason to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

COMMENT ON COLUMN bookings.cancel_reason IS '师傅或用户取消订单时填写的原因';
