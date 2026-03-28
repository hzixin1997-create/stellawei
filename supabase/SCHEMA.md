# Chuhai 数据库 Schema 文档

## 表结构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS (auth.users)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         profiles                                │
│  - 用户资料表，扩展 auth.users                                   │
│  - 包含个人信息、出生信息等                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  user_settings  │    │     masters     │    │     orders      │
│  - 用户偏好设置  │    │  - 师傅信息表    │    │  - 订单核心表    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                     │
          ┌─────────────────────┘                     │
          │                                           │
          ▼                                           ▼
┌─────────────────────────────────────┐    ┌─────────────────────┐
│       master_schedules              │    │    appointments     │
│  - 师傅周排班 (每周重复)             │    │  - 预约详情表        │
├─────────────────────────────────────┤    └─────────────────────┘
│  master_schedule_exceptions         │              │
│  - 特殊日期排班覆盖                  │              │
├─────────────────────────────────────┤              │
│       master_time_slots             │              ▼
│  - 可预约时间格 (自动生成)           │    ┌─────────────────────┐
│  - 混合模式: 周排班+特殊日期          │    │      reviews        │
└─────────────────────────────────────┘    │  - 评价表            │
                                           └─────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                         services                                │
│  - 服务产品表                                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      service_tiers                              │
│  - 服务价格档位 (师傅可自定义)                                    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                        payments                                 │
│  - 支付记录表                                                    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                    refund_requests                              │
│  - 退款申请表                                                    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                       tarot_cards                               │
│  - 塔罗牌静态数据表                                               │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                       app_configs                               │
│  - 应用配置表                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 核心表详情

### 1. profiles (用户资料)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，关联 auth.users |
| email | VARCHAR(255) | 邮箱 |
| full_name | VARCHAR(100) | 全名 |
| avatar_url | TEXT | 头像URL |
| phone | VARCHAR(20) | 电话 |
| date_of_birth | DATE | 出生日期 |
| birth_time | TIME | 出生时间 |
| birth_location | VARCHAR(200) | 出生地点 |
| gender | VARCHAR(10) | 性别 |
| timezone | VARCHAR(50) | 时区 |
| locale | VARCHAR(10) | 语言设置 |
| stripe_customer_id | VARCHAR(100) | Stripe客户ID |
| is_master | BOOLEAN | 是否是师傅 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 2. masters (师傅信息)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联 profiles |
| display_name | VARCHAR(100) | 显示名称 |
| tagline | VARCHAR(200) | 标语/签名 |
| bio | TEXT | 简介 |
| avatar_url | TEXT | 头像 |
| video_intro_url | TEXT | 视频介绍 |
| specialties | VARCHAR[] | 专长领域 |
| languages | VARCHAR[] | 语言能力 |
| experience_years | INTEGER | 经验年数 |
| certifications | JSONB | 资质证书 |
| is_verified | BOOLEAN | 是否认证 |
| verification_status | VARCHAR(20) | 认证状态 |
| base_price_tier | VARCHAR(20) | 基础价格档位 |
| rating_average | DECIMAL(2,1) | 平均评分 |
| rating_count | INTEGER | 评价数量 |
| completed_sessions | INTEGER | 完成会话数 |
| timezone | VARCHAR(50) | 时区 |
| is_active | BOOLEAN | 是否活跃 |

### 3. services (服务产品)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| type | VARCHAR(30) | 类型: tarot, bazi, fengshui... |
| name_en | VARCHAR(100) | 英文名称 |
| name_zh | VARCHAR(100) | 中文名称 |
| slug | VARCHAR(100) | URL别名 |
| description | TEXT | 详细描述 |
| short_description | VARCHAR(300) | 短描述 |
| price_min | DECIMAL(10,2) | 最低价格 |
| price_max | DECIMAL(10,2) | 最高价格 |
| duration_minutes | INTEGER | 时长(分钟) |
| features | JSONB | 服务特色 |
| requirements | JSONB | 需要提供的信息 |
| sort_order | INTEGER | 排序 |
| is_active | BOOLEAN | 是否上架 |
| image_url | TEXT | 图片URL |

### 4. master_schedules (周排班)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| master_id | UUID | 师傅ID |
| day_of_week | INTEGER | 星期(0-6) |
| start_time | TIME | 开始时间 |
| end_time | TIME | 结束时间 |
| is_available | BOOLEAN | 是否可用 |

### 5. master_schedule_exceptions (特殊日期排班)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| master_id | UUID | 师傅ID |
| exception_date | DATE | 特殊日期 |
| is_available | BOOLEAN | 是否可用 |
| start_time | TIME | 自定义开始时间 |
| end_time | TIME | 自定义结束时间 |
| reason | VARCHAR(200) | 原因说明 |

### 6. master_time_slots (可预约时间格)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| master_id | UUID | 师傅ID |
| slot_date | DATE | 日期 |
| slot_time | TIME | 时间 |
| duration_minutes | INTEGER | 时长 |
| is_available | BOOLEAN | 是否可用 |
| is_booked | BOOLEAN | 是否被预订 |
| order_id | UUID | 关联订单 |
| timezone | VARCHAR(50) | 时区 |
| source | VARCHAR(20) | 来源: weekly_schedule, manual, exception |

