# Stellawei 一期开发技术方案

## 项目状态（2026-05-04 11:50）

### 已完成部分

| 模块 | 状态 | 说明 |
|------|------|------|
| 数据库 Schema | ✅ | 005_order_system_v2.sql 已定义完整表结构 |
| Supabase 配置 | ✅ | URL + anon key + service role key 已配置 |
| Stripe 后端集成 | ✅ | Checkout Session 创建、Webhook 处理 |
| 订单创建 API | ✅ | POST /api/orders 创建订单 + Stripe Session |
| 订单查询 API | ✅ | GET /api/orders 用户订单列表 |
| 订单详情 API | ✅ | GET /api/orders/[id] |
| 订单更新 API | ✅ | PATCH /api/orders/[id] 状态更新 |
| 用户问题提交 API | ✅ | POST /api/orders/[id]/question |
| 师傅回复 API | ✅ | POST /api/orders/[id]/response |
| 师傅订单列表 API | ✅ | GET /api/master/orders |
| 师傅服务列表 API | ✅ | GET /api/masters/[id]/services |
| Stripe Webhook | ✅ | checkout.session.completed 处理 |
| 邮件通知 | ✅ | Resend 集成，5种邮件模板 |
| 用户订单列表页 | ✅ | /orders |
| 用户订单详情页 | ✅ | /order/[id]，含问题提交、回复展示 |
| 师傅登录页 | ✅ | /master/login |
| 师傅后台首页 | ✅ | /master/dashboard |
| 师傅订单列表页 | ✅ | /master/orders |
| 师傅订单详情页 | ✅ | /master/orders/[id]，含回复表单 |
| 支付成功页 | ✅ | /payment/success |
| 支付取消页 | ✅ | /payment/cancel |
| 师傅详情页 | ✅ | /masters/[id]，含服务列表和下单 |

### 待修复/补充

1. **环境变量**：.env.local 缺少 STRIPE_SECRET_KEY 和 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - 需要确认 Vercel 生产环境是否已配置
   - Stripe 账户已开通（Individual 香港），需要获取实际密钥

2. **首页按钮链接**：首页 "Book Now" 按钮指向 /booking，应改为 /masters 或师傅详情页

3. **数据库迁移执行**：005_order_system_v2.sql 需要在 Supabase 中执行

4. **师傅 auth.users 账号**：张易桦和戊阳需要在 Supabase Auth 中创建用户

5. **支付成功页双重实现**：/payment/success/page.tsx 和 PaymentSuccessContent.tsx 有重复，需要清理

### 技术架构

```
前端 (Next.js 14 + Tailwind + shadcn/ui)
  ├── 用户端：首页 / 师傅列表 / 师傅详情 / 订单列表 / 订单详情 / 支付
  └── 师傅端：登录 / 后台首页 / 订单列表 / 订单详情

API (Next.js Route Handlers)
  ├── /api/orders          — 创建订单、查询列表
  ├── /api/orders/[id]     — 订单详情、更新状态
  ├── /api/orders/[id]/question  — 用户提交问题
  ├── /api/orders/[id]/response  — 师傅提交回复
  ├── /api/master/orders   — 师傅订单列表
  ├── /api/masters/[id]/services — 师傅服务列表
  └── /api/webhook/stripe  — Stripe Webhook

数据库 (Supabase PostgreSQL)
  ├── orders              — 订单表
  ├── master_services     — 师傅服务定价表
  ├── masters             — 师傅信息表
  ├── profiles            — 用户信息表
  ├── payments            — 支付记录表
  └── order_status_history — 订单状态历史

支付 (Stripe)
  ├── Checkout Session    — 一次性支付
  ├── Webhook             — 支付成功回调
  └── 货币：HKD（港币）

邮件 (Resend)
  ├── 订单确认邮件 → 用户
  ├── 新订单通知 → 师傅
  ├── 问题提交通知 → 师傅
  ├── 回复通知 → 用户
  └── 订单完成通知 → 用户
```

### 订单状态流

```
留言咨询 (message):
  pending → paid → assigned → in_progress → completed
           ↓
      用户提交问题
           ↓
      师傅收到通知
           ↓
      师傅回复（可标记完成）
           ↓
      用户收到通知

预约咨询 (booking):
  pending → paid → confirmed → ready → in_progress → completed
           ↓
      用户预约时段（二期实现）
```

### 关键配置

- Supabase Project: qkbkagkalygnfkdiihcak
- Vercel Project: chuhai-eight
- Domain: stellawei.org（已绑定）
- Stripe: Individual (HK) 账户
- Resend: 邮件发送（FROM: noreply@stellawei.com）

### 部署步骤

1. 确保所有环境变量在 Vercel 上已配置
2. 执行数据库迁移（005_order_system_v2.sql）
3. 创建师傅 auth.users 账号并关联 masters.user_id
4. npm run build 测试
5. vercel --prod 部署
