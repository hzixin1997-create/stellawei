import { createServiceClient } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { TimeEngine } from '@/lib/timeEngine';
import { getMessageWithLang } from '@/lib/i18n';
import type { SupportedLang } from '@/lib/i18n';

// ============================================================
// RefundEngine — 统一退款引擎
// 所有退款操作的唯一入口
// ============================================================

export type RefundStatus =
  | 'none'
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'refunded'
  | 'failed';

export type RefundRequestStatus = RefundStatus;

export type RefundRequester = 'user' | 'master' | 'admin';

export interface RefundEligibilityResult {
  canRefund: boolean;
  autoRefund: boolean; // 是否自动退款（无需人工审核）
  reason: string;
  code: string;
  hoursUntilStart?: number;
  sessionState?: string;
}

export interface RefundProcessResult {
  success: boolean;
  refundRequestId?: string;
  stripeRefundId?: string | null;
  status: RefundStatus;
  error?: string;
  code?: string;
  isLegacy?: boolean;
}

export interface RefundRequestParams {
  bookingId: string;
  requestedBy: RefundRequester;
  requestedById: string;
  requestedByEmail?: string;
  reason?: string;
  lang?: SupportedLang;
}

export interface RefundReviewParams {
  refundRequestId: string;
  bookingId: string;
  adminId: string;
  adminEmail?: string;
  action: 'approve' | 'reject';
  adminNote?: string;
  lang?: SupportedLang;
}

// 自动退款条件：未开始、支付时间短、未进入咨询
const AUTO_REFUND_MAX_HOURS = 24; // 距离预约开始 > 24小时 自动退款
const AUTO_REFUND_MAX_AGE_HOURS = 48; // 支付后 48 小时内可自动退款

/**
 * 统一退款引擎
 * 所有退款操作必须调用此引擎，禁止直接 UPDATE bookings
 */
export class RefundEngine {
  // ==================== 退款资格检查 ====================

  /**
   * 检查订单是否可以退款
   * 统一供：用户退款、师傅退款、管理员退款 调用
   */
  static async checkEligibility(
    bookingId: string,
    requestedBy: RefundRequester
  ): Promise<RefundEligibilityResult> {
    const supabase = createServiceClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, status, payment_status, scheduled_at, scheduled_date, scheduled_time, duration_minutes, timezone, consultation_type, created_at, stripe_payment_intent_id, stripe_session_id')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { canRefund: false, autoRefund: false, reason: 'Booking not found', code: 'NOT_FOUND' };
    }

    // 1. 检查是否已支付
    if (booking.payment_status !== 'paid') {
      return { canRefund: false, autoRefund: false, reason: 'Booking is not paid', code: 'NOT_PAID' };
    }

    // 2. 检查是否已退款/已取消/已申请退款
    if (['refunded', 'cancelled'].includes(booking.status)) {
      return { canRefund: false, autoRefund: false, reason: 'Booking is already refunded or cancelled', code: 'ALREADY_REFUNDED' };
    }

    const existingRefund = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('booking_id', bookingId)
      .not('status', 'in', '(refunded,rejected)')
      .single();

    if (existingRefund.data) {
      return { canRefund: false, autoRefund: false, reason: 'Refund request already exists', code: 'ALREADY_REQUESTED' };
    }

    // 3. 计算时间状态
    const sessionState = TimeEngine.getSessionState({
      scheduled_at: booking.scheduled_at,
      duration_minutes: booking.duration_minutes || 25,
    }, Date.now());

    // 4. 计算距离开始时间
    let hoursUntilStart = Infinity;
    if (booking.scheduled_at) {
      const startTime = TimeEngine.parseUTC(booking.scheduled_at);
      hoursUntilStart = (startTime - Date.now()) / (1000 * 60 * 60);
    }

    // 5. 已开始/已结束/已完成的订单检查
    if (['in_progress', 'ended', 'completed'].includes(sessionState)) {
      // 时间已过且无任何聊天消息，说明服务未实际发生，允许退款（需审核）
      if (sessionState !== 'in_progress') {
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('booking_id', bookingId)
          .limit(1);
        
        if (!messages || messages.length === 0) {
          return { canRefund: true, autoRefund: false, reason: 'Consultation time passed but no service was delivered', code: 'REVIEW_REQUIRED', hoursUntilStart, sessionState };
        }
      }
      
      return { canRefund: false, autoRefund: false, reason: 'Consultation has already started or completed', code: 'ALREADY_STARTED', sessionState };
    }

    // 6. 计算订单年龄
    let orderAgeHours = Infinity;
    if (booking.created_at) {
      orderAgeHours = (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60);
    }

