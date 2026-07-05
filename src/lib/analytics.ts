// Google Analytics / GTM 事件追踪工具

// 事件类型定义
type EventName =
  | 'click_home_cta'
  | 'view_master'
  | 'booking_start'
  | 'booking_created'
  | 'register'
  | 'login'
  | 'payment_start'
  | 'payment_success';

type EventParams = {
  [key: string]: string | number | boolean | undefined;
};

// GA4 Key Events（原 Conversion）—— 在 GA4 后台标记
export const KEY_EVENTS: EventName[] = ['register', 'booking_created', 'payment_success'];

/**
 * 追踪自定义事件
 * @param eventName - 事件名称（GA4 Event）
 * @param params - 事件参数
 */
export function trackEvent(eventName: EventName, params?: EventParams) {
  if (typeof window === 'undefined') return;

  // GA4 gtag
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  // GTM dataLayer
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
  }

  // 开发环境打印日志
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, params);
  }
}

/**
 * 追踪页面浏览
 * @param pagePath - 页面路径
 * @param pageTitle - 页面标题
 * @param pageLocation - 完整 URL（用于 UTM 参数捕获）
 */
export function trackPageView(pagePath: string, pageTitle?: string, pageLocation?: string) {
  if (typeof window === 'undefined') return;

  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-MC61YGF78P';
  
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_location: pageLocation || window.location.href,
    });
  }
}

// 便捷事件函数
export const track = {
  /** 点击首页 CTA */
  clickHomeCTA: (params: { button_name: string; page: string; language?: string }) => 
    trackEvent('click_home_cta', params),

  /** 查看师傅详情 */
  viewMaster: (params: { master_name: string; master_type?: string }) => 
    trackEvent('view_master', params),

  /** 开始预约 */
  bookingStart: (params: { master_name: string; service_type: string; price: number }) => 
    trackEvent('booking_start', params),

  /** 预约创建成功 */
  bookingCreated: (params: { booking_id: string; master_name: string; service_type: string; price: number }) => 
    trackEvent('booking_created', params),

  /** 注册成功 */
  register: (params: { method: string; language?: string }) => 
    trackEvent('register', params),

  /** 登录成功 */
  login: (params: { method: string }) => 
    trackEvent('login', params),

  /** 开始支付 */
  paymentStart: (params: { booking_id: string; master_name: string; price: number }) => 
    trackEvent('payment_start', params),

  /** 支付成功 */
  paymentSuccess: (params: { booking_id: string; master_name: string; price: number; currency?: string }) => 
    trackEvent('payment_success', params),
};

// 预定义的关键转化事件（旧兼容）
export const Events = {
  // 用户行为
  VIEW_ITEM: 'view_item',           // 查看师傅详情
  BEGIN_CHECKOUT: 'begin_checkout', // 开始预约
  ADD_PAYMENT_INFO: 'add_payment_info', // 添加支付信息
  PURCHASE: 'purchase',             // 完成支付
  SIGN_UP: 'sign_up',               // 注册
  LOGIN: 'login',                   // 登录

  // 咨询流程
  SELECT_MASTER: 'select_master',   // 选择师傅
  SELECT_TIER: 'select_tier',       // 选择档位
  SELECT_DATE: 'select_date',       // 选择日期
  SELECT_TIME: 'select_time',       // 选择时间
  SUBMIT_QUESTION: 'submit_question', // 提交留言问题

  // 聊天互动
  SEND_MESSAGE: 'send_message',     // 发送消息
  SEND_IMAGE: 'send_image',         // 发送图片
  SEND_VOICE: 'send_voice',         // 发送语音
  LEAVE_REVIEW: 'leave_review',     // 提交评价
} as const;

// TypeScript 类型声明
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}
