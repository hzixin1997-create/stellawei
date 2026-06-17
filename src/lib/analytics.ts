// Google Analytics / GTM 事件追踪工具

type EventParams = {
  [key: string]: string | number | boolean | undefined;
};

/**
 * 追踪自定义事件
 * @param eventName - 事件名称（如: 'begin_checkout', 'purchase'）
 * @param params - 事件参数
 */
export function trackEvent(eventName: string, params?: EventParams) {
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
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
}

// 预定义的关键转化事件
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
