# Stripe 支付系统部署指南

## 概述
已完成 Stripe 支付系统集成，支持完整的支付流程：创建预约 → 支付 → Webhook 回调 → 更新订单状态。

## 新增功能

### 1. API 路由
- `POST /api/payment/create-session` - 创建 Stripe Checkout Session
- `POST /api/webhook/stripe` - 处理 Stripe Webhook 事件
- `POST /api/payment/refund` - 管理员退款 API
- `GET /api/payment/refund?bookingId=xxx` - 查询退款状态

### 2. 前端页面
- `/payment/success` - 支付成功页面
- `/payment/cancel` - 支付取消页面
- `/booking` - 更新后的预约页面（集成支付流程）

### 3. 核心功能
- 首次用户优惠价格（$9.9）
- Stripe Checkout 托管支付页面
- 自动创建/更新 Customer
- Webhook 处理支付完成事件
- 自动更新 bookings 和 payments 表

## 环境变量配置

在 Vercel 部署时需要添加以下环境变量：

```bash
# Stripe 配置（测试环境）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 应用 URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 数据库表结构

确保 Supabase 中有以下表结构：

### bookings 表
```sql
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  master_id text not null,
  service_id text not null,
  scheduled_at timestamp with time zone not null,
  scheduled_date date,
  scheduled_time text,
  timezone text default 'UTC',
  duration_minutes integer not null,
  status text default 'pending',
  payment_status text default 'pending',
  subtotal numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  total_amount numeric(10,2) not null,
  currency text default 'usd',
  payment_intent_id text,
  payment_method text,
  paid_at timestamp with time zone,
  stripe_customer_id text,
  stripe_refund_id text,
  refunded_at timestamp with time zone,
  refund_amount numeric(10,2),
  refund_reason text,
  is_first_time boolean default false,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### payments 表
```sql
create table payments (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references bookings not null,
  user_id uuid references auth.users not null,
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  amount numeric(10,2) not null,
  currency text default 'usd',
  status text default 'pending',
  payment_method text,
  metadata jsonb,
  stripe_refund_id text,
  refund_amount numeric(10,2),
  refund_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### users 表（添加字段）
```sql
alter table users add column if not exists stripe_customer_id text;
alter table users add column if not exists first_booking_completed boolean default false;
```

## Stripe Webhook 配置

1. 登录 Stripe Dashboard
2. 进入 Developers → Webhooks
3. 添加 endpoint: `https://your-domain.vercel.app/api/webhook/stripe`
4. 选择以下事件：
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
   - `charge.refunded`

5. 复制 Signing secret 到 `STRIPE_WEBHOOK_SECRET`

## 测试支付流程

使用 Stripe 测试卡：
- 成功支付: `4242 4242 4242 4242`
- 需要 3D Secure: `4000 0025 0000 3155`
- 支付失败: `4000 0000 0000 0002`

任何未来的日期和任意 3 位 CVC 都可以使用。

## 部署步骤

1. 在 Vercel 添加所有环境变量
2. 配置 Stripe Webhook
3. 确保 Supabase 数据库表已创建
4. 部署代码: `vercel --prod`

## 验收标准检查清单

- [ ] 用户可以完成完整支付流程（测试卡 4242 4242 4242 4242）
- [ ] 支付成功后数据库订单状态正确更新（payment_status = 'paid'）
- [ ] Webhook 正确处理支付回调
- [ ] 退款 API 可以正常使用
- [ ] 首次用户享受 $9.9 优惠价格
- [ ] 支付成功/取消页面正常显示
