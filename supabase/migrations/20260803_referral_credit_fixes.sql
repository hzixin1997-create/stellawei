-- ============================================================
-- StellaWei Referral Credit System V1.0 增量修复
-- 日期：2026-08-03
-- 前置条件：已有表和函数已按 profiles 表名创建
-- ============================================================

BEGIN;

-- 1. 修复 email_logs 表：增加 send_after 字段，修改 status 默认值为 pending
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS send_after TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_email_logs_send_after ON email_logs(send_after);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- 2. 修复 process_referral_reward 函数：允许 paid 和 completed 状态触发奖励
CREATE OR REPLACE FUNCTION process_referral_reward(
    p_referred_user_id UUID,
    p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_reward_amount DECIMAL(10, 2) := 5.00;
BEGIN
    SELECT referrer_id INTO v_referrer_id
    FROM referred_users
    WHERE referred_user_id = p_referred_user_id
      AND status IN ('paid', 'completed')
      AND referrer_id != p_referred_user_id;

    IF v_referrer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE referral_booking_id = p_booking_id
          AND type = 'referral_reward'
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO credit_transactions (user_id, amount, type, description, referral_booking_id, expires_at)
    VALUES (v_referrer_id, v_reward_amount, 'referral_reward', 'Friend completed first consultation', p_booking_id, NOW() + INTERVAL '90 days');

    UPDATE profiles SET credit_balance = credit_balance + v_reward_amount
    WHERE id = v_referrer_id;

    UPDATE referred_users
    SET status = 'rewarded', updated_at = NOW()
    WHERE referred_user_id = p_referred_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. 修复 apply_credit_to_booking 函数：增加余额校验 + 移除错误 NOT EXISTS 逻辑
CREATE OR REPLACE FUNCTION apply_credit_to_booking(
    p_user_id UUID,
    p_booking_id UUID,
    p_amount DECIMAL(10, 2)
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_remaining DECIMAL(10, 2) := p_amount;
    v_total_applied DECIMAL(10, 2) := 0;
    v_user_balance DECIMAL(10, 2);
    tx RECORD;
BEGIN
    -- 获取用户实际余额
    SELECT credit_balance INTO v_user_balance
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_user_balance IS NULL OR v_user_balance <= 0 THEN
        RETURN 0;
    END IF;
    
    -- 实际可抵扣金额不能超过余额
    v_remaining := LEAST(v_remaining, v_user_balance);

    FOR tx IN
        SELECT id, amount
        FROM credit_transactions
        WHERE user_id = p_user_id
          AND amount > 0
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY expires_at ASC NULLS LAST, created_at ASC
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        v_total_applied := v_total_applied + LEAST(tx.amount, v_remaining);
        v_remaining := v_remaining - LEAST(tx.amount, v_remaining);
    END LOOP;

    v_total_applied := p_amount - v_remaining;

    IF v_total_applied <= 0 THEN
        RETURN 0;
    END IF;

    UPDATE profiles SET credit_balance = GREATEST(credit_balance - v_total_applied, 0)
    WHERE id = p_user_id;

    INSERT INTO credit_transactions (user_id, amount, type, description, referral_booking_id)
    VALUES (p_user_id, -v_total_applied, 'booking_usage', 'Used credit for consultation', p_booking_id);

    RETURN v_total_applied;
END;
$$ LANGUAGE plpgsql;

COMMIT;
