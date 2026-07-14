-- Staging 环境 Seed 数据
-- 创建固定测试账号，用于 Staging 环境完整业务流程测试
-- 2026-07-14

-- ============================================
-- 测试师傅账号
-- ============================================

-- 测试师傅：Luna（塔罗）
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test-luna@stellawei.dev',
    'master',
    'Test Master Luna',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 测试师傅：戊阳（八字）
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'test-wuyang@stellawei.dev',
    'master',
    'Test Master Wu Yang',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 测试师傅：张易桦（奇门）
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'test-zhang@stellawei.dev',
    'master',
    'Test Master Zhang Yihua',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 测试用户账号
-- ============================================

INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'test-user@stellawei.dev',
    'user',
    'Test User',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 测试管理员账号
-- ============================================

INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    'test-admin@stellawei.dev',
    'admin',
    'Test Admin',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 测试师傅详情（masters 表）
-- ============================================

INSERT INTO masters (id, profile_id, slug, name, specialties, experience, bio, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'master-luna',
    'Test Master Luna',
    ARRAY['tarot', 'spiritual'],
    '10+ years experience in Tarot reading and spiritual guidance',
    'Test master for staging environment. Specializes in Tarot and spiritual guidance.',
    true,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO masters (id, profile_id, slug, name, specialties, experience, bio, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'wu-yang',
    'Test Master Wu Yang',
    ARRAY['bazi', 'fengshui'],
    '12+ years experience in BaZi analysis and Feng Shui',
    'Test master for staging environment. Specializes in BaZi and Feng Shui.',
    true,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO masters (id, profile_id, slug, name, specialties, experience, bio, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'zhang-yihua',
    'Test Master Zhang Yihua',
    ARRAY['qimen', 'liuyao'],
    '8+ years experience in Qi Men Dun Jia and Liu Yao',
    'Test master for staging environment. Specializes in Qi Men and Liu Yao.',
    true,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 说明
-- ============================================
-- 这些账号在 Staging Supabase Auth 中也需要创建
-- 需要手动在 Staging Supabase Dashboard 中注册这些邮箱
-- 密码统一为：Test123456
-- 或者使用 Supabase Admin API 批量创建
