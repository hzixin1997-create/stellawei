## 提醒系统架构调整 — 修改清单

### 1. 数据库 Migration
**文件**: `supabase/migrations/030_upgrade_reminder_system.sql`
**内容**:
- 添加 8 个新字段：
  - `user_reminder_sent` (boolean)
  - `master_reminder_sent` (boolean)
  - `reminder_processing` (boolean) + `reminder_processing_at` (timestamp)
  - `reminder_retry_count` (integer)
  - `last_reminder_attempt_at` (timestamp)
  - `reminder_error` (text)
  - `user_reminder_sent_at` (timestamp)
  - `master_reminder_sent_at` (timestamp)
- 创建 4 个索引加速 cron 查询
- 迁移旧 `reminder_sent` 数据到双边字段

**请在 Supabase SQL Editor 执行这个 migration**。

---

### 2. API 端点重构
**文件**: `src/app/api/reminders/check/route.ts`
**变化**:
- `GET` → `POST`
- 鉴权：`?key=xxx` → `Header x-cron-secret: xxx`
- 查询时间窗口：10~11 分钟 → **15 分钟**
- 双边独立控制：`reminder_sent` → `user_reminder_sent` + `master_reminder_sent`
- 并发锁：原子 UPDATE `reminder_processing`
- 错误日志：`reminder_error` + `reminder_retry_count` + `last_reminder_attempt_at`
- 发送时间：`user_reminder_sent_at` + `master_reminder_sent_at`

### 3. Brevo 超时优化
**文件**: `src/lib/brevo.ts`
**变化**:
- 新增 `fetchWithTimeout` 封装（默认 5 秒）
- Brevo 请求 5 秒超时后自动失败 → fallback 到 Resend

### 4. 邮件文案更新
**文件**: `src/lib/email.ts`
**变化**:
- "10分钟后" → "15分钟后"

---

### 5. Cron 调用方式变更

当前你的 cron 服务（cron-job.org / GitHub Actions）调用的是：
```
GET https://stellawei.org/api/reminders/check?key=xxx
```

**请改为**：
```
POST https://stellawei.org/api/reminders/check
Header: x-cron-secret: your_cron_secret_value
```

**Cron 频率保持**：每 5 分钟一次

---

### 6. Vercel 环境变量
确保已配置：
```
CRON_SECRET=your_cron_secret_value
```
（如果没有请添加）

---

### 待执行
1. ✅ 代码已修改并提交
2. ⏳ 部署到 Production
3. ⏳ 在 Supabase 执行 migration SQL
4. ⏳ 更新 cron 调用配置（GET → POST + Header）

是否需要我现在部署并帮你更新 cron 配置？