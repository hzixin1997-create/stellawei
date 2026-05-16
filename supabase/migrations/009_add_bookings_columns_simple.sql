ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_refund_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 为历史 pending 订单补填 expires_at
UPDATE bookings 
SET expires_at = created_at + interval '10 minutes'
WHERE expires_at IS NULL 
  AND (payment_status = 'pending' OR payment_status = 'pending_payment');

-- 标记已过期订单
UPDATE bookings 
SET status = 'expired', payment_status = 'expired'
WHERE (payment_status = 'pending' OR payment_status = 'pending_payment')
  AND expires_at < NOW()
  AND status NOT IN ('cancelled', 'refunded', 'paid');
