
BEGIN;

INSERT INTO referral_codes (user_id, code)
SELECT 
    id,
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1)
FROM profiles
WHERE id NOT IN (SELECT user_id FROM referral_codes)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
