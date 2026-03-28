# Supabase 配置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 点击 "New Project"
3. 填写项目信息:
   - Name: `chuhai` (或自定义)
   - Database Password: 设置强密码
   - Region: 选择靠近用户的区域 (例如: `Singapore` 对于亚洲用户)
4. 等待项目创建完成

## 2. 获取连接信息

在项目 Dashboard 中，点击左侧菜单的 `Settings` → `API`:

- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
- **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role secret**: `SUPABASE_SERVICE_ROLE_KEY` (仅在服务端使用!)

## 3. 环境变量配置

在项目根目录创建 `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Daily.co Configuration
DAILY_API_KEY=...

# Resend (Email)
RESEND_API_KEY=re_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Chuhai
```

## 4. 运行数据库迁移

### 方法 1: 使用 Supabase CLI (推荐)

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 运行迁移
supabase db push
```

### 方法 2: 使用 SQL Editor

1. 在 Supabase Dashboard 打开 `SQL Editor`
2. 依次复制粘贴以下文件内容并执行:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_appointments_and_time_slots.sql`
   - `supabase/migrations/003_auth_config.sql`

## 5. 配置 Auth 提供商

### 邮箱登录 (已默认启用)

1. 进入 `Authentication` → `Providers`
2. 确保 `Email` 已启用
3. 配置邮件模板 (可选):
   - 进入 `Authentication` → `Email Templates`
   - 自定义确认邮件、重置密码邮件等

### Google OAuth 登录

1. 进入 `Authentication` → `Providers`
2. 启用 `Google`
3. 获取 Google OAuth 凭证:
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建项目或选择现有项目
   - 进入 `APIs & Services` → `Credentials`
   - 点击 `Create Credentials` → `OAuth client ID`
   - 应用类型选择 `Web application`
   - 添加授权回调 URL: `https://your-project.supabase.co/auth/v1/callback`
4. 将 Client ID 和 Client Secret 填入 Supabase

## 6. 导入初始数据

### 使用 SQL Editor

1. 打开 Supabase Dashboard 的 `SQL Editor`
2. 复制 `supabase/seed.sql` 内容
3. 粘贴并执行

### 验证数据导入

```sql
-- 检查服务数量
SELECT COUNT(*) FROM services;

-- 检查师傅数量
SELECT COUNT(*) FROM masters;

-- 检查时间格数量
SELECT COUNT(*) FROM master_time_slots;

-- 查看师傅的可用时间
SELECT m.display_name, COUNT(ts.id) as available_slots
FROM masters m
LEFT JOIN master_time_slots ts ON m.id = ts.master_id AND ts.is_available = true AND ts.is_booked = false
GROUP BY m.id, m.display_name;
```

## 7. 配置 Storage (图片存储)

1. 进入 `Storage` → `New bucket`
2. 创建以下 buckets:
   - `avatars` - 用户头像
   - `master-avatars` - 师傅头像
   - `service-images` - 服务图片
   - `reports` - 生成的报告PDF
3. 为每个 bucket 配置 RLS 策略:
   - 允许公开读取
   - 仅允许上传者修改自己的文件

## 8. 配置 Edge Functions (可选)

用于服务器端任务:

```bash
# 安装 Supabase CLI
supabase functions new send-email
supabase functions new generate-report
supabase functions new process-refund
```

## 9. 测试连接

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000/api/health
# 应该返回数据库连接状态
```

## 10. 生产环境检查清单

- [ ] 使用强密码的 service_role_key
- [ ] 配置正确的 Site URL (Authentication → URL Configuration)
- [ ] 配置重定向 URLs
- [ ] 启用 Row Level Security (RLS) 所有表
- [ ] 设置正确的 CORS 配置
- [ ] 配置数据库备份
- [ ] 启用 Email 确认 (可选)
- [ ] 配置 Rate Limiting

## 数据库架构概览

### 核心表

| 表名 | 说明 |
|------|------|
| `profiles` | 用户资料 (extends auth.users) |
| `masters` | 师傅信息 |
| `services` | 服务产品 |
| `orders` | 订单 |
| `appointments` | 预约详情 |
| `reviews` | 评价 |
| `payments` | 支付记录 |
| `master_schedules` | 师傅周排班 |
| `master_time_slots` | 可预约时间格 |

### Auth 相关

| 表/函数 | 说明 |
|---------|------|
| `auth.users` | Supabase 内置用户表 |
| `handle_new_user()` | 自动创建用户资料触发器 |
| `is_master()` | 检查用户是否是师傅 |

## 常见问题

### Q: 如何重置数据库?

A: 在 SQL Editor 中运行:
```sql
-- 注意: 这会删除所有数据!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
```
然后重新运行所有迁移。

### Q: 如何更新师傅的排班?

A: 修改 `master_schedules` 表，然后重新生成时间格:
```sql
SELECT generate_master_time_slots('master-id', 14);
```

### Q: 如何手动添加测试用户?

A: 在 Authentication → Users → Add User，然后在 SQL Editor:
```sql
UPDATE profiles SET is_master = true WHERE id = 'user-uuid';
INSERT INTO masters (id, user_id, display_name, ...) VALUES (...);
```
