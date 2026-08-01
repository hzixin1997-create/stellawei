
BEGIN;

CREATE OR REPLACE FUNCTION process_referral_reward(
    p_referred_user_id UUID,
    p_booking_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS '
DECLARE
    v_referrer_id UUID;
    v_reward_amount DECIMAL(10, 2) := 5.00;
BEGIN
    SELECT referrer_id INTO v_referrer_id
    FROM referred_users
    WHERE referred_user_id = p_referred_user_id
      AND status IN (''paid'', ''completed'')
      AND referrer_id != p_referred_user_id;

    IF v_referrer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE referral_booking_id = p_booking_id
          AND type = ''referral_reward''
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, description, referral_booking_id, expires_at)
    VALUES (v_referrer_id, v_reward_amount, ''referral_reward'', ''Friend completed first consultation'', p_booking_id, NOW() + INTERVAL ''90 days'');

    UPDATE profiles SET credit_balance = credit_balance + v_reward_amount
    WHERE id = v_referrer_id;

    UPDATE referred_users
    SET status = ''rewarded'', updated_at = NOW()
    WHERE referred_user_id = p_referred_user_id;

    RETURN TRUE;
END;
';

COMMIT;
