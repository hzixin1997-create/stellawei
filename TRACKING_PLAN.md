# Stellawei GA4 Tracking Plan V1.0

> 数据埋点字典，统一事件命名与参数规范。后续新增事件按此格式维护。

---

## 一、Key Events（转化事件）

| Event | 触发时机 | 参数 |
|-------|---------|------|
| `register` | 用户注册成功并自动登录后 | `method: string`（如 `Email`）, `language?: string` |
| `booking_created` | Booking 成功写入 Supabase 后 | `booking_id: string`, `master_name: string`, `service_type: string`, `price: number` |
| `payment_success` | Stripe 支付成功（前端确认页 + 后端 Webhook） | `booking_id: string`, `master_name: string`, `price: number`, `currency?: string` |

> **注意**：Key Events 需在 GA4 后台手动标记为 Conversions（Key Events）。

---

## 二、标准事件（行为事件）

| Event | 触发时机 | 参数 | 位置 |
|-------|---------|------|------|
| `click_home_cta` | 点击首页 Hero 按钮 "Book Your First Reading" | `button_name: string`, `page: string`, `language?: string` | `src/app/page.tsx` |
| `view_master` | 进入师傅详情页 | `master_name: string`, `master_type?: string` | `src/app/masters/[id]/ClientMasterContent.tsx` |
| `booking_start` | 点击"确认预约"按钮 | `master_name: string`, `service_type: string`, `price: number` | `src/app/booking/page.tsx` |
| `booking_created` | Booking 创建成功 | `booking_id: string`, `master_name: string`, `service_type: string`, `price: number` | `src/app/booking/page.tsx` |
| `register` | 注册成功 | `method: string`, `language?: string` | `src/components/auth/AuthCard.tsx` |
| `login` | 登录成功 | `method: string` | `src/components/auth/AuthCard.tsx` |
| `payment_start` | 跳转 Stripe Checkout 前 | `booking_id: string`, `master_name: string`, `price: number` | `src/app/user/dashboard/page.tsx` |
| `payment_success` | 支付成功 | `booking_id: string`, `master_name: string`, `price: number`, `currency?: string` | `src/app/payment/success/page.tsx` |

---

## 三、页面浏览（Page View）

| 实现方式 | 说明 |
|----------|------|
| 自动发送 | `GoogleAnalytics.tsx` 使用 `usePathname` + `useEffect`，在 SPA 路由切换时自动发送 `page_view` |
| 首次加载 | `gtag('config', GA_MEASUREMENT_ID)` 在页面加载时自动发送 |

**覆盖页面**：`/`, `/masters/[id]`, `/booking`, `/auth/login`, `/auth/register`, `/payment/success`, `/user/dashboard`

---

## 四、UTM 参数

| 参数 | 自动支持 | 说明 |
|------|----------|------|
| `utm_source` | ✅ | GA4 自动解析 URL 中的 UTM 参数 |
| `utm_medium` | ✅ | GA4 自动解析 URL 中的 UTM 参数 |
| `utm_campaign` | ✅ | GA4 自动解析 URL 中的 UTM 参数 |

**示例 URL**：`https://stellawei.org/?utm_source=reddit&utm_medium=organic&utm_campaign=career_post`

**后续在 URL 中添加 UTM 参数即可自动追踪来源**：
- Reddit: `?utm_source=reddit&utm_medium=organic&utm_campaign=r_mysticallight`
- Instagram: `?utm_source=instagram&utm_medium=organic&utm_campaign=bazi_post`
- Google: `?utm_source=google&utm_medium=organic&utm_campaign=seo`
- Facebook: `?utm_source=facebook&utm_medium=organic&utm_campaign=group_post`
- TikTok: `?utm_source=tiktok&utm_medium=organic&utm_campaign=video_01`

---

## 五、Debug 验证

### 验证方式
1. 打开浏览器 DevTools → Console
2. 在 `NODE_ENV=development` 时，所有事件会在 Console 打印：`[Analytics] eventName params`
3. 或在 GA4 DebugView 中查看实时事件

### 验证清单
- [ ] 点击首页 CTA → `click_home_cta`
- [ ] 进入师傅详情页 → `view_master`
- [ ] 点击确认预约 → `booking_start`
- [ ] 预约创建成功 → `booking_created`（Key Event）
- [ ] 注册成功 → `register`（Key Event）
- [ ] 登录成功 → `login`
- [ ] 点击支付 → `payment_start`
- [ ] 支付成功 → `payment_success`（Key Event）
- [ ] 页面切换 → `page_view`

---

## 六、转化漏斗（Funnel）

```
Homepage (/)
  ↓ click_home_cta
Login/Register (/auth/login)
  ↓ register / login
Master Detail (/masters/[id])
  ↓ view_master
Booking (/booking)
  ↓ booking_start
  ↓ booking_created
Payment (/payment/success)
  ↓ payment_start
  ↓ payment_success
```

可在 GA4 Explore → Funnel Exploration 中构建以上漏斗分析每一步流失。

---

## 七、文件变更清单

| 文件 | 修改内容 |
|------|----------|
| `src/lib/analytics.ts` | 新增事件类型、便捷函数、Key Events 标记 |
| `src/components/analytics/GoogleAnalytics.tsx` | SPA 页面浏览自动发送 |
| `src/app/page.tsx` | Hero CTA 点击事件 `click_home_cta` |
| `src/app/masters/[id]/ClientMasterContent.tsx` | 师傅详情页事件 `view_master` |
| `src/app/booking/page.tsx` | 预约事件 `booking_start` + `booking_created` |
| `src/components/auth/AuthCard.tsx` | 登录/注册事件 `login` + `register` |
| `src/app/user/dashboard/page.tsx` | 支付开始事件 `payment_start` |
| `src/app/payment/success/page.tsx` | 支付成功事件 `payment_success` |
| `src/app/api/stripe/success/route.ts` | 返回 `masterName`, `price`, `currency` |

---

*创建于 2026-07-05 | 版本 V1.0*
