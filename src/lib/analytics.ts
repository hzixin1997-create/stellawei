// Google Analytics / GTM 事件追踪工具
// Growth Dashboard V1.0 Standard

import { getUTMEventParams, initUTMAttribution } from './utm';

// 初始化 UTM 归因（应用启动时调用一次）
if (typeof window !== 'undefined') {
  initUTMAttribution();
}

// 事件类型定义（Growth Dashboard V1.0）
type EventName =
  | 'click_home_cta'
  | 'select_service'
  | 'view_master'
  | 'select_master'
  | 'booking_start'
  | 'booking_created'
  | 'register'
  | 'login'
  | 'payment_start'
  | 'payment_success'
  | 'chat_open'
  | 'send_message'
  | 'leave_review';

type EventParams = {
  [key: string]: string | number | boolean | undefined;
};

// GA4 Key Events（Conversions）—— 需在 GA4 后台标记
export const KEY_EVENTS: EventName[] = ['register', 'booking_created', 'payment_success'];

/**
 * 获取通用事件参数（所有事件自动携带）
 */
function getCommonParams(): EventParams {
  const utmParams = getUTMEventParams();
  const language = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
  
  return {
    language,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...utmParams,
  };
}

/**
 * 追踪自定义事件
 * @param eventName - 事件名称（GA4 Event）
 * @param params - 事件参数
 */
export function trackEvent(eventName: EventName, params?: EventParams) {
  if (typeof window === 'undefined') return;

  const commonParams = getCommonParams();
  const mergedParams = { ...commonParams, ...params };

  // GA4 gtag
  if (window.gtag) {
    window.gtag('event', eventName, mergedParams);
  }

  // GTM dataLayer
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...mergedParams,
    });
  }

  // 开发环境打印日志
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, mergedParams);
  }
}

/**
 * 追踪页面浏览
 * @param pagePath - 页面路径
 * @param pageTitle - 页面标题
 * @param pageLocation - 完整 URL
 */
export function trackPageView(pagePath: string, pageTitle?: string, pageLocation?: string) {
  if (typeof window === 'undefined') return;

  const commonParams = getCommonParams();
  
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_location: pageLocation || window.location.href,
      ...commonParams,
    });
  }
}

// 便捷事件函数（Growth Dashboard V1.0 Standard）
export const track = {
  /** 点击首页 CTA */
  clickHomeCTA: (params: { button_name: string; page: string; language?: string }) => 
    trackEvent('click_home_cta', params),

  /** 选择服务 */
  selectService: (params: { service_name: string; service_id: string }) => 
    trackEvent('select_service', params),

  /** 查看师傅详情 */
  viewMaster: (params: { master_name: string; master_id?: string; master_type?: string }) => 
    trackEvent('view_master', params),

  /** 选择师傅（点击预约按钮） */
  selectMaster: (params: { master_name: string; master_id?: string; service_type?: string }) => 
    trackEvent('select_master', params),

  /** 开始预约 */
  bookingStart: (params: { master_name: string; service_type: string; price: number }) => 
    trackEvent('booking_start', params),

  /** 预约创建成功 */
  bookingCreated: (params: { booking_id: string; master_name: string; service_type: string; price: number; currency?: string }) => 
    trackEvent('booking_created', params),

  /** 注册成功 */
  register: (params: { method: string; language?: string }) => 
    trackEvent('register', params),

  /** 登录成功 */
  login: (params: { method: string }) => 
    trackEvent('login', params),

  /** 开始支付 */
  paymentStart: (params: { booking_id: string; master_name: string; price: number; currency?: string }) => 
    trackEvent('payment_start', params),

  /** 支付成功 */
  paymentSuccess: (params: { booking_id: string; master_name: string; price: number; currency?: string }) => 
    trackEvent('payment_success', params),

  /** 打开咨询会话 */
  chatOpen: (params: { booking_id: string; master_name: string }) => 
    trackEvent('chat_open', params),

  /** 发送消息 */
  sendMessage: (params: { booking_id: string; message_type: 'text' | 'image' | 'voice' }) => 
    trackEvent('send_message', params),

  /** 提交评价 */
  leaveReview: (params: { booking_id: string; rating: number; has_text?: boolean }) => 
    trackEvent('leave_review', params),
};

// 预定义的关键转化事件（旧兼容 - 逐步废弃）
export const Events = {
  VIEW_ITEM: 'view_item',
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  SELECT_MASTER: 'select_master',
  SELECT_TIER: 'select_tier',
  SELECT_DATE: 'select_date',
  SELECT_TIME: 'select_time',
  SUBMIT_QUESTION: 'submit_question',
  SEND_MESSAGE: 'send_message',
  SEND_IMAGE: 'send_image',
  SEND_VOICE: 'send_voice',
  LEAVE_REVIEW: 'leave_review',
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
