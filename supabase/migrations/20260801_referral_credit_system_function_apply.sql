
BEGIN;

CREATE OR REPLACE FUNCTION apply_credit_to_booking(
    p_user_id UUID,
    p_booking_id UUID,
    p_amount DECIMAL(10, 2)
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS '
DECLARE
    v_remaining DECIMAL(10, 2) := p_amount;
    v_total_applied DECIMAL(10, 2) := 0;
    tx RECORD;
BEGIN
    FOR tx IN
        SELECT id, amount
        FROM credit_transactions
        WHERE user_id = p_user_id
          AND amount > 0
          AND (expires_at IS NULL OR expires_at > NOW())
          AND id NOT IN (
              SELECT ABS(credit_transactions.id)::UUID FROM credit_transactions
              WHERE user_id = p_user_id AND amount < 0
          )
        ORDER BY expires_at ASC NULLS LAST, created_at ASC
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;
        v_total_applied := v_total_applied + LEAST(tx.amount, v_remaining);
        v_remaining := v_remaining - LEAST(tx.amount, v_remaining);
    END LOOP;

    v_total_applied := p_amount - v_remaining;

    IF v_total_applied <= 0 THEN RETURN 0; END IF;

    UPDATE profiles SET credit_balance = GREATEST(credit_balance - v_total_applied, 0)
    WHERE id = p_user_id;

    INSERT INTO credit_transactions (user_id, amount, type, description, referral_booking_id)
    VALUES (p_user_id, -v_total_applied, ''booking_usage'', ''Used credit for consultation'', p_booking_id);

    RETURN v_total_applied;
END;
';

COMMIT;
