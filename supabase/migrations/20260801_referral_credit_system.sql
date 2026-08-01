-- ============================================================
-- StellaWei Referral Credit & User Reward System V1.0
-- ============================================================

-- 1. 新增 credit_balance 到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10, 2) DEFAULT 0;

-- 2. 创建 credit_transactions 表
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('referral_reward', 'booking_usage', 'manual_adjustment', 'promotion')),
    description TEXT,
    referral_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);

-- 3. 创建 referral_codes 表
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);

-- 4. 创建 referred_users 表（追踪推荐关系）
CREATE TABLE IF NOT EXISTS referred_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'paid', 'completed', 'rewarded')),
    referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_referral CHECK (referrer_id != referred_user_id)
);

CREATE INDEX idx_referred_users_referrer ON referred_users(referrer_id);
CREATE INDEX idx_referred_users_referred ON referred_users(referred_user_id);
CREATE INDEX idx_referred_users_status ON referred_users(status);

-- 5. 创建 email_logs 表
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL CHECK (template_type IN ('referral_invitation', 'referral_success', 'booking_confirmation', 'consultation_reminder')),
    language TEXT DEFAULT 'en',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_template ON email_logs(template_type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- 6. 创建函数：生成随机推荐码
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数：为用户生成推荐码（如果不存在）
CREATE OR REPLACE FUNCTION ensure_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO referral_codes (user_id, code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 触发器：新用户注册时自动生成推荐码
DROP TRIGGER IF EXISTS auto_create_referral_code ON users;
CREATE TRIGGER auto_create_referral_code
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_referral_code();

-- 9. 创建函数：处理推荐奖励
CREATE OR REPLACE FUNCTION process_referral_reward(
    p_referred_user_id UUID,
    p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referrer_id UUID;
    v_reward_amount DECIMAL(10, 2) := 5.00;
BEGIN
    -- 查找推荐人
    SELECT referrer_id INTO v_referrer_id
    FROM referred_users
    WHERE referred_user_id = p_referred_user_id
      AND status = 'paid'
      AND referrer_id != p_referred_user_id;

    IF v_referrer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 检查是否已发放过奖励
    IF EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE referral_booking_id = p_booking_id
          AND type = 'referral_reward'
    ) THEN
        RETURN FALSE;
    END IF;

    -- 发放奖励（90天过期）
    INSERT INTO credit_transactions (user_id, amount, type, description, referral_booking_id, expires_at)
    VALUES (v_referrer_id, v_reward_amount, 'referral_reward', 'Friend completed first consultation', p_booking_id, NOW() + INTERVAL '90 days');

    -- 更新用户余额
    UPDATE users SET credit_balance = credit_balance + v_reward_amount
    WHERE id = v_referrer_id;

    -- 更新推荐状态
    UPDATE referred_users
    SET status = 'rewarded', updated_at = NOW()
    WHERE referred_user_id = p_referred_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建函数：使用 credit 抵扣预约
CREATE OR REPLACE FUNCTION apply_credit_to_booking(
    p_user_id UUID,
    p_booking_id UUID,
    p_amount DECIMAL(10, 2)
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_remaining DECIMAL(10, 2) := p_amount;
    v_total_applied DECIMAL(10, 2) := 0;
    tx RECORD;
BEGIN
    -- 遍历用户的 credit transactions，优先使用快过期的
    FOR tx IN
        SELECT id, amount
        FROM credit_transactions
        WHERE user_id = p_user_id
          AND amount > 0
          AND (expires_at IS NULL OR expires_at > NOW())
          AND NOT EXISTS (
              SELECT 1 FROM credit_transactions ct2
              WHERE ct2.user_id = p_user_id
                AND ct2.amount < 0
                AND ct2.description LIKE '%Used credit for consultation%'
                AND ct2.created_at >= credit_transactions.created_at
          )
        ORDER BY expires_at ASC NULLS LAST, created_at ASC
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;

        -- 计算这张 credit 能抵扣多少
        v_total_applied := v_total_applied + LEAST(tx.amount, v_remaining);
        v_remaining := v_remaining - LEAST(tx.amount, v_remaining);
    END LOOP;

    v_total_applied := p_amount - v_remaining;

    IF v_total_applied <= 0 THEN
        RETURN 0;
    END IF;

    -- 扣除余额
    UPDATE users SET credit_balance = GREATEST(credit_balance - v_total_applied, 0)
    WHERE id = p_user_id;

    -- 记录交易
    INSERT INTO credit_transactions (user_id, amount, type, description, referral_booking_id)
    VALUES (p_user_id, -v_total_applied, 'booking_usage', 'Used credit for consultation', p_booking_id);

    RETURN v_total_applied;
END;
$$ LANGUAGE plpgsql;

-- 11. RLS 策略
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referred_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- credit_transactions: 用户只能看到自己的记录
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit transactions"
    ON credit_transactions FOR SELECT
    USING (user_id = auth.uid());

-- referral_codes: 用户只能看到自己的推荐码
DROP POLICY IF EXISTS "Users can view own referral code" ON referral_codes;
CREATE POLICY "Users can view own referral code"
    ON referral_codes FOR SELECT
    USING (user_id = auth.uid());

-- referred_users: 推荐人可以看到自己的推荐记录
DROP POLICY IF EXISTS "Referrers can view own referrals" ON referred_users;
CREATE POLICY "Referrers can view own referrals"
    ON referred_users FOR SELECT
    USING (referrer_id = auth.uid());

-- email_logs: 用户只能看到自己的邮件记录
DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
CREATE POLICY "Users can view own email logs"
    ON email_logs FOR SELECT
    USING (user_id = auth.uid());

-- 12. 为现有用户生成推荐码
INSERT INTO referral_codes (user_id, code)
SELECT id, generate_referral_code()
FROM users
WHERE id NOT IN (SELECT user_id FROM referral_codes)
ON CONFLICT (user_id) DO NOTHING;