**生成逻辑**:
1. 读取 master_schedules 获取周排班
2. 检查 master_schedule_exceptions 是否有特殊日期覆盖
3. 从当前日期开始生成未来 N 天的时间格
4. 每个时间格默认 30 分钟间隔

### 7. orders (订单)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_number | VARCHAR(20) | 订单号 (ORD+日期+随机数) |
| user_id | UUID | 用户ID |
| master_id | UUID | 师傅ID |
| service_id | UUID | 服务ID |
| tier_id | UUID | 价格档位ID |
| scheduled_at | TIMESTAMP | 预约时间 |
| timezone | VARCHAR(50) | 时区 |
| duration_minutes | INTEGER | 时长 |
| status | order_status | 订单状态 |
| question_text | TEXT | 用户问题 |
| subtotal | DECIMAL(10,2) | 小计 |
| discount_amount | DECIMAL(10,2) | 优惠金额 |
| total_amount | DECIMAL(10,2) | 总计 |
| currency | VARCHAR(3) | 货币 |
| payment_intent_id | VARCHAR(100) | Stripe Payment Intent |
| paid_at | TIMESTAMP | 支付时间 |

**订单状态流转**:
```
pending → paid → confirmed → ready → in_progress → completed
   ↓        ↓         ↓
cancelled  refunded  disputed
```

### 8. appointments (预约详情)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_id | UUID | 关联订单 |
| master_id | UUID | 师傅ID |
| user_id | UUID | 用户ID |
| scheduled_at | TIMESTAMP | 预约时间 |
| meeting_type | VARCHAR(20) | 会议类型: video/audio/chat |
| meeting_url | TEXT | 会议链接 |
| status | VARCHAR(20) | 预约状态 |
| reminder_24h_sent | BOOLEAN | 24小时提醒已发送 |
| reminder_1h_sent | BOOLEAN | 1小时提醒已发送 |
| user_notes | TEXT | 用户备注 |
| master_notes | TEXT | 师傅备注 |

### 9. reviews (评价)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_id | UUID | 关联订单 |
| user_id | UUID | 用户ID |
| master_id | UUID | 师傅ID |
| overall_rating | INTEGER | 综合评分(1-5) |
| accuracy_rating | INTEGER | 准确度评分 |
| communication_rating | INTEGER | 沟通评分 |
| value_rating | INTEGER | 性价比评分 |
| title | VARCHAR(200) | 标题 |
| content | TEXT | 内容 |
| is_anonymous | BOOLEAN | 是否匿名 |
| master_reply | TEXT | 师傅回复 |
| status | review_status | 审核状态 |

### 10. payments (支付记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| order_id | UUID | 订单ID |
| user_id | UUID | 用户ID |
| amount | DECIMAL(10,2) | 金额 |
| status | payment_status | 支付状态 |
| method | payment_method_type | 支付方式 |
| stripe_payment_intent_id | VARCHAR(100) | Stripe Payment Intent |
| card_brand | VARCHAR(50) | 卡品牌 |
| card_last4 | VARCHAR(4) | 卡后4位 |

## 关键函数

### generate_master_time_slots(master_id, days_ahead)
为指定师傅生成未来 N 天的可预约时间格。

```sql
SELECT generate_master_time_slots('master-id', 14);
```

### book_time_slot(slot_id, order_id)
预订指定时间格。

```sql
SELECT book_time_slot('slot-id', 'order-id');
```

### create_order(...)
创建订单和预约。

```sql
SELECT create_order(
  'master-id',
  'service-id',
  '2026-04-01 14:00:00+08',
  'Asia/Shanghai',
  30,
  'My question...',
  null, null, null,
  60.00
);
```

## RLS 策略总结

| 表 | 用户权限 | 师傅权限 |
|---|---------|---------|
| profiles | 查看/更新自己 | - |
| masters | 查看活跃师傅 | 更新自己的信息 |
| services | 查看 | 查看 |
| master_time_slots | 查看可用时段 | 管理自己的时段 |
| orders | 查看/创建自己的 | 查看分配的订单 |
| appointments | 查看/创建自己的 | 查看分配的预约 |
| reviews | 查看已审核的 | 回复自己的评价 |
| payments | 查看自己的 | - |

## 索引列表

- `idx_orders_user_id` - 按用户查询订单
- `idx_orders_master_id` - 按师傅查询订单
- `idx_orders_status` - 按状态查询订单
- `idx_time_slots_master_date` - 按师傅和日期查询时间格
- `idx_time_slots_available` - 查询可用时间格
- `idx_reviews_master_id` - 按师傅查询评价

## 混合时间模式说明

**师傅可预约时间 = 周排班 + 特殊日期覆盖 + 自动生成时间格**

1. **周排班**: 在 `master_schedules` 中设置每周重复的可用时段
2. **特殊日期**: 在 `master_schedule_exceptions` 中设置特定日期的覆盖规则
3. **时间格生成**: 系统每天自动生成未来14天的时间格，用户可以实时预订

**优点**:
- 师傅只需设置一次周排班，系统自动生成可预约时间
- 支持特殊日期灵活调整 (如节假日、休假)
- 用户看到实时可用时间，预订体验好
- 支持自动清理过期时间格