    // 7. 退款规则判断
    if (requestedBy === 'user') {
      // 用户主动退款
      if (hoursUntilStart > AUTO_REFUND_MAX_HOURS) {
        // 距离开始 > 24小时：自动退款
        return { canRefund: true, autoRefund: true, reason: 'More than 24 hours before consultation', code: 'AUTO_REFUND', hoursUntilStart, sessionState };
      } else if (hoursUntilStart > 0) {
        // 距离开始 ≤ 24小时但还没到：人工审核
        return { canRefund: true, autoRefund: false, reason: 'Less than 24 hours before consultation, requires admin review', code: 'REVIEW_REQUIRED', hoursUntilStart, sessionState };
      } else {
        // 时间已过（但 sessionState 不是 in_progress/ended/completed，可能是时间还没到但状态异常）
        return { canRefund: false, autoRefund: false, reason: 'Consultation time has passed', code: 'TIME_PASSED', hoursUntilStart, sessionState };
      }
    }

    if (requestedBy === 'master') {
      // 师傅主动取消：允许退款，进入快速审核
      return { canRefund: true, autoRefund: false, reason: 'Master initiated refund, fast review', code: 'MASTER_REFUND', hoursUntilStart, sessionState };
    }

    if (requestedBy === 'admin') {
      // 管理员强制退款：允许
      return { canRefund: true, autoRefund: true, reason: 'Admin force refund', code: 'ADMIN_FORCE', hoursUntilStart, sessionState };
    }

