# Stellawei 技术 PRD v2.0
## 订单系统 + 留言流 + 师傅后台

**日期**: 2026-05-03
**开发**: 阿夜
**状态**: P0 开发中

---

## 一、数据库 Schema 变更

### 1.1 orders 表 — 新增/修改字段

在现有 `orders` 表基础上（保留现有字段兼容性），新增以下字段：

```sql
-- 订单类型（核心新增）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'booking' 
  CHECK (type IN ('booking', 'message'));

-- 留言订单专用字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_question TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS master_response TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_question_submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS master_response_at TIMESTAMP WITH TIME ZONE;

-- 服务名称（冗余存储，方便查询）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_name VARCHAR(100);

-- 响应时限（留言制用，小时）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE;

-- 师傅是否已读
ALTER TABLE orders ADD COLUMN IF NOT EXISTS master_read BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS master_read_at TIMESTAMP WITH TIME ZONE;
```

### 1.2 master_services 表 — 师傅服务定价（新建）

```sql
CREATE TABLE IF NOT EXISTS master_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('booking', 'message')),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'HKD',
  duration_minutes INTEGER DEFAULT 30,
  response_hours INTEGER DEFAULT 48,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_master_services_master ON master_services(master_id);
CREATE INDEX idx_master_services_type ON master_services(type);
CREATE INDEX idx_master_services_active ON master_services(master_id, is_active);
```

### 1.3 初始化师傅服务数据

```sql
-- 张易桦师傅
INSERT INTO master_services (master_id, name, type, price, currency, duration_minutes, response_hours, description, sort_order) VALUES
('zhang-yihua', '奇门遁甲咨询（预约制）', 'booking', 800, 'HKD', 30, NULL, '通过奇门遁甲分析时机、机遇和人生事件中的隐藏影响', 1),
('zhang-yihua', '六爻占卜（预约制）', 'booking', 600, 'HKD', 20, NULL, '六爻占卜精确解答具体问题', 2),
('zhang-yihua', '留言咨询', 'message', 300, 'HKD', NULL, 48, '提交您的问题，师傅将在48小时内回复', 3);

-- 戊阳师傅
INSERT INTO master_services (master_id, name, type, price, currency, duration_minutes, response_hours, description, sort_order) VALUES
('wu-yang', '八字命盘分析（预约制）', 'booking', 1000, 'HKD', 45, NULL, '深度八字分析，了解人生轨迹和环境能量', 1),
('wu-yang', '风水咨询（预约制）', 'booking', 1500, 'HKD', 60, NULL, '家居/办公室风水调理，改善健康、财运和人际关系', 2),
('wu-yang', '留言咨询', 'message', 400, 'HKD', NULL, 48, '提交您的问题，师傅将在48小时内回复', 3);
```

---

## 二、API 设计

### 2.1 Stripe 支付

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/payment/create-session` | POST | 创建 Stripe Checkout Session（改造，支持 booking/message 两种订单） |
| `/api/webhook/stripe` | POST | Stripe Webhook（改造，支付成功创建订单） |

### 2.2 订单 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/orders` | POST | 创建订单（支付前预创建） |
| `/api/orders` | GET | 查询当前用户订单列表 |
| `/api/orders/[id]` | GET | 查询订单详情 |
| `/api/orders/[id]/question` | POST | 用户提交问题（留言制） |
| `/api/orders/[id]/response` | POST | 师傅提交回复 |
| `/api/orders/[id]/status` | PATCH | 更新订单状态（师傅标记完成等） |

### 2.3 师傅 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/masters/[id]/services` | GET | 获取师傅服务列表 |
| `/api/master/orders` | GET | 师傅获取分配到的订单 |
| `/api/master/profile` | GET/PUT | 师傅个人资料/设置 |

---

## 三、页面路由

### 3.1 用户端（已有基础，新增/改造）

| 路由 | 说明 |
|------|------|
| `/masters/[id]` | 师傅详情页（新增服务选择 → 付款） |
| `/order/[id]` | 订单详情页（改造：支持留言填写/查看回复） |
| `/orders` | 用户订单列表页（新增） |
| `/payment/success` | 付款成功页（改造：跳转订单详情） |

### 3.2 师傅后台（新增）

| 路由 | 说明 |
|------|------|
| `/master/login` | 师傅登录页 |
| `/master/dashboard` | 师傅仪表盘（订单统计） |
| `/master/orders` | 订单列表（按状态筛选） |
| `/master/orders/[id]` | 订单详情（看问题、写回复、标记完成） |
| `/master/settings` | 个人设置（接单开关、可预约时间） |

---

## 四、状态流转

### 4.1 留言订单（message）

```
pending → paid → assigned → in_progress → completed
                    ↓
              user_question 用户提交问题
                    ↓
              master_response 师傅回复
```

### 4.2 预约订单（booking）

```
pending → paid → assigned → confirmed → in_progress → completed
```

---

## 五、邮件通知流程

1. **用户提交问题后** → 通知师傅有新订单（Resend）
2. **师傅回复后** → 通知用户「您的咨询已有回复」
3. **48小时快到时** → 提醒师傅未回复（计划用 Supabase Edge Function / cron）
4. **订单完成** → 通知用户订单已完成

---

## 六、RLS 策略

```sql
-- orders: 用户只能看到自己的订单，师傅只能看到分配到的订单
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Masters can view assigned orders" ON orders
  FOR SELECT USING (master_id IN (
    SELECT id FROM masters WHERE user_id = auth.uid()
  ));

-- master_services: 公开可读
CREATE POLICY "Master services are public" ON master_services
  FOR SELECT USING (true);
```

---

## 七、开发优先级

### P0 — 本周完成
1. [ ] 数据库迁移（orders 新增字段 + master_services 表）
2. [ ] Stripe Checkout 改造（支持 message/booking 两种订单预创建）
3. [ ] Webhook 改造（支付成功自动创建订单，状态改为 paid）
4. [ ] 用户订单流程（师傅页 → 选服务 → 付款 → 订单页 → 提交问题）
5. [ ] 师傅后台（订单列表、订单详情、写回复、标记完成）
6. [ ] 邮件通知（Resend 封装 + 基础模板）
7. [ ] 师傅登录认证

### P1 — 下周完成
8. [ ] 预约日历系统
9. [ ] 实时聊天
10. [ ] 黄总管理后台
11. [ ] 邮件模板优化

---

## 八、技术决策

1. **邮件服务**: Resend（已安装，免费100封/天，对开发者友好）
2. **Stripe 货币**: 默认 HKD，Stripe 支持
3. **师傅认证**: Supabase Auth 邮箱+密码，master.user_id 关联 auth.users
4. **订单ID**: 继续使用 uuid，支付成功后更新订单状态

---

## 九、环境变量需求

```
# 已有
NEXT_PUBLIC_APP_URL=https://chuhai-eight.vercel.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=hzixin1997@gmail.com
STRIPE_SECRET_KEY=...（在 Vercel 环境变量中）
STRIPE_WEBHOOK_SECRET=...（在 Vercel 环境变量中）

# 需要新增
RESEND_API_KEY=...（从 Resend 控制台获取）
```
