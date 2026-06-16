// ============================================================
// i18n — 统一错误消息国际化
// 所有 API 错误消息必须走此处，禁止硬编码
// ============================================================

export type SupportedLang = 'zh' | 'en';

export const i18nMessages = {
  // === 预约相关 ===
  SLOT_BOOKED: {
    zh: '该时间槽已被占用，请选择其他时间',
    en: 'This time slot is already booked. Please select another time.',
  },
  CHECK_SLOT_FAILED: {
    zh: '检查时间槽可用性失败',
    en: 'Failed to check slot availability.',
  },
  PENDING_ORDER: {
    zh: '您已有待支付订单，请先完成支付或等待过期',
    en: 'You already have a pending order. Please complete payment or wait for it to expire.',
  },
  FIRST_TIME_ONLY: {
    zh: '首单优惠仅限您的第一笔订单',
    en: 'First-time discount is only available for your first order.',
  },
  BOOK_TOO_EARLY: {
    zh: '实时咨询必须至少提前2小时预约',
    en: 'Real-time consultations must be booked at least 2 hours in advance.',
  },
  BOOK_TOO_SHORT: {
    zh: '预约时间必须至少提前15分钟',
    en: 'Appointments must be at least 15 minutes in advance.',
  },
  CREATE_FAILED: {
    zh: '创建订单失败',
    en: 'Failed to create booking.',
  },

  // === 改期相关 ===
  BOOKING_NOT_FOUND: {
    zh: '订单未找到',
    en: 'Booking not found.',
  },
  FORBIDDEN_NOT_MASTER: {
    zh: '无权操作：您不是该师傅',
    en: 'Forbidden: not the assigned master.',
  },
  FORBIDDEN_NOT_USER: {
    zh: '无权操作：这不是您的订单',
    en: 'Forbidden: not your booking.',
  },
  CANNOT_RESCHEDULE_MESSAGE: {
    zh: '留言咨询不能修改时间',
    en: 'Message consultations cannot reschedule.',
  },
  CANNOT_RESCHEDULE_STATUS: {
    zh: '该状态的订单不能修改时间',
    en: 'Cannot reschedule a booking with this status.',
  },
  UNPAID_BOOKING: {
    zh: '只有已付款的订单才能修改时间',
    en: 'Only paid bookings can be rescheduled.',
  },
  SLOT_UNAVAILABLE: {
    zh: '师傅未开放该时间槽',
    en: 'Master has not opened this time slot.',
  },
  TIME_CONFLICT: {
    zh: '该时间槽已被占用',
    en: 'This time slot is already occupied.',
  },
  CONFLICT_CHECK_ERROR: {
    zh: '检查时间冲突失败',
    en: 'Failed to check time conflicts.',
  },
  UPDATE_ERROR: {
    zh: '更新订单失败',
    en: 'Failed to update booking.',
  },

  // === 通用 ===
  UNAUTHORIZED: {
    zh: '未授权，请登录',
    en: 'Unauthorized. Please login.',
  },
  INTERNAL_ERROR: {
    zh: '服务器内部错误',
    en: 'Internal server error.',
  },

  // === 语音消息相关 ===
  AUDIO_TOO_LARGE: {
    zh: '语音文件过大，请缩短录制时间',
    en: 'Audio file too large. Please shorten the recording.',
  },
  AUDIO_UPLOAD_TIMEOUT: {
    zh: '语音上传超时，请重试',
    en: 'Audio upload timed out. Please retry.',
  },
  AUDIO_UPLOAD_FAILED: {
    zh: '语音发送失败，请重试',
    en: 'Audio send failed. Please retry.',
  },
  AUDIO_RECORDING_FAILED: {
    zh: '录音失败，请重试',
    en: 'Recording failed. Please retry.',
  },
  AUDIO_MAX_DURATION: {
    zh: '最长支持3分钟语音',
    en: 'Maximum 3 minutes audio supported.',
  },
  AUDIO_TOO_LONG: {
    zh: '语音最长3分钟，请缩短后重试',
    en: 'Audio maximum 3 minutes. Please shorten and retry.',
  },
  SEND_FAILED: {
    zh: '发送失败，请重试',
    en: 'Send failed, please retry.',
  },
  UPLOAD_FAILED: {
    zh: '上传失败',
    en: 'Upload failed.',
  },
  SESSION_EXPIRED: {
    zh: '登录已过期，请重新登录',
    en: 'Session expired. Please login again.',
  },
  CONSULTATION_ENDED: {
    zh: '咨询已结束，您不能继续发送消息',
    en: 'Consultation ended. You cannot send more messages.',
  },
  CONSULTATION_COMPLETED: {
    zh: '咨询已完全结束',
    en: 'Consultation fully completed.',
  },
  PRE_CONSULT_LIMIT: {
    zh: '已达到咨询前消息上限，请等待预约时间正式开始对话',
    en: 'Pre-consultation message limit reached. Please wait for the scheduled time.',
  },
  COMPLETE_FAILED: {
    zh: '结束咨询失败',
    en: 'Complete failed.',
  },
  SUBMIT_REVIEW_FAILED: {
    zh: '提交评价失败',
    en: 'Submit review failed.',
  },

  // === 后台操作 ===
  CANCEL_FAILED: {
    zh: '取消订单失败',
    en: 'Cancel failed.',
  },
  REFUND_FAILED: {
    zh: '申请退款失败',
    en: 'Refund failed.',
  },
  PAYMENT_FAILED: {
    zh: '支付失败',
    en: 'Payment failed.',
  },
  LOAD_REVIEW_FAILED: {
    zh: '加载评价失败',
    en: 'Failed to load review.',
  },
  RESCHEDULE_LIMIT_REACHED: {
    zh: '该订单已达到改期次数上限（最多2次）',
    en: 'This booking has reached the reschedule limit (max 2 times).',
  },
  ACCEPT_FAILED: {
    zh: '接单失败',
    en: 'Accept failed.',
  },
  STATUS_UPDATE_FAILED: {
    zh: '更新状态失败',
    en: 'Update failed.',
  },
  DELETE_FAILED: {
    zh: '删除失败',
    en: 'Delete failed.',
  },

  // === Cron / 系统 ===
  COMPLETE_EXPIRED_FAILED: {
    zh: '自动完成过期订单失败',
    en: 'Failed to complete expired bookings.',
  },
  REMINDER_CHECK_FAILED: {
    zh: '检查提醒失败',
    en: 'Failed to check upcoming consultations.',
  },
  NO_REMINDER: {
    zh: '未来15分钟内没有即将开始的咨询',
    en: 'No upcoming consultations in the next 15 minutes.',
  },
  MISSING_USER_EMAIL: {
    zh: '缺少用户邮箱',
    en: 'Missing user email.',
  },
  MISSING_MASTER_DATA: {
    zh: '缺少师傅数据',
    en: 'Missing master data.',
  },
} as const;

/** 从 Request 获取语言（优先 x-language header，其次 Accept-Language） */
export function getLang(req: Request): SupportedLang {
  const xLang = req.headers.get('x-language');
  if (xLang === 'zh' || xLang === 'en') return xLang;

  const acceptLang = req.headers.get('accept-language') || '';
  if (acceptLang.includes('zh')) return 'zh';
  return 'en';
}

/** 从 Request 获取错误消息 */
export function getMessage(key: string, req: Request): string {
  const lang = getLang(req);
  const msg = i18nMessages[key as keyof typeof i18nMessages];
  if (!msg) return key;
  return msg[lang] || msg.en || key;
}

/** 直接指定语言获取消息 */
export function getMessageWithLang(key: string, lang: SupportedLang): string {
  const msg = i18nMessages[key as keyof typeof i18nMessages];
  if (!msg) return key;
  return msg[lang] || msg.en || key;
}