    return { canRefund: false, autoRefund: false, reason: 'Unknown requester', code: 'UNKNOWN' };
  }

  // ==================== 申请退款 ====================

  /**
   * 统一退款申请入口
   * 用户/师傅/管理员 申请退款时调用
   */
  static async requestRefund(params: RefundRequestParams): Promise<RefundProcessResult> {
    const { bookingId, requestedBy, requestedById, requestedByEmail, reason, lang = 'en' } = params;
    const supabase = createServiceClient();

    // 1. 检查资格
    const eligibility = await this.checkEligibility(bookingId, requestedBy);
    if (!eligibility.canRefund) {
      return { success: false, status: 'none', error: eligibility.reason, code: eligibility.code };
    }

    // 2. 创建退款请求记录
    const { data: refundRequest, error: createError } = await supabase
      .from('refund_requests')
      .insert({
        booking_id: bookingId,
        requested_by: requestedBy,
        requested_by_id: requestedById,
        requested_by_email: requestedByEmail,
        reason: reason || 'User requested refund',
        status: eligibility.autoRefund ? 'approved' : 'requested',
        refund_amount: 0, // 将在处理时填充
      })
      .select()
      .single();

    if (createError || !refundRequest) {
      return { success: false, status: 'none', error: 'Failed to create refund request', code: 'CREATE_FAILED' };
    }

    // 3. 更新 bookings 表（解耦 refund_status）
    await supabase
      .from('bookings')
      .update({
        refund_status: eligibility.autoRefund ? 'approved' : 'requested',
        refund_reason: reason,
        refund_requested_by: requestedBy,
        refund_requested_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    // 4. 记录退款日志
    await this.logRefundAction({
      refundRequestId: refundRequest.id,
      bookingId,
      action: 'request',
      oldStatus: 'none',
      newStatus: eligibility.autoRefund ? 'approved' : 'requested',
      performedBy: requestedById,
      performedByEmail: requestedByEmail,
      details: { reason, autoRefund: eligibility.autoRefund, hoursUntilStart: eligibility.hoursUntilStart },
    });

    // 5. 如果是自动退款，直接处理
    if (eligibility.autoRefund) {
      const processResult = await this.processRefund({
        refundRequestId: refundRequest.id,
        bookingId,
        adminId: requestedById,
        adminEmail: requestedByEmail,
        action: 'approve',
        adminNote: 'Auto refund: ' + eligibility.reason,
        lang,
      });
      return processResult;
    }

    // 6. 返回结果（等待人工审核）
    return {
      success: true,
      refundRequestId: refundRequest.id,
      status: 'requested',
      error: undefined,
    };
  }

  // ==================== 处理退款 ====================

  /**
   * 统一退款处理入口（Stripe + 数据库更新）
   * 所有退款处理必须调用此函数
   */
  static async processRefund(params: RefundReviewParams): Promise<RefundProcessResult> {
    const { refundRequestId, bookingId, adminId, adminEmail, action, adminNote, lang = 'en' } = params;
    const supabase = createServiceClient();

    // 1. 获取退款请求和订单信息
    const { data: refundRequest } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('id', refundRequestId)
      .single();

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!refundRequest || !booking) {
      return { success: false, status: 'failed', error: 'Refund request or booking not found', code: 'NOT_FOUND' };
    }

    // 2. 如果拒绝退款
    if (action === 'reject') {
      await supabase
        .from('refund_requests')
        .update({ status: 'rejected', admin_note: adminNote, processed_at: new Date().toISOString() })
        .eq('id', refundRequestId);

      await supabase
        .from('bookings')
        .update({ refund_status: 'rejected', refund_admin_note: adminNote })
        .eq('id', bookingId);

      await this.logRefundAction({
        refundRequestId,
        bookingId,
        action: 'review',
        oldStatus: refundRequest.status,
        newStatus: 'rejected',
        performedBy: adminId,
        performedByEmail: adminEmail,
        details: { adminNote, action: 'reject' },
      });

      return { success: true, refundRequestId, status: 'rejected' };
    }

    // 3. 检查 Stripe 支付信息
    const paymentIntentId = booking.stripe_payment_intent_id || booking.payment_intent_id;
    const isLegacy = !paymentIntentId && !booking.stripe_session_id;

    let stripeRefundId: string | null = null;
    let stripeRefundStatus: string = 'refunded';

    // 4. 更新退款请求为 processing
    await supabase
      .from('refund_requests')
      .update({ status: 'processing', admin_note: adminNote })
      .eq('id', refundRequestId);

    await supabase
      .from('bookings')
      .update({ refund_status: 'processing' })
      .eq('id', bookingId);

    // 5. 尝试 Stripe 退款（有 payment intent 时）
    if (paymentIntentId) {
      try {
        const stripe = getStripe();
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            booking_id: bookingId,
            refund_request_id: refundRequestId,
            processed_by: adminId,
          },
        });
        stripeRefundId = refund.id;
        stripeRefundStatus = refund.status || 'refunded';
      } catch (stripeErr: any) {
        console.error('[RefundEngine] Stripe refund failed:', stripeErr);
        stripeRefundStatus = 'failed';
      }
    }

    // 6. 如果 Stripe 失败或没有 Stripe 信息（Legacy），直接标记为 refunded
    const finalStatus: RefundStatus = stripeRefundStatus === 'failed' ? 'failed' : 'refunded';
    const now = new Date().toISOString();

    // 7. 更新退款请求记录
    await supabase
      .from('refund_requests')
      .update({
        status: finalStatus,
        stripe_refund_id: stripeRefundId,
        refund_amount: booking.total_amount,
        currency: booking.currency || 'USD',
        processed_at: now,
        admin_note: adminNote,
      })
      .eq('id', refundRequestId);

    // 8. 更新 bookings 表
    await supabase
      .from('bookings')
      .update({
        status: 'refunded',
        payment_status: 'refunded',
        refund_status: finalStatus,
        stripe_refund_id: stripeRefundId,
        refund_amount: booking.total_amount,
        refund_processed_at: now,
        refund_admin_note: adminNote,
      })
      .eq('id', bookingId);

    // 9. 记录退款日志
    await this.logRefundAction({
      refundRequestId,
      bookingId,
      action: 'stripe_refund',
      oldStatus: 'processing',
      newStatus: finalStatus,
      performedBy: adminId,
      performedByEmail: adminEmail,
      details: { stripeRefundId, stripeRefundStatus, isLegacy, amount: booking.total_amount },
    });

    return {
      success: finalStatus === 'refunded',
      refundRequestId,
      stripeRefundId,
      status: finalStatus,
      isLegacy,
      error: finalStatus === 'failed' ? 'Stripe refund failed' : undefined,
    };
  }

  // ==================== 查询退款信息 ====================

  /**
   * 获取订单的退款信息（供用户后台显示）
   */
  static async getRefundInfo(bookingId: string) {
    const supabase = createServiceClient();
    const { data: refundRequests } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    return refundRequests || [];
  }

  /**
   * 获取待审核退款列表（供管理员后台）
   */
  static async getPendingRefunds() {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('refund_requests')
      .select(`
        *,
        bookings(id, order_number, user_id, master_id, service_id, total_amount, currency, scheduled_date, scheduled_time, status)
      `)
      .in('status', ['requested', 'under_review'])
      .order('created_at', { ascending: false });

    return data || [];
  }

  // ==================== 退款日志 ====================

  static async logRefundAction(params: {
    refundRequestId: string;
    bookingId: string;
    action: string;
    oldStatus?: string;
    newStatus?: string;
    performedBy?: string;
    performedByEmail?: string;
    details?: any;
  }) {
    const supabase = createServiceClient();
    try {
      await supabase.from('refund_logs').insert({
        refund_request_id: params.refundRequestId,
        booking_id: params.bookingId,
        action: params.action,
        old_status: params.oldStatus,
        new_status: params.newStatus,
        performed_by: params.performedBy,
        performed_by_email: params.performedByEmail,
        details: params.details || {},
      });
    } catch (err) {
      console.error('[RefundEngine] Log refund action failed:', err);
    }
  }
}

// 兼容导出
export default RefundEngine;
